const config = require('config/config');
var path = require('path');
var qtestImpl = require(path.resolve(__dirname, "./qtest.js"));
var qtest = new qtestImpl();

var testingTool = function() {};

module.exports = testingTool;

/* Create Test Cases in Test Design */
testingTool.prototype.createTestCases = async function(execution_id) {
    // Create Test Case in Qtest
    let qtestCreateTestCasesRes = await qtest.createTestCases(execution_id);
    //console.log("\n--- Qtest CreateTestCasesRes ---\n", qtestCreateTestCasesRes);
    return qtestCreateTestCasesRes;
}

/* Create Test Run in Test Executions */
testingTool.prototype.createTestRun = async function(execution_id) {
    // Create Test Execution in Qtest
    let qtestCreateTestRun = await qtest.createTestRun(execution_id);
    //console.log("\n--- Qtest CreateTestRun ---\n", qtestCreateTestRun);
    return qtestCreateTestRun;
}

/* Update PASS/FAIL Status in Test Executions */
testingTool.prototype.updateTestExecutionStatus = async function(execution_id, test_no) {
    // Update Test Execution in Qtest
    let qtestUpdateTestRun = await qtest.updateTestExecutionStatus(execution_id, test_no);
    //console.log("\n--- Qtest UpdateTestRun ---\n", qtestUpdateTestRun);
    return qtestUpdateTestRun;
}

/* Update PASS/FAIL Status in Test Executions */
testingTool.prototype.qtestProjects = async function(req, res) {
    // Update Test Execution in Qtest
    console.log("\n-- List of projects from qTest --");
    let qtestProjects = await qtest.qtestProjects();
    console.log("\nQtest Projects - ", qtestProjects.data.length);
    // return qtestProjects;
    res.json(qtestProjects);
}