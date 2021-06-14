// MQTT subscriber
var mqtt = require("mqtt");
var config = require('config/config.js');
var testExecutionImpl = require('../services/db/testExecutionImpl');
var executionObj = new testExecutionImpl();
var throughputImpl = require('services/db/throughputImpl.js');
var throughputObj = new throughputImpl();
var socket = require('config/socket');
var socketObj = new socket();
var testBed = require('../routes/controller/testBed');
var testBedObj = new testBed();
const _ = require('underscore');
const lodash = require("lodash");
var path = require('path');
const e = require("express");
var testBedUtilImpl = require(path.resolve(__dirname, "../routes/controller/testBedUtil.js"));
var testBedUtil = new testBedUtilImpl();

var testingToolImpl = require(path.resolve(__dirname, "../routes/controller/testingTool.js"));
var testingTool = new testingToolImpl();

// Connection URL
const url = `tcp://${config.mqtt.host}:${config.mqtt.port}`;

//Connection options
var options = {
    clientId: "nxp_" + Math.random().toString(16).substr(2, 8),
    keepalive: 60,
    protocolId: "MQTT",
    // clean: true,
    encoding: "utf8",
};

var mqttClient = function() {

}

var mqttConnection;

//mqtt connection
mqttClient.prototype.connect = () => {
    mqttConnection = mqtt.connect(url, options);
    // mqttConnection.on("error", function (error) {
    //   // console.log("Can't connect" + error);
    //   // process.exit(1)
    //   throw new Error("cannot connect to mqtt");
    // }
    // );
}

//subscribe to mqtt topic
mqttClient.prototype.subscribe = (topic) => {
    mqttConnection.on('connect', () => {
        console.log("connected to broker ", topic);
        mqttConnection.subscribe(topic);
    });
}

//publishing to a topic
mqttClient.prototype.publish = (topic, message) => {
    mqttConnection.publish(topic, message);
    console.log(`Message sent! to ${topic}`, message);
}


// Listen to subscribed topics
mqttClient.prototype.onMsgArrived = () => {
    mqttConnection.on('message', async(topic, message) => {
        let name;
        let TestCaseID = '';
        if (topic.match('nxp\/testExecutionResult\/')) {
            message = message.toString();
            let msg = message.split("#@|");
            if (msg[4] == '') {
                console.log("Dropping of message");
            } else {
                TestCaseID = msg[1]; // TestCaseID is used for updating PASS/FAIL in qTest
                name = await executionObj.getExecution(msg[4]);
                name = name[0].test_bed_name;
                console.log(`message from ${topic} -`, message.toString());
                msg[3] = msg[3].toUpperCase();
                message = msg.join("#@|");
                let splitMsg = msg[9].split("/");
                log = msg[9].split("/").slice(4, splitMsg.length).join("/");
                logPath = "http://92.120.51.53/" + log + "/" + msg[0] + "-" + msg[1] + "/" + msg[0] + "-" + msg[1] + "_MAIN_CONSOLE.html"; //Changes as per STA-TP
                logPath = logPath.split("/")
                logPath.splice(4, 0, name);
                logPath = logPath.join("/");
                let res = await executionObj.updateExecutionResults(message, name);
                if (res == 1) {
                    let percent = await calculatePercentage(msg[4]);
                    percent = percent.toFixed(0);
                    if (percent == 100) {
                        let bands = await getBands(msg[4]);
                        let execution = await executionObj.getExecution(msg[4]);
                        let duration = await calculateDuration(execution[0].created_time, Date.now());
                        await executionObj.updateExecution(msg[4], { "status": "COMPLETED", "completed_time": Date.now(), "duration": duration, "bands": bands, "outputPath": msg[10] });
                        let updatedSummary = await calculateSummary(msg[4]);
                        executionObj.updateExecutionSummary(msg[4], { "Total": updatedSummary.Total, "Summary": updatedSummary.Summary }, { upsert: false });
                        socketObj.emit('testExecutionResult', "Execution Complete!!#@|");
                        // TestBed Utilization
                        let result = await testBedUtil.executeTestBedUtil(msg[4], msg[1]);
                        console.log('testBedUtil --', result)
                    }
                    msg.pop();
                    message = msg.join("#@|");
                    message = message + "#@|" + percent + "#@|" + logPath;
                    socketObj.emit('testExecutionResult', message);
                    let summary = await calculateSummary(msg[4]);
                    if (summary) {
                        socketObj.emit('testExecutionSummary', summary);
                    }
                }

                await qTestFunc(msg[4], TestCaseID); // qTest Integration 

            }
        } else if (topic.match('nxp\/testExecutionStatus\/')) {
            console.log(`message from ${topic} -`, message.toString());
            message = message.toString();
            let msg = message.split("#");
            console.log("msg--", msg);
            let executionId = msg[0];
            let TC_Id = msg[1];
            let TC = msg[2];
            let suite = msg[7];
            let status = msg[8];
            let res = suite + "#@|" + TC_Id + "#@|" + TC + "#@|" + status + "#@|" + executionId;
            if (executionId == '') {
                console.log("Dropping of message");
            } else {
                executionObj.updateExecutionResults(res, name);
                socketObj.emit('testExecutionResult', res);
            }
        } else if (topic == "nxp/testbed/register") {
            console.log(`message from ${topic} -`, message.toString());
            message = message.toString();
            testBedObj.registerTestBed(message);
        } else if (topic == "nxp/testbed/error") {
            console.log(`message from ${topic} -`, message.toString());
            msg = "error#@|" + message.toString();
            socketObj.emit('testExecutionResult', msg);
            message = JSON.parse(message.toString());
            executionObj.updateExecution(message.testExecutionId, { "error": true, "traceMessage": message.traceMessage, "errorType": message.errorType, "status": "BLOCKED" });
        } else if (topic.match('nxp\/testExecutionSummary\/')) {
            let query = {};
            console.log(`message from ${topic} -`, message.toString());
            message = message.toString().split("#");
            console.log("Build message", message);
            if (message[0] && message[0].length > 0) {
                if (message[1] && message[1].length > 0) {
                    query["UUT_Name"] = message[1];
                }
                if (message[2] && message[2].length > 0) {
                    query["UUT_Os"] = message[2];
                }
                if (message[3] && message[3].length > 0) {
                    query["UUT_Build"] = message[3];
                }
                executionObj.updateExecutionSummary(message[0], query, { upsert: false });
            }
        } else if (topic.match('nxp\/testbedUtilizationInfo\/')) {
            console.log(`message from ${topic} -`, message.toString());
            message = JSON.parse(message.toString());
            console.log("message", message);
        } else {
            console.log("Different topic");
            console.log(`message from ${topic} -`, message.toString());
        }
    });
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

                let totalTC = exeResult.filter(ele => ele.execution_id == executionID && ele.test_suite_name == data && ele.status != '');
                let passTC = exeResult.filter(ele => ele.status == "PASS" && ele.test_suite_name == data);
                let failTC = exeResult.filter(ele => ele.status == "FAIL" && ele.test_suite_name == data);
                let skipTC = exeResult.filter(ele => ele.status == "SKIP" && ele.test_suite_name == data);

                console.log("pass/fail/skip", passTC.length, failTC.length, skipTC.length);

                let percent = (passTC.length / totalTC.length) * 100;
                percent = percent.toFixed(2);

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

async function calculateDuration(startDate, endDate) {

    var difference = Math.abs(startDate - endDate) / 1000;
    var hourDifference = Number(difference / 3600);
    var minDiff = parseInt(Math.abs(difference / 60) % 60);
    var secDiff = parseInt(difference % 60);

    if (hourDifference == 0) {
        return (Number("0." + minDiff)).toFixed(2);
    } else if (hourDifference > 0) {
        return Number(hourDifference).toFixed(2);
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

module.exports = mqttClient;