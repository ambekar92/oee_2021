var router = require('express').Router();

var user = require('routes/controller/user');
var userObj = new user();
var testExecution = require('routes/controller/testExecution');
var testExecutionObj = new testExecution();
var xlsProcessor = require('routes/controller/xlsProcessor.js');
var xlsProcessorObj = new xlsProcessor();
var testBed = require('routes/controller/testBed');
var testPlanUpload = require('routes/controller/testPlanUpload');
var testPlanUploadObj = new testPlanUpload();
var testBedObj = new testBed();
var xlsOperations = require('routes/controller/xlsOperations.js');
var xlsOperationObj = new xlsOperations();
var xlsxWriter = require('routes/controller/xlsxWriter');
var xlsxWriterObj = new xlsxWriter();
var watsVersion = require('routes/controller/watsVersion');
var watsVersionObj = new watsVersion();
var throughputResults = require('routes/controller/throughputResults');
var throughputResultsObj = new throughputResults();
var uploadAnalyze = require('routes/controller/uploadAnalyze');
var uploadAnalyzeObj = new uploadAnalyze();
var testBedUtil = require('routes/controller/testBedUtil');
var testBedUtilObj = new testBedUtil();
var auth = require('../config/auth');
var path = require('path');
var reportXlsxWriter = require('routes/controller/reportXlsxWriter');
var reportXlsxWriterObj = new reportXlsxWriter();
var testingToolImpl = require(path.resolve(__dirname, "./controller/testingTool.js"));
var testingTool = new testingToolImpl();

// export the routes to our application
module.exports = {
    router: router
};

// render angular application
router.get('/', function(req, res) {
    res.render('index');
});

/* User APIs */
router.post('/login', userObj.login);

router.post('/api/addUser', userObj.addUser);

router.get('/api/getUsers', userObj.getUsers);

router.post('/api/disableUser', userObj.disableUser);

router.post('/api/assignRole', userObj.assignRole);

router.post('/logout', userObj.logout);


/* Execution APIs */
router.get('/api/getTestSuites', xlsOperationObj.parsexls); // show test suites and test cases in selected test plan

router.post('/api/updateTestSuites', auth.verifyRole, xlsOperationObj.editxls); // modify existing xls file with updated values

router.post('/api/triggerExecution', testExecutionObj.triggerExecution); // start execution through GUI

router.post('/api/triggerCLIExecution', testExecutionObj.triggerCLIExecution); // start execution through CLI

router.post('/api/stopCLIExec', testExecutionObj.stopCLIExec); // terminate the execution via CLI

router.post('/api/stopExec', testExecutionObj.stopExec); // terminate execution via GUI

router.post('/api/reTriggerFailed', testExecutionObj.reTriggerFailed); // re execution of failed test cases

router.post('/processxlsfile', xlsProcessorObj.processxlsfile);

router.get('/api/liveUpdates', testExecutionObj.getExecutionUpdates);

router.post('/api/testPlanUpload', testPlanUploadObj.testPlanUpload); // upload input file to a testbed

router.post('/api/testPlanList', testPlanUploadObj.testPlanList); // list all the testplans within the directory

router.post('/api/downloadOutputFile', xlsxWriterObj.generateOutputFile); // generate output file for execution

router.post('/api/copyConfigFile', xlsOperationObj.createConfigCopy); // creates a copy of specified config file

router.post('/api/exportConfigFile', xlsOperationObj.exportConfig); // exports the specified config file

router.get('/api/listConfigFiles', testPlanUploadObj.listConfigFiles); // list of config file in testbed

router.post('/api/approveExecution', testExecutionObj.approveExecution);

router.post('/api/filterExecution', testExecutionObj.filterExecution);

router.post('/api/compareExecutionResults', testExecutionObj.compareExecutionResults);

router.post('/api/uploadWATSFiles', testBedObj.uploadWATSFiles); // upload WATS input file to a testbed

router.post('/api/uploadBATSFiles', testBedObj.uploadBATSFiles); // upload BATS input file to a testbed

router.post('/api/addColumns', xlsOperationObj.addColumns); // dynamically adds new column/columns in the specified file

router.post('/api/addRows', xlsOperationObj.addRows); // dynamically adds new row/rows in the specified file

router.post('/api/updateWorkbook', testExecutionObj.updateWorkbook);

router.post('/api/getPassFailResults', testExecutionObj.getPassFailResults);

// router.post('/api/updateExecutionFolder', testExecutionObj.updateExecFolder); // gets the output folder name for present execution from Testbed and updates the test_execution collection

router.get('/api/executions', testExecutionObj.executions); //gets all the executions for for given testbed for testbed hierarchy.

router.get('/api/getSummary', testExecutionObj.getSummary); //gets the summary for a given execution.

router.get('/api/getDropDowns', testExecutionObj.getDropDowns); // gets the drop downs available for filtering.

router.post('/api/getBands', testExecutionObj.getBands); // gets the bands executed for a given execution.

router.put('/api/deleteExecution', testExecutionObj.deleteExecutions); //deletes the executios

/* TestBed APIs */

router.get('/api/getAllTestBeds', testBedObj.getAllTestBeds); // gets all testbeds

router.put('/api/deleteTestBeds', testBedObj.deleteTestBeds); // deletes the testbeds

router.get('/api/getFavTestBeds', testBedObj.getFavoriteTestBeds); // gets favorite testbeds of users

router.post('/api/addFavoriteTestBeds', testBedObj.addFavoriteTestBeds); // adds the perticular testbed to favorites.

router.post('/api/removeFavoriteTestBeds', testBedObj.removeFavoriteTestBeds); // removes perticular testbed from favorites.


/* WATS Version APIs */
router.post('/api/createWatsVersion', watsVersionObj.createWatsVersion); // create a new wats version

router.get('/api/listVersions', watsVersionObj.listVersions); // list all wats versions

router.get('/api/listExecutions', testExecutionObj.listExecutions); // list all executions on the selected testbed

router.post('/api/addWatsVersion', testBedObj.addWatsVersion); // add wats version to the specified testbed

router.post('/api/addBatsVersion', testBedObj.addBatsVersion); // add bats version to the specified testbed


/* Result Comparision APIs */
router.post('/api/throughputData', throughputResultsObj.getThroughputData); // get the throughput values of each testcase from testbed

router.post('/api/compareKPIData', throughputResultsObj.compareThroughputData); // compares the throughput values between executions

router.get('/api/getthroughputData', throughputResultsObj.getThroughputTableData); // get the throughput values of each testcase from testbed

router.post('/api/compareTPRows', throughputResultsObj.compareTPRows); // compare the throughput values between rows specified for TP

router.post('/api/benchmarkTP', throughputResultsObj.benchmarkTP); // benchmarks the given throughput values

router.post('/api/storeTPData', throughputResultsObj.storeTPData); // store the TP data in throughput table

router.post('/api/removeBenchmark', throughputResultsObj.removeBenchmark); // removes the given benchmarked throughput values

router.get('/api/getBenchmarks', throughputResultsObj.getBenchmarks); // lists the queried benchmarked throughput values

router.get('/api/exportKpiReport', xlsxWriterObj.generateKpiReport); // generates the KPI report according to the template and sends it to client

router.get('/api/generateMergedKpiReport', xlsxWriterObj.generateMergedKpiReport); // generates the merged KPI report according to the template and sends it to client

router.post('/api/generateComparisonReport', xlsxWriterObj.generateComparisonReport); //generates compared KPI report to the template

router.get('/api/exportFunctionalityReport', xlsxWriterObj.generateFunctionalityReport); // generates the Functionality report(Pass/Fail) according to the template and sends it to client


/* Result Smart Merge APIs */
router.post('/api/mergeKpiData', throughputResultsObj.smartMergeThroughputData); // compares the throughput values between executions

router.post('/api/insertSmartMergeReport', throughputResultsObj.insertSmartMergeReport); // insert the Smart Merge Value to collection

router.get('/api/getReportList', throughputResultsObj.getReportList); // Display Saved TP Merge report

router.post('/api/detailReportList', throughputResultsObj.detailReportList); // Detail TP Merge report by name

router.post('/api/mergeResults', testExecutionObj.mergeResults); // merge pass fail results

router.post('/api/insertMergedResults', testExecutionObj.insertMergedResultsReport); //insert pass fail merged results 

router.get('/api/getPFReportList', testExecutionObj.getReportList); // Display Saved PF Merge report

router.post('/api/detailPFReportList', testExecutionObj.detailReportList); // Display Saved detailed PF Merge report


/* Result Upload and Analyze APIs */
router.get('/api/getTemplateList', uploadAnalyzeObj.getTemplateList); // Upload the file for test executions

router.get('/api/getTestbedList', uploadAnalyzeObj.getTestbedList); // Upload the file for test executions

router.post('/api/uploadTestExecution', uploadAnalyzeObj.uploadTestExecution); // Upload the file for test executions

router.post('/api/getExcelSheetNames', uploadAnalyzeObj.getExcelSheetNames); // Upload the file and get Excel Sheet Names

router.post('/api/testBedUtil', uploadAnalyzeObj.testBedUtil); // To test the testbed Utilization 

/* Edit and Update the report APIs */
router.post('/api/editReports', throughputResultsObj.editReports); // edit & update report

/* TestBed Utilization APIs */
router.post('/api/getTestBedUtilization', testBedUtilObj.getTestBedUtilization); // get TestBed Utilization (Day, Daily, Monthly, Yearly, Location and Chipset) Colum chart

router.get('/api/getChipsetList', testBedUtilObj.getChipsetList); // Get Chipset list added from Super admin

router.post('/api/chipsetValidation', testBedUtilObj.chipsetValidation); // Validating chipset mapped to qtest project or NOT

router.post('/api/updateMapChipsetQtest', testBedUtilObj.updateMappedChipset); // Update the Mapped chipset qtest project

router.get('/api/qTestProjects', testingTool.qtestProjects); //  get list of projects from qTest

/* Execution Report Comparison*/
router.post('/api/reportExecCompare', throughputResultsObj.reportExecutionCompare); // compares the report values between executions

router.get('/api/generateXlsxReport', reportXlsxWriterObj.generateXlsxReport); // generates the KPI report according to the template and sends it to client