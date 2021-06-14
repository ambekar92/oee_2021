var multer = require('multer');
var util = require('util');
const fs = require('fs');
var excel = require('xlsx');


var responseError = require('routes/errorHandler.js');
const config = require('config/config');
const logger = require('config/logger');
var uploadAnalyzeImpl = require('services/db/uploadAnalyzeImpl.js');
var uploadAnalyzeObj = new uploadAnalyzeImpl();
var testExecutionImpl = require('services/db/testExecutionImpl.js');
var executionObj = new testExecutionImpl();
var throughputImpl = require('services/db/throughputImpl.js');
var throughputObj = new throughputImpl();
var testBedImpl = require('services/db/testBedImpl.js');
var testBedImplObj = new testBedImpl();
var testBedImpl = require('services/db/testBedImpl.js');
var testBedImplObj = new testBedImpl();
const lodash = require("lodash");


var path = require('path');
var testBedUtilImpl = require(path.resolve(__dirname, "./testBedUtil.js"));
var testBedUtil = new testBedUtilImpl();
var testingToolImpl = require(path.resolve(__dirname, "./testingTool.js"));
var testingTool = new testingToolImpl();



var auth = require('config/auth');
const _ = require('underscore');
const { ObjectID } = require('mongodb');
var dateFormat = require("dateformat");
const { template, random } = require('underscore');

var routes = function() {};

module.exports = routes;

/******* Upload and Analyze test execution Results Controller ******/

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function(req, file, cb) {

        let filePath = config.public.path + 'TestExeUpload/';

        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, 0744);
        }

        console.log('filePath', filePath);
        cb(null, filePath)
    },
    filename: function(req, file, cb) {
        //console.log('file', file);
        let filename = Date.now() + '_' + file.originalname;
        cb(null, filename);
    }
});

var upload = util.promisify(multer({ //multer settings
    storage: storage,
    fileFilter: function(req, file, callback) { //file filter

        // if (['xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
        //     return callback('Wrong extension type', null);
        // }

        callback(null, true);
    }
}).single('file'));

/*
    This function takes the workbook name as parameter.
    Returns the sheet names.
*/
var getSheetNames = async function(filename) {
    try {
        // reading and parsing the file
        let workbook = excel.readFile(filename);

        return workbook.SheetNames;
    } catch (err) {
        logger.error("getSheetNames : ", err);
    }
}

/*
    This function takes the workbook and sheet number as parameters.
    Converts the sheet to json format and returns the array of objects.
*/
var getSheetdata = async function(filename, sheetName) {

    console.log('File :', filename);
    try {
        // reading and parsing the file
        let workbook = excel.readFile(filename);
        console.log('workbook :', workbook.SheetNames);
        let sheets = workbook.SheetNames; // get the sheet names  //blankrows: true 
        let sheet_num = sheets.indexOf(sheetName);
        let data;

        data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '' });

        return data;
    } catch (err) {
        logger.error("getSheetdata : ", err);
    }
}

/* Generator manual testbed utilization data */
routes.prototype.testBedUtil = async function(req, res) {

    let responseObject = {
        status: true
    };

    try {
        let execution_id = req.body.execution_id;
        let testbedMac_id = req.body.testbedMac_id;
        let timestamp = req.body.timestamp;

        let result = await testBedUtil.agentExecuteTestBedUtil(execution_id, timestamp);
        responseObject.data = result;

        res.json(responseObject);

    } catch (err) {
        logger.error("Error testBed Util:", err);
        responseError(res, responseObject, "Error in testBedUtil");
    }
}

/* This method receives the Template List data for template_header collection */
routes.prototype.getTemplateList = async function(req, res) {
    let headers = '';
    let headerValue = {};
    let valuesTest = [];

    try {
        let responseObject = {
            status: true
        };
        console.log("getTemplateList --");
        headers = await throughputObj.findHeader('ALL');

        if (headers.length > 0) {
            valuesTest.push(config.qtest.uploadTemplate);
            for (val in headers) {
                headerValue = { 'id': headers[val]['_id'], 'template': headers[val]['template'] };
                valuesTest.push(headerValue);
            }
            console.log('headers --', valuesTest);
            responseObject.message = "Successfull";
            responseObject.size = headers.length;
            responseObject.templates = valuesTest;
        } else {
            responseObject.status = false;
            responseObject.message = "No Headers Found";
        }
        res.json(responseObject);
    } catch (err) {
        logger.error("Upload and Analyze:", err);
        responseError(res, responseObject, "Error in the Upload and Analyze Data.");
    }
}

/* This method receives the Testbed List data for test_bed collection */
routes.prototype.getTestbedList = async function(req, res) {

    let testBedValue = {};
    let valuesTest = [];
    let testBed;

    try {
        let responseObject = {
            status: true
        };
        console.log("getTestbedList --");

        testBed = await testBedImplObj.getTestBed('ALL');

        if (testBed.length > 0) {
            for (val in testBed) {
                testBedValue = { 'id': testBed[val]['_id'], 'name': testBed[val]['displayName'], 'macID': testBed[val]['name'] };
                valuesTest.push(testBedValue);
            }
            console.log('testBeds --', valuesTest);
            responseObject.message = "Successfull";
            responseObject.size = testBed.length;
            responseObject.testbeds = valuesTest;

        } else {
            responseObject.status = false;
            responseObject.message = "No Testbeds Found";
        }
        res.json(responseObject);
    } catch (err) {
        logger.error("Upload and Analyze:", err);
        responseError(res, responseObject, "Error in the Upload and Analyze Data.");
    }
}

/* This method to get the uploaded excel sheetname */
routes.prototype.getExcelSheetNames = async function(req, res) {

    var responseObject = {
        status: true,
        message: ''
    };

    try {

        await upload(req, res); // Upload the file to read in Public/TestExeUpload folder
        console.log('body', req.body);
        console.log('file', req.file);

        let sheets = [];

        let CommonObj = {
            email: req.body.email,
            filePath: req.file.path
        }

        // get sheet names in the file
        sheets = await getSheetNames(req.file.path);
        console.log('Sheet Names --', sheets);

        responseObject.message = "Uploaded Excel Sheet Names";
        responseObject.data = sheets;
        responseObject.info = CommonObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        responseError(res, responseObject, "Error in uploading file - (Getting the SheetNames)");

    }

    res.json(responseObject);
}

/* This method receives the upload file to create test execution */
let TestExecutionID = '';
routes.prototype.uploadTestExecution = async function(req, res) {

    let responseArr = [];
    TestExecutionID = '';
    //UploadTestExecutionID = '';

    var responseObject = {
        status: true,
    };

    let response = {
        info: '',
        uploadPF: false
    }

    try {
        //await upload(req, res); // Upload the file to read in Public/TestExeUpload folder
        console.log('body --', req.body);
        //console.log('file', req.file);

        let CommonObj = {
            testExecName: req.body.testExecName,
            testbed_id: req.body.testbed_id,
            testbed_name: req.body.testbed_name,
            email: req.body.email,
            filePath: req.body.filePath,
            UUT_Build: req.body.UUT_Build,
            UUT_Name: req.body.UUT_Name,
            UUT_Os: req.body.UUT_Os
        }
        let selectedItems = req.body.selected;
        /* Calling Create Test Execution and getting its ID*/
        //let executionDetails = await createExecution(CommonObj);
        //let TestExecutionID = executionDetails.getLastInsertedID;

        for (let item of selectedItems) {

            console.log("\n\n----- ", item['template'], "-----\n\n");

            if (item['template'] == 'Upload PASS/FAIL') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await uploadPassFailStatus(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    response.uploadPF = true;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    response.uploadPF = false;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'OFDMA-DL') {

                let DBHeaderObj = ["Date", "SOC", "APPlatform", "APBuild", "Type", "Mode", "Band", "Channel", "Bandwidth", "Security", "Coding", "GI", "SS", "Rate", "WFO", "Aggregation", "DLmode", "wlmgrversion", "TID", "NoofSTAs", "Delaytime(ms)", "RU_mode", "STA1", "STA2", "STA3", "STA4", "DL-OFDMA", "KPI", "SU", "Gain", "iperf-l", "STAantenna", "PowerTable", "Bfmee", "Protection", "STAPlatform", "STAS/Winformation", "AP-Backend", "STA-Backend", "TestTool", "Environment", "BugNum", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'OFDMA-UL') {

                let DBHeaderObj = ["Date", "SOC", "AP Platform", "AP Build", "Type", "Mode", "Band", "Channel", "Bandwidth", "Security", "Coding", "SS", "Rate", "WFO", "Aggregation", "UL mode", "ul_mimo_datalen", "wlmgr version", "No of STAs", "TF_Type", "BSRP", "TF time (ms)", "TF_Continue", "RU Allocation", "STA1", "STA2", "STA3", "STA4", "UL-OFDMA", "KPI", "SU", "Gain", "iperf -l", "STA antenna", "PowerTable", "Bfmee", "Protection", "STA Platform", "STA S/W information", "AP-Backend", "STA-Backend", "Test Tool", "Environment", "Bug Num", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'DL-11ac-MU-MIMO') {

                let DBHeaderObj = ["FW/Driver ver", "AP-Model", "MU Config", "STA1", "STA2", "STA1 ANT", "STA2 ANT", "STA3 ANT", "STA4 ANT", "No of clients", "MU Groups", "Band", "Mode/BW", "MCS Rates", "MU UDP AP-> STA1", "MU UDP AP-> STA2", "MU UDP AP-> STA3", "MU UDP AP-> STA4", "MU UDP", "Expected", "SU UDP AP-> STA1", "SU UDP AP-> STA2", "SU UDP AP-> STA3", "SU UDP AP-> STA4", "SU UDP", "UDP MUvsSU gain", "MU TCP AP-> STA1", "MU TCP AP-> STA2", "MU TCP AP-> STA3", "MU TCP AP-> STA4", "MU TCP", "Expected", "SU TCP AP-> STA1", "SU TCP AP-> STA2", "SU TCP AP-> STA3", "SU TCP AP-> STA4", "SU TCP", "TCP MUvsSU gain", "STA3", "STA4", "Environment", "MIMO Cache", "Pvt build", "AP-SoC Rev", "traffic Tool", "Channel", "SGI/LGI", "Security", "Date tested", "Total Duration", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'UL-11ax-MU-MIMO') {

                let DBHeaderObj = ["FW/Driver ver", "No of clients", "MU Groups", "MU Config", "AP-Model", "Environment", "STA1 ANT", "STA2 ANT", "STA3 ANT", "STA4 ANT", "BW", "MCS Rates", "Band", "MU UDP STA1->AP", "MU UDP STA2->AP", "MU UDP STA3->AP", "MU UDP STA4->AP", "MU UDP", "Expected TP", "SU UDP STA1->AP", "SU UDP STA2->AP", "SU UDP STA3->AP", "SU UDP STA4->AP", "SU UDP", "UDP MUvsSU gain", "MU TCP STA1->AP", "MU TCP STA2->AP", "MU TCP STA3->AP", "MU TCP STA4->AP", "MU TCP", "Expected", "SU TCP STA1->AP", "SU TCP STA2->AP", "SU TCP STA3->AP", "SU TCP STA4->AP", "SU TCP", "TCP MUvsSU gain", "STA1", "STA2", "STA3", "STA4", "Pvt build", "AP-SoC Rev", "traffic Tool", "Mode/BW", "Channel", "Trigger frame", "Data bytes", "Target RSSI set in AP", "Security", "Date tested", "Total Duration", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'DL-11ax-MU-MIMO') {

                let DBHeaderObj = ["FW/Driver ver", "AP-Model", "MU Config", "STA1", "STA2", "STA1 ANT", "STA2 ANT", "STA3 ANT", "STA4 ANT", "No of clients", "MU Groups", "Band", "Mode/BW", "MCS Rates", "MU UDP AP->STA1", "MU UDP AP->STA2", "MU UDP AP->STA3", "MU UDP AP->STA4", "MU UDP", "Expected", "SU UDP AP-> STA1", "SU UDP AP-> STA2", "SU UDP AP-> STA3", "SU UDP AP-> STA4", "SU UDP", "UDP MUvsSU gain", "MU TCP AP-> STA1", "MU TCP AP-> STA2", "MU TCP AP-> STA3", "MU TCP AP-> STA4", "MU TCP", "Expected", "SU TCP AP-> STA1", "SU TCP AP-> STA2", "SU TCP AP-> STA3", "SU TCP AP-> STA4", "SU TCP", "TCP MUvsSU gain", "STA3", "STA4", "Environment", "MIMO Cache", "Pvt build", "AP-SoC Rev", "traffic Tool", "Channel", "SGI/LGI", "Security", "Date tested", "Total Duration", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'STA-CPU-Util') { //  STA_CPU-Util

                let DBHeaderObj = ["", "", "S#N#", "TP TYPE", "DUT", "SoC Version", "SoC TYPE", "DUT Fw/Drv", "Interface", "Aggregation", "Spatial Streams", "Guard Interval", "Data Rate", "Channel | 2 GHz", "Channel | 5 GHz", "SDIO Clock", "Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC", "Companion Device FW/Drv", "Host Platform", "OS", "DUT Beamforming Config", "Companion Device Beamforming Config", "LDPC", "STBC", "DUT EdMac", "Misc", "Security", "Test Repetition", "DUT Mode", "DUT Protocol", "NAPI", "CPU Clock Speed", "BOGO MIPS of Host Platform", "D-MIPS of Host Platform", "No Of CPU Cores", "CPU Time out of %", "Multi-Core Support", "Throughput Limit", "UDP Bandwidth / TCP Window Size", "Throughput (Mbps)", "MIPS / Mbps", "CPU Usage in D-MIPS", "CPU Usage in MIPS", "CPU UTILIZATION % - Iperf per core", "CPU UTILIZATION % - Iperf", "CPU Utilization %", "Process Threads", "Iperf", "Process1", "Process2", "Process3", "Process4", "Process5", "Process6", "Process7", "Process8", "Process9", "Process10", "Process11", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'DBC-Cpu-Util') { //My code

                let DBHeaderObj = ["", "", "Sl No", "TP TYPE", "DUT", "SoC Version", "SoC TYPE", "DUT Fw/Drv", "Interface", "SDIO Clock [MHz]", "Aggregation", "Spatial Streams", "Guard Interval", "Data Rate", "Connectivity Modes", "Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC", "Companion Device 1 FW/Drv", "Companion Device 2 /Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC", "Companion Device 2 FW/Drv", "DUT Host Platform", "DUT OS", "INTF 1 Configuration", "Channel | INTF 1", "INTF 2 Configuration", "Channel | INTF 2", "DRCS Timing Configuration Duty Cycle | INTF1 | INTF2", "Misc", "Security", "DUT Protocol (Radio-0)", "DUT Protocol (Radio-1)", "NAPI", "CPU Clock Speed (MHz)", "BOGO MIPS of Host Platform", "D-MIPS of Host Platform", "No Of CPU Cores", "CPU Time out of %", "Multi Core Support", "Throughput Limit", "UDP Bandwidth / TCP Window Size (Radio-0)", "UDP Bandwidth / TCP Window Size (Radio-1)", "Throughput (Radio-0)", "Throughput (Radio-1)", "Aggregated TP", "MIPS / Mbps", "CPU Usage in D-MIPS", "CPU Usage in MIPS", "(CPU UTILIZATION % - Iperf) Per Core", "CPU UTILIZATION % - Iperf", "CPU Utilization %", "CPU Utilization/CPU %", "Process Threads", "Iperf", "Process1", "Process2", "Process3", "Process4", "Process5", "Process6", "Process7", "Process8", "Process9", "Process10", "Comments"];

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await GenericTEUploadFunc(CommonObj, DBHeaderObj, 'T');
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'IOP-Perf') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await IOPPerfTEUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'MBSS-SCBT') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await MBSS_SCBTuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'BAT-CABLE-UP') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await BAT_CABLEuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'TP') { //  TP

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await TP_uploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'IOP-TP') { //  IOP-TP

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await IOP_TPuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'MMH-Coex-TP') { //  MMH-Coex-TP

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await MMHCoexTP_uploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }


            } else if (item['template'] == 'P2P-Coex-TP') { //  P2P-Coex-TP

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await P2P_Coex_TPUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'STA-Coex-TP') { // STA-Coex-TP
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await STA_Coex_TPUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }


            } else if (item['template'] == 'Simul-TP-2INTF') { // Clien-WLAN Simul-TP-2INTF
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await Simul_TP_2INTFUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'Simul-TP-3INTF') { //  Simul-TP-3INTF

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await Simul_TP_3INTFuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'Simul-TP-4INTF') { //  Simul-TP-4INTF

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await Simul_TP_4INTFuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'Coex-Simul-TP-2INTF') { // Coex-Simul-TP-2INTF
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await CoexSimul_TP_2INTFUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'Coex-Simul-TP-3INTF') { // Coex-Simul-TP-3INTF
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await CoexSimul_TP_3INTFUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'BT-MOS') { // BT-MOS
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await BT_MOS_FUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'BT-Dual-HFP') { // BT-Dual-HFP
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await BT_Dual_HFPFUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {


                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'BT-RvR') { // BT-RvR
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await BT_RvRFUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'BLE-RvR') { // BLE-RvR
                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await BLE_RvRFUploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);


                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }


            } else if (item['template'] == 'BT-Throughput') { //  Simul-TP-4INTF

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await BT_ThroughputuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'BLE-Throughput') { //  BLE-Throughput

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await BLE_ThroughputuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'LE-Long-Range-RvR') { //  LE-Long-Range-RvR

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await LE_Long_Range_RvRuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'COEX-RVR' && item['sheetname'] == "Coex_RVR_Set-1") { //  COEX-BT-RVR

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await COEX_BT_RVRuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'COEX-RVR' && item['sheetname'] == "Coex_RVR_Set-2") { //  COEX-WiFi-RVR

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await COEX_BT_RVRuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }
            } else if (item['template'] == 'COEX-RVR' /*&& item['sheetname'] == "Coex_RvR_Set-3"*/ ) { //  COEX-WiFi-RVR

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];
                // '' Or T for UTC Date to dd-mm-yy format
                let result = await COEX_BT_RVRuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'RvR') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await RvR_uploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'CC') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await CC_uploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'DFS') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await DFS_uploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'WACP_Coex') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await WACP_CoexuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else if (item['template'] == 'WACP_Wifi') {

                CommonObj.template = item['template'];
                CommonObj.sheetName = item['sheetname'];

                let result = await WACP_WifiuploadFunc(CommonObj);
                responseObject = {};
                if (result.error != 1) {
                    responseObject.status = true;
                    responseObject.message = result.message;
                    responseObject.size = result.size;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                } else {
                    responseObject.status = false;
                    responseObject.message = result.message;
                    responseObject.template = item['template'];
                    responseObject.sheetname = item['sheetname'];
                    responseArr.push(responseObject);
                    response.info = responseArr;
                    console.log('responseArr --', responseArr);
                }

            } else {
                responseObject = {};
                responseObject.status = false;
                responseObject.message = "Selected Template Not Found";
                responseObject.template = item['template'];
                responseObject.sheetname = item['sheetname'];
                responseArr.push(responseObject);
                response.info = responseArr;
            }
        }


    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            responseError(res, response, "This Execution Name already exists!");
        } else {
            responseError(res, response, "Please select the proper template");
        }
    }
    res.json(response);

    if (response.uploadPF) {

        let updatedSummary = await calculateSummary(TestExecutionID);
        executionObj.updateExecutionSummary(TestExecutionID, { "Total": updatedSummary.Total, "Summary": updatedSummary.Summary }, { upsert: false });

        if (config.qtest.permission) {
            // Create Test Case in Qtest
            let qtestCreateTestCasesRes = await testingTool.createTestCases(TestExecutionID);
            console.log("\n--- Qtest CreateTestCasesRes ---\n", qtestCreateTestCasesRes);

            // Create Test Execution in Qtest
            let qtestCreateTestRun = await testingTool.createTestRun(TestExecutionID);
            console.log("\n--- Qtest CreateTestRun ---\n", qtestCreateTestRun);

            // Updating the Test Execution PASS/FAIL Status
            let qtestUpdateStatus = await testingTool.updateTestExecutionStatus(TestExecutionID);
            console.log("\n--- Qtest CreateTestRun ---\n", qtestUpdateStatus);

        } else {
            console.log("\n--- Qtest Service Not Enabled ---\n");
        }
    }

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


/* Create a Single Test Execution for uploaded multiple template  */
async function createExecution(CommonObj) {
    let returnObj = {
        error: 0
    };

    let filePath = CommonObj.filePath; //test_plan_name, file_path
    let testExecName = CommonObj.testExecName;
    let testbed_id = CommonObj.testbed_id;
    let testbed_name = CommonObj.testbed_name; //test_bed_name
    let email = CommonObj.email;
    let soc = CommonObj.UUT_Name;
    let os = CommonObj.UUT_Os;
    let UUT_Build = CommonObj.UUT_Build;


    let res = filePath.split("\\");
    console.log(res);

    try {
        let test_execution = {
            "name": testExecName,
            "status": "COMPLETED",
            "test_bed_id": testbed_id,
            "test_plan_name": res[2],
            "test_bed_name": testbed_name,
            "file_path": res[0] + '/' + res[1],
            "created_by": email,
            "updated_by": null,
            "created_time": Date.now(),
            "completed_time": Date.now(),
            "updated_time": null,
            "isApproved": null,
            "manual_import": true,
            "testBedDisplayName": testbed_name,
            "duration": 0,
            "soc": soc,
            "os": os,
            "UUT_Build": UUT_Build
        }

        //"uploaded_filePath": filePath

        /* get last inserted id of the test_execution collection*/
        let getTest_execution = await executionObj.insertExecution(test_execution);
        console.log('getLastInsertedID', getTest_execution.insertedId);

        let sumObj = {
            execution_id: getTest_execution.insertedId,
            totalTc: 0,
            UUT_Build: CommonObj.UUT_Build,
            UUT_Name: CommonObj.UUT_Name,
            UUT_Os: CommonObj.UUT_Os
        }
        executionObj.insertSummary(sumObj);

        returnObj.getLastInsertedID = getTest_execution.insertedId;
        returnObj.message = "Execution Created";

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "\"" + testExecName + "\"" + " - Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Error While Creating Execution";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }


}

/* Upload the */
async function uploadPassFailStatus(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);
        console.log('Length --', excelData.length);
        console.log('filePath -->', filePath);

        let res = filePath.split("\\");
        console.log("filePath Local Machine -->", res);

        if (res.length == 1) {
            res = filePath.split("/");
            console.log("filePath NXP Server -->", res);
        }

        if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
            let execDetails = await createExecution(CommonObj);
            TestExecutionID = execDetails.getLastInsertedID;

            if (execDetails.error == 1) {
                returnObj.message = execDetails.message;
                returnObj.status = false;
                returnObj.error = 1;
                return returnObj;
            }
        }

        let count = 0;
        for (var i = 0; i < excelData.length; i++) {
            if (excelData[i]['B'] == 'Test_No.') { // Test_No. Should be in Column 'B'
                count = i + 1;
            }
        }

        let execResArr = [];
        let obj = {};
        for (var i = count; i < excelData.length; i++) {
            //if (excelData[i]['D'] != '') {

            obj = {
                "execution_id": ObjectID(TestExecutionID),
                "test_plan_name": res[2], //"WLAN_AP_OFDMA.xls", 
                "test_suite_name": sheetName, //"AP-DL_OFDMA_WLMGR",
                "test_no": excelData[i]['B'], //"30.2.2.2",
                "test_case": excelData[i]['C'], //"AP_AX_CBW80_OPEN_1x1_4xLTF_3.2GI_MCS1",
                "status": excelData[i]['D'], //"PLANNED",
                "comments": excelData[i]['E']
            };

            execResArr.push(obj)
                //}
        }

        /* Creating Test Execution */
        let getTest_executionRes = await executionObj.insertTestExeResult(execResArr);
        console.log('getTest_executionResID -- ', getTest_executionRes.insertedIds);

        console.log('Test_executionRes Length - ', execResArr.length);

        returnObj.message = "Successfully Uploaded PASS/FAIL Status";
        returnObj.size = execResArr.length;
        returnObj.error = 0;

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}

/* Generic Function for Upload test executions for single header templates
 OFDMA-DL, OFDMA-UL, DL-11ax-MU-MIMO,UL-11ax-MU-MIMO, DL-11ac-MU-MIMO ,STA-CPU-Util,DBC-Cpu-Util*/
async function GenericTEUploadFunc(CommonObj, DBHeaderObj, date) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);
        //console.log('Sheet Data --', runSheet);
        let k;
        let excel_index = (CommonObj.template == 'DBC-Cpu-Util' || CommonObj.template == 'STA-CPU-Util') ? k = 1 : k = 0
        let excelHeader = _.values(excelData[excel_index])

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //let headerVal = headers.header[0];
        if (headers.header.length > 6) {
            let headerVal = headers.header;
            headers.header = [];

            headers.header[0] = headerVal.map(function(el) {
                return el.split(/\s/).join('');
            });
        } else {
            //Remove the single space of the object
            headers.header[0] = headers.header[0].map(function(el) {
                return el.split(/\s/).join('');
            });
        }

        if (excelHeader[0] == '' && excelHeader[1] == '') {
            let index = 0;
            excelHeader.splice(index, 2);
            if (CommonObj.template != 'STA-CPU-Util')
                excelHeader.splice(0, 1, 'SlNo.');
        }

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        if (CommonObj.template == 'DL-11ax-MU-MIMO') {
            let indexOfHeader = headers.header[0].indexOf("Noofclients");
            //console.log("indexof header----", indexOfHeader);
            headers.header[0][indexOfHeader] = 'Numofclient';
        }

        if (CommonObj.template == 'STA-CPU-Util') {
            excelHeader.splice(0, 2);
        }

        console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            var i;
            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (CommonObj.template == 'DBC-Cpu-Util' ? i = 2 : (CommonObj.template == 'STA-CPU-Util' ? i = 6 : i = 1); i < excelData.length; i++) {

                let sheetValues = _.values(excelData[i]);
                let obj = _.object(DBHeaderObj, sheetValues);

                obj = _.omit(obj, '');
                console.log(obj);
                throughput_data.push(obj);
                sheetValues = '';

            }
            //console.log('data', throughput_data);
            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {

                if (date == 'T') { //throughput_data[j].Date != null && 
                    var d = new Date(throughput_data[j].Date);
                    var dateVal = d.getUTCDate() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCFullYear();
                    throughput_data[j].Date = String(dateVal);
                }

                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}
/** Generic Function for Upload test executions Multiheader templates IOP-Perf*/
async function IOPPerfTEUploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        // console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        // console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        // console.log('\nExcel Header --', excelHeader);
        console.log('ExcelHeader Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (!headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 4; i < excelData.length; i++) {

                let _5GHz = {
                    "Tcp_Tx": { "value": excelData[i]['AE'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AF'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AG'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AH'], "percent": null },
                    "PHY Rate": { "value": excelData[i]['AI'], "percent": null }
                };

                let _2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['AK'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AL'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AM'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AN'], "percent": null },
                    "PHY Rate": { "value": excelData[i]['AO'], "percent": null }
                };

                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "Release": excelData[i]['H'],
                    "LSP Ver": excelData[i]['I'],
                    "DUT Fw/Drv": excelData[i]['J'],
                    "Board": excelData[i]['K'],
                    "Interface": excelData[i]['L'],
                    "Channel | 2 GHz": excelData[i]['M'],
                    "Channel | 5 GHz": excelData[i]['N'],
                    "Aggregation": excelData[i]['O'],
                    "11ax NSS": excelData[i]['P'],
                    "11ac NSS": excelData[i]['Q'],
                    "Guard Interval": excelData[i]['R'],
                    "WMM": excelData[i]['S'],
                    "Power Table": excelData[i]['T'],
                    "superBA": excelData[i]['U'],
                    "RTS Protection": excelData[i]['V'],
                    "BeamForming": excelData[i]['W'],
                    "Data Rate": excelData[i]['X'],
                    "STA Device": excelData[i]['Y'],
                    "Category": excelData[i]['Z'],
                    "STA FW/Drv": excelData[i]['AA'],
                    "PHY TYPE": excelData[i]['AB'],
                    "Security": excelData[i]['AC'],
                    "5GHz": _5GHz,
                    "2GHz": _2GHz,
                    "Traffic information": excelData[i]['AP'],
                    "Traffic Tool": excelData[i]['AQ'],
                    "No of Traffic Pair (TCP)": excelData[i]['AR'],
                    "No of Traffic Pair (UDP)": excelData[i]['AS'],
                    "Traffic Duration": excelData[i]['AT'],
                    "Test Environment": excelData[i]['AU'],
                    "Extra": excelData[i]['AV'],
                    "DUT MAC": excelData[i]['AW'],
                    "DUT Backend": excelData[i]['AX'],
                    "Comments": excelData[i]['AZ']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}

/* Generic Function for Upload test executions Multiheader templates MBSS_SCBT*/
async function MBSS_SCBTuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        //console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        let headerStatusVal = _.intersection(headers.header[0], excelHeader);
        // console.log('Intersection - DB & Excel Header --\n', headerStatusVal);
        // console.log('Intersection length --', headerStatusVal.length);

        if (!headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 8; i < excelData.length; i++) {

                let _HE80MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AS'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AT'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AU'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AV'], "percent": null }
                };

                let _HE20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AX'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AY'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AZ'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BA'], "percent": null }
                };

                let _VHT80MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BC'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BD'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BE'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BF'], "percent": null }
                };

                let _VHT20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BH'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BI'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BJ'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BK'], "percent": null }
                };


                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "AP_TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "Release": excelData[i]['H'],
                    "LSP Ver": excelData[i]['I'],
                    "DUT Fw/Drv": excelData[i]['J'],
                    "Board": excelData[i]['K'],
                    "Interface": excelData[i]['L'],
                    "Channel | 2 GHz": excelData[i]['M'],
                    "Channel | 5 GHz": excelData[i]['N'],
                    "Aggregation": excelData[i]['O'],
                    "11ax NSS": excelData[i]['P'],
                    "11ac NSS": excelData[i]['Q'],
                    "Guard Interval": excelData[i]['R'],
                    "LDPC": excelData[i]['S'],
                    "STBC": excelData[i]['T'],
                    "WMM": excelData[i]['U'],
                    "Power Table": excelData[i]['V'],
                    "superBA": excelData[i]['W'],
                    "RTS Protection": excelData[i]['X'],
                    "BeamForming": excelData[i]['Y'],
                    "EDMAC": excelData[i]['Z'],
                    "CCK Desense": excelData[i]['AA'],
                    "RX Abort": excelData[i]['AB'],
                    "Data Rate": excelData[i]['AC'],
                    "STA Device": excelData[i]['AD'],
                    "STA Host Platform": excelData[i]['AE'],
                    "STA OS/LSP": excelData[i]['AF'],
                    "STA FW/Drv": excelData[i]['AG'],
                    "STA Beamforming  Config": excelData[i]['AH'],
                    "STA 11ax NSS": excelData[i]['AI'],
                    "STA 11ac NSS": excelData[i]['AJ'],
                    "STA Aggregation": excelData[i]['AK'],
                    "STA SuperBA": excelData[i]['AL'],
                    "STA Power Table": excelData[i]['AM'],
                    "STA RTS Protection": excelData[i]['AN'],
                    "RSSI": excelData[i]['AO'],
                    "Security": excelData[i]['AP'],
                    "BSS": excelData[i]['AQ'],
                    "HE-80MHz | 5GHz": _HE80MHz,
                    "HE-20MHz | 2GHz": _HE20MHz,
                    "VHT-80MHz | 5GHz": _VHT80MHz,
                    "VHT-20MHz  | 2Ghz": _VHT20MHz,
                    "Comments": excelData[i]['BM'],
                    "Traffic Tool": excelData[i]['BO'],
                    "No of Traffic  Pair (TCP)": excelData[i]['BP'],
                    "TCP Window Size": excelData[i]['BQ'],
                    "UDP Bandwidth": excelData[i]['BR'],
                    "No of Traffic  Pair (UDP)": excelData[i]['BS'],
                    "Traffic Duration": excelData[i]['BT'],
                    "Offered Load": excelData[i]['BU'],
                    "Test Environment": excelData[i]['BV'],
                    "DUT MAC": excelData[i]['BX'],
                    "DUT Backend": excelData[i]['BY'],
                    "Companion Device MAC": excelData[i]['BZ'],
                    "Companion Device Backend": excelData[i]['CA']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            //console.log('throughput_data', throughput_data);
            c //onsole.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}

/* Generic Function for Upload test executions Multiheader templates BAT-CABLE */
async function BAT_CABLEuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        //console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('EXcel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        let headerStatusVal = _.intersection(headers.header[0], excelHeader);
        //console.log('Intersection - DB & Excel Header --\n', headerStatusVal);
        //console.log('Intersection length --', headerStatusVal.length);

        if (headerStatus) { // if Both the Headers are equal

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 8; i < excelData.length; i++) {

                let _HE80MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AS'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AT'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AU'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AV'], "percent": null }
                };

                let _HE20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AX'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AY'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AZ'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BA'], "percent": null }
                };

                let _VHT80MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BC'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BD'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BE'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BF'], "percent": null }
                };

                let _VHT20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BH'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BI'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BJ'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BK'], "percent": null }
                };


                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "AP_TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "Release": excelData[i]['H'],
                    "LSP Ver": excelData[i]['I'],
                    "DUT Fw/Drv": excelData[i]['J'],
                    "Board": excelData[i]['K'],
                    "Interface": excelData[i]['L'],
                    "Channel | 2 GHz": excelData[i]['M'],
                    "Channel | 5 GHz": excelData[i]['N'],
                    "Aggregation": excelData[i]['O'],
                    "11ax NSS": excelData[i]['P'],
                    "11ac NSS": excelData[i]['Q'],
                    "Guard Interval": excelData[i]['R'],
                    "LDPC": excelData[i]['S'],
                    "STBC": excelData[i]['T'],
                    "WMM": excelData[i]['U'],
                    "Power Table": excelData[i]['V'],
                    "superBA": excelData[i]['W'],
                    "RTS Protection": excelData[i]['X'],
                    "BeamForming": excelData[i]['Y'],
                    "EDMAC": excelData[i]['Z'],
                    "CCK Desense": excelData[i]['AA'],
                    "RX Abort": excelData[i]['AB'],
                    "Data Rate": excelData[i]['AC'],
                    "STA Device": excelData[i]['AD'],
                    "STA Host Platform": excelData[i]['AE'],
                    "STA OS/LSP": excelData[i]['AF'],
                    "STA FW/Drv": excelData[i]['AG'],
                    "STA Beamforming  Config": excelData[i]['AH'],
                    "STA 11ax NSS": excelData[i]['AI'],
                    "STA 11ac NSS": excelData[i]['AJ'],
                    "STA Aggregation": excelData[i]['AK'],
                    "STA SuperBA": excelData[i]['AL'],
                    "STA Power Table": excelData[i]['AM'],
                    "STA RTS Protection": excelData[i]['AN'],
                    "RSSI": excelData[i]['AO'],
                    "Security": excelData[i]['AP'],
                    "BSS": excelData[i]['AQ'],
                    "HE-80MHz | 5GHz": _HE80MHz,
                    "HE-20MHz | 2GHz": _HE20MHz,
                    "VHT-80MHz | 5GHz": _VHT80MHz,
                    "VHT-20MHz  | 2Ghz": _VHT20MHz,
                    "Comments": excelData[i]['BM'],
                    "Traffic Tool": excelData[i]['BO'],
                    "No of Traffic  Pair (TCP)": excelData[i]['BP'],
                    "TCP Window Size": excelData[i]['BQ'],
                    "UDP Bandwidth": excelData[i]['BR'],
                    "No of Traffic  Pair (UDP)": excelData[i]['BS'],
                    "Traffic Duration": excelData[i]['BT'],
                    "Offered Load": excelData[i]['BU'],
                    "Test Environment": excelData[i]['BV'],
                    "DUT MAC": excelData[i]['BX'],
                    "DUT Backend": excelData[i]['BY'],
                    "Companion Device MAC": excelData[i]['BZ'],
                    "Companion Device Backend": excelData[i]['CA']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            //console.log('throughput_data', throughput_data);
            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates TP*/
async function TP_uploadFunc(CommonObj) {

    let headers = [];

    //console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 2);
        // console.log('excelHeader --', excelData);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });
        excelHeader.splice(25, excelHeader.length - 25);
        headers.header[0].splice(25, headers.header[0].length - 25);

        let indexOfHeader = headers.header[0].indexOf("CompanionDevice/Ex-AP/Ex-STA/Ex-P2PGO/Ex-P2P-GC");
        //console.log("indexof header----", indexOfHeader);
        headers.header[0][indexOfHeader] = 'CompanionDevice/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC';

        console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 6; i < excelData.length; i++) {

                if (excelData[i]['D'] != '' && excelData[i]['E'] != '') {

                    if (excelData[i]['A'] == 'Reference Throughput') {
                        continue;
                    }

                    let _HE160MHz = {
                        "Tcp_Tx": { "value": excelData[i]['AD'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['AE'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['AF'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['AG'], "percent": null }
                    };

                    let _HE80MHz = {
                        "Tcp_Tx": { "value": excelData[i]['AI'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['AJ'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['AK'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['AL'], "percent": null }
                    };

                    let _HE40MHz = {
                        "Tcp_Tx": { "value": excelData[i]['AN'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['AO'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['AP'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['AQ'], "percent": null }
                    };

                    let _HE20MHz = {
                        "Tcp_Tx": { "value": excelData[i]['AS'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['AT'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['AU'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['AV'], "percent": null }
                    };

                    let _HET40MHz = {
                        "Tcp_Tx": { "value": excelData[i]['AX'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['AY'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['AZ'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['BA'], "percent": null }
                    };

                    let _HET20MHz = {
                        "Tcp_Tx": { "value": excelData[i]['BC'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['BD'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['BE'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['BF'], "percent": null }
                    };

                    let _VHT160MHz = {
                        "Tcp_Tx": { "value": excelData[i]['BH'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['BI'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['BJ'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['BK'], "percent": null }
                    };

                    let _VHT80MHz = {
                        "Tcp_Tx": { "value": excelData[i]['BM'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['BN'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['BO'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['BP'], "percent": null }
                    };

                    let _VHT40MHz = {
                        "Tcp_Tx": { "value": excelData[i]['BR'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['BS'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['BT'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['BU'], "percent": null }
                    };

                    let _VHT20MHz = {
                        "Tcp_Tx": { "value": excelData[i]['BW'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['BX'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['BY'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['BZ'], "percent": null }
                    };

                    let _VHTT40MHz = {
                        "Tcp_Tx": { "value": excelData[i]['CB'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['CC'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['CD'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['CE'], "percent": null }
                    };

                    let _VHTT20MHz = {
                        "Tcp_Tx": { "value": excelData[i]['CG'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['CH'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['CI'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['CJ'], "percent": null }
                    };

                    let _HT40MHz = {
                        "Tcp_Tx": { "value": excelData[i]['CL'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['CM'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['CN'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['CO'], "percent": null }
                    };

                    let _HT20MHz = {
                        "Tcp_Tx": { "value": excelData[i]['CQ'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['CR'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['CS'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['CT'], "percent": null }
                    };

                    let _HTT40MHz = {
                        "Tcp_Tx": { "value": excelData[i]['CV'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['CW'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['CX'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['CY'], "percent": null }
                    };

                    let _HTT20MHz = {
                        "Tcp_Tx": { "value": excelData[i]['DA'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['DB'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['DC'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['DD'], "percent": null }
                    };

                    let _NonHTBG = {
                        "Tcp_Tx": { "value": excelData[i]['DF'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['DG'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['DH'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['DI'], "percent": null }
                    };

                    let _NonHTA = {
                        "Tcp_Tx": { "value": excelData[i]['DK'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['DL'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['DM'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['DN'], "percent": null }
                    };

                    let _NonHTBonly = {
                        "Tcp_Tx": { "value": excelData[i]['DP'], "percent": null },
                        "Tcp_Rx": { "value": excelData[i]['DQ'], "percent": null },
                        "Udp_Tx": { "value": excelData[i]['DR'], "percent": null },
                        "Udp_Rx": { "value": excelData[i]['DS'], "percent": null }
                    };

                    arrColValues = {
                        "S#N#": excelData[i]['C'],
                        "TP TYPE": excelData[i]['D'],
                        "DUT": excelData[i]['E'],
                        "SoC Version": excelData[i]['F'],
                        "SoC TYPE": excelData[i]['G'],
                        "DUT Fw/Drv": excelData[i]['H'],
                        "Interface": excelData[i]['I'],
                        "Aggregation": excelData[i]['J'],
                        "Spatial Streams": excelData[i]['K'],
                        "Guard Interval": excelData[i]['L'],
                        "Data Rate": excelData[i]['M'],
                        "Channel | 2 GHz": excelData[i]['N'],
                        "Channel | 5 GHz": excelData[i]['O'],
                        "SDIO Clock": excelData[i]['P'],
                        "Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['Q'],
                        "Companion Device FW/Drv": excelData[i]['R'],
                        "Host Platform": excelData[i]['S'],
                        "OS": excelData[i]['T'],
                        "DUT Beamforming Config": excelData[i]['U'],
                        "Companion Device Beamforming Config": excelData[i]['V'],
                        "DUT LDPC": excelData[i]['W'],
                        "DUT STBC": excelData[i]['X'],
                        "EdMac": excelData[i]['Y'],
                        "More Config": excelData[i]['Z'],
                        "Security": excelData[i]['AA'],
                        "Test Repetition": excelData[i]['AB'],
                        "HE-160MHz | 5GHz": _HE160MHz,
                        "HE-80MHz | 5GHz": _HE80MHz,
                        "HE-40MHz | 5GHz": _HE40MHz,
                        "HE-20MHz | 5GHz": _HE20MHz,
                        "HE-40MHz | 2GHz": _HET40MHz,
                        "HE-20MHz | 2GHz": _HET20MHz,
                        "VHT-160MHz | 5GHz": _VHT160MHz,
                        "VHT-80MHz | 5GHz": _VHT80MHz,
                        "VHT-40MHz | 5GHz": _VHT40MHz,
                        "VHT-20MHz | 5GHz": _VHT20MHz,
                        "VHT-40MHz | 2GHz": _VHTT40MHz,
                        "VHT-20MHz | 2GHz": _VHTT20MHz,
                        "HT-40MHz | 5GHz": _HT40MHz,
                        "HT-20MHz | 5GHz": _HT20MHz,
                        "HT-40MHz | 2GHz": _HTT40MHz,
                        "HT-20MHz | 2GHz": _HTT20MHz,
                        "Non-HT BG | 2GHz": _NonHTBG,
                        "Non-HT A | 5GHz": _NonHTA,
                        "Non-HT B-Only | 2GHz": _NonHTBonly,
                        "Comments": excelData[i]['DU'],
                        //"Traffic information": excelData[i]['DW'],
                        "Traffic Tool": excelData[i]['DW'],
                        "No of Traffic Pair(TCP)": excelData[i]['DX'],
                        "TCP Window Size": excelData[i]['DY'],
                        "UDP Bandwidth": excelData[i]['DZ'],
                        "Traffic Duration": excelData[i]['EA'],
                        "Offered Load": excelData[i]['EB'],
                        "Test Environment": excelData[i]['EC'],
                        "DUT MAC": excelData[i]['EE'],
                        "DUT Backend": excelData[i]['EF'],
                        "Companion Device MAC": excelData[i]['EG'],
                        "Companion Device Backend": excelData[i]['EH']

                    };
                    throughput_data.push(arrColValues);
                    arrColValues = {};
                }
            }
            //console.log('throughput_data', throughput_data);
            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }
}


/** Generic Function for Upload test executions Multiheader templates IOP-TP*/

async function IOP_TPuploadFunc(CommonObj) {

    let headers = [];

    // console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 2);
        // console.log('excelHeader --', excelHeader);


        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(25, excelHeader.length - 25);
        headers.header[0].splice(25, headers.header[0].length - 25);


        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 5; i < excelData.length; i++) {


                let _HE160MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AD'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AE'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AF'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AG'], "percent": null }
                };
                let _HE80MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AI'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AJ'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AK'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AL'], "percent": null }
                };
                let _HE40MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AN'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AO'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AP'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AQ'], "percent": null }
                };
                let _HE20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['AS'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AT'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AU'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['AV'], "percent": null }
                };
                let _HE40MHz_2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['AX'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['AY'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['AZ'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BA'], "percent": null }
                };
                let _HE20MHz_2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['BC'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BD'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BE'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BF'], "percent": null }
                };
                let _VHT160MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BH'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BI'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BJ'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BK'], "percent": null }
                };
                let _VHT80MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BM'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BN'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BO'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BP'], "percent": null }
                };
                let _VHT40MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BR'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BS'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BT'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BU'], "percent": null }
                };
                let _VHT20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['BW'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['BX'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['BY'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['BZ'], "percent": null }
                };
                let _VHT40MHz_2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['CB'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['CC'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['CD'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['CE'], "percent": null }
                };
                let _VHT20MHz_2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['CG'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['CH'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['CI'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['CJ'], "percent": null }
                };
                let _HT40MHz = {
                    "Tcp_Tx": { "value": excelData[i]['CL'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['CM'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['CN'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['CO'], "percent": null }
                };
                let _HT20MHz = {
                    "Tcp_Tx": { "value": excelData[i]['CQ'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['CR'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['CS'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['CT'], "percent": null }
                };
                let _HT40MHz_2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['CV'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['CW'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['CX'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['CY'], "percent": null }
                };
                let _HT20MHz_2GHz = {
                    "Tcp_Tx": { "value": excelData[i]['DA'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['DB'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['DC'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['DD'], "percent": null }
                };
                let _NonHT_BG = {
                    "Tcp_Tx": { "value": excelData[i]['DF'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['DG'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['DH'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['DI'], "percent": null }
                };
                let _NonHT_A = {
                    "Tcp_Tx": { "value": excelData[i]['DK'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['DL'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['DM'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['DN'], "percent": null }
                };
                let NonH_BOnly = {
                    "Tcp_Tx": { "value": excelData[i]['DP'], "percent": null },
                    "Tcp_Rx": { "value": excelData[i]['DQ'], "percent": null },
                    "Udp_Tx": { "value": excelData[i]['DR'], "percent": null },
                    "Udp_Rx": { "value": excelData[i]['DS'], "percent": null }
                };


                let HE_80MHz = {
                    "Association": excelData[i]['DX'],
                    "Unicast ping": excelData[i]['DY'],
                    "Ping (Bi-Directional)": excelData[i]['DZ'],
                    "Re-association": excelData[i]['EA'],
                    "TCP Data (Bi-Directional)": excelData[i]['EB'],
                    "UDP Data (Bi-Directional)": excelData[i]['EC'],
                    "Broadcast Data": excelData[i]['ED'],
                    "Multicast Data": excelData[i]['EE'],
                };

                let HE_20MHz_1 = {
                    "Association": excelData[i]['EG'],
                    "Unicast ping": excelData[i]['EH'],
                    "Ping (Bi-Directional)": excelData[i]['EI'],
                    "Re-association": excelData[i]['EJ'],
                    "TCP Data (Bi-Directional)": excelData[i]['EK'],
                    "UDP Data (Bi-Directional)": excelData[i]['EL'],
                    "Broadcast Data": excelData[i]['EM'],
                    "Multicast Data": excelData[i]['EN'],
                };

                let VHT_80MHz = {
                    "Association": excelData[i]['EP'],
                    "Unicast ping": excelData[i]['EQ'],
                    "Ping (Bi-Directional)": excelData[i]['ER'],
                    "Re-association": excelData[i]['ES'],
                    "TCP Data (Bi-Directional)": excelData[i]['ET'],
                    "UDP Data (Bi-Directional)": excelData[i]['EU'],
                    "Broadcast Data": excelData[i]['EV'],
                    "Multicast Data": excelData[i]['EW'],
                };

                let HT_40MHz = {
                    "Association": excelData[i]['EY'],
                    "Unicast ping": excelData[i]['EZ'],
                    "Ping (Bi-Directional)": excelData[i]['FA'],
                    "Re-association": excelData[i]['FB'],
                    "TCP Data (Bi-Directional)": excelData[i]['FC'],
                    "UDP Data (Bi-Directional)": excelData[i]['FD'],
                    "Broadcast Data": excelData[i]['FE'],
                    "Multicast Data": excelData[i]['FF'],
                }

                let HT_20MHz_1 = {
                    "Association": excelData[i]['FH'],
                    "Unicast ping": excelData[i]['FI'],
                    "Ping (Bi-Directional)": excelData[i]['FJ'],
                    "Re-association": excelData[i]['FK'],
                    "TCP Data (Bi-Directional)": excelData[i]['FL'],
                    "UDP Data (Bi-Directional)": excelData[i]['FM'],
                    "Broadcast Data": excelData[i]['FN'],
                    "Multicast Data": excelData[i]['FO'],
                }

                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "DUT Fw/Drv": excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "Aggregation": excelData[i]['J'],
                    "Spatial Streams": excelData[i]['K'],
                    "Guard Interval": excelData[i]['L'],
                    "Data Rate": excelData[i]['M'],
                    "Channel | 2 GHz": excelData[i]['N'],
                    "Channel | 5 GHz": excelData[i]['O'],
                    "SDIO Clock": excelData[i]['P'],
                    "Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['Q'],
                    "Companion Device FW/Drv": excelData[i]['R'],
                    "Host Platform": excelData[i]['S'],
                    "OS": excelData[i]['T'],
                    "DUT Beamforming Config": excelData[i]['U'],
                    "Companion Device Beamforming Config": excelData[i]['V'],
                    "DUT LDPC": excelData[i]['W'],
                    "DUT STBC": excelData[i]['X'],
                    "EdMac": excelData[i]['Y'],
                    "More Config info": excelData[i]['Z'],
                    "Security": excelData[i]['AA'],
                    "Test Repetition": excelData[i]['AB'],
                    "HE-160MHz | 5GHz": _HE160MHz,
                    "HE-80MHz | 5GHz": _HE80MHz,
                    "HE-40MHz | 5GHz": _HE40MHz,
                    "HE-20MHz | 5GHz": _HE20MHz,
                    "HE-40MHz | 2GHz": _HE40MHz_2GHz,
                    "HE-20MHz | 2GHz": _HE20MHz_2GHz,
                    "VHT-160MHz | 5GHz": _VHT160MHz,
                    "VHT-80MHz | 5GHz": _VHT80MHz,
                    "VHT-40MHz | 5GHz": _VHT40MHz,
                    "VHT-20MHz | 5GHz": _VHT20MHz,
                    "VHT-40MHz | 2GHz": _VHT40MHz_2GHz,
                    "VHT-20MHz | 2GHz": _VHT20MHz_2GHz,
                    "HT-40MHz | 5GHz": _HT40MHz,
                    "HT-20MHz | 5GHz": _HT20MHz,
                    "HT-40MHz | 2GHz": _HT40MHz_2GHz,
                    "HT-20MHz | 2GHz": _HT20MHz_2GHz,
                    "Non-HT BG | 2GHz": _NonHT_BG,
                    "Non-HT A | 5GHz": _NonHT_A,
                    "Non-HT B-Only | 2GHz": NonH_BOnly,
                    "Comments": excelData[i]['DU'],
                    "Connectivity and Traffic Tests": excelData[i]['DV'],
                    "HE 80 | 5GHz": HE_80MHz,
                    "HE 20 | 2GHz": HE_20MHz_1,
                    "VHT 80MHz | 5GHz": VHT_80MHz,
                    "HT 40MHz | 5GHz": HT_40MHz,
                    "HT 20MHz | 2GHz": HT_20MHz_1,
                    "STA-Connectivity-IOT Comments": excelData[i]['FQ'],
                    "Additional Details": excelData[i]['FS'],
                    "2GHz / 5GHz Support": excelData[i]['FT'],
                    "11ax Suport": excelData[i]['FU'],
                    "11ac 5GHz Support - Wave1": excelData[i]['FV'],
                    "11ac 5GHz Support - Wave2": excelData[i]['FW'],
                    "Access Point / Client OEM": excelData[i]['FX'],
                    "Device Model": excelData[i]['FY'],
                    "Chipset Vendor": excelData[i]['FZ'],
                    "Category (Enterprise/Retail)": excelData[i]['GA']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            //console.log('throughput_data', throughput_data);
            // console.log('len-data', throughput_data.length);
            //console.log(throughput_data)

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates MMH-Coex-TP*/
async function MMHCoexTP_uploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);
        //console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });
        excelHeader.splice(19, excelHeader.length - 19);
        headers.header[0].splice(19, headers.header[0].length - 19);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 4; i < excelData.length; i++) {

                let HT20MHzWlan_2 = {
                    "TCP_TX": excelData[i]['AK'],
                    "TCP_RX": excelData[i]['AL'],
                    "UDP_TX": excelData[i]['AM'],
                    "UDP_RX": excelData[i]['AN'],
                    "WiFi RSSI": excelData[i]['AO']
                };
                let HT_20MHz_2 = {

                    "Coex TCP-TX": excelData[i]['AP'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['AQ'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['AR'],
                    "Coex TCP-RX": excelData[i]['AS'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['AT'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['AU'],
                    "Coex UDP-TX": excelData[i]['AV'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['AW'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['AX'],
                    "Coex UDP-RX": excelData[i]['AY'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['AZ'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['BA']
                };
                let finalHT20Mhz_2 = {
                    'Wlan Baseline': HT20MHzWlan_2,
                    'COEX_Performance': HT_20MHz_2,
                    "BT RSSI": excelData[i]['BB'],
                    "WiFi RSSI": excelData[i]['BC']
                };

                let HE20MHzWlan_2 = {
                    "TCP_TX": excelData[i]['BE'],
                    "TCP_RX": excelData[i]['BF'],
                    "UDP_TX": excelData[i]['BG'],
                    "UDP_RX": excelData[i]['BH'],
                    "WiFi RSSI": excelData[i]['BI']
                };
                let HE_20MHz_2 = {

                    "Coex TCP-TX": excelData[i]['BJ'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['BK'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['BL'],
                    "Coex TCP-RX": excelData[i]['BM'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['BN'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['BO'],
                    "Coex UDP-TX": excelData[i]['BP'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['BQ'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['BR'],
                    "Coex UDP-RX": excelData[i]['BS'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['BT'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['BU']

                };

                let finalHE20Mhz_2 = {
                    'Wlan Baseline': HE20MHzWlan_2,
                    'COEX_Performance': HE_20MHz_2,
                    "BT RSSI": excelData[i]['BV'],
                    "WiFi RSSI": excelData[i]['BW']
                };

                let VHT80MHzWlan_5 = {
                    "TCP_TX": excelData[i]['BY'],
                    "TCP_RX": excelData[i]['BZ'],
                    "UDP_TX": excelData[i]['CA'],
                    "UDP_RX": excelData[i]['CB'],
                    "WiFi RSSI": excelData[i]['CC']
                };

                let VHT_80MHz_5 = {

                    "Coex TCP-TX": excelData[i]['CD'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['CE'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['CF'],
                    "Coex TCP-RX": excelData[i]['CG'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['CH'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['CI'],
                    "Coex UDP-TX": excelData[i]['CJ'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['CK'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['CL'],
                    "Coex UDP-RX": excelData[i]['CM'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['CN'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['CO']

                };

                let finalVHT80Mhz_5 = {
                    'Wlan Baseline': VHT80MHzWlan_5,
                    'COEX_Performance': VHT_80MHz_5,
                    "BT RSSI": excelData[i]['CP'],
                    "WiFi RSSI": excelData[i]['CQ']
                };

                let HE80MHzWlan_5 = {
                    "TCP_TX": excelData[i]['CS'],
                    "TCP_RX": excelData[i]['CT'],
                    "UDP_TX": excelData[i]['CU'],
                    "UDP_RX": excelData[i]['CV'],
                    "WiFi RSSI": excelData[i]['CW']
                }

                let HE_80MHz_5 = {

                    "Coex TCP-TX": excelData[i]['CX'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['CY'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['CZ'],
                    "Coex TCP-RX": excelData[i]['DA'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['DB'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['DC'],
                    "Coex UDP-TX": excelData[i]['DD'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['DE'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['DF'],
                    "Coex UDP-RX": excelData[i]['DG'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['DH'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['DI']

                };

                let finalHE80Mhz_5 = {
                    'Wlan Baseline': HE80MHzWlan_5,
                    'COEX_Performance': HE_80MHz_5,
                    "BT RSSI": excelData[i]['DJ'],
                    "WiFi RSSI": excelData[i]['DK']
                };

                let HT40MHzWlan_2 = {
                    "TCP_TX": excelData[i]['DM'],
                    "TCP_RX": excelData[i]['DN'],
                    "UDP_TX": excelData[i]['DO'],
                    "UDP_RX": excelData[i]['DP'],
                    "WiFi RSSI": excelData[i]['DQ']
                };

                let HT_40MHz_2 = {

                    "Coex TCP-TX": excelData[i]['DR'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['DS'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['DT'],
                    "Coex TCP-RX": excelData[i]['DU'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['DV'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['DW'],
                    "Coex UDP-TX": excelData[i]['DX'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['DY'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['DZ'],
                    "Coex UDP-RX": excelData[i]['EA'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['EB'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['EC']

                };

                let finalHT40Mhz_2 = {
                    'Wlan Baseline': HT40MHzWlan_2,
                    'COEX_Performance': HT_40MHz_2,
                    "BT RSSI": excelData[i]['ED'],
                    "Wi-Fi RSSI": excelData[i]['EE']
                };

                let HE40MHzWlan_2 = {
                    "TCP_TX": excelData[i]['EG'],
                    "TCP_RX": excelData[i]['EH'],
                    "UDP_TX": excelData[i]['EI'],
                    "UDP_RX": excelData[i]['EJ'],
                    "WiFi RSSI": excelData[i]['EK']
                };
                let HE_40MHz_2 = {

                    "Coex TCP-TX": excelData[i]['EL'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['EM'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['EN'],
                    "Coex TCP-RX": excelData[i]['EO'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['EP'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['EQ'],
                    "Coex UDP-TX": excelData[i]['ER'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['ES'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['ET'],
                    "Coex UDP-RX": excelData[i]['EU'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['EV'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['EW']

                };
                let finalHE40Mhz_2 = {
                    'Wlan Baseline': HE40MHzWlan_2,
                    'COEX_Performance': HE_40MHz_2,
                    "BT RSSI": excelData[i]['EX'],
                    "WiFi RSSI": excelData[i]['EY']
                };

                let HT40MHzWlan_5 = {
                    "TCP_TX": excelData[i]['FA'],
                    "TCP_RX": excelData[i]['FB'],
                    "UDP_TX": excelData[i]['FC'],
                    "UDP_RX": excelData[i]['FD'],
                    "WiFi RSSI": excelData[i]['FE']
                };

                let HT_40MHz_5 = {

                    "Coex TCP-TX": excelData[i]['FF'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['FG'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['FH'],
                    "Coex TCP-RX": excelData[i]['FI'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['FJ'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['FK'],
                    "Coex UDP-TX": excelData[i]['FL'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['FM'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['FN'],
                    "Coex UDP-RX": excelData[i]['FO'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['FP'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['FQ']

                };

                let finalHT40Mhz_5 = {
                    'Wlan Baseline': HT40MHzWlan_5,
                    'COEX_Performance': HT_40MHz_5,
                    "BT RSSI": excelData[i]['FR'],
                    "WiFi RSSI": excelData[i]['FS']
                };

                let HE40MHzWlan_5 = {
                    "TCP_TX": excelData[i]['FU'],
                    "TCP_RX": excelData[i]['FV'],
                    "UDP_TX": excelData[i]['FW'],
                    "UDP_RX": excelData[i]['FX'],
                    "WiFi RSSI": excelData[i]['FY']
                };

                let HE_40MHz_5 = {

                    "Coex TCP-TX": excelData[i]['FZ'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['GA'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['GB'],
                    "Coex TCP-RX": excelData[i]['GC'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['GD'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['GE'],
                    "Coex UDP-TX": excelData[i]['GF'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['GG'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['GH'],
                    "Coex UDP-RX": excelData[i]['GI'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['GJ'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['GK']

                };

                let finalHE40Mhz_5 = {
                    'Wlan Baseline': HE40MHzWlan_5,
                    'COEX_Performance': HE_40MHz_5,
                    "BT RSSI": excelData[i]['GL'],
                    "WiFi RSSI": excelData[i]['GM']
                };
                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    '" DUT Fw/Drv"': excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "Aggregation": excelData[i]['J'],
                    "Spatial Streams": excelData[i]['K'],
                    "Guard Interval": excelData[i]['L'],
                    "Data Rate": excelData[i]['M'],
                    "Channel | 2 GHz": excelData[i]['N'],
                    "Channel | 5 GHz": excelData[i]['O'],
                    "SDIO Clock": excelData[i]['P'],
                    "Companion Device/": excelData[i]['Q'],
                    "Companion Device FW/Drv": excelData[i]['R'],
                    "Host Platform": excelData[i]['S'],
                    "OS": excelData[i]['T'],
                    "Security": excelData[i]['U'],
                    "BT Ref": excelData[i]['V'],
                    "Coex mode": excelData[i]['W'],
                    "ANT isolation": excelData[i]['X'],
                    "BT profiles": excelData[i]['Y'],
                    "BT/BLE Role": excelData[i]['Z'],
                    "Profile Param": excelData[i]['AA'],
                    "Connection param": excelData[i]['AB'],
                    "BT Sniff": excelData[i]['AC'],
                    "Test Duration": excelData[i]['AD'],
                    "Test Repetition": excelData[i]['AE'],
                    "BT Baseline #1": excelData[i]['AG'],
                    "BT Baseline #2": excelData[i]['AH'],
                    "BT RSSI": excelData[i]['AI'],
                    "BT Baseline": excelData[i]['AJ'],
                    "HT-20MHz | 2GHz": finalHT20Mhz_2,
                    "HE-20MHz | 2GHz": finalHE20Mhz_2,
                    "VHT / HE-80MHz | 5GHz": finalVHT80Mhz_5,
                    "HT / HE-40MHz  | 2GHz": finalHT40Mhz_2,
                    "HT / HE-40MHz  | 5GHz": finalHT40Mhz_5,
                    "Comments": excelData[i]['GO']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            //console.log('throughput_data', throughput_data);
            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }
}


/** Generic Function for Upload test executions Multiheader templates IOP-Perf*/
async function P2P_Coex_TPUploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(25, excelHeader.length - 25);
        headers.header[0].splice(25, headers.header[0].length - 25);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 4; i < excelData.length; i++) {

                let HT_20MHz_24Ghz_wlan = {
                    "TCP-TX": excelData[i]['AK'],
                    "TCP_RX": excelData[i]['AL'],
                    "UDP_TX": excelData[i]['AM'],
                    "UDP_RX": excelData[i]['AN'],
                    "WiFi RSSI": excelData[i]['AO']
                }

                let HT_20MHz_24Ghz_BT = {
                    "Coex TCP-TX": excelData[i]['AP'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['AQ'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['AR'],
                    "Coex TCP-RX": excelData[i]['AS'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['AT'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['AU'],
                    "Coex UDP-TX": excelData[i]['AV'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['AW'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['AX'],
                    "Coex UDP-RX": excelData[i]['AY'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['AZ'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['BA'],

                }
                let HT_20MHz_24Ghz = {
                    'Wlan Baseline': HT_20MHz_24Ghz_wlan,
                    'COEX_Performance': HT_20MHz_24Ghz_BT,
                    "BT RSSI": excelData[i]['BB'],
                    "Wi-Fi RSSI": excelData[i]['BC']

                }

                let HE_20MHz_24Ghz_wlan = {
                    "TCP_TX": excelData[i]['BE'],
                    "TCP_RX": excelData[i]['BF'],
                    "UDP_TX": excelData[i]['BG'],
                    "UDP_RX": excelData[i]['BH'],
                    "WiFi RSSI": excelData[i]['BI']
                }

                let HE_20MHz_24Ghz_BT = {
                    "Coex TCP-TX": excelData[i]['BJ'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['BK'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['BL'],
                    "Coex TCP-RX": excelData[i]['BM'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['BN'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['BO'],
                    "Coex UDP-TX": excelData[i]['BP'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['BQ'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['BR'],
                    "Coex UDP-RX": excelData[i]['BS'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['BT'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['BU'],

                }
                let HE_20MHz_24Ghz = {
                    'Wlan Baseline': HE_20MHz_24Ghz_wlan,
                    'COEX_Performance': HE_20MHz_24Ghz_BT,
                    "BT RSSI": excelData[i]['BV'],
                    "Wi-Fi RSSI": excelData[i]['BW']

                }

                let VHT_80MHz_5GHz_wlan = {
                    "TCP_TX": excelData[i]['BY'],
                    "TCP_RX": excelData[i]['BZ'],
                    "UDP_TX": excelData[i]['CA'],
                    "UDP_RX": excelData[i]['CB'],
                    "WiFi RSSI": excelData[i]['CC'],
                }

                let VHT_80MHz_5GHz_BT = {
                    "Coex TCP-TX": excelData[i]['CD'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['CE'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['CF'],
                    "Coex TCP-RX": excelData[i]['CG'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['CH'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['CI'],
                    "Coex UDP-TX": excelData[i]['CJ'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['CK'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['CL'],
                    "Coex UDP-RX": excelData[i]['CM'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['CN'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['CO'],

                }

                let VHT_80MHz_5GHz = {
                    'Wlan Baseline': VHT_80MHz_5GHz_wlan,
                    'COEX_Performance': VHT_80MHz_5GHz_BT,
                    "BT RSSI": excelData[i]['CP'],
                    "Wi-Fi RSSI": excelData[i]['CQ']

                }

                let HT_40MHz_24_Ghz_wlan = {
                    "TCP_TX": excelData[i]['DM'],
                    "TCP_RX": excelData[i]['DN'],
                    "UDP_TX": excelData[i]['DO'],
                    "UDP_RX": excelData[i]['DP'],
                    "WiFi RSSI": excelData[i]['DQ'],
                }

                let HT_40MHz_24_Ghz_BT = {
                    "Coex TCP-TX": excelData[i]['DR'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['DS'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['DT'],
                    "Coex TCP-RX": excelData[i]['DU'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['DV'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['DW'],
                    "Coex UDP-TX": excelData[i]['DX'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['DY'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['DZ'],
                    "Coex UDP-RX": excelData[i]['EA'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['EB'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['EC'],

                }

                let HT_40MHz_24_Ghz = {
                    'Wlan Baseline': HT_40MHz_24_Ghz_wlan,
                    'COEX_Performance': HT_40MHz_24_Ghz_BT,
                    "BT RSSI": excelData[i]['ED'],
                    "Wi-Fi RSSI": excelData[i]['EF']
                }


                let HE_40MHz_5_Ghz_wlan = {
                    "TCP_TX": excelData[i]['FU'],
                    "TCP_RX": excelData[i]['FV'],
                    "UDP_TX": excelData[i]['FW'],
                    "UDP_RX": excelData[i]['FX'],
                    "WiFi RSSI": excelData[i]['FY'],
                }

                let HE_40MHz_5_Ghz_BT = {
                    "Coex TCP-TX": excelData[i]['FZ'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['GA'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['GB'],
                    "Coex TCP-RX": excelData[i]['GC'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['GD'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['GE'],
                    "Coex UDP-TX": excelData[i]['GF'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['GG'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['GH'],
                    "Coex UDP-RX": excelData[i]['GI'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['GJ'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['GK'],

                }
                let HE_40MHz_5_Ghz = {
                    'Wlan Baseline': HE_40MHz_5_Ghz_wlan,
                    'COEX_Performance': HE_40MHz_5_Ghz_BT,
                    "BT RSSI": excelData[i]['GL'],
                    "Wi-Fi RSSI": excelData[i]['GM']
                }

                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    '" DUT Fw/Drv"': excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "Aggregation": excelData[i]['J'],
                    "Spatial Streams": excelData[i]['K'],
                    "Guard Interval": excelData[i]['L'],
                    "Data Rate": excelData[i]['M'],
                    "Channel | 2 GHz": excelData[i]['N'],
                    "Channel | 5 GHz": excelData[i]['O'],
                    "SDIO Clock": excelData[i]['P'],
                    "Companion Device/": excelData[i]['Q'],
                    "Companion Device FW/Drv": excelData[i]['R'],
                    "Host Platform": excelData[i]['S'],
                    "OS": excelData[i]['T'],
                    "Security": excelData[i]['U'],
                    "BT Ref": excelData[i]['V'],
                    "Coex mode": excelData[i]['W'],
                    "ANT isolation": excelData[i]['X'],
                    "BT profiles": excelData[i]['Y'],
                    "BT/BLE Role": excelData[i]['Z'],
                    "Profile Param": excelData[i]['AA'],
                    "Connection param": excelData[i]['AB'],
                    "BT Sniff": excelData[i]['AC'],
                    "Test Duration": excelData[i]['AD'],
                    "Test Repetition": excelData[i]['AE'],
                    "BT Baseline #1": excelData[i]['AG'],
                    "BT Baseline #2": excelData[i]['AH'],
                    "BT RSSI": excelData[i]['AI'],
                    "BT Baseline": excelData[i]['AJ'],
                    "HT-20MHz | 2GHz": HT_20MHz_24Ghz,
                    "HE-20MHz | 2GHz": HE_20MHz_24Ghz,
                    "VHT / HE-80MHz | 5GHz": VHT_80MHz_5GHz,
                    "HT / HE-40MHz  | 2GHz": HT_40MHz_24_Ghz,
                    "HT / HE-40MHz  | 5GHz": HE_40MHz_5_Ghz,
                    "Comments": excelData[i]['GO']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}


/** Generic Function for Upload test executions Multiheader templates STA-Coex-TP*/
async function STA_Coex_TPUploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);
        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(25, excelHeader.length - 25);
        headers.header[0].splice(25, headers.header[0].length - 25);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 4; i < excelData.length; i++) {

                let WlanBaseline_20MHz_2 = {
                    "TCP_TX": excelData[i]['AK'],
                    "TCP_RX": excelData[i]['AL'],
                    "UDP_TX": excelData[i]['AM'],
                    "UDP_RX": excelData[i]['AN'],
                    "WiFi RSSI": excelData[i]['AO']
                };
                let Coexperformance_20MHz_2 = {
                    "Coex TCP-TX": excelData[i]['AP'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['AQ'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['AR'],
                    "Coex TCP-RX": excelData[i]['AS'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['AT'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['AU'],
                    "Coex UDP-TX": excelData[i]['AV'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['AW'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['AX'],
                    "Coex UDP-RX": excelData[i]['AY'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['AZ'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['BA']
                };

                let HT_20MHz_24Ghz = {
                    'Wlan Baseline': WlanBaseline_20MHz_2,
                    'COEX_Performance': Coexperformance_20MHz_2,
                    "BT RSSI": excelData[i]['BB'],
                    "WiFi RSSI": excelData[i]['BC']

                };


                let WlanBaseline_HE_20_2 = {
                    "TCP_TX": excelData[i]['BE'],
                    "TCP_RX": excelData[i]['BF'],
                    "UDP_TX": excelData[i]['BG'],
                    "UDP_RX": excelData[i]['BH'],
                    "WiFi RSSI": excelData[i]['BI']
                };

                let Coexperformance_HE_20_2 = {
                    "Coex TCP-TX": excelData[i]['BJ'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['BK'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['BL'],
                    "Coex TCP-RX": excelData[i]['BM'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['BN'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['BO'],
                    "Coex UDP-TX": excelData[i]['BP'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['BQ'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['BR'],
                    "Coex UDP-RX": excelData[i]['BS'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['BT'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['BU']
                };


                let HE_20MHz_24Ghz = {
                    'Wlan Baseline': WlanBaseline_HE_20_2,
                    'COEX_Performance': Coexperformance_HE_20_2,
                    "BT RSSI": excelData[i]['BV'],
                    "Wi-Fi RSSI": excelData[i]['BW']
                };



                let WlanBaseline_VHT80_5 = {
                    "TCP_TX": excelData[i]['BY'],
                    "TCP_RX": excelData[i]['BZ'],
                    "UDP_TX": excelData[i]['CA'],
                    "UDP_RX": excelData[i]['CB'],
                    "WiFi RSSI": excelData[i]['CC']
                };

                let Coexperformance_VHT80_5 = {
                    "Coex TCP-TX": excelData[i]['CD'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['CE'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['CF'],
                    "Coex TCP-RX": excelData[i]['CG'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['CH'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['CI'],
                    "Coex UDP-TX": excelData[i]['CJ'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['CK'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['CL'],
                    "Coex UDP-RX": excelData[i]['CM'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['CN'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['CO']

                };
                let VHT_80MHz_5GHz = {
                    'Wlan Baseline': WlanBaseline_VHT80_5,
                    'COEX_Performance': Coexperformance_VHT80_5,
                    "BT RSSI": excelData[i]['CP'],
                    "Wi-Fi RSSI": excelData[i]['CQ']
                };


                let WlanBaseline_HT40_2 = {
                    "TCP_TX": excelData[i]['DM'],
                    "TCP_RX": excelData[i]['DN'],
                    "UDP_TX": excelData[i]['DO'],
                    "UDP_RX": excelData[i]['DP'],
                    "WiFi RSSI": excelData[i]['DQ']
                };

                let Coexperformance_HT40_2 = {
                    "Coex TCP-TX": excelData[i]['DR'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['DS'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['DT'],
                    "Coex TCP-RX": excelData[i]['DU'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['DV'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['DW'],
                    "Coex UDP-TX": excelData[i]['DX'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['DY'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['DZ'],
                    "Coex UDP-RX": excelData[i]['EA'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['EB'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['EC']

                };

                let HT_40MHz_24_Ghz = {
                    'Wlan Baseline': WlanBaseline_HT40_2,
                    'COEX_Performance': Coexperformance_HT40_2,
                    "BT RSSI": excelData[i]['ED'],
                    "Wi-Fi RSSI": excelData[i]['EE']
                };


                let WlanBaseline_HE80_5 = {
                    "TCP_TX": excelData[i]['EG'],
                    "TCP_RX": excelData[i]['EH'],
                    "UDP_TX": excelData[i]['EI'],
                    "UDP_RX": excelData[i]['EJ'],
                    "WiFi RSSI": excelData[i]['EK']
                };

                let Coexperformance_HE80_5 = {
                    "Coex TCP-TX": excelData[i]['EL'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['EM'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['EN'],
                    "Coex TCP-RX": excelData[i]['EO'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['EP'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['EQ'],
                    "Coex UDP-TX": excelData[i]['ER'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['ES'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['ET'],
                    "Coex UDP-RX": excelData[i]['EU'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['EV'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['EW']

                };

                let HE_80MHz_5GHz = {
                    'Wlan Baseline': WlanBaseline_HE80_5,
                    'COEX_Performance': Coexperformance_HE80_5,
                    "BT RSSI": excelData[i]['EX'],
                    "Wi-Fi RSSI": excelData[i]['EY']
                };


                let WlanBaseline_HT40_5 = {
                    "TCP_TX": excelData[i]['FA'],
                    "TCP_RX": excelData[i]['FB'],
                    "UDP_TX": excelData[i]['FC'],
                    "UDP_RX": excelData[i]['FD'],
                    "WiFi RSSI": excelData[i]['FE']
                };

                let Coexperformance_HT40_5 = {
                    "Coex TCP-TX": excelData[i]['FF'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['FG'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['FH'],
                    "Coex TCP-RX": excelData[i]['FI'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['FJ'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['FK'],
                    "Coex UDP-TX": excelData[i]['FL'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['FM'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['FN'],
                    "Coex UDP-RX": excelData[i]['FO'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['FP'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['FQ']

                };

                let HT_40MHz_5_Ghz = {
                    'Wlan Baseline': WlanBaseline_HT40_5,
                    'COEX_Performance': Coexperformance_HT40_5,
                    "BT RSSI": excelData[i]['FR'],
                    "Wi-Fi RSSI": excelData[i]['FS']
                };


                let WlanBaseline_HE40_5 = {
                    "TCP_TX": excelData[i]['FU'],
                    "TCP_RX": excelData[i]['FV'],
                    "UDP_TX": excelData[i]['FW'],
                    "UDP_RX": excelData[i]['FX'],
                    "WiFi RSSI": excelData[i]['FY']
                };

                let Coexperformance_HE40_5 = {
                    "Coex TCP-TX": excelData[i]['FZ'],
                    "CoexTCP-TX_BT Performance Result#1": excelData[i]['GA'],
                    "CoexTCP-TX_BT Performance Result#2": excelData[i]['GB'],
                    "Coex TCP-RX": excelData[i]['GC'],
                    "CoexTCP-RX_BT Performance Result#1": excelData[i]['GD'],
                    "CoexTCP-RX_BT Performance Result#2": excelData[i]['GE'],
                    "Coex UDP-TX": excelData[i]['GF'],
                    "CoexUDP-TX_BT Performance Result#1": excelData[i]['GG'],
                    "CoexUDP-TX_BT Performance Result#2": excelData[i]['GH'],
                    "Coex UDP-RX": excelData[i]['GI'],
                    "CoexUDP-RX_BT Performance Result#1": excelData[i]['GJ'],
                    "CoexUDP-RX_BT Performance Result#2": excelData[i]['GK']

                };


                let HE_40MHz_24_Ghz = {
                    'Wlan Baseline': WlanBaseline_HE40_5,
                    'COEX_Performance': Coexperformance_HE40_5,
                    "BT RSSI": excelData[i]['GL'],
                    "Wi-Fi RSSI": excelData[i]['GM']
                };

                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    '" DUT Fw/Drv"': excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "Aggregation": excelData[i]['J'],
                    "Spatial Streams": excelData[i]['K'],
                    "Guard Interval": excelData[i]['L'],
                    "Data Rate": excelData[i]['M'],
                    "Channel | 2 GHz": excelData[i]['N'],
                    "Channel | 5 GHz": excelData[i]['O'],
                    "SDIO Clock": excelData[i]['P'],
                    "Companion Device/": excelData[i]['Q'],
                    "Companion Device FW/Drv": excelData[i]['R'],
                    "Host Platform": excelData[i]['S'],
                    "OS": excelData[i]['T'],
                    "Security": excelData[i]['U'],
                    "BT Ref": excelData[i]['V'],
                    "Coex mode": excelData[i]['W'],
                    "ANT isolation": excelData[i]['X'],
                    "BT profiles": excelData[i]['Y'],
                    "BT/BLE Role": excelData[i]['Z'],
                    "Profile Param": excelData[i]['AA'],
                    "Connection param": excelData[i]['AB'],
                    "BT Sniff": excelData[i]['AC'],
                    "Test Duration": excelData[i]['AD'],
                    "Test Repetition": excelData[i]['AE'],
                    "BT Baseline #1": excelData[i]['AG'],
                    "BT Baseline #2": excelData[i]['AH'],
                    "BT RSSI": excelData[i]['AI'],
                    "BT Baseline": excelData[i]['AJ'],
                    "BT Baseline #1": excelData[i]['AG'],
                    "BT Baseline #2": excelData[i]['AH'],
                    "BT RSSI": excelData[i]['AI'],
                    "HT-20MHz | 2GHz": HT_20MHz_24Ghz,
                    "HE-20MHz | 2GHz": HE_20MHz_24Ghz,
                    "VHT / HE-80MHz | 5GHz": VHT_80MHz_5GHz,
                    "HT / HE-40MHz  | 2GHz": HT_40MHz_24_Ghz,
                    "HT / HE-40MHz  | 5GHz": HT_40MHz_5_Ghz,
                    "Comments": excelData[i]['GO']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            // console.log('len-data', throughput_data.length);
            // console.log(throughput_data)

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }
}


/** Generic Function for Upload test executions Multiheader templates Simul_TP_2INTF*/
async function Simul_TP_2INTFUploadFunc(CommonObj) { //Client-WLAN

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        let indexOfHeader = headers.header[0].indexOf("Sl.No");
        headers.header[0][indexOfHeader] = "S#N#";

        excelHeader.splice(26, excelHeader.length - 26);
        headers.header[0].splice(26, headers.header[0].length - 26);

        console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 6; i < excelData.length; i++) {

                let TCPheadTxTx = {
                    "INTF1": excelData[i]['AE'],
                    "INTF2": excelData[i]['AF']

                };
                let TCPheadTxRx = {
                    "INTF1": excelData[i]['AH'],
                    "INTF2": excelData[i]['AI']

                };
                let TCPheadRxRx = {
                    "INTF1": excelData[i]['AK'],
                    "INTF2": excelData[i]['AL']

                };
                let TCPheadRxTx = {
                    "INTF1": excelData[i]['AN'],
                    "INTF2": excelData[i]['AO']

                };
                let TCPHeadTXRX = {
                    'TXTX': TCPheadTxTx,
                    'TXRX': TCPheadTxRx,
                    "RXTX": TCPheadRxTx,
                    "RXRX": TCPheadRxRx
                };

                let UDPheadTxTx = {
                    "INTF1": excelData[i]['AQ'],
                    "INTF2": excelData[i]['AR']

                };
                let UDPheadTxRx = {
                    "INTF1": excelData[i]['AT'],
                    "INTF2": excelData[i]['AU']

                };
                let UDPheadRxRx = {
                    "INTF1": excelData[i]['AW'],
                    "INTF2": excelData[i]['AX']

                };
                let UDPheadRxTx = {
                    "INTF1": excelData[i]['AZ'],
                    "INTF2": excelData[i]['BA']

                };
                let UDPHeadTXRX = {
                    'TXTX': UDPheadTxTx,
                    'TXRX': UDPheadTxRx,
                    "RXTX": UDPheadRxTx,
                    "RXRX": UDPheadRxRx
                };

                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    'DUT Fw/Drv': excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "SDIO Clock": excelData[i]['J'],
                    "Aggregation": excelData[i]['K'],
                    "Spatial Streams": excelData[i]['L'],
                    "Guard_Interval": excelData[i]['M'],
                    "Data Rate": excelData[i]['N'],
                    "Connectivity Modes": excelData[i]['O'],
                    "Companion Device1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['P'],
                    "Companion Device1 FW/Drv": excelData[i]['Q'],
                    "Companion Device2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['R'],
                    "Companion Device2 FW/Drv": excelData[i]['S'],
                    "DUT Host Platform": excelData[i]['T'],
                    "DUT OS": excelData[i]['U'],
                    "INTF1 Configuration": excelData[i]['V'],
                    "Channel | INTF 1": excelData[i]['W'],
                    "INTF2 Configuration": excelData[i]['X'],
                    "Channel | INTF 2": excelData[i]['Y'],
                    "DRCS Timing Configuration Duty Cycle | INTF1 | INTF2": excelData[i]['Z'],
                    "Misc": excelData[i]['AA'],
                    "Security": excelData[i]['AB'],
                    "Test Repetition": excelData[i]['AC'],
                    "TCP": TCPHeadTXRX,
                    "UDP": UDPHeadTXRX,
                    "Comments": excelData[i]['BC']

                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates Coex_Simul_TP_2INTF*/
async function CoexSimul_TP_2INTFUploadFunc(CommonObj) { //Client-WLAN Coex_Simul_TP_2INTF

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);
        console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(26, excelHeader.length - 26);
        headers.header[0].splice(26, headers.header[0].length - 26);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 7; i < excelData.length; i++) {

                let TCPPerformanceTXTX = {
                    'INTF1': excelData[i]['BR'],
                    'INTF2': excelData[i]['BS'],
                    'BT Performance Result#1': excelData[i]['BT'],
                    'BT Performance Result#2': excelData[i]['BU']
                };

                let TCPPerformanceTXRX = {
                    'INTF1': excelData[i]['BW'],
                    'INTF2': excelData[i]['BX'],
                    'BT Performance Result#1': excelData[i]['BY'],
                    'BT Performance Result#2': excelData[i]['BZ']
                };

                let TCPPerformanceRXTX = {
                    'INTF1': excelData[i]['CB'],
                    'INTF2': excelData[i]['CC'],
                    'BT Performance Result#1': excelData[i]['CD'],
                    'BT Performance Result#2': excelData[i]['CE']
                };

                let TCPPerformanceRXRX = {
                    'INTF1': excelData[i]['CG'],
                    'INTF2': excelData[i]['CH'],
                    'BT Performance Result#1': excelData[i]['CI'],
                    'BT Performance Result#2': excelData[i]['CJ']
                };

                let headTCP_CoexPerformance = {
                    'TxTx': TCPPerformanceTXTX,
                    'TxRx': TCPPerformanceTXRX,
                    'RxTx': TCPPerformanceRXTX,
                    'RxRx': TCPPerformanceRXRX
                };

                let UDPPerformanceTXTX = {
                    'INTF1': excelData[i]['CL'],
                    'INTF2': excelData[i]['CM'],
                    'BT Performance Result#1': excelData[i]['CN'],
                    'BT Performance Result#2': excelData[i]['CO']
                };

                let UDPPerformanceTXRX = {
                    'INTF1': excelData[i]['CQ'],
                    'INTF2': excelData[i]['CR'],
                    'BT Performance Result#1': excelData[i]['CS'],
                    'BT Performance Result#2': excelData[i]['CT']
                };

                let UDPPerformanceRXTX = {
                    'INTF1': excelData[i]['CV'],
                    'INTF2': excelData[i]['CW'],
                    'BT Performance Result#1': excelData[i]['CX'],
                    'BT Performance Result#2': excelData[i]['CY']
                };

                let UDPPerformanceRXRX = {
                    'INTF1': excelData[i]['DA'],
                    'INTF2': excelData[i]['DB'],
                    'BT Performance Result#1': excelData[i]['DC'],
                    'BT Performance Result#2': excelData[i]['DD']
                };

                let headUDP_CoexPerformance = {
                    'TxTx': UDPPerformanceTXTX,
                    'TxRx': UDPPerformanceTXRX,
                    'RxTx': UDPPerformanceRXTX,
                    'RxRx': UDPPerformanceRXRX
                };


                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    'DUT Fw/Drv': excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "SDIO Clock [MHz]": excelData[i]['J'],
                    "Aggregation": excelData[i]['K'],
                    "Spatial Streams": excelData[i]['L'],
                    "Guard Interval": excelData[i]['M'],
                    "Data Rate": excelData[i]['N'],
                    "Connectivity Modes": excelData[i]['O'],
                    "INTF1 | Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['P'],
                    "INTF1 | Companion Device 1 FW/Drv": excelData[i]['Q'],
                    "INTF2 | Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['R'],
                    "INTF2 | Companion Device 1 FW/Drv": excelData[i]['S'],
                    "DUT Host Platform": excelData[i]['T'],
                    "DUT OS": excelData[i]['U'],
                    "INTF 1 Configuration": excelData[i]['V'],
                    "Channel | INTF 1": excelData[i]['W'],
                    "INTF 2 Configuration": excelData[i]['X'],
                    "Channel | INTF 2": excelData[i]['Y'],
                    "DRCS Timing Configuration Duty Cycle | INTF1 | INTF2": excelData[i]['Z'],
                    "Misc": excelData[i]['AA'],
                    "Security": excelData[i]['AB'],
                    "BT Ref": excelData[i]['AC'],
                    'Coex mode': excelData[i]['AD'],
                    'ANT isolation': excelData[i]['AE'],
                    'BT profiles': excelData[i]['AF'],
                    'BT/BLE Role': excelData[i]['AG'],
                    'Profile Param': excelData[i]['AH'],
                    'Connection param': excelData[i]['AI'],
                    'BT Sniff': excelData[i]['AJ'],
                    'Test Duration': excelData[i]['AK'],
                    'Test Repetition': excelData[i]['AL'],
                    'BT Baseline #1': excelData[i]['AN'],
                    'BT Baseline #2': excelData[i]['AO'],
                    'Wi-Fi Baseline1': excelData[i]['AQ'],
                    'BT RSSI': excelData[i]['AD'],

                    //"TCP Baseline": TCP_Baseline,
                    'TCP-TxTx_INTF1': excelData[i]['AR'],
                    'TCP-TxTx_INTF2': excelData[i]['AS'],
                    'TCP-TxRx_INTF1': excelData[i]['AU'],
                    'TCP-TxRx_INTF2': excelData[i]['AV'],
                    'TCP-RxTx_INTF1': excelData[i]['AX'],
                    'TCP-RxTx_INTF2': excelData[i]['AY'],
                    'TCP-RxRx_INTF1': excelData[i]['BA'],
                    'TCP-RxRx_INTF2': excelData[i]['BB'],

                    'Wi-Fi Baseline2': excelData[i]['BC'],

                    //"UDP Baseline": UDP_Baseline,
                    'UDP-TxTx_INTF1': excelData[i]['BD'],
                    'UDP-TxTx_INTF2': excelData[i]['BE'],
                    'UDP-TxRx_INTF1': excelData[i]['BG'],
                    'UDP-TxRx_INTF2': excelData[i]['BH'],
                    'UDP-RxTx_INTF1': excelData[i]['BJ'],
                    'UDP-RxTx_INTF2': excelData[i]['BK'],
                    'UDP-RxRx_INTF1': excelData[i]['BM'],
                    'UDP-RxRx_INTF2': excelData[i]['BN'],

                    'Wi-Fi Intf 1 RSSI': excelData[i]['BO'],
                    'Wi-Fi Intf 2 RSSI': excelData[i]['BP'],
                    "Coex Performance1": excelData[i]['BQ'],
                    "Coex Performance2": excelData[i]['CK'],
                    "TCP Coex Performance": headTCP_CoexPerformance,
                    "UDP Coex Performance": headUDP_CoexPerformance,
                    "BT RSSI": excelData[i]['DE'],
                    "Wi-Fi Intf_1 RSSI": excelData[i]['DF'],
                    "Wi-Fi Intf_2 RSSI": excelData[i]['DG'],
                    "Comments": excelData[i]['DH']

                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }
}


/** Generic Function for Upload test executions Multiheader templates Coex_Simul_TP_3INTF*/
async function CoexSimul_TP_3INTFUploadFunc(CommonObj) { //Client-WLAN Coex_Simul_TP_3INTF

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(26, excelHeader.length - 26);
        headers.header[0].splice(26, headers.header[0].length - 26);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 7; i < excelData.length; i++) {

                let TCPPerformanceTXTXTX = {
                    'INTF1': excelData[i]['DK'],
                    'INTF2': excelData[i]['DL'],
                    'INTF3': excelData[i]['DM'],
                    'BT Performance Result#1': excelData[i]['DN'],
                    'BT Performance Result#2': excelData[i]['DO']
                };

                let TCPPerformanceTXTXRX = {
                    'INTF1': excelData[i]['DQ'],
                    'INTF2': excelData[i]['DR'],
                    'INTF3': excelData[i]['DS'],
                    'BT Performance Result#1': excelData[i]['DT'],
                    'BT Performance Result#2': excelData[i]['DU']
                };

                let TCPPerformanceTXRXTX = {
                    'INTF1': excelData[i]['DW'],
                    'INTF2': excelData[i]['DX'],
                    'INTF3': excelData[i]['DY'],
                    'BT Performance Result#1': excelData[i]['DZ'],
                    'BT Performance Result#2': excelData[i]['EA']
                };

                let TCPPerformanceTXRXRX = {
                    'INTF1': excelData[i]['EC'],
                    'INTF2': excelData[i]['ED'],
                    'INTF3': excelData[i]['EE'],
                    'BT Performance Result#1': excelData[i]['EF'],
                    'BT Performance Result#2': excelData[i]['EG']
                };
                let TCPPerformanceRXTXTX = {
                    'INTF1': excelData[i]['EI'],
                    'INTF2': excelData[i]['EJ'],
                    'INTF3': excelData[i]['EK'],
                    'BT Performance Result#1': excelData[i]['EL'],
                    'BT Performance Result#2': excelData[i]['EM']
                };
                let TCPPerformanceRXTXRX = {
                    'INTF1': excelData[i]['EO'],
                    'INTF2': excelData[i]['EP'],
                    'INTF3': excelData[i]['EQ'],
                    'BT Performance Result#1': excelData[i]['ER'],
                    'BT Performance Result#2': excelData[i]['ES']
                };
                let TCPPerformanceRXRXTX = {
                    'INTF1': excelData[i]['EU'],
                    'INTF2': excelData[i]['EV'],
                    'INTF3': excelData[i]['EW'],
                    'BT Performance Result#1': excelData[i]['EX'],
                    'BT Performance Result#2': excelData[i]['EY']
                };
                let TCPPerformanceRXRXRX = {
                    'INTF1': excelData[i]['FA'],
                    'INTF2': excelData[i]['FB'],
                    'INTF3': excelData[i]['FC'],
                    'BT Performance Result#1': excelData[i]['FD'],
                    'BT Performance Result#2': excelData[i]['FE']
                };
                let headTCP_CoexPerformance = {
                    'TxTxTx': TCPPerformanceTXTXTX,
                    'TxTxRx': TCPPerformanceTXTXRX,
                    'TxRxTx': TCPPerformanceTXRXTX,
                    'TxRxRx': TCPPerformanceTXRXRX,
                    'RxTxTx': TCPPerformanceRXTXTX,
                    'RxTxRx': TCPPerformanceRXTXRX,
                    'RxRxTx': TCPPerformanceRXRXTX,
                    'RxRxRx': TCPPerformanceRXRXRX
                };

                let UDPPerformanceTXTXTX = {
                    'INTF1': excelData[i]['FG'],
                    'INTF2': excelData[i]['FH'],
                    'INTF3': excelData[i]['FI'],
                    'BT Performance Result#1': excelData[i]['FJ'],
                    'BT Performance Result#2': excelData[i]['FK']
                };

                let UDPPerformanceTXTXRX = {
                    'INTF1': excelData[i]['FM'],
                    'INTF2': excelData[i]['FN'],
                    'INTF3': excelData[i]['FO'],
                    'BT Performance Result#1': excelData[i]['FP'],
                    'BT Performance Result#2': excelData[i]['FQ']
                };

                let UDPPerformanceTXRXTX = {
                    'INTF1': excelData[i]['FS'],
                    'INTF2': excelData[i]['FT'],
                    'INTF3': excelData[i]['FU'],
                    'BT Performance Result#1': excelData[i]['FV'],
                    'BT Performance Result#2': excelData[i]['FW']
                };

                let UDPPerformanceTXRXRX = {
                    'INTF1': excelData[i]['FY'],
                    'INTF2': excelData[i]['FZ'],
                    'INTF3': excelData[i]['GA'],
                    'BT Performance Result#1': excelData[i]['GB'],
                    'BT Performance Result#2': excelData[i]['GC']
                };
                let UDPPerformanceRXTXTX = {
                    'INTF1': excelData[i]['GE'],
                    'INTF2': excelData[i]['GF'],
                    'INTF3': excelData[i]['GG'],
                    'BT Performance Result#1': excelData[i]['GH'],
                    'BT Performance Result#2': excelData[i]['GI']
                };
                let UDPPerformanceRXTXRX = {
                    'INTF1': excelData[i]['GK'],
                    'INTF2': excelData[i]['GL'],
                    'INTF3': excelData[i]['GM'],
                    'BT Performance Result#1': excelData[i]['GN'],
                    'BT Performance Result#2': excelData[i]['GO']
                };
                let UDPPerformanceRXRXTX = {
                    'INTF1': excelData[i]['GQ'],
                    'INTF2': excelData[i]['GR'],
                    'INTF3': excelData[i]['GS'],
                    'BT Performance Result#1': excelData[i]['GT'],
                    'BT Performance Result#2': excelData[i]['GU']
                };
                let UDPPerformanceRXRXRX = {
                    'INTF1': excelData[i]['GW'],
                    'INTF2': excelData[i]['GX'],
                    'INTF3': excelData[i]['GY'],
                    'BT Performance Result#1': excelData[i]['GZ'],
                    'BT Performance Result#2': excelData[i]['HA']
                };
                let headUDP_CoexPerformance = {
                    'TxTxTx': UDPPerformanceTXTXTX,
                    'TxTxRx': UDPPerformanceTXTXRX,
                    'TxRxTx': UDPPerformanceTXRXTX,
                    'TxRxRx': UDPPerformanceTXRXRX,
                    'RxTxTx': UDPPerformanceRXTXTX,
                    'RxTxRx': UDPPerformanceRXTXRX,
                    'RxRxTx': UDPPerformanceRXRXTX,
                    'RxRxRx': UDPPerformanceRXRXRX
                };



                arrColValues = {
                    "S#N#": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    'DUT Fw/Drv': excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "SDIO Clock [MHz]": excelData[i]['J'],
                    "Aggregation": excelData[i]['K'],
                    "Spatial Streams": excelData[i]['L'],
                    "Guard Interval": excelData[i]['M'],
                    "Data Rate": excelData[i]['N'],
                    "Connectivity Modes": excelData[i]['O'],
                    "Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['P'],
                    "Companion Device 1 FW/Drv": excelData[i]['Q'],
                    "Companion Device 2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['R'],
                    "Companion Device 2 FW/Drv": excelData[i]['S'],
                    "Companion Device 3/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['T'],
                    "Companion Device 3 FW/Drv": excelData[i]['U'],
                    "DUT Host Platform": excelData[i]['V'],
                    "DUT OS": excelData[i]['W'],
                    "INTF 1 Configuration": excelData[i]['X'],
                    "Channel | INTF 1": excelData[i]['Y'],
                    "INTF 2 Configuration": excelData[i]['Z'],
                    "Channel | INTF 2": excelData[i]['AA'],
                    "INTF 3 Configuration": excelData[i]['AB'],
                    "Channel | INTF 3": excelData[i]['AC'],
                    "DRCS Timing Configuration Duty Cycle | INTF1 | INTF2": excelData[i]['AD'],
                    "Misc": excelData[i]['AE'],
                    "Security": excelData[i]['AF'],
                    "BT Ref": excelData[i]['AG'],
                    'Coex mode': excelData[i]['AH'],
                    'ANT isolation': excelData[i]['AI'],
                    'BT profiles': excelData[i]['AJ'],
                    'BT/BLE Role': excelData[i]['AK'],
                    'Profile Param': excelData[i]['AL'],
                    'Connection param': excelData[i]['AM'],
                    'BT Sniff': excelData[i]['AN'],
                    'Test Duration': excelData[i]['AO'],
                    'Test Repetition': excelData[i]['AP'],
                    'BT Baseline #1': excelData[i]['AR'],
                    'BT Baseline #2': excelData[i]['AS'],
                    'BT RSSI': excelData[i]['AT'],
                    //"TCP Baseline": TCP_Baseline,
                    'TCP-TxTxTx_INTF1': excelData[i]['AV'],
                    'TCP-TxTxTx_INTF2': excelData[i]['AW'],
                    'TCP-TxTxTx_INTF3': excelData[i]['AX'],
                    'TCP-TxTxRx_INTF1': excelData[i]['AZ'],
                    'TCP-TxTxRx_INTF2': excelData[i]['BA'],
                    'TCP-TxTxRx_INTF3': excelData[i]['BB'],
                    'TCP-TxRxTx_INTF1': excelData[i]['BD'],
                    'TCP-TxRxTx_INTF2': excelData[i]['BE'],
                    'TCP-TxRxTx_INTF3': excelData[i]['BF'],
                    'TCP-TxRxRx_INTF1': excelData[i]['BH'],
                    'TCP-TxRxRx_INTF2': excelData[i]['BI'],
                    'TCP-TxRxRx_INTF3': excelData[i]['BJ'],
                    'TCP-RxTxTx_INTF1': excelData[i]['BL'],
                    'TCP-RxTxTx_INTF2': excelData[i]['BM'],
                    'TCP-RxTxTx_INTF3': excelData[i]['BN'],
                    'TCP-RxTxRx_INTF1': excelData[i]['BP'],
                    'TCP-RxTxRx_INTF2': excelData[i]['BQ'],
                    'TCP-RxTxRx_INTF3': excelData[i]['BR'],
                    'TCP-RxRxTx_INTF1': excelData[i]['BT'],
                    'TCP-RxRxTx_INTF2': excelData[i]['BU'],
                    'TCP-RxRxTx_INTF3': excelData[i]['BV'],
                    'TCP-RxRxRx_INTF1': excelData[i]['BX'],
                    'TCP-RxRxRx_INTF2': excelData[i]['BY'],
                    'TCP-RxRxRx_INTF3': excelData[i]['BZ'],

                    'Wi-Fi Baseline1': excelData[i]['AU'],
                    'Wi-Fi Baseline2': excelData[i]['CA'],
                    "Coex Performance1": excelData[i]['DJ'],
                    "Coex Performance2": excelData[i]['FF'],

                    //"UDP Baseline": UDP_Baseline,
                    'UDP-TxTxTx_INTF1': excelData[i]['CB'],
                    'UDP-TxTxTx_INTF2': excelData[i]['CC'],
                    'UDP-TxTxTx_INTF3': excelData[i]['CD'],
                    'UDP-TxTxRx_INTF1': excelData[i]['CF'],
                    'UDP-TxTxRx_INTF2': excelData[i]['CG'],
                    'UDP-TxTxRx_INTF3': excelData[i]['CH'],
                    'UDP-TxRxTx_INTF1': excelData[i]['CJ'],
                    'UDP-TxRxTx_INTF2': excelData[i]['CK'],
                    'UDP-TxRxTx_INTF3': excelData[i]['CL'],
                    'UDP-TxRxRx_INTF1': excelData[i]['CN'],
                    'UDP-TxRxRx_INTF2': excelData[i]['CO'],
                    'UDP-TxRxRx_INTF3': excelData[i]['CP'],
                    'UDP-RxTxTx_INTF1': excelData[i]['CR'],
                    'UDP-RxTxTx_INTF2': excelData[i]['CS'],
                    'UDP-RxTxTx_INTF3': excelData[i]['CT'],
                    'UDP-RxTxRx_INTF1': excelData[i]['CV'],
                    'UDP-RxTxRx_INTF2': excelData[i]['CW'],
                    'UDP-RxTxRx_INTF3': excelData[i]['CX'],
                    'UDP-RxRxTx_INTF1': excelData[i]['CZ'],
                    'UDP-RxRxTx_INTF2': excelData[i]['DA'],
                    'UDP-RxRxTx_INTF3': excelData[i]['DB'],
                    'UDP-RxRxRx_INTF1': excelData[i]['DD'],
                    'UDP-RxRxRx_INTF2': excelData[i]['DE'],
                    'UDP-RxRxRx_INTF3': excelData[i]['DF'],

                    'Wi-Fi Intf 1 RSSI': excelData[i]['DG'],
                    'Wi-Fi Intf 2 RSSI': excelData[i]['DH'],
                    'Wi-Fi Intf 3 RSSI': excelData[i]['DI'],
                    "TCP Coex Performance": headTCP_CoexPerformance,
                    "UDP Coex Performance": headUDP_CoexPerformance,
                    "BT RSSI": excelData[i]['HB'],
                    "Wi-Fi Intf_1 RSSI": excelData[i]['HC'],
                    "Wi-Fi Intf_2 RSSI": excelData[i]['HD'],
                    "Wi-Fi Intf_3 RSSI": excelData[i]['HE'],
                    "Comments": excelData[i]['HG']

                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates BT_MOS_FUploadFunc*/
async function BT_MOS_FUploadFunc(CommonObj) { //BT_MOS_FUploadFunc

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        //console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(16, excelHeader.length - 16);
        headers.header[0].splice(16, headers.header[0].length - 16);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 3; i < excelData.length; i++) {

                let MOS_Score = {
                    "Tx": excelData[i]['R'],
                    "Rx": excelData[i]['S']
                };

                arrColValues = {
                    'DUT': excelData[i]['B'],
                    "SoC Version": excelData[i]['C'],
                    "SoC Type": excelData[i]['D'],
                    "DUT FW": excelData[i]['E'],
                    "Interface": excelData[i]['F'],
                    "DUT OS": excelData[i]['G'],
                    "DUT Host Platform": excelData[i]['H'],
                    "Audio path": excelData[i]['I'],
                    "HFP Interface": excelData[i]['J'],
                    "DUT Controller Role wrt Codec (Master/Slave)": excelData[i]['K'],
                    "DUT BT Role(Master/ Role)": excelData[i]['L'],
                    "Packet Type": excelData[i]['M'],
                    "Retransmission": excelData[i]['N'],
                    "Max Latency": excelData[i]['O'],
                    "Air mode": excelData[i]['P'],
                    "Mos baseline": excelData[i]['Q'],
                    "Mos score": MOS_Score
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            console.log('len-data', throughput_data.length);
            console.log(throughput_data)

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates BT_MOS_FUploadFunc*/
async function BT_Dual_HFPFUploadFunc(CommonObj) { //BT_Dual_HFPFFUploadFunc

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        let indexOfHeader = headers.header[0].indexOf("Audio Path");
        headers.header[0][indexOfHeader] = "Audio path";

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });
        excelHeader.shift();
        excelHeader.splice(20, excelHeader.length - 20);
        headers.header[0].splice(20, headers.header[0].length - 20);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 3; i < excelData.length; i++) {

                let Link1MOS_Score = {
                    "Tx": excelData[i]['V'],
                    "Rx": excelData[i]['W']
                };

                let Link2MOS_Score = {
                    "Tx": excelData[i]['X'],
                    "Rx": excelData[i]['Y']
                };

                arrColValues = {
                    'DUT': excelData[i]['B'],
                    'SoC Version': excelData[i]['C'],
                    'SoC Type': excelData[i]['D'],
                    'DUT FW': excelData[i]['E'],
                    'Interface': excelData[i]['F'],
                    'DUT OS': excelData[i]['G'],
                    'DUT Host Platform': excelData[i]['H'],
                    'Audio path': excelData[i]['I'],
                    'Link-1 HFP Interface': excelData[i]['J'],
                    'Link-2 HFP Interface': excelData[i]['K'],
                    'DUT Controller Role wrt Codec(Master/Slave)': excelData[i]['L'],
                    'Link-1 DUT BT Role(Master/Slave)': excelData[i]['M'],
                    'Link-2 DUT BT Role(Master/Slave)': excelData[i]['N'],
                    'Link-1 Packet Type': excelData[i]['O'],
                    'Link-2 Packet Type': excelData[i]['P'],
                    'Link-1 Retransmission': excelData[i]['Q'],
                    'Link-2 Retransmission': excelData[i]['R'],
                    'Link-1 Max Latency': excelData[i]['S'],
                    'Link-2 Max Latency': excelData[i]['T'],
                    'MOS Baseline': excelData[i]['U'],
                    'Link-1 MOS Score': Link1MOS_Score,
                    'Link-2 MOS Score': Link2MOS_Score
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }

}


/** Generic Function for Upload test executions Multiheader templates BT_RvRFUploadFunc*/
async function BT_RvRFUploadFunc(CommonObj) { //BT_RvRFUploadFunc

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 1);
        //console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header = headers.header.map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });


        let indexOfHeader = headers.header.indexOf('BLEAttn(InputAttenuationincludingPathLoss)');
        headers.header[indexOfHeader] = 'BTAttn(InputAttenuationincludingPathLoss)';
        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(11, excelHeader.length - 11);
        headers.header.splice(11, headers.header.length - 11);

        //console.log('DB Header --', headers.header);
        console.log('DB Header Size --', headers.header.length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header, excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};


            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 3; i < excelData.length; i = i + 2) {

                arrColValues = {
                    'Test scenario': excelData[i]['B'],
                    'DUT': excelData[i]['C'],
                    'SoC Version': excelData[i]['D'],
                    'SoC Type': excelData[i]['E'],
                    'DUT FW': excelData[i]['F'],
                    'Interface': excelData[i]['G'],
                    'DUT OS': excelData[i]['H'],
                    'DUT Host Platform': excelData[i]['I'],
                    'DUT (Master/Slave)': excelData[i]['J'],
                    'DUT (Tx/Rx)': excelData[i]['K'],
                    //'BT Attn (Input Attenuation including Path Loss)': excelData[i]['L'],
                    "BLE Attn ": excelData[i]['L'], // excelData[i]['I']],
                    "20": {
                        "Rssi": excelData[i]['M'],
                        "Throughput": excelData[i + 1]['M']
                    },
                    "41": {
                        "Rssi": excelData[i]['N'],
                        "Throughput": excelData[i + 1]['N']
                    },
                    "51": {
                        "Rssi": excelData[i]['O'],
                        "Throughput": excelData[i + 1]['O']
                    },
                    "56": {
                        "Rssi": excelData[i]['P'],
                        "Throughput": excelData[i + 1]['P']
                    },
                    "61": {
                        "Rssi": excelData[i]['Q'],
                        "Throughput": excelData[i + 1]['Q']
                    },
                    "66": {
                        "Rssi": excelData[i]['R'],
                        "Throughput": excelData[i + 1]['R']
                    },
                    "71": {
                        "Rssi": excelData[i]['S'],
                        "Throughput": excelData[i + 1]['S']
                    },
                    "72": {
                        "Rssi": excelData[i]['T'],
                        "Throughput": excelData[i + 1]['T']
                    },
                    "73": {
                        "Rssi": excelData[i]['U'],
                        "Throughput": excelData[i + 1]['U']
                    },
                    "74": {
                        "Rssi": excelData[i]['V'],
                        "Throughput": excelData[i + 1]['V']
                    },
                    "75": {
                        "Rssi": excelData[i]['W'],
                        "Throughput": excelData[i + 1]['W']
                    },
                    "76": {
                        "Rssi": excelData[i]['X'],
                        "Throughput": excelData[i + 1]['X']
                    },
                    "77": {
                        "Rssi": excelData[i]['Y'],
                        "Throughput": excelData[i + 1]['Y']
                    },
                    "78": {
                        "Rssi": excelData[i]['Z'],
                        "Throughput": excelData[i + 1]['Z']
                    },
                    "79": {
                        "Rssi": excelData[i]['AA'],
                        "Throughput": excelData[i + 1]['AA']
                    },
                    "80": {
                        "Rssi": excelData[i]['AB'],
                        "Throughput": excelData[i + 1]['AB']
                    },
                    "81": {
                        "Rssi": excelData[i]['AC'],
                        "Throughput": excelData[i + 1]['AC']
                    },
                    "82": {
                        "Rssi": excelData[i]['AD'],
                        "Throughput": excelData[i + 1]['AD']
                    },
                    "83": {
                        "Rssi": excelData[i]['AE'],
                        "Throughput": excelData[i + 1]['AE']
                    },
                    "84": {
                        "Rssi": excelData[i]['AF'],
                        "Throughput": excelData[i + 1]['AF']
                    },
                    "85": {
                        "Rssi": excelData[i]['AG'],
                        "Throughput": excelData[i + 1]['AG']
                    },
                    "86": {
                        "Rssi": excelData[i]['AH'],
                        "Throughput": excelData[i + 1]['AH']
                    },
                    "87": {
                        "Rssi": excelData[i]['AI'],
                        "Throughput": excelData[i + 1]['AI']
                    },

                    "88": {
                        "Rssi": excelData[i]['AJ'],
                        "Throughput": excelData[i + 1]['AJ']
                    },
                    "89": {
                        "Rssi": excelData[i]['AK'],
                        "Throughput": excelData[i + 1]['AK']
                    },
                    "90": {
                        "Rssi": excelData[i]['AL'],
                        "Throughput": excelData[i + 1]['AL']
                    },
                    "91": {
                        "Rssi": excelData[i]['AM'],
                        "Throughput": excelData[i + 1]['AM']
                    },
                    "92": {
                        "Rssi": excelData[i]['AN'],
                        "Throughput": excelData[i + 1]['AN']
                    },
                    "93": {
                        "Rssi": excelData[i]['AO'],
                        "Throughput": excelData[i + 1]['AO']
                    },
                    "94": {
                        "Rssi": excelData[i]['AP'],
                        "Throughput": excelData[i + 1]['AP']
                    },
                    "95": {
                        "Rssi": excelData[i]['AQ'],
                        "Throughput": excelData[i + 1]['AQ']
                    },
                    "96": {
                        "Rssi": excelData[i]['AR'],
                        "Throughput": excelData[i + 1]['AR']
                    },
                    "97": {
                        "Rssi": excelData[i]['AS'],
                        "Throughput": excelData[i + 1]['AS']
                    },
                    "98": {
                        "Rssi": excelData[i]['AT'],
                        "Throughput": excelData[i + 1]['AT']
                    },
                    "99": {
                        "Rssi": excelData[i]['AU'],
                        "Throughput": excelData[i + 1]['AV']
                    },
                    "100": {
                        "Rssi": excelData[i]['AV'],
                        "Throughput": excelData[i + 1]['AV']
                    },
                    "101": {
                        "Rssi": excelData[i]['AW'],
                        "Throughput": excelData[i + 1]['AW']
                    },
                    "102": {
                        "Rssi": excelData[i]['AX'],
                        "Throughput": excelData[i + 1]['AX']
                    },
                    "103": {
                        "Rssi": excelData[i]['AY'],
                        "Throughput": excelData[i + 1]['AY']
                    },
                    "104": {
                        "Rssi": excelData[i]['AZ'],
                        "Throughput": excelData[i + 1]['AZ']
                    },
                    "105": {
                        "Rssi": excelData[i]['BA'],
                        "Throughput": excelData[i + 1]['BA']
                    },
                    "106": {
                        "Rssi": excelData[i]['BB'],
                        "Throughput": excelData[i + 1]['BB']
                    },
                    "107": {
                        "Rssi": excelData[i]['BC'],
                        "Throughput": excelData[i + 1]['BC']
                    },
                    "108": {
                        "Rssi": excelData[i]['BD'],
                        "Throughput": excelData[i + 1]['BD']
                    },
                    "109": {
                        "Rssi": excelData[i]['BE'],
                        "Throughput": excelData[i + 1]['BE']
                    },
                    "110": {
                        "Rssi": excelData[i]['BF'],
                        "Throughput": excelData[i + 1]['BF']
                    },
                    "111": {
                        "Rssi": excelData[i]['BG'],
                        "Throughput": excelData[i + 1]['BG']
                    }

                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }

}


/** Generic Function for Upload test executions Multiheader templates BLE_RvRFUploadFunc*/
async function BLE_RvRFUploadFunc(CommonObj) { //BLE_RvRFUploadFunc

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 1);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header = headers.header.map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });



        excelHeader.splice(13, excelHeader.length - 13);
        headers.header.splice(13, headers.header.length - 13);

        //console.log('DB Header --', headers.header);
        console.log('DB Header Size --', headers.header.length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header, excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};


            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 3; i < excelData.length; i += 2) {

                arrColValues = {
                    'DUT': excelData[i]['B'],
                    'SoC Version': excelData[i]['C'],
                    'SoC Type': excelData[i]['D'],
                    'DUT FW': excelData[i]['E'],
                    'Interface': excelData[i]['F'],
                    'DUT OS': excelData[i]['G'],
                    'DUT Host Platform': excelData[i]['H'],
                    'DUT (Master/Slave)(Tx/Rx)': excelData[i]['I'],
                    'REF (Master/Slave)(Tx/Rx)': excelData[i]['J'],
                    'Connection Interval': excelData[i]['K'],
                    'BLE PHY 1M/2M/DLE': excelData[i]['L'],
                    'Test scenario': excelData[i]['M'],
                    "BLE Attn ": [excelData[i]['N'], excelData[i + 1]['N']],
                    "20": {
                        "Rssi": excelData[i]['O'],
                        "Throughput": excelData[i + 1]['O']
                    },
                    "41": {
                        "Rssi": excelData[i]['P'],
                        "Throughput": excelData[i + 1]['P']
                    },
                    "51": {
                        "Rssi": excelData[i]['Q'],
                        "Throughput": excelData[i + 1]['Q']
                    },
                    "56": {
                        "Rssi": excelData[i]['R'],
                        "Throughput": excelData[i + 1]['R']
                    },
                    "61": {
                        "Rssi": excelData[i]['S'],
                        "Throughput": excelData[i + 1]['S']
                    },
                    "66": {
                        "Rssi": excelData[i]['T'],
                        "Throughput": excelData[i + 1]['T']
                    },
                    "71": {
                        "Rssi": excelData[i]['U'],
                        "Throughput": excelData[i + 1]['U']
                    },
                    "72": {
                        "Rssi": excelData[i]['V'],
                        "Throughput": excelData[i + 1]['V']
                    },
                    "73": {
                        "Rssi": excelData[i]['W'],
                        "Throughput": excelData[i + 1]['W']
                    },
                    "74": {
                        "Rssi": excelData[i]['X'],
                        "Throughput": excelData[i + 1]['X']
                    },
                    "75": {
                        "Rssi": excelData[i]['Y'],
                        "Throughput": excelData[i + 1]['Y']
                    },
                    "76": {
                        "Rssi": excelData[i]['Z'],
                        "Throughput": excelData[i + 1]['Z']
                    },
                    "77": {
                        "Rssi": excelData[i]['AA'],
                        "Throughput": excelData[i + 1]['AA']
                    },
                    "78": {
                        "Rssi": excelData[i]['AB'],
                        "Throughput": excelData[i + 1]['AB']
                    },
                    "79": {
                        "Rssi": excelData[i]['AC'],
                        "Throughput": excelData[i + 1]['AC']
                    },
                    "80": {
                        "Rssi": excelData[i]['AD'],
                        "Throughput": excelData[i + 1]['AD']
                    },
                    "81": {
                        "Rssi": excelData[i]['AE'],
                        "Throughput": excelData[i + 1]['AE']
                    },
                    "82": {
                        "Rssi": excelData[i]['AF'],
                        "Throughput": excelData[i + 1]['AF']
                    },
                    "83": {
                        "Rssi": excelData[i]['AG'],
                        "Throughput": excelData[i + 1]['AG']
                    },
                    "84": {
                        "Rssi": excelData[i]['AH'],
                        "Throughput": excelData[i + 1]['AH']
                    },
                    "85": {
                        "Rssi": excelData[i]['AI'],
                        "Throughput": excelData[i + 1]['AI']
                    },
                    "86": {
                        "Rssi": excelData[i]['AJ'],
                        "Throughput": excelData[i + 1]['AJ']
                    },
                    "87": {
                        "Rssi": excelData[i]['AK'],
                        "Throughput": excelData[i + 1]['AK']
                    },

                    "88": {
                        "Rssi": excelData[i]['AL'],
                        "Throughput": excelData[i + 1]['AL']
                    },
                    "89": {
                        "Rssi": excelData[i]['AM'],
                        "Throughput": excelData[i + 1]['AM']
                    },
                    "90": {
                        "Rssi": excelData[i]['AN'],
                        "Throughput": excelData[i + 1]['AN']
                    },
                    "91": {
                        "Rssi": excelData[i]['AO'],
                        "Throughput": excelData[i + 1]['AO']
                    },
                    "92": {
                        "Rssi": excelData[i]['AP'],
                        "Throughput": excelData[i + 1]['AP']
                    },
                    "93": {
                        "Rssi": excelData[i]['AQ'],
                        "Throughput": excelData[i + 1]['AQ']
                    },
                    "94": {
                        "Rssi": excelData[i]['AR'],
                        "Throughput": excelData[i + 1]['AR']
                    },
                    "95": {
                        "Rssi": excelData[i]['AS'],
                        "Throughput": excelData[i + 1]['AS']
                    },
                    "96": {
                        "Rssi": excelData[i]['AT'],
                        "Throughput": excelData[i + 1]['AT']
                    },
                    "97": {
                        "Rssi": excelData[i]['AU'],
                        "Throughput": excelData[i + 1]['AU']
                    },
                    "98": {
                        "Rssi": excelData[i]['AV'],
                        "Throughput": excelData[i + 1]['AV']
                    },
                    "99": {
                        "Rssi": excelData[i]['AW'],
                        "Throughput": excelData[i + 1]['AW']
                    },
                    "100": {
                        "Rssi": excelData[i]['AX'],
                        "Throughput": excelData[i + 1]['AX']
                    },
                    "101": {
                        "Rssi": excelData[i]['AY'],
                        "Throughput": excelData[i + 1]['AY']
                    },
                    "102": {
                        "Rssi": excelData[i]['AZ'],
                        "Throughput": excelData[i + 1]['AZ']
                    },
                    "103": {
                        "Rssi": excelData[i]['BA'],
                        "Throughput": excelData[i + 1]['BA']
                    },
                    "104": {
                        "Rssi": excelData[i]['BB'],
                        "Throughput": excelData[i + 1]['BB']
                    },
                    "105": {
                        "Rssi": excelData[i]['BC'],
                        "Throughput": excelData[i + 1]['BC']
                    },
                    "106": {
                        "Rssi": excelData[i]['BD'],
                        "Throughput": excelData[i + 1]['BD']
                    },
                    "107": {
                        "Rssi": excelData[i]['BE'],
                        "Throughput": excelData[i + 1]['BE']
                    },
                    "108": {
                        "Rssi": excelData[i]['BF'],
                        "Throughput": excelData[i + 1]['BF']
                    },
                    "109": {
                        "Rssi": excelData[i]['BG'],
                        "Throughput": excelData[i + 1]['BG']
                    },
                    "110": {
                        "Rssi": excelData[i]['BH'],
                        "Throughput": excelData[i + 1]['BH']
                    },
                    "111": {
                        "Rssi": excelData[i]['BI'],
                        "Throughput": excelData[i + 1]['BI']
                    },
                    "112": {
                        "Rssi": excelData[i]['BJ'],
                        "Throughput": excelData[i + 1]['BJ']
                    },
                    "113": {
                        "Rssi": excelData[i]['BK'],
                        "Throughput": excelData[i + 1]['BK']
                    },
                    "114": {
                        "Rssi": excelData[i]['BL'],
                        "Throughput": excelData[i + 1]['BL']
                    },
                    "115": {
                        "Rssi": excelData[i]['BM'],
                        "Throughput": excelData[i + 1]['BM']
                    },
                    "116": {
                        "Rssi": excelData[i]['BN'],
                        "Throughput": excelData[i + 1]['BN']
                    }

                };

                throughput_data.push(arrColValues);
                arrColValues = {};
            }

            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }

            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";

        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";

        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates Simul_TP_3INTF*/
async function Simul_TP_3INTFuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);
        //console.log('excelHeader --', excelHeader);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(25, excelHeader.length - 25);
        headers.header[0].splice(25, headers.header[0].length - 25);
        excelHeader.splice(0, 1, 'Sl.No');

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 7; i < excelData.length; i++) {

                let TCP_TXTXTX = {
                    "INTF1": excelData[i]["AI"],
                    "INTF2": excelData[i]["AJ"],
                    "INTF3": excelData[i]["AK"]
                }

                let TCP_TXTXRX = {
                    "INTF1": excelData[i]["AM"],
                    "INTF2": excelData[i]["AN"],
                    "INTF3": excelData[i]["AO"]

                }

                let TCP_TXRXTX = {
                    "INTF1": excelData[i]["AQ"],
                    "INTF2": excelData[i]["AR"],
                    "INTF3": excelData[i]["AS"]

                }

                let TCP_TXRXRX = {
                    "INTF1": excelData[i]["AU"],
                    "INTF2": excelData[i]["AV"],
                    "INTF3": excelData[i]["AW"]

                }

                let TCP_RXTXTX = {
                    "INTF1": excelData[i]["AY"],
                    "INTF2": excelData[i]["AZ"],
                    "INTF3": excelData[i]["BA"]

                }

                let TCP_RXTXRX = {
                    "INTF1": excelData[i]["BC"],
                    "INTF2": excelData[i]["BD"],
                    "INTF3": excelData[i]["BE"]

                }

                let TCP_RXRXTX = {
                    "INTF1": excelData[i]["BG"],
                    "INTF2": excelData[i]["BH"],
                    "INTF3": excelData[i]["BI"]

                }

                let TCP_RXRXRX = {
                    "INTF1": excelData[i]["BK"],
                    "INTF2": excelData[i]["BL"],
                    "INTF3": excelData[i]["BM"]

                }

                let UDP_TXTXTX = {
                    "INTF1": excelData[i]["BO"],
                    "INTF2": excelData[i]["BP"],
                    "INTF3": excelData[i]["BQ"]
                }

                let UDP_TXTXRX = {
                    "INTF1": excelData[i]["BS"],
                    "INTF2": excelData[i]["BT"],
                    "INTF3": excelData[i]["BU"]

                }

                let UDP_TXRXTX = {
                    "INTF1": excelData[i]["BW"],
                    "INTF2": excelData[i]["BX"],
                    "INTF3": excelData[i]["BY"]

                }

                let UDP_TXRXRX = {
                    "INTF1": excelData[i]["CA"],
                    "INTF2": excelData[i]["CB"],
                    "INTF3": excelData[i]["CC"]

                }

                let UDP_RXTXTX = {
                    "INTF1": excelData[i]["CE"],
                    "INTF2": excelData[i]["CF"],
                    "INTF3": excelData[i]["CG"]

                }

                let UDP_RXTXRX = {
                    "INTF1": excelData[i]["CI"],
                    "INTF2": excelData[i]["CJ"],
                    "INTF3": excelData[i]["CK"]

                }

                let UDP_RXRXTX = {
                    "INTF1": excelData[i]["CM"],
                    "INTF2": excelData[i]["CN"],
                    "INTF3": excelData[i]["CO"]

                }

                let UDP_RXRXRX = {
                    "INTF1": excelData[i]["CQ"],
                    "INTF2": excelData[i]["CR"],
                    "INTF3": excelData[i]["CS"]

                }
                let _TCP = {
                    "TXTXTX": TCP_TXTXTX,
                    "TXTXRX": TCP_TXTXRX,
                    "TXRXTX": TCP_TXRXTX,
                    "TXRXRX": TCP_TXRXRX,
                    "RXTXTX": TCP_RXTXTX,
                    "RXTXRX": TCP_RXTXRX,
                    "RXRXTX": TCP_RXRXTX,
                    "RXRXRX": TCP_RXRXRX

                }

                let _UDP = {
                    "TXTXTX": UDP_TXTXTX,
                    "TXTXRX": UDP_TXTXRX,
                    "TXRXTX": UDP_TXRXTX,
                    "TXRXRX": UDP_TXRXRX,
                    "RXTXTX": UDP_RXTXTX,
                    "RXTXRX": UDP_RXTXRX,
                    "RXRXTX": UDP_RXRXTX,
                    "RXRXRX": UDP_RXRXRX

                }

                arrColValues = {
                    "Sl No": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "DUT Fw/Drv": excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "SDIO Clock": excelData[i]['J'],
                    "Aggregation": excelData[i]['K'],
                    "Spatial Streams": excelData[i]['L'],
                    "Guard_Interval": excelData[i]['M'],
                    "Data Rate": excelData[i]['N'],
                    "Connectivity Modes": excelData[i]['O'],
                    "Companion Device1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['P'],
                    "Companion Device1 FW/Drv": excelData[i]['Q'],
                    "Companion Device2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['R'],
                    "Companion Device2 FW/Drv": excelData[i]['S'],
                    "Companion Device3/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['T'],
                    "Companion Device3 FW/Drv": excelData[i]['U'],
                    "DUT Host Platform": excelData[i]['V'],
                    "DUT OS": excelData[i]['W'],
                    "INTF1 Configuration": excelData[i]['X'],
                    "Channel | INTF 1": excelData[i]['Y'],
                    "INTF2 Configuration": excelData[i]['Z'],
                    "Channel | INTF 2": excelData[i]['AA'],
                    "INTF3 Configuration": excelData[i]['AB'],
                    "Channel | INTF 3": excelData[i]['AC'],
                    "DRCS Timing Configuration Duty Cycle | INTF1 | INTF2": excelData[i]['AD'],
                    "Misc": excelData[i]['AE'],
                    "Security": excelData[i]['AF'],
                    "Test Repetition": excelData[i]['AG'],
                    "TCP": _TCP,
                    "UDP": _UDP,
                    "Comments": excelData[i]['CU']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            // console.log('throughput_data', throughput_data);
            //console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates Simul_TP_3INTF*/
async function Simul_TP_4INTFuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(25, excelHeader.length - 25);
        headers.header[0].splice(25, headers.header[0].length - 25);
        excelHeader.splice(0, 1, 'Sl.No');

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 7; i < excelData.length; i++) {

                let TCP_TXTXTXTX = {
                    "INTF1": excelData[i]["AL"],
                    "INTF2": excelData[i]["AM"],
                    "INTF3": excelData[i]["AN"],
                    "INTF4": excelData[i]["AO"]
                }

                let TCP_TXTXTXRX = {
                    "INTF1": excelData[i]["AQ"],
                    "INTF2": excelData[i]["AR"],
                    "INTF3": excelData[i]["AS"],
                    "INTF4": excelData[i]["AT"]

                }

                let TCP_TXTXRXTX = {
                    "INTF1": excelData[i]["AV"],
                    "INTF2": excelData[i]["AW"],
                    "INTF3": excelData[i]["AX"],
                    "INTF4": excelData[i]["AY"]

                }

                let TCP_TXTXRXRX = {
                    "INTF1": excelData[i]["BA"],
                    "INTF2": excelData[i]["BB"],
                    "INTF3": excelData[i]["BC"],
                    "INTF4": excelData[i]["BD"]

                }

                let TCP_TXRXTXTX = {
                    "INTF1": excelData[i]["BF"],
                    "INTF2": excelData[i]["BG"],
                    "INTF3": excelData[i]["BH"],
                    "INTF4": excelData[i]["BI"]

                }

                let TCP_TXRXTXRX = {
                    "INTF1": excelData[i]["BK"],
                    "INTF2": excelData[i]["BL"],
                    "INTF3": excelData[i]["BM"],
                    "INTF4": excelData[i]["BN"]

                }

                let TCP_TXRXRXTX = {
                    "INTF1": excelData[i]["BP"],
                    "INTF2": excelData[i]["BQ"],
                    "INTF2": excelData[i]["BR"],
                    "INTF4": excelData[i]["BS"]

                }

                let TCP_TXRXRXRX = {
                    "INTF1": excelData[i]["BU"],
                    "INTF2": excelData[i]["BV"],
                    "INTF3": excelData[i]["BW"],
                    "INTF4": excelData[i]["BX"]

                }
                let TCP_RXTXTXTX = {
                    "INTF1": excelData[i]["BZ"],
                    "INTF2": excelData[i]["CA"],
                    "INTF3": excelData[i]["CB"],
                    "INTF4": excelData[i]["CC"]
                }

                let TCP_RXTXTXRX = {
                    "INTF1": excelData[i]["CE"],
                    "INTF2": excelData[i]["CF"],
                    "INTF3": excelData[i]["CG"],
                    "INTF4": excelData[i]["CH"]

                }

                let TCP_RXTXRXTX = {
                    "INTF1": excelData[i]["CJ"],
                    "INTF2": excelData[i]["CK"],
                    "INTF3": excelData[i]["CL"],
                    "INTF4": excelData[i]["CM"]

                }

                let TCP_RXTXRXRX = {
                    "INTF1": excelData[i]["CO"],
                    "INTF2": excelData[i]["CP"],
                    "INTF3": excelData[i]["CQ"],
                    "INTF4": excelData[i]["CR"]

                }

                let TCP_RXRXTXTX = {
                    "INTF1": excelData[i]["CT"],
                    "INTF2": excelData[i]["CU"],
                    "INTF3": excelData[i]["CV"],
                    "INTF4": excelData[i]["CW"]

                }

                let TCP_RXRXTXRX = {
                    "INTF1": excelData[i]["CY"],
                    "INTF2": excelData[i]["CZ"],
                    "INTF3": excelData[i]["DA"],
                    "INTF4": excelData[i]["DB"]

                }

                let TCP_RXRXRXTX = {
                    "INTF1": excelData[i]["DD"],
                    "INTF2": excelData[i]["DE"],
                    "INTF2": excelData[i]["DF"],
                    "INTF4": excelData[i]["DG"]

                }

                let TCP_RXRXRXRX = {
                    "INTF1": excelData[i]["DI"],
                    "INTF2": excelData[i]["DJ"],
                    "INTF3": excelData[i]["DK"],
                    "INTF4": excelData[i]["DL"]

                }
                let UDP_TXTXTXTX = {
                    "INTF1": excelData[i]["DN"],
                    "INTF2": excelData[i]["DO"],
                    "INTF3": excelData[i]["DP"],
                    "INTF4": excelData[i]["DQ"]
                }

                let UDP_TXTXTXRX = {
                    "INTF1": excelData[i]["DS"],
                    "INTF2": excelData[i]["DT"],
                    "INTF3": excelData[i]["DU"],
                    "INTF4": excelData[i]["DV"]

                }

                let UDP_TXTXRXTX = {
                    "INTF1": excelData[i]["DX"],
                    "INTF2": excelData[i]["DY"],
                    "INTF3": excelData[i]["DZ"],
                    "INTF4": excelData[i]["EA"]

                }

                let UDP_TXTXRXRX = {
                    "INTF1": excelData[i]["EC"],
                    "INTF2": excelData[i]["ED"],
                    "INTF3": excelData[i]["EE"],
                    "INTF4": excelData[i]["EF"]

                }

                let UDP_TXRXTXTX = {
                    "INTF1": excelData[i]["EH"],
                    "INTF2": excelData[i]["EI"],
                    "INTF3": excelData[i]["EJ"],
                    "INTF4": excelData[i]["EK"]

                }

                let UDP_TXRXTXRX = {
                    "INTF1": excelData[i]["EM"],
                    "INTF2": excelData[i]["EN"],
                    "INTF3": excelData[i]["EO"],
                    "INTF4": excelData[i]["EP"]

                }

                let UDP_TXRXRXTX = {
                    "INTF1": excelData[i]["ER"],
                    "INTF2": excelData[i]["ES"],
                    "INTF3": excelData[i]["ET"],
                    "INTF4": excelData[i]["EU"]

                }

                let UDP_TXRXRXRX = {
                    "INTF1": excelData[i]["EW"],
                    "INTF2": excelData[i]["EX"],
                    "INTF3": excelData[i]["EY"],
                    "INTF4": excelData[i]["EZ"]

                }

                let UDP_RXTXTXTX = {
                    "INTF1": excelData[i]["FB"],
                    "INTF2": excelData[i]["FC"],
                    "INTF3": excelData[i]["FD"],
                    "INTF4": excelData[i]["FE"]
                }

                let UDP_RXTXTXRX = {
                    "INTF1": excelData[i]["FG"],
                    "INTF2": excelData[i]["FH"],
                    "INTF3": excelData[i]["FI"],
                    "INTF4": excelData[i]["FJ"]

                }

                let UDP_RXTXRXTX = {
                    "INTF1": excelData[i]["FL"],
                    "INTF2": excelData[i]["FM"],
                    "INTF3": excelData[i]["FN"],
                    "INTF4": excelData[i]["FO"]

                }

                let UDP_RXTXRXRX = {
                    "INTF1": excelData[i]["FQ"],
                    "INTF2": excelData[i]["FR"],
                    "INTF3": excelData[i]["FS"],
                    "INTF4": excelData[i]["FT"]

                }

                let UDP_RXRXTXTX = {
                    "INTF1": excelData[i]["FV"],
                    "INTF2": excelData[i]["FW"],
                    "INTF3": excelData[i]["FX"],
                    "INTF4": excelData[i]["FY"]

                }

                let UDP_RXRXTXRX = {
                    "INTF1": excelData[i]["GA"],
                    "INTF2": excelData[i]["GB"],
                    "INTF3": excelData[i]["GC"],
                    "INTF4": excelData[i]["GD"]

                }

                let UDP_RXRXRXTX = {
                    "INTF1": excelData[i]["GF"],
                    "INTF2": excelData[i]["GG"],
                    "INTF3": excelData[i]["GH"],
                    "INTF4": excelData[i]["GI"]

                }

                let UDP_RXRXRXRX = {
                    "INTF1": excelData[i]["GK"],
                    "INTF2": excelData[i]["GL"],
                    "INTF3": excelData[i]["GM"],
                    "INTF4": excelData[i]["GN"]

                }


                let _TCP = {
                    "TXTXTXTX": TCP_TXTXTXTX,
                    "TXTXTXRX": TCP_TXTXTXRX,
                    "TXTXRXTX": TCP_TXTXRXTX,
                    "TXTXRXRX": TCP_TXTXRXRX,
                    "TXRXTXTX": TCP_TXRXTXTX,
                    "TXRXTXRX": TCP_TXRXTXRX,
                    "TXRXRXTX": TCP_TXRXRXTX,
                    "TXRXRXRX": TCP_TXRXRXRX,

                    "RXTXTXTX": TCP_RXTXTXTX,
                    "RXTXTXRX": TCP_RXTXTXRX,
                    "RXTXRXTX": TCP_RXTXRXTX,
                    "RXTXRXRX": TCP_RXTXRXRX,
                    "RXRXTXTX": TCP_RXRXTXTX,
                    "RXRXTXRX": TCP_RXRXTXRX,
                    "RXRXRXTX": TCP_RXRXRXTX,
                    "RXRXRXRX": TCP_RXRXRXRX

                }

                let _UDP = {
                    "TXTXTXTX": UDP_TXTXTXTX,
                    "TXTXTXRX": UDP_TXTXTXRX,
                    "TXTXRXTX": UDP_TXTXRXTX,
                    "TXTXRXRX": UDP_TXTXRXRX,
                    "TXRXTXTX": UDP_TXRXTXTX,
                    "TXRXTXRX": UDP_TXRXTXRX,
                    "TXRXRXTX": UDP_TXRXRXTX,
                    "TXRXRXRX": UDP_TXRXRXRX,

                    "RXTXTXTX": UDP_RXTXTXTX,
                    "RXTXTXRX": UDP_RXTXTXRX,
                    "RXTXRXTX": UDP_RXTXRXTX,
                    "RXTXRXRX": UDP_RXTXRXRX,
                    "RXRXTXTX": UDP_RXRXTXTX,
                    "RXRXTXRX": UDP_RXRXTXRX,
                    "RXRXRXTX": UDP_RXRXRXTX,
                    "RXRXRXRX": UDP_RXRXRXRX

                }

                arrColValues = {
                    "Sl No": excelData[i]['C'],
                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "DUT Fw/Drv": excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "SDIO Clock": excelData[i]['J'],
                    "Aggregation": excelData[i]['K'],
                    "Spatial Streams": excelData[i]['L'],
                    "Guard_Interval ": excelData[i]['M'],
                    "Data Rate": excelData[i]['N'],
                    "Connectivity Modes": excelData[i]['O'],
                    "Companion Devices1": excelData[i]['P'],
                    "Companion Devices1 Fw_Drv": excelData[i]['Q'],
                    "Companion Devices2": excelData[i]['R'],
                    "Companion Devices2 Fw_Drv": excelData[i]['S'],
                    "Companion Devices3": excelData[i]['T'],
                    "Companion Devices3 Fw_Drv": excelData[i]['U'],
                    "Companion Devices4": excelData[i]['V'],
                    "Companion Devices4 Fw_Drv": excelData[i]['W'],
                    "DUT Host Platform": excelData[i]['X'],
                    "DUT OS": excelData[i]['Y'],
                    "INTF1 Configuration": excelData[i]['Z'],
                    "Channel | INTF 1": excelData[i]['AA'],
                    "INTF2 Configuration": excelData[i]['AB'],
                    "Channel | INTF 2": excelData[i]['AC'],
                    "INTF3 Configuration": excelData[i]['AD'],
                    "Channel | INTF 3": excelData[i]['AE'],
                    "INTF4 Configuration": excelData[i]['AF'],
                    "Channel | INTF 4": excelData[i]['AG'],

                    "": excelData[i]['AH'],
                    "": excelData[i]['AI'],
                    "Security": excelData[i]['AJ'],
                    "Throughput": excelData[i]['AK'],
                    "TCP": _TCP,
                    "UDP": _UDP,
                    "Comments": excelData[i]['GP']
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            // console.log('throughput_data', throughput_data);
            console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions Multiheader templates BT-Throughput*/
async function BT_ThroughputuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 1);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        let indexOfHeader1 = headers.header[0].indexOf("TheoreticalVal(kbps)");
        headers.header[0][indexOfHeader1] = 'TheoreticalVal(Kbps)';

        let indexOfHeader2 = headers.header[0].indexOf("Baseline(95%ofTheoreticalval)(Kbps)");
        headers.header[0][indexOfHeader2] = 'Baseline(95%ofTheoreticalvalinKbps)';

        excelHeader.splice(10, excelHeader.length - 10);
        headers.header[0].splice(10, headers.header[0].length - 10);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 5; i < excelData.length; i++) {

                let _E01 = {

                    "Master": {
                        "Tx": excelData[i]["L"],
                        "Rx": excelData[i]["M"]
                    },

                    "Slave": {
                        "Tx": excelData[i]["N"],
                        "Rx": excelData[i]["O"]
                    }
                }

                let _AES1 = {
                    "Master": {
                        "Tx": excelData[i]["P"],
                        "Rx": excelData[i]["Q"]

                    },

                    "Slave": {
                        "Tx": excelData[i]["R"],
                        "Rx": excelData[i]["S"]

                    }
                }

                let _E02 = {
                    "Master": {

                        "Tx": excelData[i]["T"],
                        "Rx": excelData[i]["U"]
                    },

                    "Slave": {
                        "Tx": excelData[i]["V"],
                        "Rx": excelData[i]["W"]
                    }
                }
                let _AES2 = {
                    "Master": {
                        "Tx": excelData[i]["X"],
                        "Rx": excelData[i]["Y"]
                    },

                    "Slave": {
                        "Tx": excelData[i]["Z"],
                        "Rx": excelData[i]["AA"]
                    }
                }
                let UNI_DIRECTIONAL = {
                    "E0": _E01,
                    "AES": _AES1
                }
                let BI_DIRECTIONAL = {
                    "E0": _E02,
                    "AES": _AES2
                }

                arrColValues = {

                    "DUT": excelData[i]['B'],
                    "Soc Version": excelData[i]['C'],
                    "SocType": excelData[i]['D'],
                    "DUT Fw": excelData[i]['E'],
                    "Interface": excelData[i]['F'],
                    "DUT Os": excelData[i]['G'],
                    "DUT Host Platform": excelData[i]['H'],
                    "Packet Type": excelData[i]['I'],
                    "Theoretical Val (kbps)": excelData[i]['J'],
                    "Baseline(95% of Theoretical val)(Kbps)": excelData[i]['K'],
                    "Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)": UNI_DIRECTIONAL,
                    "Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)": BI_DIRECTIONAL
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            // console.log('throughput_data', throughput_data);
            console.log('len-data', throughput_data.length);
            console.log(throughput_data)

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}


/** Generic Function for Upload test executions Multiheader templates BLE-Throughput*/
async function BLE_ThroughputuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 1);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        let indexOfHeader1 = headers.header[0].indexOf("TheoreticalVal(kbps)");
        headers.header[0][indexOfHeader1] = 'TheoreticalVal(Kbps)';

        let indexOfHeader2 = headers.header[0].indexOf("Baseline(90%ofTheoreticalval)(Kbps)");
        headers.header[0][indexOfHeader2] = 'Baseline(95%ofTheoreticalvalinKbps)';

        excelHeader.splice(10, excelHeader.length - 10);
        headers.header[0].splice(10, headers.header[0].length - 10);

        //console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 5; i < excelData.length; i++) {
                let _MASTER1 = {

                    "uni-dir": {
                        "TX": excelData[i]["L"],
                        "RX": excelData[i]["M"]
                    },

                    "bi-dir": {
                        "TX": excelData[i]["N"],
                        "RX": excelData[i]["O"]
                    }
                }

                let _SLAVE1 = {
                    "uni-dir": {
                        "TX": excelData[i]["P"],
                        "RX": excelData[i]["Q"]

                    },

                    "bi-dir": {
                        "TX": excelData[i]["R"],
                        "RX": excelData[i]["S"]

                    }
                }

                let _MASTER2 = {

                    "uni-dir": {
                        "TX": excelData[i]["W"],
                        "RX": excelData[i]["X"]
                    },

                    "bi-dir": {
                        "TX": excelData[i]["Y"],
                        "RX": excelData[i]["Z"]
                    }
                }

                let _SLAVE2 = {
                    "uni-dir": {
                        "TX": excelData[i]["AA"],
                        "RX": excelData[i]["AB"]

                    },

                    "bi-dir": {
                        "TX": excelData[i]["AC"],
                        "RX": excelData[i]["AD"]

                    }
                }

                let _MASTER3 = {

                    "uni-dir": {
                        "TX": excelData[i]["AH"],
                        "RX": excelData[i]["AI"]
                    },

                    "bi-dir": {
                        "TX": excelData[i]["AJ"],
                        "RX": excelData[i]["AK"]
                    }
                }

                let _SLAVE3 = {
                    "uni-dir": {
                        "TX": excelData[i]["AL"],
                        "RX": excelData[i]["AM"]

                    },

                    "bi-dir": {
                        "TX": excelData[i]["AN"],
                        "RX": excelData[i]["AO"]

                    }
                }

                let _MASTER4 = {

                    "uni-dir": {
                        "TX": excelData[i]["AS"],
                        "RX": excelData[i]["AT"]
                    },

                    "bi-dir": {
                        "TX": excelData[i]["AU"],
                        "RX": excelData[i]["AV"]
                    }
                }

                let _SLAVE4 = {
                    "uni-dir": {
                        "TX": excelData[i]["AW"],
                        "RX": excelData[i]["AX"]

                    },

                    "bi-dir": {
                        "TX": excelData[i]["AY"],
                        "RX": excelData[i]["AZ"]

                    }
                }

                let _LE_1MBPS = {
                    "Master": _MASTER1,
                    "Slave": _SLAVE1
                }
                let _LE_2MBPS = {
                    "Master": _MASTER2,
                    "Slave": _SLAVE2
                }

                let _DLE_1MBPS = {
                    "Master": _MASTER3,
                    "Slave": _SLAVE3
                }
                let _DLE_2MBPS = {
                    "Master": _MASTER4,
                    "Slave": _SLAVE4
                }

                arrColValues = {

                    "DUT": excelData[i]['B'],
                    "Soc Version": excelData[i]['C'],
                    "SocType": excelData[i]['D'],
                    "DUT Fw": excelData[i]['E'],
                    "Interface": excelData[i]['F'],
                    "DUT Os": excelData[i]['G'],
                    "DUT Host Platform": excelData[i]['H'],
                    "Connection_interval": excelData[i]['I'],
                    "Theoretical Val (kbps)": excelData[i]['J'],
                    "Baseline(95% of Theoretical val)(Kbps)": excelData[i]['K'],
                    "Le 1Mbps": _LE_1MBPS,
                    "Connection_interval": excelData[i]['T'],
                    "Theoretical Val (kbps)": excelData[i]['U'],
                    "Baseline(95% of Theoretical val)(Kbps)": excelData[i]['V'],
                    "Le 2Mbps": _LE_2MBPS,
                    "Connection_interval": excelData[i]['AE'],
                    "Theoretical Val (kbps)": excelData[i]['AF'],
                    "Baseline(95% of Theoretical val)(Kbps)": excelData[i]['AG'],
                    "DLE 1Mbps": _DLE_1MBPS,
                    "Connection_interval": excelData[i]['AP'],
                    "Theoretical Val (kbps)": excelData[i]['AQ'],
                    "Baseline(95% of Theoretical val)(Kbps)": excelData[i]['AR'],
                    "DLE 2Mbps": _DLE_2MBPS
                };
                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            // console.log('throughput_data', throughput_data);
            console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            //console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}



/** Generic Function for Upload test executions Multiheader templates LE_Long_Range_RvR*/
async function LE_Long_Range_RvRuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[1]);
        excelHeader.splice(0, 1);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);
        console.log(headers.header)
            //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header = headers.header.map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(13, excelHeader.length - 13);
        headers.header.splice(13, headers.header.length - 13);

        console.log('DB Header --', headers.header);
        console.log('Size --', headers.header.length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header, excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    //responseObject = {};
                    //responseObject.status = false;
                    //responseObject.message = executionDetails.message;
                    //responseArr.push(responseObject);
                    //response.info = responseArr;

                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};
            let tracker = 0;

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 4; i < excelData.length; i += 2) {
                let sheetValues = _.values(excelData[i])

                arrColValues = {

                    "DUT": excelData[i]['B'],
                    "SoC Version": excelData[i]['C'],
                    "SoC Type": excelData[i]['D'],
                    "DUT FW": excelData[i]['E'],
                    "Interface": excelData[i]['F'],
                    "DUT OS": excelData[i]['G'],
                    "DUT Host Platform": excelData[i]['H'],
                    "DUT (Master/Slave)(Tx/Rx)": excelData[i]['I'],
                    "REF (Master/Slave)(Tx/Rx)": excelData[i]['J'],
                    "Connection Interval": excelData[i]['K'],
                    "BLE PHY 1M/2M/DLE": excelData[i]['L'],
                    "Test scenario": excelData[i]['M'],
                    "BLE Attn ": [excelData[i]['N'], excelData[i + 1]['N']],
                    "29": {
                        "Rssi": excelData[i]['O'],
                        "Throughput": excelData[i + 1]['O']
                    },
                    "50": {
                        "Rssi": excelData[i]['P'],
                        "Throughput": excelData[i + 1]['P']
                    },
                    "60": {
                        "Rssi": excelData[i]['Q'],
                        "Throughput": excelData[i + 1]['Q']
                    },
                    "65": {
                        "Rssi": excelData[i]['R'],
                        "Throughput": excelData[i + 1]['R']
                    },
                    "70": {
                        "Rssi": excelData[i]['S'],
                        "Throughput": excelData[i + 1]['S']
                    },
                    "72": {
                        "Rssi": excelData[i]['T'],
                        "Throughput": excelData[i + 1]['T']
                    },
                    "74": {
                        "Rssi": excelData[i]['U'],
                        "Throughput": excelData[i + 1]['U']
                    },
                    "76": {
                        "Rssi": excelData[i]['V'],
                        "Throughput": excelData[i + 1]['V']
                    },
                    "77": {
                        "Rssi": excelData[i]['W'],
                        "Throughput": excelData[i + 1]['W']
                    },
                    "78": {
                        "Rssi": excelData[i]['X'],
                        "Throughput": excelData[i + 1]['X']
                    },
                    "79": {
                        "Rssi": excelData[i]['Y'],
                        "Throughput": excelData[i + 1]['Y']
                    },
                    "80": {
                        "Rssi": excelData[i]['Z'],
                        "Throughput": excelData[i + 1]['Z']
                    },
                    "81": {
                        "Rssi": excelData[i]['AA'],
                        "Throughput": excelData[i + 1]['AA']
                    },
                    "82": {
                        "Rssi": excelData[i]['AB'],
                        "Throughput": excelData[i + 1]['AB']
                    },
                    "83": {
                        "Rssi": excelData[i]['AC'],
                        "Throughput": excelData[i + 1]['AC']
                    },
                    "84": {
                        "Rssi": excelData[i]['AD'],
                        "Throughput": excelData[i + 1]['AD']
                    },
                    "85": {
                        "Rssi": excelData[i]['AE'],
                        "Throughput": excelData[i + 1]['AE']
                    },
                    "86": {
                        "Rssi": excelData[i]['AF'],
                        "Throughput": excelData[i + 1]['AF']
                    },
                    "87": {
                        "Rssi": excelData[i]['AG'],
                        "Throughput": excelData[i + 1]['AG']
                    },
                    "88": {
                        "Rssi": excelData[i]['AH'],
                        "Throughput": excelData[i + 1]['AH']
                    },
                    "89": {
                        "Rssi": excelData[i]['AI'],
                        "Throughput": excelData[i + 1]['AI']
                    },
                    "90": {
                        "Rssi": excelData[i]['AJ'],
                        "Throughput": excelData[i + 1]['AJ']
                    },
                    "91": {
                        "Rssi": excelData[i]['AK'],
                        "Throughput": excelData[i + 1]['AK']
                    },

                    "92": {
                        "Rssi": excelData[i]['AL'],
                        "Throughput": excelData[i + 1]['AL']
                    },
                    "93": {
                        "Rssi": excelData[i]['AM'],
                        "Throughput": excelData[i + 1]['AM']
                    },
                    "94": {
                        "Rssi": excelData[i]['AN'],
                        "Throughput": excelData[i + 1]['AN']
                    },
                    "95": {
                        "Rssi": excelData[i]['AO'],
                        "Throughput": excelData[i + 1]['AO']
                    },
                    "96": {
                        "Rssi": excelData[i]['AP'],
                        "Throughput": excelData[i + 1]['AP']
                    },
                    "97": {
                        "Rssi": excelData[i]['AQ'],
                        "Throughput": excelData[i + 1]['AQ']
                    },
                    "98": {
                        "Rssi": excelData[i]['AR'],
                        "Throughput": excelData[i + 1]['AR']
                    },
                    "99": {
                        "Rssi": excelData[i]['AS'],
                        "Throughput": excelData[i + 1]['AS']
                    },
                    "100": {
                        "Rssi": excelData[i]['AT'],
                        "Throughput": excelData[i + 1]['AT']
                    },
                    "101": {
                        "Rssi": excelData[i]['AU'],
                        "Throughput": excelData[i + 1]['AU']
                    },
                    "102": {
                        "Rssi": excelData[i]['AV'],
                        "Throughput": excelData[i + 1]['AV']
                    },
                    "103": {
                        "Rssi": excelData[i]['AW'],
                        "Throughput": excelData[i + 1]['AW']
                    },
                    "104": {
                        "Rssi": excelData[i]['AX'],
                        "Throughput": excelData[i + 1]['AX']
                    },
                    "105": {
                        "Rssi": excelData[i]['AY'],
                        "Throughput": excelData[i + 1]['AY']
                    },
                    "106": {
                        "Rssi": excelData[i]['AZ'],
                        "Throughput": excelData[i + 1]['AZ']
                    },
                    "107": {
                        "Rssi": excelData[i]['BA'],
                        "Throughput": excelData[i + 1]['BA']
                    },
                    "108": {
                        "Rssi": excelData[i]['BB'],
                        "Throughput": excelData[i + 1]['BB']
                    },
                    "109": {
                        "Rssi": excelData[i]['BC'],
                        "Throughput": excelData[i + 1]['BC']
                    },
                    "110": {
                        "Rssi": excelData[i]['BD'],
                        "Throughput": excelData[i + 1]['BD']
                    },
                    "111": {
                        "Rssi": excelData[i]['BE'],
                        "Throughput": excelData[i + 1]['BE']
                    },
                    "112": {
                        "Rssi": excelData[i]['BF'],
                        "Throughput": excelData[i + 1]['BF']
                    },
                    "113": {
                        "Rssi": excelData[i]['BG'],
                        "Throughput": excelData[i + 1]['BG']
                    },
                    "114": {
                        "Rssi": excelData[i]['BH'],
                        "Throughput": excelData[i + 1]['BH']
                    },
                    "115": {
                        "Rssi": excelData[i]['BI'],
                        "Throughput": excelData[i + 1]['BI']
                    },
                    "116": {
                        "Rssi": excelData[i]['BJ'],
                        "Throughput": excelData[i + 1]['BJ']
                    },
                    "117": {
                        "Rssi": excelData[i]['BK'],
                        "Throughput": excelData[i + 1]['BK']
                    },
                    "118": {
                        "Rssi": excelData[i]['BL'],
                        "Throughput": excelData[i + 1]['BL']
                    },
                    "119": {
                        "Rssi": excelData[i]['BM'],
                        "Throughput": excelData[i + 1]['BM']
                    },
                    "120": {
                        "Rssi": excelData[i]['BN'],
                        "Throughput": excelData[i + 1]['BN']
                    }



                };

                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}


/** Generic Function for Upload test executions Multiheader templates LE_Long_Range_RvR*/
async function COEX_BT_RVRuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);
        //console.log('excelData --', excelData);

        let excelHeader = _.values(excelData[2]);
        excelHeader.splice(0, 2);

        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader("COEX-RVR");
        //let headerVal = headers.header[0];

        //Remove the single space of the object
        headers.header = headers.header.map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(25, excelHeader.length - 25);
        headers.header.splice(25, headers.header.length - 25);

        console.log('DB Header --', headers.header);
        console.log('Size --', headers.header.length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header, excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let excelJsonData = [];
            let throughput_data = [];
            let arrColValues = {};
            let i;

            for (var j = 0; j < excelData.length; j++) {

                if (excelData[j]['D'] == "TP TYPE") {
                    i = j + 2;
                    console.log('\ni-->', i);
                }

            }

            var keyIndex = i - 1;

            // Using 2 array of Excel header and Excel Data - mapping to Key:Value
            var endLength = excelData.length;
            for (i; i < endLength; i += 8) {

                if (excelData[i + 7]['AI'] == "BT Performance Result #2" && excelData[i + 8]['AI'] == "" && excelData[i + 9]['AI'] == "") {
                    endLength = i + 2
                }

                arrColValues = {

                    "TP TYPE": excelData[i]['D'],
                    "DUT": excelData[i]['E'],
                    "SoC Version": excelData[i]['F'],
                    "SoC TYPE": excelData[i]['G'],
                    "DUT Fw/Drv": excelData[i]['H'],
                    "Interface": excelData[i]['I'],
                    "Aggregation": excelData[i]['J'],
                    "Spatial Streams": excelData[i]['K'],
                    "Guard Interval": excelData[i]['L'],
                    "Data Rate": excelData[i]['M'],
                    "Channel | 2 GHz": excelData[i]['N'],
                    "Channel | 5 GHz": excelData[i]['O'],
                    "SDIO Clock": excelData[i]['P'],
                    "Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['Q'],
                    "Companion Device FW/Drv": excelData[i]['R'],
                    "DUT Host Platform": excelData[i]['S'],
                    "DUT OS": excelData[i]['T'],
                    "Security": excelData[i]['U'],
                    "DUT Mode": excelData[i]['V'],
                    "BT Ref": excelData[i]['W'],
                    "Coex mode": excelData[i]['X'],
                    "ANT isolation": excelData[i]['Y'],
                    "BT profiles": excelData[i]['Z'],
                    "BT/BLE Role": excelData[i]['AA'],
                    "Profile Param": excelData[i]['AB'],
                    "Connection param": excelData[i]['AC'],
                    "BT Sniff": excelData[i]['AD'],
                    "Test Duration": excelData[i]['AE'],
                    "Test Repetition": excelData[i]['AF'],
                    "DUT Protocol": excelData[i]['AG'],
                    "Comments": excelData[i]['DB']


                };

                if (excelData[i]['AK'] != "" || typeof excelData[i]['AK'] == 'undefined') {
                    let _AK = {
                        [excelData[keyIndex]['AK']]: {
                            "DataRSSI": excelData[i]['AK'],
                            "BeaconRSSI": excelData[i + 1]['AK'],
                            "WiFiMCSRate": excelData[i + 2]['AK'],
                            "WiFiNoisefloor": excelData[i + 3]['AK'],
                            "BTRSSI": excelData[i + 4]['AK'],
                            "WiFiCoexTP": excelData[i + 5]['AK'],
                            "BTPerformanceResult#1": excelData[i + 6]['AK'],
                            "BTPerformanceResult#2": excelData[i + 7]['AK']
                        }
                    };
                    Object.assign(arrColValues, _AK)
                }

                if (excelData[i]['AL'] != "") {
                    let _AL = {
                        [excelData[keyIndex]['AL']]: {
                            "DataRSSI": excelData[i]['AL'],
                            "BeaconRSSI": excelData[i + 1]['AL'],
                            "WiFiMCSRate": excelData[i + 2]['AL'],
                            "WiFiNoisefloor": excelData[i + 3]['AL'],
                            "BTRSSI": excelData[i + 4]['AL'],
                            "WiFiCoexTP": excelData[i + 5]['AL'],
                            "BTPerformanceResult#1": excelData[i + 6]['AL'],
                            "BTPerformanceResult#2": excelData[i + 7]['AL']
                        }
                    };
                    Object.assign(arrColValues, _AL)
                }

                if (excelData[i]['AM'] != "") {
                    let _AM = {
                        [excelData[keyIndex]['AM']]: {
                            "DataRSSI": excelData[i]['AM'],
                            "BeaconRSSI": excelData[i + 1]['AM'],
                            "WiFiMCSRate": excelData[i + 2]['AM'],
                            "WiFiNoisefloor": excelData[i + 3]['AM'],
                            "BTRSSI": excelData[i + 4]['AM'],
                            "WiFiCoexTP": excelData[i + 5]['AM'],
                            "BTPerformanceResult#1": excelData[i + 6]['AM'],
                            "BTPerformanceResult#2": excelData[i + 7]['AM']
                        }
                    };
                    Object.assign(arrColValues, _AM)
                }
                if (excelData[i]['AM'] != "") {
                    let _AM = {
                        [excelData[keyIndex]['AM']]: {
                            "DataRSSI": excelData[i]['AM'],
                            "BeaconRSSI": excelData[i + 1]['AM'],
                            "WiFiMCSRate": excelData[i + 2]['AM'],
                            "WiFiNoisefloor": excelData[i + 3]['AM'],
                            "BTRSSI": excelData[i + 4]['AM'],
                            "WiFiCoexTP": excelData[i + 5]['AM'],
                            "BTPerformanceResult#1": excelData[i + 6]['AM'],
                            "BTPerformanceResult#2": excelData[i + 7]['AM']
                        }
                    };
                    Object.assign(arrColValues, _AM)
                }


                if (excelData[i]['AN'] != "") {
                    let _AN = {
                        [excelData[keyIndex]['AN']]: {
                            "DataRSSI": excelData[i]['AN'],
                            "BeaconRSSI": excelData[i + 1]['AN'],
                            "WiFiMCSRate": excelData[i + 2]['AN'],
                            "WiFiNoisefloor": excelData[i + 3]['AN'],
                            "BTRSSI": excelData[i + 4]['AN'],
                            "WiFiCoexTP": excelData[i + 5]['AN'],
                            "BTPerformanceResult#1": excelData[i + 6]['AN'],
                            "BTPerformanceResult#2": excelData[i + 7]['AN']
                        }
                    };
                    Object.assign(arrColValues, _AN)
                }

                if (excelData[i]['AO'] != "") {
                    let _AO = {
                        [excelData[keyIndex]['AO']]: {
                            "DataRSSI": excelData[i]['AO'],
                            "BeaconRSSI": excelData[i + 1]['AO'],
                            "WiFiMCSRate": excelData[i + 2]['AO'],
                            "WiFiNoisefloor": excelData[i + 3]['AO'],
                            "BTRSSI": excelData[i + 4]['AO'],
                            "WiFiCoexTP": excelData[i + 5]['AO'],
                            "BTPerformanceResult#1": excelData[i + 6]['AO'],
                            "BTPerformanceResult#2": excelData[i + 7]['AO']
                        }
                    };
                    Object.assign(arrColValues, _AO)
                }

                if (excelData[i]['AP'] != "") {
                    let _AP = {
                        [excelData[keyIndex]['AP']]: {
                            "DataRSSI": excelData[i]['AP'],
                            "BeaconRSSI": excelData[i + 1]['AP'],
                            "WiFiMCSRate": excelData[i + 2]['AP'],
                            "WiFiNoisefloor": excelData[i + 3]['AP'],
                            "BTRSSI": excelData[i + 4]['AP'],
                            "WiFiCoexTP": excelData[i + 5]['AP'],
                            "BTPerformanceResult#1": excelData[i + 6]['AP'],
                            "BTPerformanceResult#2": excelData[i + 7]['AP']
                        }
                    };
                    Object.assign(arrColValues, _AP)
                }

                if (excelData[i]['AQ'] != "") {
                    let _AQ = {
                        [excelData[keyIndex]['AQ']]: {
                            "DataRSSI": excelData[i]['AQ'],
                            "BeaconRSSI": excelData[i + 1]['AQ'],
                            "WiFiMCSRate": excelData[i + 2]['AQ'],
                            "WiFiNoisefloor": excelData[i + 3]['AQ'],
                            "BTRSSI": excelData[i + 4]['AQ'],
                            "WiFiCoexTP": excelData[i + 5]['AQ'],
                            "BTPerformanceResult#1": excelData[i + 6]['AQ'],
                            "BTPerformanceResult#2": excelData[i + 7]['AQ']
                        }
                    };
                    Object.assign(arrColValues, _AQ)
                }

                if (excelData[i]['AR'] != "") {
                    let _AR = {
                        [excelData[keyIndex]['AR']]: {
                            "DataRSSI": excelData[i]['AR'],
                            "BeaconRSSI": excelData[i + 1]['AR'],
                            "WiFiMCSRate": excelData[i + 2]['AR'],
                            "WiFiNoisefloor": excelData[i + 3]['AR'],
                            "BTRSSI": excelData[i + 4]['AR'],
                            "WiFiCoexTP": excelData[i + 5]['AR'],
                            "BTPerformanceResult#1": excelData[i + 6]['AR'],
                            "BTPerformanceResult#2": excelData[i + 7]['AR']
                        }
                    };
                    Object.assign(arrColValues, _AR)
                }

                if (excelData[i]['AS'] != "") {
                    let _AS = {
                        [excelData[keyIndex]['AS']]: {
                            "DataRSSI": excelData[i]['AS'],
                            "BeaconRSSI": excelData[i + 1]['AS'],
                            "WiFiMCSRate": excelData[i + 2]['AS'],
                            "WiFiNoisefloor": excelData[i + 3]['AS'],
                            "BTRSSI": excelData[i + 4]['AS'],
                            "WiFiCoexTP": excelData[i + 5]['AS'],
                            "BTPerformanceResult#1": excelData[i + 6]['AS'],
                            "BTPerformanceResult#2": excelData[i + 7]['AS']
                        }
                    };
                    Object.assign(arrColValues, _AS)
                }

                if (excelData[i]['AT'] != "") {
                    let _AT = {
                        [excelData[keyIndex]['AT']]: {
                            "DataRSSI": excelData[i]['AT'],
                            "BeaconRSSI": excelData[i + 1]['AT'],
                            "WiFiMCSRate": excelData[i + 2]['AT'],
                            "WiFiNoisefloor": excelData[i + 3]['AT'],
                            "BTRSSI": excelData[i + 4]['AT'],
                            "WiFiCoexTP": excelData[i + 5]['AT'],
                            "BTPerformanceResult#1": excelData[i + 6]['AT'],
                            "BTPerformanceResult#2": excelData[i + 7]['AT']
                        }
                    };
                    Object.assign(arrColValues, _AT)
                }

                if (excelData[i]['AU'] != "") {
                    let _AU = {
                        [excelData[keyIndex]['AU']]: {
                            "DataRSSI": excelData[i]['AU'],
                            "BeaconRSSI": excelData[i + 1]['AU'],
                            "WiFiMCSRate": excelData[i + 2]['AU'],
                            "WiFiNoisefloor": excelData[i + 3]['AU'],
                            "BTRSSI": excelData[i + 4]['AU'],
                            "WiFiCoexTP": excelData[i + 5]['AU'],
                            "BTPerformanceResult#1": excelData[i + 6]['AU'],
                            "BTPerformanceResult#2": excelData[i + 7]['AU']
                        }
                    };
                    Object.assign(arrColValues, _AU)
                }

                if (excelData[i]['AV'] != "") {
                    let _AV = {
                        [excelData[keyIndex]['AV']]: {
                            "DataRSSI": excelData[i]['AV'],
                            "BeaconRSSI": excelData[i + 1]['AV'],
                            "WiFiMCSRate": excelData[i + 2]['AV'],
                            "WiFiNoisefloor": excelData[i + 3]['AV'],
                            "BTRSSI": excelData[i + 4]['AV'],
                            "WiFiCoexTP": excelData[i + 5]['AV'],
                            "BTPerformanceResult#1": excelData[i + 6]['AV'],
                            "BTPerformanceResult#2": excelData[i + 7]['AV']
                        }
                    };
                    Object.assign(arrColValues, _AV)
                }

                if (excelData[i]['AW'] != "") {
                    let _AW = {
                        [excelData[keyIndex]['AW']]: {
                            "DataRSSI": excelData[i]['AW'],
                            "BeaconRSSI": excelData[i + 1]['AW'],
                            "WiFiMCSRate": excelData[i + 2]['AW'],
                            "WiFiNoisefloor": excelData[i + 3]['AW'],
                            "BTRSSI": excelData[i + 4]['AW'],
                            "WiFiCoexTP": excelData[i + 5]['AW'],
                            "BTPerformanceResult#1": excelData[i + 6]['AW'],
                            "BTPerformanceResult#2": excelData[i + 7]['AW']
                        }
                    };
                    Object.assign(arrColValues, _AW)
                }

                if (excelData[i]['AX'] != "") {
                    let _AX = {
                        [excelData[keyIndex]['AX']]: {
                            "DataRSSI": excelData[i]['AX'],
                            "BeaconRSSI": excelData[i + 1]['AX'],
                            "WiFiMCSRate": excelData[i + 2]['AX'],
                            "WiFiNoisefloor": excelData[i + 3]['AX'],
                            "BTRSSI": excelData[i + 4]['AX'],
                            "WiFiCoexTP": excelData[i + 5]['AX'],
                            "BTPerformanceResult#1": excelData[i + 6]['AX'],
                            "BTPerformanceResult#2": excelData[i + 7]['AX']
                        }
                    };
                    Object.assign(arrColValues, _AX)
                }

                if (excelData[i]['AY'] != "") {
                    let _AY = {
                        [excelData[keyIndex]['AY']]: {
                            "DataRSSI": excelData[i]['AY'],
                            "BeaconRSSI": excelData[i + 1]['AY'],
                            "WiFiMCSRate": excelData[i + 2]['AY'],
                            "WiFiNoisefloor": excelData[i + 3]['AY'],
                            "BTRSSI": excelData[i + 4]['AY'],
                            "WiFiCoexTP": excelData[i + 5]['AY'],
                            "BTPerformanceResult#1": excelData[i + 6]['AY'],
                            "BTPerformanceResult#2": excelData[i + 7]['AY']
                        }
                    };
                    Object.assign(arrColValues, _AY)
                }

                if (excelData[i]['AZ'] != "") {
                    let _AZ = {
                        [excelData[keyIndex]['AZ']]: {
                            "DataRSSI": excelData[i]['AZ'],
                            "BeaconRSSI": excelData[i + 1]['AZ'],
                            "WiFiMCSRate": excelData[i + 2]['AZ'],
                            "WiFiNoisefloor": excelData[i + 3]['AZ'],
                            "BTRSSI": excelData[i + 4]['AZ'],
                            "WiFiCoexTP": excelData[i + 5]['AZ'],
                            "BTPerformanceResult#1": excelData[i + 6]['AZ'],
                            "BTPerformanceResult#2": excelData[i + 7]['AZ']
                        }
                    };
                    Object.assign(arrColValues, _AZ)
                }

                if (excelData[i]['BA'] != "") {
                    let _BA = {
                        [excelData[keyIndex]['BA']]: {
                            "DataRSSI": excelData[i]['BA'],
                            "BeaconRSSI": excelData[i + 1]['BA'],
                            "WiFiMCSRate": excelData[i + 2]['BA'],
                            "WiFiNoisefloor": excelData[i + 3]['BA'],
                            "BTRSSI": excelData[i + 4]['BA'],
                            "WiFiCoexTP": excelData[i + 5]['BA'],
                            "BTPerformanceResult#1": excelData[i + 6]['BA'],
                            "BTPerformanceResult#2": excelData[i + 7]['BA']
                        }
                    };
                    Object.assign(arrColValues, _BA)
                }

                if (excelData[i]['BB'] != "") {
                    let _BB = {
                        [excelData[keyIndex]['BB']]: {
                            "DataRSSI": excelData[i]['BB'],
                            "BeaconRSSI": excelData[i + 1]['BB'],
                            "WiFiMCSRate": excelData[i + 2]['BB'],
                            "WiFiNoisefloor": excelData[i + 3]['BB'],
                            "BTRSSI": excelData[i + 4]['BB'],
                            "WiFiCoexTP": excelData[i + 5]['BB'],
                            "BTPerformanceResult#1": excelData[i + 6]['BB'],
                            "BTPerformanceResult#2": excelData[i + 7]['BB']
                        }
                    };
                    Object.assign(arrColValues, _BB)
                }

                if (excelData[i]['BC'] != "") {
                    let _BC = {
                        [excelData[keyIndex]['BC']]: {
                            "DataRSSI": excelData[i]['BC'],
                            "BeaconRSSI": excelData[i + 1]['BC'],
                            "WiFiMCSRate": excelData[i + 2]['BC'],
                            "WiFiNoisefloor": excelData[i + 3]['BC'],
                            "BTRSSI": excelData[i + 4]['BC'],
                            "WiFiCoexTP": excelData[i + 5]['BC'],
                            "BTPerformanceResult#1": excelData[i + 6]['BC'],
                            "BTPerformanceResult#2": excelData[i + 7]['BC']
                        }
                    };
                    Object.assign(arrColValues, _BC)
                }

                if (excelData[i]['BD'] != "") {
                    let _BD = {
                        [excelData[keyIndex]['BD']]: {
                            "DataRSSI": excelData[i]['BD'],
                            "BeaconRSSI": excelData[i + 1]['BD'],
                            "WiFiMCSRate": excelData[i + 2]['BD'],
                            "WiFiNoisefloor": excelData[i + 3]['BD'],
                            "BTRSSI": excelData[i + 4]['BD'],
                            "WiFiCoexTP": excelData[i + 5]['BD'],
                            "BTPerformanceResult#1": excelData[i + 6]['BD'],
                            "BTPerformanceResult#2": excelData[i + 7]['BD']
                        }
                    };
                    Object.assign(arrColValues, _BD)
                }

                if (excelData[i]['BE'] != "") {
                    let _BE = {
                        [excelData[keyIndex]['BE']]: {
                            "DataRSSI": excelData[i]['BE'],
                            "BeaconRSSI": excelData[i + 1]['BE'],
                            "WiFiMCSRate": excelData[i + 2]['BE'],
                            "WiFiNoisefloor": excelData[i + 3]['BE'],
                            "BTRSSI": excelData[i + 4]['BE'],
                            "WiFiCoexTP": excelData[i + 5]['BE'],
                            "BTPerformanceResult#1": excelData[i + 6]['BE'],
                            "BTPerformanceResult#2": excelData[i + 7]['BE']
                        }
                    };
                    Object.assign(arrColValues, _BE)
                }

                if (excelData[i]['BF'] != "") {
                    let _BF = {
                        [excelData[keyIndex]['BF']]: {
                            "DataRSSI": excelData[i]['BF'],
                            "BeaconRSSI": excelData[i + 1]['BF'],
                            "WiFiMCSRate": excelData[i + 2]['BF'],
                            "WiFiNoisefloor": excelData[i + 3]['BF'],
                            "BTRSSI": excelData[i + 4]['BF'],
                            "WiFiCoexTP": excelData[i + 5]['BF'],
                            "BTPerformanceResult#1": excelData[i + 6]['BF'],
                            "BTPerformanceResult#2": excelData[i + 7]['BF']
                        }
                    };
                    Object.assign(arrColValues, _BF)
                }

                if (excelData[i]['BG'] != "") {
                    let _BG = {
                        [excelData[keyIndex]['BG']]: {
                            "DataRSSI": excelData[i]['BG'],
                            "BeaconRSSI": excelData[i + 1]['BG'],
                            "WiFiMCSRate": excelData[i + 2]['BG'],
                            "WiFiNoisefloor": excelData[i + 3]['BG'],
                            "BTRSSI": excelData[i + 4]['BG'],
                            "WiFiCoexTP": excelData[i + 5]['BG'],
                            "BTPerformanceResult#1": excelData[i + 6]['BG'],
                            "BTPerformanceResult#2": excelData[i + 7]['BG']
                        }
                    };
                    Object.assign(arrColValues, _BG)
                }

                if (excelData[i]['BH'] != "") {
                    let _BH = {
                        [excelData[keyIndex]['BH']]: {
                            "DataRSSI": excelData[i]['BH'],
                            "BeaconRSSI": excelData[i + 1]['BH'],
                            "WiFiMCSRate": excelData[i + 2]['BH'],
                            "WiFiNoisefloor": excelData[i + 3]['BH'],
                            "BTRSSI": excelData[i + 4]['BH'],
                            "WiFiCoexTP": excelData[i + 5]['BH'],
                            "BTPerformanceResult#1": excelData[i + 6]['BH'],
                            "BTPerformanceResult#2": excelData[i + 7]['BH']
                        }
                    };
                    Object.assign(arrColValues, _BH)
                }

                if (excelData[i]['BI'] != "") {
                    let _BI = {
                        [excelData[keyIndex]['BI']]: {
                            "DataRSSI": excelData[i]['BI'],
                            "BeaconRSSI": excelData[i + 1]['BI'],
                            "WiFiMCSRate": excelData[i + 2]['BI'],
                            "WiFiNoisefloor": excelData[i + 3]['BI'],
                            "BTRSSI": excelData[i + 4]['BI'],
                            "WiFiCoexTP": excelData[i + 5]['BI'],
                            "BTPerformanceResult#1": excelData[i + 6]['BI'],
                            "BTPerformanceResult#2": excelData[i + 7]['BI']
                        }
                    };
                    Object.assign(arrColValues, _BI)
                }

                throughput_data.push(arrColValues);
                arrColValues = {};
            }
            console.log('len-data', throughput_data.length);

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                if (sheetName == "Coex_RVR_Set-1") {
                    throughput_data[j].project_type = "COEX-BT-RVR";
                } else if (sheetName == "Coex_RVR_Set-2") {
                    throughput_data[j].project_type = "COEX-WiFi-RVR";

                } else if (sheetName == "Coex_RVR_Set-3") {
                    throughput_data[j].project_type = "COEX-BT-WiFi-RVR";

                }
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
            //responseError(res, responseObject, "This Execution Name already exists!");
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
            //responseError(res, responseObject, "Error in uploading file - (GenericTEUploadFunc)");
        }
        return returnObj;
    }

}



/** Generic Function for Upload test executions templates RvR*/

async function RvR_uploadFunc(CommonObj) {

    let headers = [];

    // console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[51]);
        excelHeader.splice(0, 2);
        // console.log('excelHeader --', excelHeader);


        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        // let indexOfHeader1 = headers.header.indexOf("Sl No.");
        // headers.header[indexOfHeader1] = 'S#N#';

        // let indexOfHeader = headers.header.indexOf("DUT Fw-Drv");
        // headers.header[indexOfHeader] = 'DUT Fw/Drv';

        //Remove the single space of the object
        headers.header = headers.header.map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });


        excelHeader.splice(19, excelHeader.length - 19);
        headers.header.splice(19, headers.header.length - 19);


        console.log('DB Header --', headers.header);
        console.log('DB Header Size --', headers.header.length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header, excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};
            let length = excelData.length;
            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 52; i < length; i++) {

                if (excelData[i]['D'] != '') {

                    arrColValues = {
                        "Sl No": excelData[i]['C'],
                        "TP TYPE": excelData[i]['D'],
                        "DUT": excelData[i]['E'],
                        "SoC Version": excelData[i]['F'],
                        "SoC TYPE": excelData[i]['G'],
                        "DUT Fw/Drv": excelData[i]['H'],
                        "Interface": excelData[i]['I'],
                        "Aggregation": excelData[i]['J'],
                        "Spatial Streams": excelData[i]['K'],
                        "Guard Interval": excelData[i]['L'],
                        "Data Rate": excelData[i]['M'],
                        "Channel | 2 GHz": excelData[i]['N'],
                        "Channel | 5 GHz": excelData[i]['O'],
                        "SDIO Clock": excelData[i]['P'],
                        "Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC": excelData[i]['Q'],
                        "Companion Device FW/Drv": excelData[i]['R'],
                        "DUT Host Platform": excelData[i]['S'],
                        "DUT OS": excelData[i]['T'],
                        "Security": excelData[i]['U'],
                        "DUT Mode": excelData[i]['V'],
                        "DUT Protocol": excelData[i]['W'],
                        "59": (Number(excelData[i]['X']) ? Number(excelData[i]['X']) : ''),
                        "60": (Number(excelData[i]['Y']) ? Number(excelData[i]['Y']) : ''),
                        "61": (Number(excelData[i]['Z']) ? Number(excelData[i]['Z']) : ''),
                        "62": (Number(excelData[i]['AA']) ? Number(excelData[i]['AA']) : ''),
                        "63": (Number(excelData[i]['AB']) ? Number(excelData[i]['AB']) : ''),
                        "64": (Number(excelData[i]['AC']) ? Number(excelData[i]['AC']) : ''),
                        "65": (Number(excelData[i]['AD']) ? Number(excelData[i]['AD']) : ''),
                        "66": (Number(excelData[i]['AE']) ? Number(excelData[i]['AE']) : ''),
                        "67": (Number(excelData[i]['AF']) ? Number(excelData[i]['AF']) : ''),
                        "68": (Number(excelData[i]['AG']) ? Number(excelData[i]['AG']) : ''),
                        "69": (Number(excelData[i]['AH']) ? Number(excelData[i]['AH']) : ''),
                        "70": (Number(excelData[i]['AI']) ? Number(excelData[i]['AI']) : ''),
                        "71": (Number(excelData[i]['AJ']) ? Number(excelData[i]['AJ']) : ''),
                        "72": (Number(excelData[i]['AK']) ? Number(excelData[i]['AK']) : ''),
                        "73": (Number(excelData[i]['AL']) ? Number(excelData[i]['AL']) : ''),
                        "74": (Number(excelData[i]['AM']) ? Number(excelData[i]['AM']) : ''),
                        "75": (Number(excelData[i]['AN']) ? Number(excelData[i]['AN']) : ''),
                        "76": (Number(excelData[i]['AO']) ? Number(excelData[i]['AO']) : ''),
                        "77": (Number(excelData[i]['AP']) ? Number(excelData[i]['AP']) : ''),
                        "78": (Number(excelData[i]['AQ']) ? Number(excelData[i]['AQ']) : ''),
                        "79": (Number(excelData[i]['AR']) ? Number(excelData[i]['AR']) : ''),
                        "80": (Number(excelData[i]['AS']) ? Number(excelData[i]['AS']) : ''),
                        "81": (Number(excelData[i]['AT']) ? Number(excelData[i]['AT']) : ''),
                        "82": (Number(excelData[i]['AU']) ? Number(excelData[i]['AU']) : ''),
                        "83": (Number(excelData[i]['AV']) ? Number(excelData[i]['AV']) : ''),
                        "84": (Number(excelData[i]['AW']) ? Number(excelData[i]['AW']) : ''),
                        "85": (Number(excelData[i]['AX']) ? Number(excelData[i]['AX']) : ''),
                        "86": (Number(excelData[i]['AY']) ? Number(excelData[i]['AY']) : ''),
                        "87": (Number(excelData[i]['AZ']) ? Number(excelData[i]['AZ']) : ''),
                        "88": (Number(excelData[i]['BA']) ? Number(excelData[i]['BA']) : ''),
                        "89": (Number(excelData[i]['BB']) ? Number(excelData[i]['BB']) : ''),
                        "90": (Number(excelData[i]['BC']) ? Number(excelData[i]['BC']) : ''),
                        "91": (Number(excelData[i]['BD']) ? Number(excelData[i]['BD']) : ''),
                        "92": (Number(excelData[i]['BE']) ? Number(excelData[i]['BE']) : ''),
                        "93": (Number(excelData[i]['BF']) ? Number(excelData[i]['BF']) : ''),
                        "94": (Number(excelData[i]['BG']) ? Number(excelData[i]['BG']) : ''),
                        "95": (Number(excelData[i]['BH']) ? Number(excelData[i]['BH']) : ''),
                        "96": (Number(excelData[i]['BI']) ? Number(excelData[i]['BI']) : ''),
                        "97": (Number(excelData[i]['BJ']) ? Number(excelData[i]['BJ']) : ''),
                        "98": (Number(excelData[i]['BK']) ? Number(excelData[i]['BK']) : ''),
                        "99": (Number(excelData[i]['BL']) ? Number(excelData[i]['BL']) : ''),
                        "100": (Number(excelData[i]['BM']) ? Number(excelData[i]['BM']) : ''),
                        "101": (Number(excelData[i]['BN']) ? Number(excelData[i]['BN']) : ''),
                        "102": (Number(excelData[i]['BO']) ? Number(excelData[i]['BO']) : ''),
                        "103": (Number(excelData[i]['BP']) ? Number(excelData[i]['BP']) : ''),
                        "104": (Number(excelData[i]['BQ']) ? Number(excelData[i]['BQ']) : ''),
                        "105": (Number(excelData[i]['BR']) ? Number(excelData[i]['BR']) : ''),
                        "106": (Number(excelData[i]['BS']) ? Number(excelData[i]['BS']) : ''),
                        "107": (Number(excelData[i]['BT']) ? Number(excelData[i]['BT']) : ''),
                        "108": (Number(excelData[i]['BU']) ? Number(excelData[i]['BU']) : ''),
                        "109": (Number(excelData[i]['BV']) ? Number(excelData[i]['BV']) : ''),
                        "110": (Number(excelData[i]['BW']) ? Number(excelData[i]['BW']) : ''),
                        "111": (Number(excelData[i]['BX']) ? Number(excelData[i]['BX']) : ''),
                        "112": (Number(excelData[i]['BY']) ? Number(excelData[i]['BY']) : ''),
                        "113": (Number(excelData[i]['BZ']) ? Number(excelData[i]['BZ']) : ''),
                        "114": (Number(excelData[i]['CA']) ? Number(excelData[i]['CA']) : ''),
                        "115": (Number(excelData[i]['CB']) ? Number(excelData[i]['CB']) : ''),
                        "116": (Number(excelData[i]['CC']) ? Number(excelData[i]['CC']) : ''),
                        "117": (Number(excelData[i]['CD']) ? Number(excelData[i]['CD']) : ''),
                        "118": (Number(excelData[i]['CE']) ? Number(excelData[i]['CE']) : ''),
                        "119": (Number(excelData[i]['CF']) ? Number(excelData[i]['CF']) : ''),
                        "120": (Number(excelData[i]['CG']) ? Number(excelData[i]['CG']) : ''),
                        "121": (Number(excelData[i]['CH']) ? Number(excelData[i]['CH']) : ''),
                        "122": (Number(excelData[i]['CI']) ? Number(excelData[i]['CI']) : ''),
                        "123": (Number(excelData[i]['CJ']) ? Number(excelData[i]['CJ']) : ''),
                        "124": (Number(excelData[i]['CK']) ? Number(excelData[i]['CK']) : ''),
                        "125": (Number(excelData[i]['CL']) ? Number(excelData[i]['CL']) : ''),
                        "126": (Number(excelData[i]['CM']) ? Number(excelData[i]['CM']) : ''),
                        "127": (Number(excelData[i]['CN']) ? Number(excelData[i]['CN']) : ''),
                        "Comments": excelData[i]['CO'],
                        "Test Repetition": excelData[i]['CP']
                    };
                    throughput_data.push(arrColValues);
                    arrColValues = {};
                }
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }
}


/** Generic Function for Upload test executions templates CC*/

async function CC_uploadFunc(CommonObj) {

    let headers = [];

    // console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[3]);
        excelHeader.splice(0, 3);
        console.log('exceldata length --', excelData.length);


        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });


        excelHeader.splice(14, excelHeader.length - 14);
        headers.header[0].splice(14, headers.header[0].length - 14);


        console.log('DB Header --', headers.header[0]);
        console.log('DB Header Size --', headers.header[0].length);
        console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};
            let counter = 0;
            let headervalue;
            let headerarr = [];
            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 4; i < excelData.length; i++) {

                if (excelData[i]['F'] == '' && excelData[i]['G'] == '' && excelData[i]['H'] == '' && excelData[i]['I'] == '' && excelData[i]['J'] == '' && excelData[i]['K'] == '' && excelData[i]['L'] == '' && excelData[i]['M'] == '') {
                    counter++;
                    console.log("Counter --> ", i, "-->", counter);

                    headervalue = {
                        'S#NO#': excelData[i]['D'],
                        'Test Cases': excelData[i]['E']
                    }
                    headerarr.push(headervalue);
                    headervalue = {};

                    //console.log("headerarr -->", headerarr.length);

                } else {

                    counter = 0;
                    let Header = {};
                    let Harr = [];

                    if (headerarr.length == 0) {
                        Harr.push(null);
                    } else {
                        for (var j = 0; j < headerarr.length; j++) {
                            Header['Header' + (j + 1)] = headerarr[j];
                        }
                        Harr.push(Header);
                        Header = [];
                    }

                    //console.log("Harr -->", Harr);

                    let V1 = {
                        "Measured(mA)": excelData[i]['Y'],
                        "Refernce(mA)": excelData[i]['Z']
                    };

                    let V8 = {
                        "Measured(mA)": excelData[i]['AA'],
                        "Refernce(mA)": excelData[i]['AB']
                    };

                    let V2 = {
                        "Measured(mA)": excelData[i]['AC'],
                        "Refernce(mA)": excelData[i]['AD']
                    };

                    let V3 = {
                        "Measured(mA)": excelData[i]['AE'],
                        "Refernce(mA)": excelData[i]['AF']
                    };

                    let V5 = {
                        "Measured(mA)": excelData[i]['AG'],
                        "Refernce(mA)": excelData[i]['AH']
                    };

                    let V6 = {
                        "Measured(mA)": excelData[i]['AI'],
                        "Refernce(mA)": excelData[i]['AJ']
                    };

                    arrColValues = {
                        "Test_case_Id": excelData[i]['D'],
                        "TEST CASES": excelData[i]['E'],
                        "Test Steps": excelData[i]['F'],
                        "Test Status": excelData[i]['G'],
                        "WLAN Standalone FW": excelData[i]['H'],
                        "BT Standalone FW": excelData[i]['I'],
                        "BLE Standalone FW": excelData[i]['J'],
                        "Combo FW": excelData[i]['K'],
                        "CPU-1 (WLAN)": excelData[i]['L'],
                        "CPU-2 (BT)": excelData[i]['M'],
                        "Band": excelData[i]['N'],
                        "Band Width": excelData[i]['O'],
                        "MCS": excelData[i]['P'],
                        "RU Size": excelData[i]['Q'],
                        "Antenna Configuration": excelData[i]['R'],
                        "Spatial Stream": excelData[i]['S'],
                        "Comments": excelData[i]['T'],
                        "Tx-Power_Expected [dBm]": excelData[i]['V'],
                        "Tx-Power_Measured [dBm]": excelData[i]['W'],
                        "TP_Measured [Mbps]": excelData[i]['X'],
                        "Header data": Harr[0],
                        "I_V1_1": V1,
                        "I_V1_8": V8,
                        "I_V2_2": V2,
                        "I_V3_3": V3,
                        "I_V5": V5,
                        "I_V3_6 | V_BAT": V6,
                        "Comments": excelData[i]['AK']

                    };
                    throughput_data.push(arrColValues);
                    arrColValues = {};
                    headerarr = [];
                    Harr = [];
                }
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;

        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}


/** Generic Function for Upload test executions templates DFS*/

async function DFS_uploadFunc(CommonObj) {

    let headers = [];

    // console.log('Generic CommonObj--', CommonObj)
    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[6]);
        excelHeader.splice(0, 2);


        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        //Remove the single space of the object
        headers.header[0] = headers.header[0].map(function(el) {
            return el.split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });


        excelHeader.splice(4, excelHeader.length - 4);
        headers.header[0].splice(4, headers.header[0].length - 4);


        //console.log('DB Header --', headers.header[0]);
        //console.log('DB Header Size --', headers.header[0].length);
        //console.log('\nExcel Header --', excelHeader);
        //console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[0], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};
            let counter = 0;
            let headervalue;
            let headerarr = [];

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 7; i < excelData.length; i++) {

                if (excelData[i]['C'] == '-') {
                    continue;
                };

                if (excelData[i]['E'] == '') {
                    counter++;
                    // console.log("Counter --> ", i, "-->", counter);

                    headervalue = {
                        'S#NO#': excelData[i]['C'],
                        'Test Cases': excelData[i]['D']
                    }
                    headerarr.push(headervalue);
                    headervalue = {};

                    //console.log("headerarr -->", headerarr.length);

                } else {

                    counter = 0;
                    let Header = {};
                    let Harr = [];

                    if (headerarr.length == 0) {
                        Harr.push(null);
                    } else {
                        for (var j = 0; j < headerarr.length; j++) {
                            Header['Header' + (j + 1)] = headerarr[j];
                        }
                        Harr.push(Header);
                        Header = [];
                    }

                    //console.log("Harr -->", Harr);

                    arrColValues = {
                        "Test_case_Id": excelData[i]['C'],
                        "TEST CASES": excelData[i]['D'],
                        "RESULTS": excelData[i]['E'],
                        "COMMENTS": excelData[i]['F'],
                        "TestType": excelData[i]['H'],
                        "Region": excelData[i]['I'],
                        "Country": excelData[i]['J'],
                        "Header data": Harr[0],
                        "Mode": excelData[i]['K'],
                        "Channel Bandwidth": excelData[i]['L'],
                        "Spatial Streams": excelData[i]['M'],
                        "Radar Waveform": excelData[i]['N'],
                        "Radar Pulse Frequency @ Lower Edge| Fc | Higher Edge": excelData[i]['O'],
                        "Required Detection NT %": excelData[i]['P'],
                        "Occupied Channel BW in MHz": excelData[i]['Q'],
                        "Channel Loading %": excelData[i]['R'],
                        "Automation execution time (mins)": excelData[i]['S'],
                        "36": excelData[i]['U'],
                        "40": excelData[i]['V'],
                        "44": excelData[i]['W'],
                        "48": excelData[i]['X'],
                        "52": excelData[i]['Y'],
                        "56": excelData[i]['Z'],
                        "60": excelData[i]['AA'],
                        "64": excelData[i]['AB'],
                        "100": excelData[i]['AC'],
                        "104": excelData[i]['AD'],
                        "108": excelData[i]['AE'],
                        "112": excelData[i]['AF'],
                        "116": excelData[i]['AG'],
                        "120": excelData[i]['AH'],
                        "124": excelData[i]['AI'],
                        "128": excelData[i]['AJ'],
                        "132": excelData[i]['AK'],
                        "136": excelData[i]['AL'],
                        "140": excelData[i]['AM'],
                        "144": excelData[i]['AN'],
                        "Automation Status (Y/N)": excelData[i]['AP'],
                        "Automation execution time (mins)": excelData[i]['AQ'],
                        "Manual execution time (mins)": excelData[i]['AR'],
                        "Falcon RT": excelData[i]['AS'],
                        "Rb3 RT": excelData[i]['AT'],
                        "Rb3P RT": excelData[i]['AU'],
                        "CA2 MM-Linux": excelData[i]['AV'],
                        "CA2 MM-Android": excelData[i]['AW'],
                        "KF2 MM-Linux": excelData[i]['AX'],
                        "KF2 MM-Android": excelData[i]['AY'],
                        "CA2 Generic": excelData[i]['AZ'],
                        "KF2 Generic": excelData[i]['BA'],
                        "RB3P Generic": excelData[i]['BB'],
                        "9000S Generic": excelData[i]['BC'],
                        "9098 Generic": excelData[i]['BD'],
                        "9097 Generic": excelData[i]['BE'],
                        "Firecrest Generic": excelData[i]['BF'],
                        "SCBT": excelData[i]['BG']
                    };
                    throughput_data.push(arrColValues);
                    arrColValues = {};
                    headerarr = [];
                    Harr = [];
                }
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions templates WACP_Coex*/

async function WACP_CoexuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };

    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[14]);
        excelHeader.splice(0, 1);


        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        let indexOfHeader1 = headers.header[2].indexOf("Test_case_Id");
        headers.header[2][indexOfHeader1] = 'TC ID';

        //Remove the single space of the object
        headers.header[2] = headers.header[2].map(function(el) {
            return el.toString().split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(8, excelHeader.length - 8);
        headers.header[2].splice(8, headers.header[2].length - 8);


        // console.log('DB Header --', headers.header[2]);
        console.log('DB Header Size --', headers.header[2].length);
        // console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[2], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};
            let counter = 0;
            let headervalue;
            let headerarr = [];
            let commonarr = [];
            let Device_Configuration = {};
            let Key_Performance_Indicator = {};
            let Header1 = {};
            Device_Configuration = {
                "Build Version": excelData[1]['D'],
                "SoC Info": excelData[2]['D'],
                "Environment": excelData[3]['D'],
                "Configuration": excelData[4]['D'],
                "Ref STA1 (Iphone)": excelData[5]['D'],
                "Notes": excelData[6]['D']
            };
            commonarr.push(Device_Configuration);

            Key_Performance_Indicator = {
                "TCP Bi-directional throughput": excelData[2]['L'],
                "UDP Bi-directional throughput": excelData[3]['L'],
                "Latency": excelData[4]['L'],
                "Packet Loss": excelData[5]['L']
            };
            commonarr.push(Key_Performance_Indicator);
            Header1['Device Configuration'] = commonarr[0];
            Header1['Key Performance Indicator'] = commonarr[1];
            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 15; i < excelData.length; i++) {

                if (excelData[i]['D'] == '') {
                    continue;
                };
                if (excelData[i]['E'] == '' && excelData[i]['F'] == '' && excelData[i]['G'] == '' && excelData[i]['H'] == '' && excelData[i]['I'] == '') {
                    counter++;

                    headervalue = {
                        'TC ID': excelData[i]['C'],
                        'Test Case': excelData[i]['D']
                    }
                    headerarr.push(headervalue);
                    headervalue = {};

                } else {

                    counter = 0;
                    let Header = {};
                    let Harr = [];

                    if (headerarr.length == 0) {
                        Harr.push(null);
                    } else {
                        for (var j = 0; j < headerarr.length; j++) {
                            Header['Header' + (j + 1)] = headerarr[j];
                        }
                        Harr.push(Header);
                        Header = [];
                    }

                    let Ping = {
                        "Min (ms)": excelData[i]['J'],
                        "Max (ms)": excelData[i]['K'],
                        "Avg (ms)": excelData[i]['L'],
                        "Deviation (ms)": excelData[i]['M']
                    };

                    let MMH_Header1 = {
                        "MMH-Client TP1": excelData[i]['O'],
                        "MMH-Client TP2": excelData[i]['P']
                    };

                    arrColValues = {
                        "Test Mode": excelData[i]['B'],
                        "Test_case_Id": excelData[i]['C'],
                        "Test Case": excelData[i]['D'],
                        "Duration [min]": excelData[i]['E'],
                        "TCP UL (Mbps)": excelData[i]['F'],
                        "TCP DL (Mbps)": excelData[i]['G'],
                        "UDP UL (Mbps)": excelData[i]['H'],
                        "UDP DL (Mbps)": excelData[i]['I'],
                        "Header data": Harr[0],
                        "Ping Letancy": Ping,
                        "Ping loss (%)": excelData[i]['N'],
                        "MMH_Header": MMH_Header1,
                        "BT quality": excelData[i]['Q']
                    };
                    throughput_data.push(arrColValues);
                    arrColValues = {};
                    headerarr = [];
                    Harr = [];
                }
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].Common = Header1;
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}

/** Generic Function for Upload test executions templates WACP_Wifi*/

async function WACP_WifiuploadFunc(CommonObj) {

    let headers = [];

    console.log('Generic TestExecutionID--', TestExecutionID)

    let filePath = CommonObj.filePath;
    let sheetName = CommonObj.sheetName;
    let project_type = CommonObj.template;
    let testExecName = CommonObj.testExecName;

    let headerStatus = '';

    let returnObj = {
        returnStatus: true,
        error: 0,
        data: ''
    };



    try {
        // get the sheet data for the specified sheet name
        let excelData = await getSheetdata(filePath, sheetName);

        let excelHeader = _.values(excelData[14]);
        excelHeader.splice(0, 1);


        /*  Headers for validation on uploaded file */
        headers = await throughputObj.findHeader(project_type);

        let indexOfHeader1 = headers.header[2].indexOf("Test_case_Id");
        headers.header[2][indexOfHeader1] = 'TC ID';

        //Remove the single space of the object
        headers.header[2] = headers.header[2].map(function(el) {
            return el.toString().split(/\s/).join('');
        });

        //Remove the single space of the object
        excelHeader = excelHeader.map(function(el) {
            return el.split(/\s/).join('');
        });

        excelHeader.splice(8, excelHeader.length - 8);
        headers.header[2].splice(8, headers.header[2].length - 8);


        //console.log('DB Header --', headers.header[2]);
        console.log('DB Header Size --', headers.header[2].length);
        //console.log('\nExcel Header --', excelHeader);
        console.log('Excel Header Size --', excelHeader.length);

        headerStatus = _.isEqual(headers.header[2], excelHeader);
        console.log('Header Status --', headerStatus);

        if (headerStatus) { // if Both the Headers are equal 

            if (TestExecutionID === '' || typeof TestExecutionID === 'undefined') {
                let executionDetails = await createExecution(CommonObj);
                TestExecutionID = executionDetails.getLastInsertedID;

                if (executionDetails.error == 1) {
                    returnObj.message = executionDetails.message;
                    returnObj.status = false;
                    returnObj.error = 1;
                    return returnObj;
                }
            }

            let throughput_data = [];
            let arrColValues = {};
            let counter = 0;
            let headervalue;
            let headerarr = [];
            let commonarr = [];
            let Device_Configuration = {};
            let Key_Performance_Indicator = {};
            let Header1 = {};
            Device_Configuration = {
                "Build Version": excelData[1]['D'],
                "SoC Info": excelData[2]['D'],
                "Environment": excelData[3]['D'],
                "Configuration": excelData[4]['D'],
                "Ref STA1 (Iphone)": excelData[5]['D'],
                "Notes": excelData[6]['D']
            };
            commonarr.push(Device_Configuration);

            Key_Performance_Indicator = {
                "TCP Bi-directional throughput": excelData[2]['L'],
                "UDP Bi-directional throughput": excelData[3]['L'],
                "Latency": excelData[4]['L'],
                "Packet Loss": excelData[5]['L']
            };
            commonarr.push(Key_Performance_Indicator);
            Header1['Device Configuration'] = commonarr[0];
            Header1['Key Performance Indicator'] = commonarr[1];

            // Using array of Excel header and Excel Data - mapping to Key:Value
            for (var i = 16; i < excelData.length; i++) {

                if (excelData[i]['D'] == '') {
                    continue;
                };
                if (excelData[i]['E'] == '' && excelData[i]['F'] == '' && excelData[i]['G'] == '' && excelData[i]['H'] == '' && excelData[i]['I'] == '') {
                    counter++;

                    headervalue = {
                        'TC ID': excelData[i]['C'],
                        'Test Case': excelData[i]['D']
                    }
                    headerarr.push(headervalue);
                    headervalue = {};

                } else {

                    counter = 0;
                    let Header = {};
                    let Harr = [];

                    if (headerarr.length == 0) {
                        Harr.push(null);
                    } else {
                        for (var j = 0; j < headerarr.length; j++) {
                            Header['Header' + (j + 1)] = headerarr[j];
                        }
                        Harr.push(Header);
                        Header = [];
                    }

                    let Ping = {
                        "Min (ms)": excelData[i]['J'],
                        "Max (ms)": excelData[i]['K'],
                        "Avg (ms)": excelData[i]['L'],
                        "Deviation (ms)": excelData[i]['M']
                    };

                    arrColValues = {
                        "Test Mode": excelData[i]['B'],
                        "Test_case_Id": excelData[i]['C'],
                        "Test Case": excelData[i]['D'],
                        "Duration [min]": excelData[i]['E'],
                        "TCP UL (Mbps)": excelData[i]['F'],
                        "TCP DL (Mbps)": excelData[i]['G'],
                        "UDP UL (Mbps)": excelData[i]['H'],
                        "UDP DL (Mbps)": excelData[i]['I'],
                        "Header data": Harr[0],
                        "Ping Letancy": Ping,
                        "Result": excelData[i]['N']
                    };

                    throughput_data.push(arrColValues);
                    arrColValues = {};
                    headerarr = [];
                    Harr = [];
                }
            }

            for (var j = 0; j < throughput_data.length; j++) {
                throughput_data[j].Common = Header1;
                throughput_data[j].execution_id = String(TestExecutionID);
                throughput_data[j].execution_name = testExecName;
                throughput_data[j].project_type = project_type;
            }
            // console.log(throughput_data);
            console.log('Size --', throughput_data.length);

            let insertReport = await uploadAnalyzeObj.insertUploadedData(throughput_data);
            console.log("\n Inserted Report Details ------\n", insertReport.insertedIds);

            returnObj.message = "Successfully Uploaded";
            returnObj.size = throughput_data.length;
            //returnObj.data = throughput_data;
        } else {
            returnObj.message = "Template and Excel file Headers are not matching.";
            returnObj.error = 1;
        }

        return returnObj;

    } catch (err) {
        logger.error("uploadTestExecution :", err);
        if (err.code == '11000') {
            returnObj.error = 1;
            returnObj.message = "This Execution Name already exists!";
        } else {
            returnObj.error = 1;
            returnObj.message = "Please select the proper template";
        }
        return returnObj;
    }

}