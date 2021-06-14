const { ObjectID } = require('mongodb');
var multer = require('multer');
var util = require('util');

const axios = require('axios').default;
const https = require('https');
const path = require('path');
const rootCas = require('ssl-root-cas').create();
const xlsxFile = require('read-excel-file/node');

var responseError = require('routes/errorHandler.js');
const config = require('config/config');
const logger = require('config/logger');

var testExecutionImpl = require('services/db/testExecutionImpl.js');
var executionObj = new testExecutionImpl();
var testBedImpl = require('services/db/testBedImpl.js');
var testBedImplObj = new testBedImpl();

var auth = require('config/auth');
const _ = require('underscore');
var dateFormat = require("dateformat");
const { template, random } = require('underscore');

var qtest = function() {};

module.exports = qtest;

rootCas.addFile(path.resolve(__dirname, config.qtest.tls_ca_file));
const httpsAgent = new https.Agent({ ca: rootCas });

console.log('Qtest Access Token --', `Bearer ${config.qtest.access_token}`);

/* Qtest Create Test Cases in Test Design */
qtest.prototype.createTestCases = async function(execution_id) {

    let returnObj = {
        returnStatus: true,
        error: 0
    };

    let qTestModule = [];

    try {
        /* Getting testcases form DB */
        let getExeResult = await executionObj.getExecutionResults(execution_id);
        let executionSummary = await executionObj.getExecutionSummary(execution_id);
        console.log(executionSummary);

        let exeResult = _.filter(getExeResult, function(obj) {
            return obj.status != '';
            //return obj.status != '' || obj.status == 'PASS' || obj.status == 'FAIL';
        });

        // let getTestbedDetails = await testBedImplObj.getByTestBedId(executionDetails[0].test_bed_id);

        //console.log('exeResult --', exeResult);
        console.log('exeResult length --', exeResult.length);

        let d1 = new Date();
        let d2 = '';
        let filename = exeResult[0].test_plan_name;
        let qtest_testModule = [];
        let update_qtest_testModule = [];

        /* Qtest - Test Design Block*/
        console.log("\n--- Qtest - Test Design ---");

        for (var i = 0; i < exeResult.length; i++) {
            let sheetName = '';

            sheetName = exeResult[i].test_suite_name;
            console.log('\n\n ----- SheetName loop ', i + 1, ' -------\n Name :', sheetName, '\n')

            /* Get Project ID */
            let project_id = await getProjectID(execution_id); //id
            let id = project_id[0].id;
            let checkSheetName = [];

            /* Get Default Level Module Details */
            let rootModuleDetails = await getModuleDetails(config.qtest.root_module, id);
            console.log('\nrootModuleDetails --\n', rootModuleDetails);

            if (typeof rootModuleDetails[0].children === 'undefined') {
                console.log('\n ---- Under \"Automation Module\" - Modules are not available ----\n');
            } else {

                let checkFLm_status = await checkModule(id, filename, rootModuleDetails[0].id);
                console.log('\nStatus Root Module------------------------------\n', checkFLm_status);
                // let firstLevelId;

                /* Create 1st Level Module - Excel File Name*/
                if (checkFLm_status.length > 0) {
                    //firstLevelId = checkFLm_status[0].id;
                } else {
                    /* Validating Module(Sheetname) already available in Test Design  */
                    checkSheetName = _.filter(rootModuleDetails[0].children, function(obj) {
                        return _.some(obj.children, { name: sheetName });
                    });
                }
                //console.log('checkSheetName --', checkSheetName[0].children);
            }

            if (checkSheetName.length > 0) {

                console.log("\n--- Creating Test Cases Under Existing 2nd Module ---");
                //for (var i = 0; i < exeResult.length; i++) {
                if (exeResult[i].status != '') {

                    /* checking testcases if not found then inserting in test design */
                    let checkTestCaseFound = "/api/v3/projects/" + id + "/search";
                    let postReqTC = {
                        "object_type": "test-cases",
                        "fields": [
                            "*"
                        ],
                        "query": "'Internal_Test_ID' = '" + exeResult[i].test_no + "'"
                    };
                    let getTCMRes = await qtestPostMethod(checkTestCaseFound, postReqTC);
                    //console.log('checking getTCMRes Items--', getTCMRes.data);

                    if (getTCMRes.data.items.length == 0) {

                        /* Storing the Test Design - Test Module ID in DB Collection */
                        let qtest_testModule_id_val = [{ "name": sheetName, "qtest_id": checkSheetName[0].children[0].id }];
                        await executionObj.updateExecution(execution_id, { "qtest_testModule_id": qtest_testModule_id_val });
                        console.log('New Value qtest_testModule_id_val -- ', qtest_testModule_id_val)
                            //qTestModule.push({ "name": sheetName, "qtest_id": checkSheetName[0].children[0].id });

                        let executionDetails = await executionObj.getExecution(execution_id);
                        console.log('Check Value-- ', executionDetails[0].qtest_testModule_id);
                        console.log('sheetName -- ', sheetName)

                        let ModuleIDArr = _.where(executionDetails[0].qtest_testModule_id, { name: sheetName });
                        //console.log('ModuleIDArr --', ModuleIDArr);
                        // Test Design 2 Module ID 
                        let ModuleID = ModuleIDArr[0].qtest_id;
                        console.log('\n\n -- Inserting New TestCases --');
                        let createTestCasesAPI = "/api/v3/projects/" + id + "/test-cases";

                        console.log('\n === Mapping Dynamic Fields ===\n');
                        let getFieldsList = "/api/v3/projects/" + id + "/settings/test-cases/fields";
                        let getFieldsListRes = await qtestGetMethod(getFieldsList);
                        //console.log('getFieldsListRes--', getFieldsListRes.data)
                        let fieldsArr = ['Status', 'Type', 'Description', 'Internal_Test_ID']
                        let propertiesArr = [];

                        for (let ii = 0; ii < fieldsArr.length; ii++) {
                            let obj = {};
                            let ModuleIDArr = _.where(getFieldsListRes.data, { label: fieldsArr[ii] });
                            //console.log('ModuleIDArr --', i, '---', ModuleIDArr);
                            if (typeof ModuleIDArr[0].id != 'undefined') {
                                if (fieldsArr[ii] == 'Status') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Status",
                                        "field_value": "202",
                                        "field_value_name": exeResult[i].status
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'Type') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Type",
                                        "field_value": "701",
                                        "field_value_name": "Manual"
                                    }
                                    propertiesArr.push(obj);

                                } else if (fieldsArr[ii] == 'Description') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Description",
                                        "field_value": "<p>" + exeResult[i].test_case + "</p>"
                                    }
                                    propertiesArr.push(obj);

                                } else if (fieldsArr[ii] == 'Internal_Test_ID') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Internal_Test_ID",
                                        "field_value": exeResult[i].test_no
                                    }
                                    propertiesArr.push(obj);
                                }
                            }
                        }

                        //console.log('propertiesArr -----', propertiesArr);
                        firstLevelTC = {
                            "name": exeResult[i].test_case,
                            "parent_id": ModuleID,
                            "properties": propertiesArr
                        }

                        await qtestPostMethod(createTestCasesAPI, firstLevelTC); //Calling Create TestCase API 
                        firstLevelTC = {};

                    } else {
                        console.log('\n--> Existing 2nd Module Test-Cases Found --', i + 1, '--', exeResult[i].test_no, '-', exeResult[i].test_case);

                        /* Storing the Test Design - Test Module ID in DB Collection */
                        let qtest_testModule_id = { "name": sheetName, "qtest_id": getTCMRes.data.items[0].parent_id }
                        qTestModule.push(qtest_testModule_id);

                        let insertUnique = _.where(update_qtest_testModule, { name: sheetName });
                        //console.log('insertUnique --', insertUnique);

                        if (insertUnique.length == 0) {
                            // update_qtest_testModule.push(qtest_testModule_id)
                            // await executionObj.updateExecution(execution_id, { "qtest_testModule_id": update_qtest_testModule });
                            qtest_testModule_id = {};
                            console.log('IF SheetFound DB Array - ', update_qtest_testModule);
                        }

                    }
                }
                // }
            } else {

                /* checking testcases if not found then inserting in test design */
                let checkTestCaseFound = "/api/v3/projects/" + id + "/search";
                let postReqTC = {
                    "object_type": "test-cases",
                    "fields": [
                        "*"
                    ],
                    "query": "'Internal_Test_ID' = '" + exeResult[i].test_no + "'"
                };
                let getTCMRes = await qtestPostMethod(checkTestCaseFound, postReqTC);
                //console.log('checking getTCMRes Items--', getTCMRes.data);

                if (getTCMRes.data.items.length == 0) {

                    /* Create a New Module (SheetName) & Test-Cases */
                    let createModuleAPI = "/api/v3/projects/" + id + "/modules";

                    let checkFLm_status = await checkModule(id, filename, rootModuleDetails[0].id);
                    console.log('\nStatus 1------------------------------\n', checkFLm_status);
                    let firstLevelId;

                    /* Create 1st Level Module - Excel File Name*/
                    if (checkFLm_status.length > 0) {
                        firstLevelId = checkFLm_status[0].id;
                    } else {
                        console.log("\n--- Creating 1st Module Under \"Automation Module\"  called Excel File Name ---");
                        /* Create 1st Level Module */
                        let firstLevel = {
                            "name": filename,
                            "parent_id": rootModuleDetails[0].id,
                            "description": filename
                        };
                        let firstLevelRes = await qtestPostMethod(createModuleAPI, firstLevel); // id, name, pid
                        firstLevelId = firstLevelRes.data.id;
                    }

                    let checkSLm_status = await checkModule(id, sheetName, firstLevelId);
                    console.log('\nStatus 2------------------------------\n', checkSLm_status);
                    let secondLevelId;
                    let secondLevelData = '';

                    /* Create 1st Level Module - Sheetname*/
                    if (checkSLm_status.length > 0) {
                        secondLevelId = checkSLm_status[0].id;
                    } else {
                        console.log("\n--- Creating 2nd Module Under 1st Module called Sheetname ---");
                        /* Create 2nd Level Module */
                        let secondLevel = {
                            "name": sheetName,
                            "parent_id": firstLevelId,
                            "description": sheetName
                        };
                        let secondLevelRes = await qtestPostMethod(createModuleAPI, secondLevel);
                        secondLevelId = secondLevelRes.data.id;
                        secondLevelData = secondLevelRes.data;
                    }

                    /* Storing the Test Design - Test Module ID in DB Collection */
                    let qtest_testModule_id = { "name": sheetName, "qtest_id": secondLevelId }
                    let ModuleID = secondLevelId;
                    let insertUnique = _.where(update_qtest_testModule, { name: sheetName });
                    console.log('insertUnique --', insertUnique);
                    //qTestModule.push(qtest_testModule_id)

                    if (insertUnique.length == 0) {
                        update_qtest_testModule.push(qtest_testModule_id)
                        await executionObj.updateExecution(execution_id, { "qtest_testModule_id": update_qtest_testModule });
                        qtest_testModule_id = {};
                        console.log('New Value qtest_testModule_id_val -- ', update_qtest_testModule);
                    }

                    console.log("\n--- Create Test Cases Under 2nd Module ---");
                    /* Create Test Cases Under 2nd Module */
                    let createTestCasesAPI = "/api/v3/projects/" + id + "/test-cases";
                    let firstLevelTC = {};
                    //for (var i = 0; i < exeResult.length; i++) {
                    if (exeResult[i].status != '') {

                        console.log('\n === Mapping Dynamic Fields ===\n');
                        let getFieldsList = "/api/v3/projects/" + id + "/settings/test-cases/fields";
                        let getFieldsListRes = await qtestGetMethod(getFieldsList);
                        //console.log('getFieldsListRes--', getFieldsListRes.data)
                        let fieldsArr = ['Status', 'Type', 'Description', 'Internal_Test_ID']
                        let propertiesArr = [];

                        for (let ii = 0; ii < fieldsArr.length; ii++) {
                            let obj = {};
                            let ModuleIDArr = _.where(getFieldsListRes.data, { label: fieldsArr[ii] });
                            //console.log('ModuleIDArr --', ii, '---', ModuleIDArr);

                            if (typeof ModuleIDArr[0].id != 'undefined') {
                                if (fieldsArr[ii] == 'Status') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Status",
                                        "field_value": "202",
                                        "field_value_name": exeResult[i].status
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'Type') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Type",
                                        "field_value": "701",
                                        "field_value_name": "Manual"
                                    }
                                    propertiesArr.push(obj);

                                } else if (fieldsArr[ii] == 'Description') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Description",
                                        "field_value": "<p>" + exeResult[i].test_case + "</p>"
                                    }
                                    propertiesArr.push(obj);

                                } else if (fieldsArr[ii] == 'Internal_Test_ID') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Internal_Test_ID",
                                        "field_value": exeResult[i].test_no
                                    }
                                    propertiesArr.push(obj);
                                }
                            }
                        }

                        //console.log('propertiesArr -----', propertiesArr);
                        firstLevelTC = {
                            "name": exeResult[i].test_case,
                            "parent_id": ModuleID,
                            "properties": propertiesArr
                        }

                        await qtestPostMethod(createTestCasesAPI, firstLevelTC); //Calling Create TestCase API 
                        firstLevelTC = {};
                    }
                } else {

                    console.log('\n--> New 2nd Module (SheetName) Found Test-Cases Already Created --> ', i + 1, '\n-->', exeResult[i].test_no, '\n-->', exeResult[i].test_case);

                    /* Storing the Test Design - Test Module ID in DB Collection */
                    let qtest_testModule_id = { "name": sheetName, "qtest_id": getTCMRes.data.items[0].parent_id }
                    qTestModule.push(qtest_testModule_id);
                    let insertUnique = _.where(update_qtest_testModule, { name: sheetName });
                    console.log('InsertUnique -->', insertUnique);

                    if (insertUnique.length == 0) {
                        //update_qtest_testModule.push(qtest_testModule_id)
                        //await executionObj.updateExecution(execution_id, { "qtest_testModule_id": update_qtest_testModule });
                        qtest_testModule_id = {};
                        console.log('\n-->Else Sheet-TestCase Not Found DB Array - ', update_qtest_testModule);
                    }

                }
                //}
            }
        }

        const key = 'qtest_id';
        const arrayUniqueByKey = [...new Map(qTestModule.map(item => [item[key], item])).values()];
        console.log("\nTEST qTestModule --> ", qTestModule);
        console.log("\narrayUniqueByKey --> ", arrayUniqueByKey);

        /* Get Project ID */
        let project_id = await getProjectID(execution_id); //id
        let id = project_id[0].id;

        for (var i = 0; i < arrayUniqueByKey.length; i++) {
            let moduleIdKey = arrayUniqueByKey[i].qtest_id;
            //https://qtest.tulip.nxp.com/api/v3/projects/55/modules/20129
            let getSingleModuleDetails = "/api/v3/projects/" + id + "/modules/" + moduleIdKey;
            let getSingleModuleDetailsRes = await qtestGetMethod(getSingleModuleDetails);
            console.log("getAllTestCasesRes -- ", getSingleModuleDetailsRes.data);
            arrayUniqueByKey[i].name = getSingleModuleDetailsRes.data.name;
        }
        console.log("\narrayUniqueByKey --> ", arrayUniqueByKey);

        // Final update to the Execution table
        await executionObj.updateExecution(execution_id, { "qTestModule": arrayUniqueByKey });

        d2 = new Date();
        console.log('\n\n------- Duration -----\nStartTime -', d1, 'FinishTime -', d2);
        console.log('-- Duration - ', diff_hours(d1, d2));

        returnObj.message = "Qtest Test Design Created Successfully";
        returnObj.size = exeResult.length;
        // returnObj.moduleID = secondLevelId;

        return returnObj;

    } catch (err) {
        console.log('\nCreate Test Design Error in Catch --\n', err)
        returnObj.error = 1;
        returnObj.message = "Error while qtest Implementation";

    }

}

/* Qtest Create Test Run in Test Execution */
qtest.prototype.createTestRun = async function(execution_id) {

    let returnObj = {
        returnStatus: true,
        error: 0
    };

    try {

        let getExeResult = await executionObj.getExecutionResults(execution_id);
        let executionRes = await executionObj.getExecution(execution_id);
        let getTestbedDetails = await testBedImplObj.getByTestBedId(executionRes[0].test_bed_id);
        let executionSummary = await executionObj.getExecutionSummary(execution_id);

        let exeResult = _.filter(getExeResult, function(obj) {
            return obj.status != '';
            //return obj.status != '' || obj.status == 'PASS' || obj.status == 'FAIL';
        });

        //console.log('exeResult Data --', exeResult);

        /* Approve all the test cases */
        await approveTestCases(execution_id);
        console.log('\n exeResult length --', exeResult.length);

        let d1 = new Date();
        let d2 = '';
        let qtest_testSuite = [];

        // Test Bed Name
        let test_bed_name = getTestbedDetails[0].displayName; //+ ' - ' + executionRes[0].test_bed_name; 
        let build = '';
        if (executionSummary[0].UUT_Build != '' && typeof executionSummary[0].UUT_Build != 'undefined') {
            build = executionSummary[0].UUT_Build;
        } else {
            build = "Unavailable Build Info";
        }
        let execution = executionRes[0].name; // Execution Name

        /* Qtest - Test Execution Block */
        console.log("\n\n------ Qtest - Test Execution ------");
        //qTestModule
        if (exeResult.length > 0) {
            if (typeof executionRes[0].qtest_testModule_id != "undefined") {
                console.log("\n\n------ Qtest - Test Execution -- [qtest_testModule_id] ------");
                for (var i = 0; i < executionRes[0].qtest_testModule_id.length; i++) {
                    let sheetName = '';

                    // Test Suite from get Test Execution Results
                    sheetName = executionRes[0].qtest_testModule_id[i].name;
                    console.log('\n\n ----- SheetName loop ', i + 1, ' -------\n Name :', sheetName, '\n');

                    let ModuleIDArr = _.where(executionRes[0].qtest_testModule_id, { name: sheetName });
                    console.log('\n Check ModuleIDArr -->', ModuleIDArr);

                    // Test Design 2 Module ID 
                    ModuleID = ModuleIDArr[0].qtest_id; //executionRes[0].qtest_testModule_id; 
                    console.log('\n ModuleID Details -->', ModuleID);

                    /* Getting the Project ID */
                    let project_id = await getProjectID(execution_id); //id
                    let id = project_id[0].id;

                    /* Get Default Level Test Cycle Details */
                    let defaultTestCycleDetails = await getTestCycleDetails(config.qtest.root_module, id);
                    console.log('defaultTestCycleDetails --', defaultTestCycleDetails);

                    //Here need to apply the logic to check same testbed or NOT
                    //if same testbed create new execution 1, 2, 3 ...    

                    let checkFLTc_status = await checkTestCycle(id, test_bed_name, defaultTestCycleDetails[0].id);
                    console.log('\nStatus 1------------------------------\n', checkFLTc_status);
                    let firstLevelId;
                    let secondLevelId;
                    let thirdLevelId;
                    let fourthLevelId;

                    /* Create 1st Level TestCycle - Testbed*/
                    if (checkFLTc_status.length > 0) {
                        firstLevelId = checkFLTc_status[0].id;
                    } else {
                        let createFLTestCycleAPI = "/api/v3/projects/" + id + "/test-cycles?parentId=" + defaultTestCycleDetails[0].id + "&parentType=test-cycle";
                        let firstLevel = {
                            "name": test_bed_name,
                            "description": test_bed_name
                        };
                        let firstLevelRes = await qtestPostMethod(createFLTestCycleAPI, firstLevel);
                        firstLevelId = firstLevelRes.data.id;
                        /* Test Cycle First level in Collection */
                        //await executionObj.updateExecution(execution_id, { "qtest_TC1L_pid": firstLevelId });
                    }

                    /* Create 2nd Level TestCycle - Build*/
                    let checkSLTc_status = await checkTestCycle(id, build, firstLevelId);
                    console.log('\nStatus 2------------------------------\n', checkSLTc_status);

                    if (checkSLTc_status.length > 0) {
                        secondLevelId = checkSLTc_status[0].id;
                    } else {
                        let createSLTestCycleAPI = "/api/v3/projects/" + id + "/test-cycles?parentId=" + firstLevelId + "&parentType=test-cycle";
                        let secondLevel = {
                            "name": build,
                            "description": build
                        };
                        let secondLevelRes = await qtestPostMethod(createSLTestCycleAPI, secondLevel);
                        secondLevelId = secondLevelRes.data.id;
                        /* Test Cycle Second level in Collection */
                        //await executionObj.updateExecution(execution_id, { "qtest_TC2L_pid": secondLevelId });
                    }


                    /* Create 3nd Level TestCycle - Execution*/
                    let checkTLTc_status = await checkTestCycle(id, execution, secondLevelId);
                    console.log('\nStatus 3------------------------------ \n', checkTLTc_status);

                    if (checkTLTc_status.length > 0) {
                        thirdLevelId = checkTLTc_status[0].id;
                    } else {
                        let createTLTestCycleAPI = "/api/v3/projects/" + id + "/test-cycles?parentId=" + secondLevelId + "&parentType=test-cycle";
                        let thirdLevel = {
                            "name": execution,
                            "description": execution
                        };
                        let thirdLevelRes = await qtestPostMethod(createTLTestCycleAPI, thirdLevel);
                        thirdLevelId = thirdLevelRes.data.id;
                        /* Test Cycle Third level in Collection */
                        //await executionObj.updateExecution(execution_id, { "qtest_TC3L_pid": thirdLevelId });
                    }


                    /* Create 4nd Level Test Suite - Excel_sheetName*/
                    //let checkFourLTc_status = await checkTestCycle(id, sheetName, thirdLevelId);
                    let checkFourLTc_status = await checkSuiteCycle(id, sheetName, thirdLevelId);
                    console.log('\nStatus 4------------------------------ \n', checkFourLTc_status);

                    if (checkFourLTc_status.length > 0) {
                        fourthLevelId = checkFourLTc_status[0].id;
                    } else {
                        let createFourLTestCycleAPI = "/api/v3/projects/" + id + "/test-suites?parentId=" + thirdLevelId + "&parentType=test-cycle";
                        let fourthLevel = {
                            "name": sheetName,
                            "description": sheetName
                        };
                        let fourthLevelRes = await qtestPostMethod(createFourLTestCycleAPI, fourthLevel);
                        fourthLevelId = fourthLevelRes.data.id;
                        /* Storing the TE - Test Suite ID in Collection */
                        let qtest_testSuite_id = { "name": sheetName, "qtest_id": fourthLevelId }
                        qtest_testSuite.push(qtest_testSuite_id)
                        await executionObj.updateExecution(execution_id, { "qtest_testSuite_id": qtest_testSuite });
                        qtest_testSuite_id = {};
                        console.log('--> TestSuite in DB Array - ', qtest_testSuite);
                    }

                    /* Get All Test Cases Under Test Module [Test Design] */
                    let getAllTestCasesAPI = "/api/v3/projects/" + id + "/test-cases?parentId=" + ModuleID + "&size=2000";
                    let getAllTestCasesRes = await qtestGetMethod(getAllTestCasesAPI);
                    console.log("\n getAllTestCasesRes -- ", getAllTestCasesRes.data.length);

                    // Get All Test Runs Under Test Suite [Test Execution] 
                    let getAllTestRunAPI = "/api/v3/projects/" + id + "/test-runs?parentId=" + fourthLevelId + "&parentType=test-suite";
                    let getAllTestRunRes = await qtestGetMethod(getAllTestRunAPI);
                    console.log("\n getAll TestRun Result length -- ", getAllTestRunRes.data.length);

                    // Getting Matching test cases from Qtest 
                    let getTcTd = [];
                    let checkTestRun = '';

                    const key_test_no = 'test_no';
                    const UniqueExeResult = [...new Map(exeResult.map(item => [item[key_test_no], item])).values()];
                    console.log("\nUnique ExeResult --> ", UniqueExeResult.length);

                    for (var j = 0; j < UniqueExeResult.length; j++) { // exeResult is from Database

                        // if (typeof exeResult[j].qTest_status == 'undefined') {

                        //     checkTestRun = _.where(getAllTestRunRes.data, { name: exeResult[j].test_case })
                        //     console.log("\ncheckTestRun --> ", checkTestRun.length);

                        //     if (checkTestRun.length == 0) {

                        foundTcName = _.filter(getAllTestCasesRes.data, function(obj) {
                            return _.some(obj.properties, { field_value: UniqueExeResult[j].test_no });
                        });

                        if (foundTcName.length > 0) {
                            console.log('--> Created Test No --', UniqueExeResult[j].test_no);
                            getTcTd.push(foundTcName[0]);
                        } else {
                            console.log('-> Already Created --', UniqueExeResult[j].test_no);
                        }

                        // } else {
                        //     console.log('-> Already Created --', exeResult[j].test_case);
                        // }

                        //}
                    }
                    //console.log("getTcTd ---------", getTcTd);

                    console.log("\n--- Creating Test Run Under Test Suit ---\n");
                    /* Create Test Run Under Test suite */
                    let createTestRunAPI = "/api/v3/projects/" + id + "/test-runs?parentId=" + fourthLevelId + "&parentType=test-suite";
                    let firstLevelTR = {};
                    for (var j = 0; j < getTcTd.length; j++) {

                        console.log('\n === Mapping Dynamic Fields ===\n');
                        let getFieldsList = "/api/v3/projects/" + id + "/settings/test-runs/fields";
                        let getFieldsListRes = await qtestGetMethod(getFieldsList);
                        //console.log('getFieldsListRes--', getFieldsListRes.data)
                        let fieldsArr = ['Planned Start Date', 'Planned End Date', 'sw release', 'CI Tool', 'Status']
                        let propertiesArr = [];

                        for (let ii = 0; ii < fieldsArr.length; ii++) {
                            let obj = {};
                            let ModuleIDArr = _.where(getFieldsListRes.data, { label: fieldsArr[ii] });
                            //console.log('ModuleIDArr --', ii, '---', ModuleIDArr);
                            if (typeof ModuleIDArr[0].id != 'undefined') {
                                if (fieldsArr[ii] == 'Planned Start Date') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Planned Start Date",
                                        "field_value": new Date()
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'Planned End Date') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Planned Start Date",
                                        "field_value": new Date()
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'sw release') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "sw release",
                                        "field_value": build
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'CI Tool') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "CI Tool",
                                        "field_value": 1
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'Status') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Status",
                                        "field_value": 601,
                                        "field_value_name": 'Passed'
                                    }
                                    propertiesArr.push(obj);
                                }
                            }
                        }
                        firstLevelTR = {
                            "name": getTcTd[j].name,
                            "properties": propertiesArr,
                            "test_case": {
                                "id": getTcTd[j].id
                            }
                        };

                        await qtestPostMethod(createTestRunAPI, firstLevelTR); //Calling Create TestCase API 
                        firstLevelTR = {};
                    }
                }
            }

            if (typeof executionRes[0].qTestModule != "undefined") {
                console.log("\n\n------ Qtest - Test Execution -- [qTestModule] ------");
                for (var i = 0; i < executionRes[0].qTestModule.length; i++) {
                    let sheetName = '';

                    // Test Suite from get Test Execution Results
                    sheetName = executionRes[0].qTestModule[i].name;
                    console.log('\n\n ----- SheetName loop ', i + 1, ' -------\n Name :', sheetName, '\n');

                    let ModuleIDArr = _.where(executionRes[0].qTestModule, { name: sheetName });
                    console.log('\n Check ModuleIDArr -->', ModuleIDArr);

                    // Test Design 2 Module ID 
                    ModuleID = ModuleIDArr[0].qtest_id; //executionRes[0].qTestModule; 
                    console.log('\n ModuleID Details -->', ModuleID);

                    /* Getting the Project ID */
                    let project_id = await getProjectID(execution_id); //id
                    let id = project_id[0].id;

                    /* Get Default Level Test Cycle Details */
                    let defaultTestCycleDetails = await getTestCycleDetails(config.qtest.root_module, id);
                    console.log('defaultTestCycleDetails --', defaultTestCycleDetails);

                    //Here need to apply the logic to check same testbed or NOT
                    //if same testbed create new execution 1, 2, 3 ...    

                    let checkFLTc_status = await checkTestCycle(id, test_bed_name, defaultTestCycleDetails[0].id);
                    console.log('\nStatus 1------------------------------\n', checkFLTc_status);
                    let firstLevelId;
                    let secondLevelId;
                    let thirdLevelId;
                    let fourthLevelId;

                    /* Create 1st Level TestCycle - Testbed*/
                    if (checkFLTc_status.length > 0) {
                        firstLevelId = checkFLTc_status[0].id;
                    } else {
                        let createFLTestCycleAPI = "/api/v3/projects/" + id + "/test-cycles?parentId=" + defaultTestCycleDetails[0].id + "&parentType=test-cycle";
                        let firstLevel = {
                            "name": test_bed_name,
                            "description": test_bed_name
                        };
                        let firstLevelRes = await qtestPostMethod(createFLTestCycleAPI, firstLevel);
                        firstLevelId = firstLevelRes.data.id;
                        /* Test Cycle First level in Collection */
                        //await executionObj.updateExecution(execution_id, { "qtest_TC1L_pid": firstLevelId });
                    }

                    /* Create 2nd Level TestCycle - Build*/
                    let checkSLTc_status = await checkTestCycle(id, build, firstLevelId);
                    console.log('\nStatus 2------------------------------\n', checkSLTc_status);

                    if (checkSLTc_status.length > 0) {
                        secondLevelId = checkSLTc_status[0].id;
                    } else {
                        let createSLTestCycleAPI = "/api/v3/projects/" + id + "/test-cycles?parentId=" + firstLevelId + "&parentType=test-cycle";
                        let secondLevel = {
                            "name": build,
                            "description": build
                        };
                        let secondLevelRes = await qtestPostMethod(createSLTestCycleAPI, secondLevel);
                        secondLevelId = secondLevelRes.data.id;
                        /* Test Cycle Second level in Collection */
                        //await executionObj.updateExecution(execution_id, { "qtest_TC2L_pid": secondLevelId });
                    }


                    /* Create 3nd Level TestCycle - Execution*/
                    let checkTLTc_status = await checkTestCycle(id, execution, secondLevelId);
                    console.log('\nStatus 3------------------------------ \n', checkTLTc_status);

                    if (checkTLTc_status.length > 0) {
                        thirdLevelId = checkTLTc_status[0].id;
                    } else {
                        let createTLTestCycleAPI = "/api/v3/projects/" + id + "/test-cycles?parentId=" + secondLevelId + "&parentType=test-cycle";
                        let thirdLevel = {
                            "name": execution,
                            "description": execution
                        };
                        let thirdLevelRes = await qtestPostMethod(createTLTestCycleAPI, thirdLevel);
                        thirdLevelId = thirdLevelRes.data.id;
                        /* Test Cycle Third level in Collection */
                        //await executionObj.updateExecution(execution_id, { "qtest_TC3L_pid": thirdLevelId });
                    }

                    /* Create 4nd Level Test Suite - Excel_sheetName*/
                    //let checkFourLTc_status = await checkTestCycle(id, sheetName, thirdLevelId);
                    let checkFourLTc_status = await checkSuiteCycle(id, sheetName, thirdLevelId);
                    console.log('\nStatus 4------------------------------ \n', checkFourLTc_status);

                    if (checkFourLTc_status.length > 0) {
                        fourthLevelId = checkFourLTc_status[0].id;
                    } else {
                        let createFourLTestCycleAPI = "/api/v3/projects/" + id + "/test-suites?parentId=" + thirdLevelId + "&parentType=test-cycle";
                        let fourthLevel = {
                            "name": sheetName,
                            "description": sheetName
                        };
                        let fourthLevelRes = await qtestPostMethod(createFourLTestCycleAPI, fourthLevel);
                        fourthLevelId = fourthLevelRes.data.id;
                        /* Storing the TE - Test Suite ID in Collection */
                        let qtest_testSuite_id = { "name": sheetName, "qtest_id": fourthLevelId }
                        qtest_testSuite.push(qtest_testSuite_id)
                        await executionObj.updateExecution(execution_id, { "qtest_testSuite_id": qtest_testSuite });
                        qtest_testSuite_id = {};
                        console.log('--> TestSuite in DB Array - ', qtest_testSuite);
                    }

                    /* Get All Test Cases Under Test Module [Test Design] */
                    let getAllTestCasesAPI = "/api/v3/projects/" + id + "/test-cases?parentId=" + ModuleID + "&size=2000";
                    let getAllTestCasesRes = await qtestGetMethod(getAllTestCasesAPI);
                    console.log("\n getAllTestCasesRes -- ", getAllTestCasesRes.data.length);

                    // Get All Test Runs Under Test Suite [Test Execution] 
                    let getAllTestRunAPI = "/api/v3/projects/" + id + "/test-runs?parentId=" + fourthLevelId + "&parentType=test-suite";
                    let getAllTestRunRes = await qtestGetMethod(getAllTestRunAPI);
                    console.log("\n getAll TestRun Result length -- ", getAllTestRunRes.data.length);

                    // Getting Matching test cases from Qtest 
                    let getTcTd = [];
                    let checkTestRun = '';

                    const key_test_no = 'test_no';
                    const UniqueExeResult = [...new Map(exeResult.map(item => [item[key_test_no], item])).values()];
                    console.log("\nUnique ExeResult --> ", UniqueExeResult.length);

                    for (var j = 0; j < UniqueExeResult.length; j++) { // exeResult is from Database

                        foundTcName = _.filter(getAllTestCasesRes.data, function(obj) {
                            return _.some(obj.properties, { field_value: UniqueExeResult[j].test_no });
                        });

                        if (foundTcName.length > 0) {
                            console.log('--> Created Test No --', UniqueExeResult[j].test_no);
                            getTcTd.push(foundTcName[0]);
                        } else {
                            console.log('-> Already Created --', UniqueExeResult[j].test_no);
                        }
                    }
                    //console.log("getTcTd ---------", getTcTd);

                    console.log("\n--- Creating Test Run Under Test Suit ---\n");
                    /* Create Test Run Under Test suite */
                    let createTestRunAPI = "/api/v3/projects/" + id + "/test-runs?parentId=" + fourthLevelId + "&parentType=test-suite";
                    let firstLevelTR = {};
                    for (var j = 0; j < getTcTd.length; j++) {

                        console.log('\n === Mapping Dynamic Fields ===\n');
                        let getFieldsList = "/api/v3/projects/" + id + "/settings/test-runs/fields";
                        let getFieldsListRes = await qtestGetMethod(getFieldsList);
                        //console.log('getFieldsListRes--', getFieldsListRes.data)
                        let fieldsArr = ['Planned Start Date', 'Planned End Date', 'sw release', 'CI Tool', 'Status']
                        let propertiesArr = [];

                        for (let ii = 0; ii < fieldsArr.length; ii++) {
                            let obj = {};
                            let ModuleIDArr = _.where(getFieldsListRes.data, { label: fieldsArr[ii] });
                            //console.log('ModuleIDArr --', ii, '---', ModuleIDArr);
                            if (typeof ModuleIDArr[0].id != 'undefined') {
                                if (fieldsArr[ii] == 'Planned Start Date') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Planned Start Date",
                                        "field_value": new Date()
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'Planned End Date') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Planned Start Date",
                                        "field_value": new Date()
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'sw release') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "sw release",
                                        "field_value": build
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'CI Tool') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "CI Tool",
                                        "field_value": 1
                                    }
                                    propertiesArr.push(obj);
                                } else if (fieldsArr[ii] == 'Status') {
                                    obj = {
                                        "field_id": ModuleIDArr[0].id,
                                        "field_name": "Status",
                                        "field_value": 601,
                                        "field_value_name": 'Passed'
                                    }
                                    propertiesArr.push(obj);
                                }
                            }
                        }
                        firstLevelTR = {
                            "name": getTcTd[j].name,
                            "properties": propertiesArr,
                            "test_case": {
                                "id": getTcTd[j].id
                            }
                        };

                        await qtestPostMethod(createTestRunAPI, firstLevelTR); //Calling Create TestCase API 
                        firstLevelTR = {};
                    }
                }
            }

        }

        d2 = new Date();
        console.log('\n ExeResult length --', exeResult.length);
        console.log('\n\n------- Duration -----\nStartTime -', d1, 'FinishTime -', d2);
        console.log('-- Duration - ', diff_hours(d1, d2));

        returnObj.message = "Qtest Test Execution Success";
        //returnObj.data = secondLevelRes.data;

        return returnObj;

    } catch (err) {
        console.log('\nCreate Test Execution Error in Catch --\n', err)
        returnObj.error = 1;
        returnObj.message = "Error while qtest Test Execution Implementation";

    }

}

/* Get Default Project ID */
async function getProjectID(execution_id) {
    try {
        let proj = [];
        let result = {};
        let module_name = config.qtest.root_module;

        let executionSummary = await executionObj.getExecutionSummary(execution_id);

        let getQtestProject = await executionObj.getQtestProject(executionSummary[0].UUT_Name);
        // console.log('ProjectID getQtestProject --', getQtestProject);
        result = { "id": getQtestProject[0].qtestProjId };
        proj.push(result)
        console.log("Project Result --", proj);


        console.log("\n-- Check Root Module --");
        let getValue = await getModuleDetails(module_name, getQtestProject[0].qtestProjId);
        // console.log("getModuleDetails --", getValue);

        if (getValue.length == 0) {
            console.log("\n-- Creating new Root Module --");
            /* Create a New Module & Test-Cases */
            let createModuleAPI = "/api/v3/projects/" + getQtestProject[0].qtestProjId + "/modules";
            /* Create 1st Level Module */
            let moduleObj = {
                "name": module_name,
                //"parent_id": getQtestProject[0].qtestProjId,
                "description": module_name
            };
            let firstLevelRes = await qtestPostMethod(createModuleAPI, moduleObj); // id, name, pid
            console.log("Module Created --", firstLevelRes.data);
        }

        console.log("\n-- Check Root TestCycle --");
        let getValueTestCycle = await getTestCycleDetails(module_name, getQtestProject[0].qtestProjId);

        if (getValueTestCycle.length == 0) {
            console.log("\n-- Creating new Root Test Cycle --");
            let createFLTestCycleAPI = "/api/v3/projects/" + getQtestProject[0].qtestProjId + "/test-cycles?parentId=0&parentType=root";
            let firstLevel = {
                "name": module_name,
                "description": module_name
            };
            let firstLevelRes1 = await qtestPostMethod(createFLTestCycleAPI, firstLevel);
            console.log("Test Cycle Created --", firstLevelRes1.data);
        }

        return proj;

    } catch (err) {
        console.log('\nDefault Project ID Error in Catch --\n', err)
    }
}

/* Get Module Details from Test Design */
async function getModuleDetails(module_name, project_id) {
    try {

        let getModules = "/api/v3/projects/" + project_id + "/modules?expand=descendants";
        let resData = await qtestGetMethod(getModules); //qtest GET Method

        // "Automation" - root module configured in config.js
        var result = _.where(resData.data, { name: module_name });
        return result;

    } catch (err) {
        console.log('\nModule Details Error in Catch --\n', err)
    }
}

/* Get Test Cycle Details from Test Execution */
async function getTestCycleDetails(testCycle_name, project_id) {
    try {

        let getTestCycle = "/api/v3/projects/" + project_id + "/test-cycles"; //?expand=descendants
        let resData = await qtestGetMethod(getTestCycle); //qtest GET Method

        var result = _.where(resData.data, { name: testCycle_name }); // project name configured in config.js
        return result;

    } catch (err) {
        console.log('\nGet Test Cycle Error in Catch --\n', err)
    }
}

/* Axios Generic Function to call Qtest GET APIs*/
async function qtestGetMethod(url) {
    try {

        const qtestURL = config.qtest.baseURL + url
        console.log('GET Method URL --', qtestURL);

        const axiosConfig = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.qtest.access_token}`
        }
        const response = await axios.get(qtestURL, {
            headers: axiosConfig
        }, { httpsAgent })

        return response;

    } catch (err) {
        console.log('\nGET Error in Catch --\n', err)
    }

}

/* Axios Generic Function to call Qtest POST APIs*/
async function qtestPostMethod(url, param) {
    try {
        const qtestURL = config.qtest.baseURL + url
        console.log('\nPOST Method URL --', qtestURL);
        console.log('Req Param --\n', JSON.stringify(param));

        const axiosConfig = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.qtest.access_token}`
        }
        const response = await axios.post(qtestURL, JSON.stringify(param), {
            headers: axiosConfig
        }, { httpsAgent })

        return response;

    } catch (err) {
        console.log('\nPost Error in Catch --\n', err)
    }
}

/* Axios Generic Function to call Qtest PUT APIs*/
async function qtestPutMethod(url) {
    try {
        const qtestURL = config.qtest.baseURL + url
        console.log('PUT Method URL --', qtestURL);

        const axiosConfig = {
            "Accept": "application/json",
            "Content-Type": "text/plain",
            'Authorization': `Bearer ${config.qtest.access_token}`
        }
        const response = await axios.put(qtestURL, '', {
            headers: axiosConfig
        });
        //, { httpsAgent }
        return response.data;

    } catch (err) {
        console.log('\nPUT Error in Catch --\n', err)
    }
}

/* Axios Generic Function to approve the test-cases */
async function approveTestCases(execution_id) {
    try {
        let executionRes = await executionObj.getExecution(execution_id);
        let getExeResult = await executionObj.getExecutionResults(execution_id);
        console.log('executionRes[0].qtest_testModule_id.length --', executionRes[0].qtest_testModule_id.length);

        let exeResult = _.filter(getExeResult, function(obj) {
            return obj.status != '';
            //return obj.status == 'PASS' || obj.status == 'FAIL';
        });

        console.log('exeResult length --', exeResult.length);

        /* Qtest - Test Cases Approve Block */
        console.log("\n--- Qtest - Test Cases Approve ---\n");

        for (var x = 0; x < executionRes[0].qtest_testModule_id.length; x++) {

            console.log('\n----- Qtest_Test Module ', x + 1, ' -------\n Name :', executionRes[0].qtest_testModule_id[x].name, '\n');
            let qtest_module_pid = executionRes[0].qtest_testModule_id[x].qtest_id; // Test Module

            /* Getting the Project ID */
            let project_id = await getProjectID(execution_id); //id
            let id = project_id[0].id;

            /* Get All Test Cases Under Test Module */
            let getAllTestCasesAPI = "/api/v3/projects/" + id + "/test-cases?parentId=" + qtest_module_pid + "&size=2000";
            let getAllTestCasesRes = await qtestGetMethod(getAllTestCasesAPI);
            console.log("getAllTestCasesRes -- ", getAllTestCasesRes.data.length);

            /* Getting Matching test cases from Qtest */
            let getTcTd = [];

            const key_test_no = 'test_no';
            const UniqueExeResult = [...new Map(exeResult.map(item => [item[key_test_no], item])).values()];
            console.log("\nUnique ExeResult --> ", UniqueExeResult.length);

            for (var i = 0; i < UniqueExeResult.length; i++) {
                foundTcName = _.filter(getAllTestCasesRes.data, function(obj) {
                    return _.some(obj.properties, { field_value: UniqueExeResult[i].test_no });
                });

                if (foundTcName.length > 0) {
                    console.log('-> Approved Test No --', UniqueExeResult[i].test_no);
                    getTcTd.push(foundTcName[0]);
                }
            }

            /* Approve the Test cases */
            console.log("\n--- Started Approving Test Cases ---");
            for (var i = 0; i < getTcTd.length; i++) {
                console.log("\ngetTcTd ID ---------", getTcTd[i].id)
                console.log("getTcTd Name---------", getTcTd[i].name)

                /* Get all the TC to approve */
                let getAllTestCasesAPI = "/api/v3/projects/" + id + "/test-cases/" + getTcTd[i].id + "/approve";
                await qtestPutMethod(getAllTestCasesAPI); // Calling PUT Method for approve the TC
            }

        }

        console.log("Approved all the test cases.");
        return;

    } catch (err) {
        console.log('\nApproval PUT Error in Catch --\n', err)
    }
}

/* Check Test Cycle Available or NOT in Test Execution */
async function checkTestCycle(project_id, testCase_name, pid) {
    try {
        let getTestCycle = "/api/v3/projects/" + project_id + "/test-cycles?parentId=" + pid + "&parentType=test-cycle";
        let resData = await qtestGetMethod(getTestCycle); //qtest GET Method

        var result = _.where(resData.data, { name: testCase_name });
        return result;

    } catch (err) {
        console.log('\nCheck Test Cycle Available or NOT Error in Catch --\n', err)
    }
}

async function checkSuiteCycle(project_id, testCase_name, pid) {
    try {
        let getTestCycle = "/api/v3/projects/" + project_id + "/test-suites?parentId=" + pid + "&parentType=test-cycle";
        let resData = await qtestGetMethod(getTestCycle);

        var result = _.where(resData.data, { name: testCase_name });
        return result;

    } catch (err) {
        console.log('\nCheck Test Cycle Available or NOT Error in Catch --\n', err)
    }
}

/* Check Test Module Available or NOT in Test Design */
async function checkModule(project_id, module_name, pid) {
    try {
        let getModule = "/api/v3/projects/" + project_id + "/modules?parentId=" + pid;
        let resData = await qtestGetMethod(getModule); //qtest GET Method

        var result = _.where(resData.data, { name: module_name });
        return result;

    } catch (err) {
        console.log('\nTest Module Available or NOT Error in Catch --\n', err)
    }
}

/* Update the status of test execution */
qtest.prototype.updateTestExecutionStatus = async function(execution_id, test_no) {

    let returnObj = {
        returnStatus: true,
        error: 0
    };

    try {
        let getExeResult = '';

        let executionRes = await executionObj.getExecution(execution_id);

        if (test_no == '' || typeof test_no === 'undefined') {
            getExeResult = await executionObj.getExecutionResults(execution_id);
        } else {
            getExeResult = await executionObj.getExecutionResultsTest_no(execution_id, test_no);
        }

        let exeResult = _.filter(getExeResult, function(obj) {
            return obj.status != '';
            //return obj.qTest_status == 0 || obj.status == 'PASS' || obj.status == 'FAIL';
        });


        let d1 = new Date();
        let d2 = '';

        /* Qtest - Update Pass / Fail Status Test Execution Block */
        console.log("\n------ Qtest - Update Pass/Fail Status in Test Execution ------\n ");

        console.log('Test_no --', test_no);
        console.log('ExeResult length --', exeResult.length);
        console.log('ExecutionRes testSuite_id.length --', executionRes[0].qtest_testSuite_id);

        if (exeResult.length > 0) {
            for (var k = 0; k < executionRes[0].qtest_testSuite_id.length; k++) {

                let qtest_suite_pid = executionRes[0].qtest_testSuite_id[k].qtest_id; // Test Suite

                console.log('\n----- Qtest_suite_pid -----', qtest_suite_pid, '\n');
                /* Getting the Project ID */
                let project_id = await getProjectID(execution_id); //id
                let id = project_id[0].id;


                /* Get All Test Runs Under Test Module */
                let getAllTestRunAPI = "/api/v3/projects/" + id + "/test-runs?parentId=" + qtest_suite_pid + "&parentType=test-suite&size=2000";
                let getAllTestRunRes = await qtestGetMethod(getAllTestRunAPI);
                // console.log("\ngetAllTestRunRes -- ", getAllTestRunRes.data);
                console.log("getAllTestRunRes -- ", getAllTestRunRes.data.length);

                /* Getting Matching test cases from Qtest */
                for (var i = 0; i < exeResult.length; i++) {

                    if (exeResult[i].status == 'PASS') {

                        console.log("--> Status Found: ", exeResult[i].test_no, '-', exeResult[i].test_case, '-', exeResult[i].status);

                        // Here test_no not found in qTest object, So we are using name
                        let foundTestRunName = _.findWhere(getAllTestRunRes.data, { name: exeResult[i].test_case });
                        //console.log("foundTestRunName  --", foundTestRunName);


                        if (typeof foundTestRunName !== 'undefined') {
                            //if (foundTestRunNameArr.length > 0) {
                            console.log("\n--> FoundTestRunName.id --", foundTestRunName.id);
                            console.log("--> PASS BLOCK -", i + 1);
                            /* Update the Status of the PASS & FAIL */
                            let createTestCasesAPI = "/api/v3/projects/" + id + "/test-runs/" + foundTestRunName.id + "/test-logs";
                            let approveParam = {};

                            approveParam = {
                                "exe_start_date": new Date(),
                                "exe_end_date": new Date(),
                                "test_case_version_id": foundTestRunName.test_case_version_id,
                                "status": {
                                    "id": 601
                                }
                            };
                            //Calling API to update the Status
                            await qtestPostMethod(createTestCasesAPI, approveParam);
                            approveParam = {};

                            let executionRes = await executionObj.updateExecutionResultsTest_no(execution_id, exeResult[i].test_no);
                            console.log('executionRes -- ', executionRes);

                        }
                    } else if (exeResult[i].status == 'FAIL') {

                        console.log("--> Status Found: ", exeResult[i].test_no, '-', exeResult[i].test_case, '-', exeResult[i].status);

                        // Here test_no not found in qTest object, So we are using name
                        let foundTestRunName = _.findWhere(getAllTestRunRes.data, { name: exeResult[i].test_case });
                        //console.log("foundTestRunName  --", foundTestRunName);


                        if (typeof foundTestRunName !== 'undefined') {
                            //    if (foundTestRunNameArr.length > 0) {
                            console.log("\n-->FoundTestRunName.id --", foundTestRunName.id);
                            console.log("--> FAIL BLOCK -", i + 1);
                            /* Update the Status of the PASS & FAIL */
                            let createTestCasesAPI = "/api/v3/projects/" + id + "/test-runs/" + foundTestRunName.id + "/test-logs";
                            let approveParam = {};

                            approveParam = {
                                "exe_start_date": new Date(),
                                "exe_end_date": new Date(),
                                "test_case_version_id": foundTestRunName.test_case_version_id,
                                "status": {
                                    "id": 602
                                }
                            };
                            //Calling API to update the Status
                            await qtestPostMethod(createTestCasesAPI, approveParam);
                            approveParam = {};

                            let executionRes = await executionObj.updateExecutionResultsTest_no(execution_id, exeResult[i].test_no);
                            console.log('executionRes -- ', executionRes);

                        }
                    } else {
                        console.log("--> Status Not Found: ", exeResult[i].test_no, '-', exeResult[i].test_case, '-', exeResult[i].status);
                    }
                }

            }
        }
        d2 = new Date();
        console.log('\nExeResult length --', exeResult.length)
        console.log('\n\n------- Time Taken -----\nStartTime -', d1, '\nFinishTime -', d2);
        console.log('Duration - ', diff_hours(d1, d2));

        returnObj.message = "Qtest Updated the Status";
        return returnObj;

    } catch (err) {
        console.log('\nError in Catch --\n', err)
        returnObj.error = 1;
        returnObj.message = "Error while qtest Test Execution Implementation";

    }
}

/* get list of projects from qTest */
qtest.prototype.qtestProjects = async function() {
    let returnObj = {
        status: true
    };

    try {

        let projects = "/api/v3/projects";
        let resData = await qtestGetMethod(projects);
        returnObj.message = "list Qtest Project";
        returnObj.data = resData.data;

        return returnObj;

    } catch (err) {
        console.log('\nError in Catch --\n', err)
        returnObj.error = 1;
        returnObj.message = "Error while qtest Implementation";

    }
}


/* getUsers from qtest for testing */
qtest.prototype.getUsers = async function() {
    let returnObj = {
        returnStatus: true,
        error: 0
    };
    try {

        let project_id = await getProjectID(); //id
        let id = project_id[0].id;

        let users = "/api/v3/projects/" + id + "/users";
        let resData = await qtestGetMethod(users);
        //  console.log('resData --', resData);
        returnObj.message = "Qtest Implementation Success";
        returnObj.data = resData.data;

        return returnObj;

    } catch (err) {
        console.log('\nError in Catch --\n', err)
        returnObj.error = 1;
        returnObj.message = "Error while qtest Implementation";

    }
}

function diff_hours(startDate, endDate) {
    var difference = Math.abs(startDate.getTime() - endDate.getTime()) / 1000;
    var hourDifference = parseInt(difference / 3600);
    var minDiff = parseInt(Math.abs(difference / 60) % 60);
    var secDiff = (difference % 60);

    return addZero(hourDifference) + ':' + addZero(minDiff) + ':' + addZero(secDiff);
}

function addZero(num) {
    if (num < 10) {
        num = "0" + num;
    }
    return num;
}