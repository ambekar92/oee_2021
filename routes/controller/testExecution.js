const { ObjectID } = require('mongodb');
const excelToJson = require('convert-excel-to-json');
const Async = require('async');
const _ = require('underscore');
var excel = require('xlsx');
const lodash = require("lodash");
const moment = require('moment');
var multer = require('multer');
var util = require('util');
const fs = require('fs');
var excel = require('xlsx');
const libre = require('libreoffice-convert');
const { exec } = require('child_process');
var path = require('path');

var responseError = require('routes/errorHandler.js');
const logger = require('config/logger');
var testExecutionImpl = require('services/db/testExecutionImpl.js');
var executionObj = new testExecutionImpl();
var mqttClient = new(require('config/mqtt'));
var config = require('../../config/config');
var auth = require('config/auth');
var testBedImpl = require('services/db/testBedImpl.js');
var testBedImplObj = new testBedImpl();
var throughputImpl = require('services/db/throughputImpl.js');
var throughputObj = new throughputImpl();
var testBedUtilImpl = require(path.resolve(__dirname, "./testBedUtil.js"));
var testBedUtil = new testBedUtilImpl();
var testingToolImpl = require(path.resolve(__dirname, "./testingTool.js"));
var testingTool = new testingToolImpl();
var socket = require('config/socket');
var socketObj = new socket();


var routes = function() {

};


module.exports = routes;

/******* Test Execution Controller ******/

/*
    This function parses the run sheet for the file specified in filePathVar path.
    Finds the Test String and list of sheets to be run for execution.
*/
function parseRunSheet(exe_id, testBed, plan_name, filePathVar, totalTc, callback) {
    let suiteList = [];
    let testString;
    console.log("filepath-", filePathVar);

    try {
        let workbook = excel.readFile(filePathVar);
        let currentSheet = workbook.Sheets['RUN'];
        let ref = currentSheet['!ref'].split(':')[0];
        ref = ref.match(/\d/g)[0]; // to get start row number

        const result = excelToJson({
            sourceFile: filePathVar,
            header: {
                rows: ref
            },
            columnToKey: {
                '*': '{{columnHeader}}'
            },
            sheets: ['RUN']
        });

        for (let resValue of result['RUN']) {
            if (resValue.Variable == "TEST_STRING") {
                testString = resValue.Value;
                console.log(testString);
            }
            if (resValue.Value == '1') {
                suiteList.push(resValue.Variable);
            }
        }
        console.log(suiteList);
        if (suiteList.length) {
            callback(null, exe_id, testBed, plan_name, filePathVar, suiteList, testString, totalTc);
        } else {
            callback("No sheets selected to run an Execution", null);
        }
    } catch (err) {
        callback("There seems to be a problem in parsing the RUN sheet", null);
        // console.log("parseRunSheet", err);
    }

}

/*
    This function parses the sheets mentioned in suiteList array from the filePathVar path.
    Gets the list of testcases in each sheet which is selected for execution with the section headers and
    inserts the same into the database.
*/
function getSuiteList(exe_id, testBed, plan_name, filePathVar, suiteList, testString, totalTc, callback) {
    let testCaseObj = {
        execution_id: exe_id,
        test_plan_name: plan_name,
        test_suite_name: "",
        test_no: "",
        test_case: "",
        status: "",
        comments: ""
    };
    let summary = {
        total: '',
        run: '',
        execution_id: exe_id,
        test_suite_name: ''
    };
    let flag = 0;
    let row;

    try {
        let workbook = excel.readFile(filePathVar);
        let count = 0;

        for (let i = 0; i < suiteList.length; i++) {
            if (flag) return;
            let suite = suiteList[i];
            if (suite.startsWith("RUN_")) {
                suite = suite.replace("RUN_", "");
            }

            // console.log("suite----\n", suite);

            let currentSheet = workbook.Sheets[suite];
            // let ref = currentSheet['!ref'].split(':')[0];
            // ref = ref.match(/\d/g)[0]; // to get start row number
            for (let key of Object.keys(currentSheet)) {
                if (currentSheet[key].v != undefined && typeof(currentSheet[key].v) === 'string') {
                    if (currentSheet[key].v.match(/Test[\s\_]*(No|Id)/ig)) {
                        row = key.match(/\d+/g); // to get start row number
                        break;
                    }
                }
            }
            row = row[0];

            const result = excelToJson({
                sourceFile: filePathVar,
                header: {
                    rows: row
                },
                columnToKey: {
                    '*': '{{columnHeader}}'
                        // 'A': '{{A2}}',
                        // 'B': '{{B2}}',
                        // 'C': '{{C2}}',
                        // 'D': '{{D2}}',
                        // 'E': '{{E2}}',
                        // 'F': '{{F2}}',
                        // 'G': '{{G2}}',
                        // 'H': '{{H2}}',
                        // 'I': '{{I2}}'
                },
                sheets: [suite]
            });

            let testCaseStack = [];
            let testCaseSectionStack = [];
            let testCaseStackfinal = [];

            let total_count = 0;
            let run_count = 0;
            let testno;
            let testscript;
            let Result;
            let testcase;

            _.each(result[suite], function(content) {
                if (flag) return;
                let arr = _.keys(content);
                _.filter(arr, (key) => {
                    if (key.match(/Test[\s\_]*(No|Id)/ig)) {
                        testno = key;
                    }
                    if (key.match(/Test[\s\_]*Script/ig)) {
                        testscript = key;
                    }
                    if (key.match(/Result/ig)) {
                        Result = key;
                    }
                    if (key.match(/Test[\s\_]*Case/ig)) {
                        testcase = key;
                    }
                })

                if (content[testscript] != '') {
                    total_count += 1;
                }

                if (content[Result] == testString) {
                    run_count += 1;
                    count += run_count;
                }

                if (content[Result] == undefined || content[testno].split(".").length == 1) {
                    let secObj = {...testCaseObj };
                    secObj.test_no = (content[testno] ? content[testno] : '');
                    secObj.test_case = content[testcase];
                    secObj.test_suite_name = suite;
                    testCaseSectionStack.push(secObj);
                }

                if (content[Result] == testString) {
                    let subObj = {...testCaseObj };
                    subObj.test_no = content[testno];
                    subObj.test_case = content[testcase];
                    subObj.test_suite_name = suite;
                    subObj.status = "PLANNED";
                    testCaseStack.push(subObj);
                }

                if (content[testno] == undefined) {
                    let secObj = {...testCaseObj };
                    secObj.test_no = (content[testno] ? content[testno] : '');
                    secObj.test_case = content[testcase];
                    secObj.test_suite_name = suite;
                    testCaseStackfinal.push(secObj);
                }
            });

            _.each(testCaseStack, function(testCase) {

                var testCaseNo = testCase['test_no'].split(".");
                var testCaseNoString = "";
                for (let j = 0; j < testCaseNo.length; j++) {
                    if (testCaseNoString == "") {
                        testCaseNoString = testCaseNo[j];
                    } else {
                        testCaseNoString = testCaseNoString + "." + testCaseNo[j];
                    }

                    var testCaseSection = testCaseSectionStack[_.findLastIndex(testCaseSectionStack, { 'test_no': testCaseNoString })]
                    if (testCaseSection != undefined) {
                        testCaseStackfinal.push(testCaseSection);
                    }

                }
                testCaseStackfinal.push(testCase);
            });

            let testCases = _.uniq(testCaseStackfinal, 'test_no');

            try {
                if (count == 0) {
                    throw "No TCs selected";
                }
                executionObj.insertTestExeResult(testCases);

                let summaryObj = {...summary };
                summaryObj.total = total_count;
                summaryObj.run = run_count;
                summaryObj.test_suite_name = suite;
                // console.log(summaryObj);
                totalTc = totalTc + summaryObj.run;
                // executionObj.insertSummary(summaryObj);

                if (i == suiteList.length - 1) {
                    callback(null, "Inserted testcases!", totalTc, testBed);
                }
                // console.log(flag);
            } catch (err) {
                flag = true;
                //throw err;
                callback(err, null);
            }
        }
    } catch (err) {
        callback("There seems to be a problem in parsing the input sheet", null);
        logger.error("getSuiteListERR:", err);
    }
}


function checkStatus(obj) {
    if (obj.status === "IN PROGRESS") {
        // console.log("obj-", obj);
        return obj;
    }
}

/*
    This method gets the test cases and related details for the given execution from the client and
    makes an entry in the test_execution and test_execution_result collection.
    Then publishes to mqtt to trigger an execution on selected testbed.
*/
routes.prototype.triggerExecution = async function(req, res) {
    let arr = [];
    totalTc = 0;
    var responseObject = {
        status: true,
        data: {}
    };
    await convertFile(config.public.path + config.public.testplan + req.body.test_bed_name + '/' + req.body.file_path + "/" + req.body.test_plan_name + "x", config.public.path + config.public.testplan + req.body.test_bed_name + '/' + req.body.file_path + "/" + req.body.test_plan_name);

    console.log("req-body--", req.body);
    try {
        let data = await executionObj.getExecutionsByTestBedId(req.body.test_bed_id, false /* pagination flag */ );
        data = data.executionResult;
        let status = data.filter(checkStatus);
        if (status.length) {
            status.forEach(element => {
                arr.push(element.name);
            });
            console.log(`Execution ${arr} is in preogress`);
            responseError(res, responseObject, `Execution ${arr} is in progress`);
        } else {
            let credentials = await executionObj.getLogCredentials();
            console.log(credentials[0]);
            // schema object to insert new execution recor
            let execution = {
                name: req.body.name + "-" + Date.now(),
                actualName: req.body.name,
                framework: req.body.framework,
                status: req.body.status,
                error: false,
                errorType: null,
                traceMessage: null,
                output_file: req.body.output_file,
                test_bed_id: req.body.test_bed_id,
                test_plan_name: req.body.test_plan_name,
                test_bed_name: req.body.test_bed_name,
                file_path: req.body.file_path,
                created_by: req.body.created_by,
                updated_by: null,
                created_time: Date.now(),
                updated_time: null,
                isApproved: null,
                completed_time: null,
                reRun: false,
                output_folder: []
            };

            let configFile = req.body.configFile;
            // execution.output_file.push(req.body.output_file);

            console.log("execution obj---", execution);
            let fp = "./public/Testplans/" + execution.test_bed_name + "/" + execution.file_path + execution.test_plan_name;
            console.log("fp--", fp);

            let testbed = await testBedImplObj.getTestBedObjects({ "name": req.body.test_bed_name });
            // inserts the above execution object into the test execution collection
            let newExecution = await executionObj.insertExecution(execution);
            let execution_id = newExecution.ops[0]._id;

            //TestBed Utilization
            // let timestamp = Date.now();
            // let result = await testbedUtil.agentExecuteTestBedUtil(execution_id, timestamp);
            // console.log("testBed Utilization --> ", result);

            Async.waterfall([
                function(cb) {
                    cb(null, execution_id, testbed[0], execution.test_plan_name, fp, totalTc);
                },
                parseRunSheet,
                getSuiteList
            ], async function(err, result, totalTc, testbed) {
                if (err) {
                    await executionObj.deleteExecution(execution_id);
                    logger.error("triggerExecution_1:", err);
                    responseError(res, responseObject, err);
                } else {
                    // let configfilepath = './public/Configurations/' + execution.test_bed_name + '/' + configFile;
                    // let workbook = excel.readFile(configfilepath);
                    // var newdata = excel.utils.sheet_to_json(workbook.Sheets['Configuration'], { header: "A", raw: false, defval: '', blankrows: true });
                    // excel.utils.sheet_add_json(workbook.Sheets['Configuration'], newdata, { skipHeader: true });
                    // excel.writeFile(workbook, configfilepath);
                    let sumObj = {
                        execution_id: execution_id,
                        totalTc: totalTc
                    }
                    executionObj.insertSummary(sumObj);
                    let path = execution.test_plan_name.split("/");
                    let testPlanName = path[(path.length - 1)];
                    path = path.slice(0, (path.length - 1)).join("/");
                    var filePathV = fp.split("/");
                    let versionNo = filePathV[4];


                    let exeResult = await executionObj.getExecutionResults(execution_id.toString());
                    let suite = _.pluck(exeResult, 'test_suite_name');
                    let uniq = _.uniq(suite);
                    await executionObj.updateExecution(execution_id.toString(), { "test_suite": uniq, "testBedDisplayName": testbed.displayName, "location": testbed.location, "wats_version": versionNo });

                    // mqtt publish for triggering execution
                    let topic = config.mqtt.publishTopic + execution.test_bed_name;
                    let message = {
                        executionId: execution_id,
                        version: versionNo,
                        testPlan: testPlanName,
                        framework: execution.framework,
                        outputFileName: req.body.output_file,
                        reRun: false,
                        macAddress: testbed.macId,
                        ftpFilePath: 'Testplans/' + execution.test_bed_name + "/" + path + execution.file_path,
                        testBedName: execution.test_bed_name,
                        config: configFile,
                        configPath: 'Configurations/' + execution.test_bed_name + '/' + versionNo,
                        log_server_username: credentials[0].username,
                        log_server_password: credentials[0].password
                    };
                    let msg = JSON.stringify(message);
                    console.log("MESSAGE", message);

                    responseObject.data.message = "Execution Started !!!";
                    responseObject.data.execution_id = execution_id;
                    auth.traceUserActivity(req, responseObject, "Create");
                    res.json(responseObject);
                    mqttClient.publish(topic, msg);

                }
            });
        }

    } catch (err) {
        logger.error("triggerExecution_2:", err);
        responseError(res, responseObject, "Error in triggering the execution");

    }
};

/*
    This function converts the file from one type to another type.
*/
async function convertFile(fileToRead, newFileName) {
    console.log("XLSX File => " + fileToRead);
    console.log("XLS File => " + newFileName);
    let newFileFormat = newFileName.substr(newFileName.lastIndexOf('.'), newFileName.length);
    const enterPath = path.join('/opt/nxp-cloudapptool/web-app', fileToRead);
    const outputPath = path.join('/opt/nxp-cloudapptool/web-app', newFileName);
    let libreConvert = util.promisify(libre.convert);
    try {
        // read file
        const file = fs.readFileSync(enterPath);
        // create new file with requested format
        let newFile = await libreConvert(file, newFileFormat, undefined);
        fs.writeFileSync(outputPath, newFile);
        exec(`chown -R nxp:nxp ${outputPath}`);
        exec(`rm ${enterPath}`)
    } catch (e) {
        console.log(e);
        console.log("Unable to convert");
    }
    return newFileName;
}

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function(req, file, cb) {
        let filePath;
        filePath = req.body.file_path.split("/");
        filePath[0] = req.body.wats_version;
        filePath.pop();
        filePath = filePath.join("/")
        filePath = config.public.path + config.public.testplan + req.body.test_bed_name + '/' + filePath;
        // console.log('filePath', filePath);
        cb(null, filePath)
    },
    filename: function(req, file, cb) {
        // console.log('file', file);
        cb(null, file.originalname);
    }
});

var upload = util.promisify(multer({ //multer settings
    storage: storage,
    fileFilter: function(req, file, callback) { //file filter
        // console.log('file', file, req.body);

        if (req.body.test_bed_name === undefined || req.body.test_bed_name == '') {
            return callback("Please select a testbed to upload the file", null);
        }

        if (!req.body.isConfig) {
            if (req.body.file_path == '' || req.body.file_path === undefined) {
                return callback('Please select the appropriate folder in the testbed to upload', null);
            }
        }

        if (['xls'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback('Wrong extension type', null);
        }

        callback(null, true);
    }
}).single('file'));

routes.prototype.triggerCLIExecution = async function(req, res) {
    totalTc = 0;
    let arr = [];
    var responseObject = {
        status: true,
        data: {},
        testBedStatus: false
    };

    try {
        await upload(req, res);
        // console.log("req-body--", req.body);
        let filePath = req.body.file_path.split("/");
        filePath[0] = req.body.wats_version;
        filePath.pop();
        filePath = filePath.join("/")
            // schema object to insert new execution record
        let execution = {
            name: req.body.name + "-" + Date.now(),
            actualName: req.body.name,
            framework: req.body.framework,
            status: "IN PROGRESS",
            error: false,
            errorType: null,
            traceMessage: null,
            output_file: req.body.output_file,
            test_bed_id: null,
            test_plan_name: req.body.test_plan_name,
            test_bed_name: req.body.test_bed_name,
            file_path: filePath,
            created_by: "automation_agent",
            updated_by: null,
            created_time: Date.now(),
            updated_time: null,
            isApproved: null,
            completed_time: null,
            reRun: false
        };

        // execution.output_file.push(req.body.output_file);
        let testbed = await testBedImplObj.getTestBedObjects({ "name": req.body.test_bed_name });
        let data = await executionObj.getExecutionsByTestBedId(testbed[0]._id.toString(), false /* pagination flag */ );
        data = data.executionResult;
        let status = data.filter(checkStatus);
        if (status.length) {
            status.forEach(element => {
                arr.push(element.name);
            });
            // console.log(`Execution ${arr} is in preogress`);
            responseObject.message = "Testbed is busy!!";
            res.json(responseObject);
        } else {
            if (testbed.length > 0) {

                // console.log("execution obj---", execution);
                let fp = "./public/Testplans/" + execution.test_bed_name + "/" + execution.file_path + "/" + execution.test_plan_name;

                var filePathV = fp.split("/");
                let versionNo = filePathV[4];
                execution['wats_version'] = versionNo;

                // inserts the above execution object into the test execution collection
                let newExecution = await executionObj.insertExecution(execution);
                let execution_id = newExecution.ops[0]._id;

                Async.waterfall([
                    function(cb) {
                        cb(null, execution_id, testbed[0], execution.test_plan_name, fp, totalTc);
                    },
                    parseRunSheet,
                    getSuiteList
                ], async function(err, result, totalTc, testbed) {
                    if (err) {
                        // console.log("execution-id", execution_id);
                        await executionObj.deleteExecution(execution_id);
                        logger.error("triggerExecution_1:", err);
                        responseError(res, responseObject, err);
                    } else {

                        // console.log("in trigger", totalTc);
                        let sumObj = {
                            execution_id: execution_id,
                            totalTc: totalTc
                        }
                        executionObj.insertSummary(sumObj);

                        let exeResult = await executionObj.getExecutionResults(execution_id.toString());
                        let suite = _.pluck(exeResult, 'test_suite_name');
                        let uniq = _.uniq(suite);
                        await executionObj.updateExecution(execution_id.toString(), { "test_suite": uniq, "testBedDisplayName": testbed.displayName, "location": testbed.location, "test_bed_id": testbed._id.toString() });

                        responseObject.message = "Execution Started !!!";
                        responseObject.execution_id = execution_id;
                        responseObject.testBedStatus = true;
                        res.json(responseObject);
                    }
                });
            } else {
                logger.error("triggerExecution_3:", err);
                responseError(res, responseObject, "Testbed is not registered!!");
            }
        }

    } catch (err) {
        logger.error("triggerExecution_2:", err);
        responseError(res, responseObject, "Error in triggering the execution");

    }
};


/**
 * Terminates the execution via GUI
 */
routes.prototype.stopExec = async function(req, res) {

    var responseObject = {
        status: true,
        data: {}
    };
    try {
        let topic = config.mqtt.publishTopic + req.body.test_bed_name;
        let executionID = req.body.executionId;
        let message = {
            termination: true,
            framework: "WATS"
        };
        let bands = await getBands(executionID);
        let execution = await executionObj.getExecution(executionID);
        let duration = await calculateDuration(execution[0].created_time, Date.now());
        await executionObj.updateExecution(executionID, { "status": "TERMINATED", "completed_time": Date.now(), "duration": duration, "bands": bands, "outputPath": execution[0].outputPath });
        let summary = await calculateSummary(req.body.executionId);
        await executionObj.updateExecutionSummary(req.body.executionId, { "Total": summary.Total, "Summary": summary.Summary }, { upsert: false });
        let msg = JSON.stringify(message);
        mqttClient.publish(topic, msg);
        responseObject.message = "Execution Stopped!"
        res.json(responseObject);
    } catch (err) {
        logger.error("stopExec : ", err);
        responseError(res, responseObject, "Unable to stop the execution");
    }
};

/**
 * Terminates the execution via CLI
 */
routes.prototype.stopCLIExec = async function(req, res) {

    var responseObject = {
        status: true,
        data: {}
    };
    try {
        let executionID = req.body.executionId;

        let execution = await executionObj.getExecution(executionID);
        let bands = await getBands(executionID);
        let duration = await calculateDuration(execution[0].created_time, Date.now());
        if (req.body.terminated == "TRUE" && execution[0].status != "COMPLETED" && execution[0].status != "TERMINATED") {
            await executionObj.updateExecution(executionID, { "status": "TERMINATED", "completed_time": Date.now(), "duration": duration, "bands": bands, "outputPath": execution[0].outputPath });
            let summary = await calculateSummary(req.body.executionId);
            await executionObj.updateExecutionSummary(req.body.executionId, { "Total": summary.Total, "Summary": summary.Summary }, { upsert: false });
            responseObject.message = "Execution Stopped!"
        } else if (req.body.terminated == "FALSE") {
            await executionObj.updateExecution(executionID, { "status": "COMPLETED", "completed_time": Date.now(), "duration": duration, "bands": bands, "outputPath": execution[0].outputPath });
            let summary = await calculateSummary(req.body.executionId);
            await executionObj.updateExecutionSummary(req.body.executionId, { "Total": summary.Total, "Summary": summary.Summary }, { upsert: false });
            responseObject.message = "Execution Completed!"
        }

        res.json(responseObject);
    } catch (err) {
        logger.error("stopExec : ", err);
        responseError(res, responseObject, "Unable to stop the execution");
    }
};

async function calculateDuration(startDate, endDate) {

    var difference = Math.abs(startDate - endDate) / 1000;
    var hourDifference = Number(difference / 3600);
    var minDiff = parseInt(Math.abs(difference / 60) % 60);
    var secDiff = parseInt(difference % 60);

    if (hourDifference == 0) {
        return (Number("0." + minDiff)).toFixed(2);
    } else if (hourDifference > 0) {
        return Number(hourDifference.toFixed(2));
    }

}

async function getBands(executionId) {
    return new Promise(async(resolve, reject) => {
        try {
            let arr1 = [];
            let throughput = await throughputObj.findThroughputData({ "execution_id": executionId });
            if (throughput.length > 0) {
                for (let item of throughput) {
                    for (let data of Object.keys(item)) {
                        if (data.includes('5GHz') || data.includes('2GHz')) {
                            arr1.push(data);
                        }
                    }
                }
                arr1 = _.uniq(arr1);
                console.log("array", arr1);
            }
            resolve(arr1);
        } catch (error) {
            console.log("error", error);
            reject(error);
        }
    });
}

async function calculateSummary(executionID) {

    let individualElement = [];
    let element;

    return new Promise(async(resolve, reject) => {
        try {


            let exeResult = await executionObj.getExecutionResults(executionID);

            let res = _.pluck(exeResult, 'test_suite_name');
            console.log("plucked res-", res);
            let uniq = _.uniq(res);
            console.log("uniq--", uniq);

            for (let data of uniq) {

                console.log("executionID", executionID);
                console.log(exeResult.filter(ele => ele.execution_id == executionID));
                console.log(exeResult.filter(ele => ele.test_suite_name == data));

                let totalTC = exeResult.filter(ele => ele.execution_id == executionID && ele.test_suite_name == data && ele.status != '');
                let passTC = exeResult.filter(ele => ele.status == "PASS" && ele.test_suite_name == data);
                let failTC = exeResult.filter(ele => ele.status == "FAIL" && ele.test_suite_name == data);
                let skipTC = exeResult.filter(ele => ele.status == "SKIP" && ele.test_suite_name == data);

                console.log("pass/fail/skip", passTC.length, failTC.length, skipTC.length);

                let percent = (passTC.length / totalTC.length) * 100;

                let obj = {
                    suitName: data,
                    Total: totalTC.length,
                    pass: passTC.length,
                    fail: failTC.length,
                    skip: skipTC.length,
                    percent: percent
                }
                individualElement.push(obj);
            }
            let sumTotal = _.pluck(individualElement, 'Total');
            sumTotal = lodash.sum(sumTotal);
            let sumPass = _.pluck(individualElement, 'pass');
            sumPass = lodash.sum(sumPass);
            let sumFail = _.pluck(individualElement, 'fail');
            sumFail = lodash.sum(sumFail);
            let sumSkip = _.pluck(individualElement, 'skip');
            sumSkip = lodash.sum(sumSkip);

            let percentage = (sumPass / sumTotal) * 100;

            percentage = percentage.toFixed(2);
            let sumNotRun = sumTotal - (sumPass + sumFail + sumSkip);
            console.log("percentage-", percentage);

            let totalElement = {
                sumTotal: sumTotal,
                sumPass: sumPass,
                sumFail: sumFail,
                sumSkip: sumSkip,
                sumNotRun: sumNotRun,
                totalPercentage: percentage
            }

            console.log("obj1", totalElement);

            console.log("individualElement--", individualElement);

            element = {
                Summary: individualElement,
                Total: totalElement
            }

            resolve(element);

        } catch (error) {
            console.log("error-", error);
            reject(error);
        }

    })

}

/** This method will re execute failed test cases */
routes.prototype.reTriggerFailed = async function(req, res) {
    var responseObject = {
        status: true,
        data: {}
    };
    let arr = [];
    console.log("req-body--", req.body);
    let parentExecutionId;
    try {
        // schema object to insert new execution record
        let execution = {
            name: req.body.name,
            test_bed_id: req.body.test_bed_id,
            test_plan_name: req.body.test_plan_name,
            execution_id: req.body.execution_id,
            // input_file: req.body.input_file,
            // output_file: req.body.output_file,
            test_bed_name: req.body.test_bed_name,
            created_by: req.body.created_by,
            updated_by: null,
            updated_time: Date.now(),
            isApproved: null,
            reRun: true,
            // completed_time: null
        };

        let executionRes = await executionObj.getExecution(execution.execution_id);

        // let index = executionRes[0].output_file.indexOf(req.body.input_file);
        // let outputFolder = executionRes[0].output_folder[index];
        // execution.output_file = executionRes[0].output_file;
        // if (executionRes[0].output_file.includes(req.body.output_file)) {
        //     throw "Output file name already present"
        // }
        // execution.output_file.push(req.body.output_file);

        if (executionRes[0].parentExecutionId) {
            parentExecutionId = executionRes[0].parentExecutionId;
        } else {
            parentExecutionId = executionRes[0]._id.toString();
        }
        let file_path = executionRes[0].file_path;

        let testbed = await testBedImplObj.getTestBedObjects({ "name": req.body.test_bed_name });
        let exeResult = await executionObj.getExecutionResults(execution.execution_id);
        let suite = _.pluck(exeResult, 'test_suite_name');
        let uniq = _.uniq(suite);

        let newExecutionObj = { // add all the params required for dashboard
            name: executionRes[0].actualName + "-" + Date.now(),
            actualName: executionRes[0].actualName,
            framework: executionRes[0].framework,
            status: req.body.status,
            error: false,
            errorType: null,
            traceMessage: null,
            output_file: req.body.output_file,
            test_bed_id: req.body.test_bed_id,
            test_plan_name: req.body.input_file,
            test_bed_name: req.body.test_bed_name,
            file_path: file_path,
            test_suite: uniq,
            testBedDisplayName: testbed[0].displayName,
            location: testbed[0].location,
            wats_version: executionRes[0].wats_version,
            created_by: req.body.created_by,
            updated_by: null,
            created_time: Date.now(),
            updated_time: null,
            isApproved: null,
            completed_time: null,
            reRun: true,
            // output_folder: [],
            parentExecutionId: parentExecutionId
        };

        let exe = await executionObj.insertExecution(newExecutionObj);

        let failedTc = _.filter(exeResult, function(obj) {
            if (obj.status == "FAIL") {
                obj["execution_id"] = exe.ops[0]._id;
                return obj;
            }
        });
        failedTc = _.each(failedTc, (tc) => {
            tc.status = "PLANNED";
            arr.push(_.omit(tc, '_id'));
        });
        executionObj.insertTestExeResult(arr);
        let summary = await executionObj.getExecutionSummary(execution.execution_id);
        let sumObj = {
            execution_id: exe.ops[0]._id,
            totalTc: summary[0].Total.sumFail
        }
        executionObj.insertSummary(sumObj);


        let topic = config.mqtt.publishTopic + execution.test_bed_name;
        let message = {
            executionId: exe.ops[0]._id.toString(),
            inputFileName: executionRes[0].outputPath,
            // outputFolder: outputFolder,
            framework: newExecutionObj.framework,
            outputFileName: req.body.output_file,
            reRun: true,
            version: executionRes[0].wats_version
        };
        let msg = JSON.stringify(message);
        console.log("MESSAGE", message);

        let newExecution = await executionObj.updateExecution(execution.execution_id, execution);
        responseObject.data.message = "Execution Started !!!";
        responseObject.data.execution_id = exe.ops[0]._id.toString();
        // auth.traceUserActivity(req, responseObject, "Create");
        res.json(responseObject);
        mqttClient.publish(topic, msg);

    } catch (err) {
        logger.error("reTriggerFailed:", err);
        responseError(res, responseObject, err);

    }

};

/*
    This method lists all the executions in the selected testbed and returns the object.
*/
routes.prototype.listExecutions = async function(req, res) {

    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(req.query.size);
    var query = {};

    query.skip = ((size * pageNo) - size);
    query.limit = size;

    let executionSummary;
    let array = [];
    try {
        var responseObject = {
            status: true,
            data: {}
        };

        // querying the db to fetch all executions with on the selected testbed
        let executions = await executionObj.getAllExecutions({ "test_bed_id": req.query.testbed_id }, true /* pagination flag */ , query);
        for (let element of executions.data) {
            console.log(element._id);
            executionSummary = await executionObj.getExecutionSummary(element._id);
            console.log(executionSummary);
            //element["total"] = executionSummary[0].Total;
            array.push(element)
        }

        console.log("array", array);

        if (!executions.data.length) {
            throw "No executions are triggered for this TestBed."
        }

        responseObject.data = array;
        responseObject.elements = executions.elements;
        res.json(responseObject);
    } catch (err) {
        logger.error("listExecutions:", err);
        responseError(res, responseObject, err);
    }
}

/*
    This method filters and list the executions
*/
routes.prototype.filterExecution = async function(req, res) {

    var responseObject = {
        status: true,
        data: {}
    };

    let allExecutions;
    var obj;
    var array = [];
    let start;
    let end;
    let minimum;
    let maximum;
    let pageNo;
    let size;

    console.log("req.body", req.body);

    try {

        if (req.body.start_date.length > 0) {
            if (req.body.start_date.length == 1) {
                start = new moment(req.body.start_date[0], "YYYY-MM-DD").valueOf(); // Integer
                end = new moment(req.body.start_date[0], "YYYY-MM-DD").add(1, 'days').valueOf(); // Integer
            } else {
                start = new moment(req.body.start_date[0], "YYYY-MM-DD").valueOf(); // Integer
                end = new moment(req.body.start_date[1], "YYYY-MM-DD").add(1, 'days').valueOf(); // Integer
            }
        }

        if (req.body.duration.length > 0) {
            if (req.body.duration.length == 1) {
                minimum = req.body.duration[0];
                maximum = Number(req.body.duration[0]) + 5;
            } else {
                minimum = req.body.duration[0];
                maximum = req.body.duration[1];
                responseObject.min = minimum;
                responseObject.max = maximum;
            }
        }

        let executionQuery = {};
        if (req.body.start_date && req.body.start_date.length > 0) {
            executionQuery["created_time"] = { "$gte": start, "$lte": end }
        }
        if (req.body.duration && req.body.duration.length > 0) {
            executionQuery["duration"] = { "$gte": minimum, "$lte": maximum }
        }
        if (req.body.status && req.body.status.length > 0) {
            executionQuery["status"] = { $in: req.body.status }
        }
        if (req.body.execution_name && req.body.execution_name.length > 0) {
            executionQuery["name"] = { $in: req.body.execution_name }
        }
        if (req.body.testbed_name && req.body.testbed_name.length > 0) {
            executionQuery["testBedDisplayName"] = { $in: req.body.testbed_name };
        }
        if (req.body.location && req.body.location.length > 0) {
            executionQuery["location"] = { $in: req.body.location };
        }
        if (req.body.suite && req.body.suite.length > 0) {
            executionQuery["test_suite"] = { $in: req.body.suite };
        }

        if (req.body.soc.length > 0) {
            executionQuery["soc"] = { $in: req.body.soc }
        }
        if (req.body.interface.length > 0) {
            executionQuery["Interface"] = { $in: req.body.interface }
        }
        if (req.body.platform.length > 0) {
            executionQuery["Platform"] = { $in: req.body.platform }
        }
        if (req.body.os.length > 0) {
            executionQuery["os"] = { $in: req.body.os }
        }
        if (req.body.release.length > 0) {
            executionQuery["release"] = { $in: req.body.release }
        }

        let query = {};


        pageNo = parseInt(req.body.pageNo);
        size = parseInt(req.body.size);
        query.skip = ((size * pageNo) - size);
        query.limit = size;
        allExecutions = await executionObj.getAllExecutions(executionQuery, true, query);
        executions = allExecutions.data;

        for (let data of executions) {
            obj = {
                displayName: data.testBedDisplayName,
                execution_name: data.name,
                execution_id: data._id.toString(),
                status: data.status,
                soc: data.soc,
                interface: data.Interface,
                platform: data.Platform,
                os: data.os,
                release: data.release,
                suits: data.test_suite,
                execution: data,
                duration: data.duration
            };
            array.push(obj);
        }
        if (!req.body.duration.length > 0) {
            let durationArr = _.uniq(_.pluck(array, "duration"));
            let min = _.min(durationArr);
            let max = _.max(durationArr);
            responseObject.min = min;
            responseObject.max = max;
        }
        responseObject.data = array;
        responseObject.elements = allExecutions.elements;
        res.json(responseObject);

    } catch (error) {
        console.log("error", error);
        responseError(res, responseObject, "Error in filtering");
    }

}

/*
    This method deletes the executions
*/
routes.prototype.deleteExecutions = async function(req, res) {
    let executionId = req.body.executionId;
    var responseObject = {
        status: true,
        data: {}
    };

    try {
        let result = await executionObj.deleteExecution(executionId);
        responseObject.message = "Deleted Successfuly";
        auth.traceUserActivity(req, responseObject, "Delete");
        res.json(responseObject);

    } catch (err) {
        logger.error("deleteExecution : ", err);
        responseError(res, responseObject, "Unable to delete the executions");
    }
}

/*
    This method gets the execution details for the given execution id
*/
routes.prototype.getExecutionUpdates = async function(req, res) {

    let execution_id = req.query.execution_id;

    try {
        var responseObject = {
            status: true,
            data: {}
        };
        let summary;
        let childExecutions = [];

        let executionRes = await executionObj.getExecution(execution_id);
        let exeResult = await executionObj.getExecutionResults(execution_id);

        // if (executionRes[0].parentExecutionId) {
        let child = await executionObj.getAllExecutions({ "parentExecutionId": execution_id }, false, null);
        // console.log("child", child);
        if (child.length > 0) {
            for (let exec of child) {
                summary = await executionObj.getExecutionSummary(exec._id.toString());
                if (summary.length > 0) {
                    if (exec.status == "COMPLETED" || exec.status == "TERMINATED") {
                        exec['totalTc'] = summary[0].Total.sumTotal;
                        exec['totalPass'] = summary[0].Total.sumPass;
                        exec['totalFail'] = summary[0].Total.sumFail;
                        exec['totalSkip'] = summary[0].Total.sumSkip;
                        exec['totalNotRun'] = summary[0].Total.sumNotRun;
                    }
                    if (exec.status == "IN PROGRESS") {
                        exec['totalTc'] = summary[0].totalTc;
                    }
                }
                console.log("exec", exec);
                childExecutions.push(exec);
            }
            responseObject.data.childExecutions = childExecutions;
        }
        // }

        responseObject.data.execution = executionRes;
        responseObject.data.executionResult = exeResult;
        res.json(responseObject);
    } catch (err) {
        logger.error("getExecutionUpdates:", err);
        responseError(res, responseObject, "Error in getting the executionsUpdates");
    }

}

/*
    This method approves the specified completed execution
*/
routes.prototype.approveExecution = async function(req, res) {
    try {
        let responseObject = {
            status: true,
            data: {}
        };

        await executionObj.updateExecution(req.body.executionId, { "isApproved": req.body.approved });
        responseObject.message = "Approved Successfully";
        res.json(responseObject);
    } catch (err) {
        logger.error("approveExecution:", err);
        responseError(res, responseObject, "Error in approving the Execution.");
    }

}

/** This method provides the execution details for comparing executions */

routes.prototype.compareExecutionResults = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {

        let executions = [];
        let results = req.body.execution_id;

        if (results.length > 5) {
            throw "ERR100";
        }

        for (let item of results) {
            let execution = await executionObj.getExecutionResults(item);
            execution = _.filter(execution, function(val) {
                    return val['status'] != '';
                })
                //console.log("filtered execution-", execution);
            executions.push(execution);
        }
        //console.log("executions--", _.flatten(executions));
        executions = _.flatten(executions);
        var uniqTestCases = _.pluck(_.uniq(_.union(executions), false, _.property('test_no')), 'test_no');
        var testCompareObjects = [];

        _.each(uniqTestCases, function(element, index) {
            var testCompareObject = {};

            let commonElements = _.filter(executions, function(p) { return p['test_no'] == element; })
                //console.log("common---",commonElements);
            testCompareObject['test_no'] = commonElements[0]['test_no'];
            testCompareObject['test_case'] = commonElements[0]['test_case'];

            for (let item of commonElements) {
                testCompareObject[item.execution_id] = {
                    'status': item['status'],
                    'comments': item['comments']
                };
            }

            //console.log("testCompareObject--", testCompareObject);

            testCompareObjects.push(testCompareObject);
        });

        responseObject.data = testCompareObjects;
        res.json(responseObject);
    } catch (err) {
        logger.error("compareExecutionResults:", err);
        if (err == "ERR100") {
            responseObject.status = false;
            responseObject.message = "You can compare upto 5 executions at a time!";
            // responseError(res, responseObject, "You can compare upto 10 executions at a time!");
        } else {
            responseObject.status = false;
            responseObject.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "Error in getting the Execution details.");
        }
        res.json(responseObject);
    }

}


/*
    This method gets the output folder name for present execution from Testbed 
    and updates the test_execution collection
*/
// routes.prototype.updateExecFolder = async function(req, res) {
//     try {
//         let responseObject = {
//             status: true,
//             data: "Successfully updated folder name."
//         };

//         let query = { _id: ObjectID(req.body.execution_id) };
//         let update = { "output_folder": req.body.output_folder };

//         let result = await executionObj.updateOutputFolder(query, update);
//         res.json(responseObject);
//     } catch (err) {
//         logger.error("updateExecFolder:", err);
//         responseError(res, responseObject, "Error in updating the Execution.");
//     }

// }

/*
    This method gets the executions for  Testbed for testbed hierarchy
*/

routes.prototype.executions = async function(req, res) {
    let responseObject = {
        status: true,
        data: []
    };

    let dataArr = [];
    let object;

    let type = req.query.type;

    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(req.query.size);
    var query = {};
    query.skip = ((size * pageNo) - size);
    query.limit = size
    try {
        let executions = await executionObj.getAllExecutions({}, true, query);
        for (let data of executions.data) {

            object = {
                execution_name: data.name,
                execution_id: data._id.toString(),
                location: data.location,
                status: data.status,
                start_date: data.created_time,
                end_date: data.completed_time,
                duration: data.duration,
                soc: data.soc,
                interface: data.Interface,
                platform: data.Platform,
                os: data.os,
                release: data.release,
                testBedId: data.test_bed_id,
                displayName: data.testBedDisplayName,
                suits: data.test_suite,
                execution: data
            }
            dataArr.push(object);
        }
        let durationArr = _.uniq(_.pluck(dataArr, "duration"));
        let min = _.min(durationArr);
        let max = _.max(durationArr);
        responseObject.data = dataArr;
        responseObject.min = min;
        responseObject.max = max;
        responseObject.elements = executions.elements;
        res.json(responseObject);
    } catch (err) {
        logger.error("executions:", err);
        responseError(res, responseObject, "Error in getting the Execution.");
    }
}

/**
 * 
    This method gets the summary of a completed execution
 */
routes.prototype.getSummary = async function(req, res) {
    let responseObject = {
        status: true,
        data: ''
    };
    let executionID = req.query.execution_id;
    try {
        let executionSummary = await executionObj.getExecutionSummary(executionID);
        responseObject.data = executionSummary;
        res.json(responseObject);
    } catch (err) {
        logger.error("getSummary:", err);
        responseError(res, responseObject, "Error in getting the summary");
    }
}

/** The below function gives the drop downs for filtering */
routes.prototype.getDropDowns = async function(req, res) {
    let responseObject = {
        status: true,
        data: ''
    };
    let soc;
    let interface;
    let platform;
    let os;
    let release;
    let throughput;
    let suite;
    let socArray = [];
    let interfaceArr = [];
    let platformArr = [];
    let osArr = [];
    let releaseArr = [];
    let suiteArr = [];
    let nameArr = [];


    try {
        let testbeds = await testBedImplObj.getTestBed('ALL');
        let executions = await executionObj.getAllExecutions({}, false /**pagination flag */ , null /** query for pagination */ );
        let location = _.pluck(testbeds, "location");
        let statusExec = _.pluck(executions, "status");
        statusExec = _.uniq(statusExec);
        for (let ele of executions) {
            nameArr.push(ele.name);
            throughput = await throughputObj.findThroughputData({ "execution_id": ele._id.toString() })
                // console.log(throughput);
            if (throughput.length > 0) {
                interfaceArr.push(throughput[0]['Interface']);
                socArray.push(throughput[0]['DUT']);
                platformArr.push(throughput[0]['DUT Host Platform']);
                osArr.push(throughput[0]['DUT OS']);
                releaseArr.push(throughput[0]['DUT Fw/Drv']);
            }
            suite = await executionObj.getExecutionResults(ele._id);
            suite = _.uniq(_.pluck(suite, 'test_suite_name'));
            for (let data of suite) {
                suiteArr.push(data);
            }

        }
        soc = _.without(_.uniq(socArray), null, '', undefined);
        interface = _.without(_.uniq(interfaceArr), null, '', undefined);
        platform = _.without(_.uniq(platformArr), null, '', undefined);
        os = _.without(_.uniq(osArr), null, '', undefined);
        release = _.without(_.uniq(releaseArr), null, '', undefined);
        suite = _.without(_.uniq(suiteArr), null, '', undefined);
        location = _.without(_.uniq(location), null, '', undefined);

        var data = {
            testbeds: testbeds,
            executions: nameArr,
            status: statusExec,
            soc: soc,
            location: location,
            interface: interface,
            platform: platform,
            os: os,
            release: release,
            suite: suite
        }

        responseObject.data = data;
        res.json(responseObject);

    } catch (error) {
        logger.error("getDropDowns:", error);
        responseError(res, responseObject, "Error in getting the drop down items");
    }
}

/** 
 * This method gets the bands for a given test suite
 */
routes.prototype.getBands = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let array = req.body.executionsArray;
    var arr = [];
    var arr1 = [];
    var bandsMatch = [];
    let suiteMatch = [];

    let bands = ["HE-160MHz | 5GHz", "HE-80MHz | 5GHz", "HE-40MHz | 5GHz", "HE-20MHz | 5GHz", "HE-40MHz | 2GHz", "HE-20MHz | 2GHz", "VHT-160MHz | 5GHz", "VHT-80MHz | 5GHz", "VHT-40MHz | 5GHz", "VHT-20MHz | 5GHz", "VHT-40MHz | 2GHz", "VHT-20MHz | 2GHz", "HT-40MHz | 5GHz", "HT-20MHz | 5GHz", "HT-40MHz | 2GHz", "HT-20MHz | 2GHz", "Non-HT-BG | 2GHz", "Non-HT-A | 5GHz", "Non-HT-B-Only | 2GHz"];
    try {
        for (let data of array) {
            let query = { "execution_id": data.execution._id.toString() };
            let throughput = await throughputObj.findThroughputData(query);
            if (data.suits && data.suits.length > 0) { // Added if(data.suits && -- Solved for WSQAAUTO-1376
                if (throughput.length > 0) {
                    arr1 = [];
                    for (let item of throughput) {
                        bandsMatch = [];
                        suiteMatch = [];
                        for (let suite of data.suits) {
                            if (item['TP TYPE'] == suite || item['test_suite'] == suite) {
                                // arr1 = [];
                                arr = [];
                                for (let data of Object.keys(item)) {
                                    if (data.includes('5GHz') || data.includes('2GHz')) {
                                        arr1.push(data);
                                        bandsMatch.push(data);
                                    }
                                }
                                arr1 = _.uniq(arr1);
                                if (arr1.length > 0) {
                                    for (let band of bands) {
                                        let obj = {};
                                        if (arr1.includes(band)) {
                                            obj[band] = 'Y';
                                            arr.push(obj);
                                        } else {
                                            obj[band] = 'N';
                                            arr.push(obj);
                                        }
                                    }
                                }
                                data[suite] = arr;
                            } else {
                                console.log("TP TYPE does not match", bandsMatch);
                                suiteMatch.push(suite);
                            }
                        }

                        suiteMatch = _.uniq(suiteMatch);
                        if (suiteMatch.length > 0) {
                            for (let suite of suiteMatch) {
                                arr = [];
                                for (let band of bands) {
                                    let obj = {};
                                    obj[band] = '-';
                                    arr.push(obj);
                                }
                                data[suite] = arr;
                            }
                        }
                        if (bandsMatch.length == 0) {
                            arr = [];
                            for (let band of bands) {
                                let obj = {};
                                obj[band] = '-';
                                arr.push(obj);
                            }
                            for (let suite of data.suits) {
                                data[suite] = arr;
                            }
                        }
                    }
                } else {
                    arr = [];
                    console.log("No throughput");
                    for (let band of bands) {
                        let obj = {};
                        obj[band] = '-';
                        arr.push(obj);
                    }
                    for (let suite of data.suits) {
                        data[suite] = arr;
                    }
                }
            } else {
                arr = [];
                console.log("No test suite in execution");
                for (let band of bands) {
                    let obj = {};
                    obj[band] = '-';
                    arr.push(obj);
                }
                // for (let suite of data.suits) {      // Solved for WSQAAUTO-1376
                //     data[suite] = arr;
                // }
            }
        }
        responseObject.data = array;
        res.json(responseObject);

    } catch (error) {
        responseError(res, responseObject, "Error in getting bands")
    }
}

routes.prototype.updateWorkbook = async function(req, res) {
    console.log('converting the workbook format from xlsx to xls');
    let sourceFile;
    let destFile;

    var responseObject = {
        status: true,
        data: {}
    };

    if (req.body.isConfig) {
        sourceFile = config.public.path + config.public.configuration + req.body.testBed + '/' + req.body.folderName + "/" + req.body.testplan + "x";
        destFile = config.public.path + config.public.configuration + req.body.testBed + '/' + req.body.folderName + "/" + req.body.testplan;
    } else {
        sourceFile = config.public.path + config.public.testplan + req.body.testBed + '/' + req.body.folderName + "/" + req.body.testplan + "x";
        destFile = config.public.path + config.public.testplan + req.body.testBed + '/' + req.body.folderName + "/" + req.body.testplan;
    }

    await convertFile(sourceFile, destFile);

    res.json(responseObject);
}

routes.prototype.getPassFailResults = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let data = {};
    let name;
    let result;
    console.log("req", req.body.passFailStatus);
    let msg = req.body.passFailStatus.split("#@|");
    data['testSuite'] = msg[0]
    data['TestCaseID'] = msg[1]
    data['testCase'] = msg[2]
    data['result'] = msg[3]
    data['executionID'] = msg[4]
    data['comment'] = msg[5]
    data['throughput'] = msg[6]
    data['start_time'] = msg[7]
    data['execution_time'] = msg[8]
    data['logpath'] = msg[9]
    data['outputPath'] = msg[10]


    console.log("data", data);

    try {
        if (data['executionID'] == '') {
            console.log("No Execution ID Dropping of message");
        } else {
            name = await executionObj.getExecution(data['executionID']);
            console.log("name", name);
            name = name[0].test_bed_name;
            result = data['result'].toUpperCase();
            let splitMsg = data['logpath'].split("/");
            log = data['logpath'].split("/").slice(4, splitMsg.length).join("/");
            let logPath = "http://92.120.51.53/" + log + "/" + data['testSuite'] + "-" + data['TestCaseID'] + "/" + data['testSuite'] + "-" + data['TestCaseID'] + "_MAIN_CONSOLE.html"; //Changes as per STA-TP
            logPath = logPath.split("/")
            logPath.splice(4, 0, name);
            logPath = logPath.join("/");



            let res = await executionObj.updatePassFailResults(data, name);
            if (res == 1) {
                let percent = await calculatePercentage(data['executionID']);
                percent = percent.toFixed(0);
                let message = data['testSuite'] + "#@|" + data['TestCaseID'] + "#@|" + data['testCase'] + "#@|" + data['result'] +
                    "#@|" + data['executionID'] + "#@|" + data['comment'] + "#@|" + data['throughput'] + "#@|" + data['start_time'] + "#@|" + data['execution_time'] + "#@|" + percent + "#@|" + logPath;
                socketObj.emit('testExecutionResult', message);

                if (percent == 100) {
                    let bands = await getBands(data['executionID']);
                    let execution = await executionObj.getExecution(data['executionID']);
                    let duration = await calculateDuration(execution[0].created_time, Date.now());
                    await executionObj.updateExecution(data['executionID'], { "status": "COMPLETED", "completed_time": Date.now(), "duration": duration, "bands": bands, "outputPath": data['outputPath'] });
                    let updatedSummary = await calculateSummary(data['executionID']);
                    executionObj.updateExecutionSummary(data['executionID'], { "Total": updatedSummary.Total, "Summary": updatedSummary.Summary }, { upsert: false });
                    socketObj.emit('testExecutionResult', "Execution Complete!!#");
                    // TestBed Utilization
                    let result = await testBedUtil.executeTestBedUtil(data['executionID'], data['TestCaseID']);
                    // console.log('testBedUtil --', result)

                }
                let summary = await calculateSummary(data['executionID']);
                if (summary) {
                    socketObj.emit('testExecutionSummary', summary);
                }
            }
        }
        res.sendStatus(200);
        //res.json(responseObject);
    } catch (error) {
        responseObject.message = "Update failure";
        res.json(responseObject);
        console.log("ërror in catch", error);
    } finally {
        await qTestFunc(data['executionID'], data['TestCaseID']); // qTest Integration 
    }
}

async function calculatePercentage(executionID) {

    return new Promise(async(resolve, reject) => {
        try {

            let executionRes = await executionObj.getExecutionSummary(executionID);
            let exeResult = await executionObj.getExecutionResults(executionID);


            let totalTc = executionRes[0].totalTc;

            let totalPassTC = exeResult.filter(ele => ele.status == "PASS");
            let totalFailTC = exeResult.filter(ele => ele.status == "FAIL");
            let totalSkipTC = exeResult.filter(ele => ele.status == "SKIP");

            let totalSum = totalPassTC.length + totalFailTC.length + totalSkipTC.length;
            console.log("sum--", totalSum);
            let totalPercentage = (totalSum / Number(totalTc)) * 100;

            console.log("percent-- ", totalPercentage);

            resolve(totalPercentage);

        } catch (error) {
            console.log("error-", error);
            reject(error);
        }

    })

}

async function qTestFunc(execution_id, TestCaseID) {

    return new Promise(async(resolve, reject) => {
        try {
            /* Testing Tool qTest Integration  */
            if (config.qtest.permission) {
                let getExecutionDetails = await executionObj.getExecution(execution_id);
                console.log("\n\n Execution Details --- ", getExecutionDetails);

                if (getExecutionDetails[0].reRun == false) {
                    let executionSummary = await executionObj.getExecutionSummary(execution_id);
                    console.log("\n\nExecution Summary --- ", executionSummary);

                    //if ((executionSummary[0].UUT_Name != '' && typeof executionSummary[0].UUT_Name != 'undefined') && (executionSummary[0].UUT_Build != '' && typeof executionSummary[0].UUT_Build != 'undefined')) {
                    if ((executionSummary[0].UUT_Name != '' && typeof executionSummary[0].UUT_Name != 'undefined')) {
                        // Create Test Case in Qtest
                        let qtestCreateTestCasesRes = await testingTool.createTestCases(execution_id);
                        console.log("\n--- Qtest CreateTestCasesRes ---\n", qtestCreateTestCasesRes);

                        // Create Test Execution in Qtest
                        let qtestCreateTestRun = await testingTool.createTestRun(execution_id);
                        console.log("\n--- Qtest CreateTestRun ---\n", qtestCreateTestRun);

                        // Updating the Test Execution PASS/FAIL Status
                        let qtestUpdateStatus = await testingTool.updateTestExecutionStatus(execution_id);
                        console.log("\n--- Qtest CreateTestRun ---\n", qtestUpdateStatus);

                    } else {
                        console.log("\n--- Execution Summary is not updated with Name and Build ---\n");
                    }
                }

                /* Update PASS/FAIL Status in qTest using ExecID and TcId  */
                let getExecutionDetailsRes = await executionObj.getExecution(execution_id);
                console.log("\n\n Execution Details --- ", getExecutionDetailsRes);
                console.log("TestCaseID -- ", TestCaseID);

                if (getExecutionDetailsRes[0].reRun == true) {
                    // Call the Qtest Update Function  - Parameter-- ExecID: "60379ec9ee57904d84de7384", TCid: "30.2.2.2"
                    let qtestUpdateStatus = await testingTool.updateTestExecutionStatus(execution_id, TestCaseID);
                    console.log("\n--- Qtest CreateTestRun ---\n", qtestUpdateStatus);
                }

            } else {
                console.log("\n--- Qtest Service Not Enabled ---\n");
            }
        } catch (error) {
            console.log("error-", error);
            reject(error);
        }

    })

}

/* Function for smart merge of pass/fail results of executions */
routes.prototype.mergeResults = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let value;

    try {

        let executions = [];
        let results = req.body.execution_id;

        if (results.length > 5) {
            throw "ERR100";
        }

        for (let item of results) {
            let execution = await executionObj.getExecutionResults(item);
            execution = _.filter(execution, function(val) {
                    return val['status'] != '';
                })
                //console.log("filtered execution-", execution);
            executions.push(execution);
        }
        //console.log("executions--", _.flatten(executions));
        executions = _.flatten(executions);
        var uniqTestCases = _.pluck(_.uniq(_.union(executions), false, _.property('test_no')), 'test_no');
        var testCompareObjects = [];

        _.each(uniqTestCases, function(element, index) {
            var testCompareObject = {};

            let commonElements = _.filter(executions, function(p) { return p['test_no'] == element; })
            console.log("common---", commonElements);
            testCompareObject['test_no'] = commonElements[0]['test_no'];
            testCompareObject['test_case'] = commonElements[0]['test_case'];

            for (let item of commonElements) {
                if (item['status'] != "PASS") {
                    value = false;
                } else {
                    value = true;
                }
                testCompareObject[item.execution_id] = {
                    'status': item['status'],
                    'comments': item['comments'],
                    'value': value
                };
            }

            console.log("testCompareObject--", testCompareObject);

            testCompareObjects.push(testCompareObject);
        });

        responseObject.data = testCompareObjects;
        res.json(responseObject);
    } catch (err) {
        logger.error("compareExecutionResults:", err);
        if (err == "ERR100") {
            responseObject.status = false;
            responseObject.message = "You can compare upto 5 executions at a time!";
            // responseError(res, responseObject, "You can compare upto 10 executions at a time!");
        } else {
            responseObject.status = false;
            responseObject.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "Error in getting the Execution details.");
        }
        res.json(responseObject);
    }
}

routes.prototype.insertMergedResultsReport = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        message: ''
    };

    try {
        let execution_names = req.body.execution_names;
        let executions = [];

        if (execution_names.length > 0) {
            for (let exec of execution_names) {
                let queryOnj = { "name": exec }
                let executionDetails = await executionObj.getExecutionObj(queryOnj);
                executions.push(executionDetails[0]);
            }


            let report = {
                filename: req.body.fileinfo[0].filename,
                created_by: req.body.fileinfo[0].email,
                created_time: Date.now(),
                executions: executions,
            }

            /* get last inserted id of the report table*/
            let insertReport = await executionObj.insertResultsReport(report);

            let bodyDataArr = [];
            let obj;
            for (let data of req.body.data) {
                obj = {};
                obj["test_no"] = data.test_no;
                obj["test_case"] = data.test_case;
                obj["status"] = data.result.status;
                obj["comments"] = data.result.comments;
                bodyDataArr.push(obj);
            }

            let query = {};
            query["report_id"] = insertReport.insertedId;
            query["reportName"] = req.body.fileinfo[0].filename;
            query["data"] = bodyDataArr;
            let insertReportData = await executionObj.insertResultReportData(query);
            responseObject.message = 'Created Report Successfully';
        } else {
            responseObject.message = 'Please Pass Execution ID and Name';
            responseObject.status = false;
            responseObject.responseCode = 400;
        }

    } catch (err) {
        logger.error("insert SmartMergeThroughpu Report Data:", err);
        if (err.code == '11000') {
            responseError(res, responseObject, "This Report Name already exists!");
        } else {
            responseError(res, responseObject, "Error in inserting Smartmerge  Report Data.");
        }
    }
    res.json(responseObject);
}

routes.prototype.getReportList = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        message: ''
    };

    try {

        let reports = await executionObj.getReports({});
        console.log("reports", reports);

        responseObject.data = reports;
        res.json(responseObject);

    } catch (error) {
        logger.error("error:", error)
        responseError(res, responseObject, "Unable to get reports");
    }
}

routes.prototype.detailReportList = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        message: ''
    };

    let reportId = req.body.report_id;
    try {
        let query = { "report_id": ObjectID(reportId) };
        let reports = await executionObj.detailReportList(query);
        console.log("reports", reports);

        responseObject.data = reports;
        res.json(responseObject);

    } catch (error) {
        logger.error("error:", error)
        responseError(res, responseObject, "Unable to get detailed reports");
    }
}