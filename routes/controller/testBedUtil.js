const { ObjectID } = require('mongodb');
const config = require('config/config');
const moment = require('moment');
const _ = require('underscore');

var testExecutionImpl = require('services/db/testExecutionImpl.js');
var executionObj = new testExecutionImpl();

var testBedImpl = require('services/db/testBedImpl.js');
var testBedImplObj = new testBedImpl();

var testBedUtilImpl = require('services/db/testBedUtilImpl.js');
var testBedUtilImplObj = new testBedUtilImpl();


var testBedUtil = function() {};

module.exports = testBedUtil;


/******* Test Bed Utilizations Controller ******/

/*
    This method to generate the raw data for the testbed using agent will pass execution_id, testbed_id, timestamp
*/
testBedUtil.prototype.agentExecuteTestBedUtil = async function(execution_id, timestamp) {

    let returnObj = {
        status: true
    };
    console.log("\n ---- Agent Execute TestBedUtil ---- \n");
    console.log("execution_id --> ", execution_id);
    console.log("timestamp --> ", timestamp);
    let agent_date = moment(timestamp).format('D');
    let agent_hour = moment(timestamp).format('H');

    try {

        let executionDetails = await executionObj.getExecution(execution_id);
        let getTestbedDetails = await testBedImplObj.getByTestBedId(executionDetails[0].test_bed_id);
        let getTestbedUtilDetails = await testBedUtilImplObj.getTestbedUtilByExeMacID(execution_id, getTestbedDetails[0].macId);

        console.log("executionDetails --> ", executionDetails);
        console.log("getTestbedDetails --> ", getTestbedDetails);
        console.log("getTestbedUtilDetails length --> ", getTestbedUtilDetails);

        let test_bed_name = getTestbedDetails[0].displayName; // Testbed Name
        let test_bed_macId = getTestbedDetails[0].macId; // Testbed Mac ID
        let execution_name = executionDetails[0].name; // Execution Name
        let execution_location = executionDetails[0].location; // Execution Name
        let execution_soc = executionDetails[0].soc; // Execution Name
        let Cumm_actual_utilization = 0;

        if (getTestbedUtilDetails.length > 0) {

            let execution_startTime = new moment(getTestbedUtilDetails[0].timestamp).format('DD-MM-YYYY HH:mm:ss'); // Execution created_time
            let agent_timestamp = new moment(timestamp).format('DD-MM-YYYY HH:mm:ss'); // From the agent agent_timestamp 05:05:00
            Cumm_actual_utilization = Cumm_actual_utilization + getTestbedUtilDetails[0].actual_utilization;

            let durationSec = moment(agent_timestamp).diff(execution_startTime, 'seconds');
            let durationMin = moment(agent_timestamp).diff(execution_startTime, 'minutes');
            let execHours = moment(execution_startTime).format('H');
            let agentHours = moment(agent_timestamp).format('H');

            console.log("execution_startTime --> ", execution_startTime);
            console.log("agent_timestamp --> ", agent_timestamp);
            console.log("durationSec --> ", durationSec);
            console.log("durationMin --> ", durationMin);
            console.log("execHours --> ", execHours);
            console.log("agentHours --> ", agentHours);

            /* Time Analysis */
            console.log('\nStarting Hour --> ', moment(execution_startTime).format('H'));
            console.log('Remaining Time--> ', moment(execution_startTime).format('mm'), "-", 60 - moment(execution_startTime).format('mm'));
            console.log('\nFinish Hour --> ', moment(timestamp).format('H'));
            console.log('Remaining Time--> ', moment(timestamp).format('mm'), "-", (60 - moment(agent_timestamp).format('mm')));

            let startTime_year = moment(timestamp).format('Y');
            let startTime_month = moment(timestamp).format('M');
            let startTime_date = moment(timestamp).format('D');
            let startTime_week = moment(timestamp).format('W');
            let startTime_hour = moment(timestamp).format('H');
            let obj = {};

            // 2 Hours are different
            if (execHours != agentHours) {

                let exec_Min = moment(execution_startTime).format('mm');
                let agent_Min = moment(agent_timestamp).format('mm');

                console.log("exec_Min >>>>>> ", exec_Min, "agent_Min >>>>>> ", agent_Min);

                let startTime_year = moment(execution_startTime).format('Y');
                let startTime_month = moment(execution_startTime).format('M');
                let startTime_date = moment(execution_startTime).format('D');
                let startTime_week = moment(execution_startTime).format('W');
                let startTime_hour = moment(execution_startTime).format('H');

                obj = {
                    "test_bed_macId": test_bed_macId,
                    "testbed_name": test_bed_name,
                    "execution_name": execution_name,
                    "execution_id": ObjectID(execution_id),
                    "location": execution_location,
                    "chipset_name": execution_soc,
                    "year": startTime_year,
                    "month": startTime_month,
                    "week": startTime_week,
                    "day": startTime_date,
                    "hour": startTime_hour,
                    "actual_utilization": 60, // Value in Minutes
                    "date": moment(agent_timestamp, "HH:mm:ss").format('DD-MM-YYYY'), //new Date(agent_timestamp).toISOString(), //moment(agent_timestamp).format(),
                    "created_at": agent_timestamp,
                    "timestamp": timestamp
                };

                let query = { "execution_id": ObjectID(execution_id), "test_bed_macId": test_bed_macId };
                let update = obj;
                let options = { upsert: true };
                let testBedUtilRes = await testBedUtilImplObj.updateTestBedUtil(query, update, options);
                console.log('\n----- Result -----');
                console.log('testBedUtilRes IDs 60 Value -- ', testBedUtilRes);
                obj = {};
                testBedUtilRes = '';

                startTime_year = moment(timestamp).format('Y');
                startTime_month = moment(timestamp).format('M');
                startTime_date = moment(timestamp).format('D');
                startTime_week = moment(timestamp).format('W');
                startTime_hour = moment(timestamp).format('H');

                let execResArr = [];
                obj = {
                    "test_bed_macId": test_bed_macId,
                    "testbed_name": test_bed_name,
                    "execution_name": execution_name,
                    "execution_id": ObjectID(execution_id),
                    "location": execution_location,
                    "chipset_name": execution_soc,
                    "year": startTime_year,
                    "month": startTime_month,
                    "week": startTime_week,
                    "day": startTime_date,
                    "hour": startTime_hour,
                    "actual_utilization": agent_Min, // Value in Minutes
                    "date": moment(agent_timestamp, "HH:mm:ss").format('DD-MM-YYYY'), //new Date(agent_timestamp).toISOString(), //moment(agent_timestamp).format(),
                    "created_at": agent_timestamp,
                    "timestamp": parseInt(timestamp)
                };
                execResArr.push(obj);

                testBedUtilRes = await testBedUtilImplObj.insertTestBedUtil(execResArr);
                console.log('\n----- Result -----');
                console.log('testBedUtilRes IDs New Record -- ', testBedUtilRes.insertedIds);

                obj = {};


            } else {

                let valueUpdate = parseInt(durationMin);
                obj = {
                    "test_bed_macId": test_bed_macId,
                    "testbed_name": test_bed_name,
                    "execution_name": execution_name,
                    "execution_id": ObjectID(execution_id),
                    "location": execution_location,
                    "chipset_name": execution_soc,
                    "year": startTime_year,
                    "month": startTime_month,
                    "week": startTime_week,
                    "day": startTime_date,
                    "hour": startTime_hour,
                    "actual_utilization": (Cumm_actual_utilization + valueUpdate), // Value in Minutes
                    "date": moment(agent_timestamp, "HH:mm:ss").format('DD-MM-YYYY'), //new Date(agent_timestamp).toISOString(), //moment(agent_timestamp).format(),
                    "created_at": agent_timestamp,
                    "timestamp": timestamp
                };

                let query = { "execution_id": ObjectID(execution_id), "test_bed_macId": test_bed_macId };
                let update = obj;
                let options = { upsert: true };
                let testBedUtilRes = await testBedUtilImplObj.updateTestBedUtil(query, update, options);
                console.log('\n----- Result -----');
                console.log('testBedUtilRes IDs -- ', testBedUtilRes);
                returnObj.message = 'Record Inserted Successfully'
                obj = {};
            }

        } else {

            let agent_timestamp = new moment(timestamp).format('DD-MM-YYYY HH:mm:ss'); // Execution agent_timestamp
            if (agent_timestamp != null || agent_timestamp != '') {

                //let created_at = moment(agent_timestamp).format('DD-MM-YYYY HH:mm:ss');
                let startTime_year = moment(timestamp).format('Y');
                let startTime_month = moment(timestamp).format('M');
                let startTime_date = moment(timestamp).format('D');
                let startTime_week = moment(timestamp).format('W');
                let startTime_hour = moment(timestamp).format('H');

                let execResArr = [];
                let obj = {};

                console.log("\n ---- On Trigger of Execution Update the Testbed Utilization By Zero -----\n")

                let valueUpdate = 0;
                obj = {
                    "test_bed_macId": test_bed_macId,
                    "testbed_name": test_bed_name,
                    "execution_name": execution_name,
                    "execution_id": ObjectID(execution_id),
                    "location": execution_location,
                    "chipset_name": execution_soc,
                    "year": startTime_year,
                    "month": startTime_month,
                    "week": startTime_week,
                    "day": startTime_date,
                    "hour": startTime_hour,
                    "actual_utilization": valueUpdate, // Value in Minutes
                    "date": moment(agent_timestamp, "DD-MM-YYYY").format('DD-MM-YYYY'), //new Date(agent_timestamp).toISOString(), //moment(agent_timestamp).format(),
                    "created_at": agent_timestamp,
                    "timestamp": parseInt(timestamp)
                };
                console.log("--> obj ==>", obj);
                execResArr.push(obj);

                let testBedUtilRes = await testBedUtilImplObj.insertTestBedUtil(execResArr);
                console.log('\n----- Result -----');
                console.log('testBedUtilRes IDs -- ', testBedUtilRes.insertedIds);
                returnObj.message = 'Record Inserted Successfully'
            } else {
                returnObj.message = "Completed_time not updated for the Execution";
            }
        }

        returnObj.data1 = executionDetails;
        returnObj.data2 = getTestbedDetails;
        //returnObj.data3 = getExeResult;

        return returnObj;
    } catch (err) {
        console.log('\nError in Catch --\n', err)
        returnObj.status = false;
        returnObj.message = "Error while qtest Test Execution Implementation";
    }
}

/*
    This method to generate the raw data for the testbed using execution_id, test_no
*/
testBedUtil.prototype.executeTestBedUtil = async function(execution_id, test_no) {

    let returnObj = {
        status: true
    };

    // let locationArr = ['Singapore', 'India', 'Germany', 'United States', 'Netherlands'];
    // let chipsetArr = ['Soc1', 'Soc2', 'Soc3', 'Soc4', 'Soc5'];

    try {

        let executionDetails = await executionObj.getExecution(execution_id);
        let getExeResult = await executionObj.getExecutionResultsTest_no(execution_id, test_no);
        let getTestbedDetails = await testBedImplObj.getByTestBedId(executionDetails[0].test_bed_id);

        console.log("executionDetails -- ", executionDetails);

        let test_bed_name = getTestbedDetails[0].displayName; // Testbed Name
        let test_bed_macId = getTestbedDetails[0].macId; // Testbed Mac ID
        let execution_name = executionDetails[0].name; // Execution Name
        let execution_location = executionDetails[0].location; // Execution Name
        let execution_soc = executionDetails[0].soc; // Execution Name

        let created_time = new moment(getExeResult[0].start_time, "HH:mm:ss").format('HH:mm:ss'); // Execution created_time
        let durationSec = moment.duration(getExeResult[0].execution_time).asSeconds();
        let completed_time = new moment(getExeResult[0].start_time, "HH:mm:ss").add(durationSec, 'seconds').format('HH:mm:ss'); // Execution completed_time

        if (completed_time != null || completed_time != '') {

            /* Execution Start Time */
            console.log('Execution Start Time - ', moment(created_time).format('LLLL'), ' H -',
                moment(created_time).format('H'));
            console.log('Execution Finish Time - ', moment(completed_time).format('LLLL'), ' H -',
                moment(completed_time).format('H'));

            let created_at = moment(created_time).format('LLLL');
            let completed_at = moment(completed_time).format('LLLL');

            let startTime_year = moment(created_time).format('Y');
            let startTime_month = moment(created_time).format('M');
            let startTime_date = moment(created_time).format('D');
            let startTime_week = moment(created_time).format('W');
            let days = moment(completed_time).diff(created_time, 'days');

            /* Execution Finish Time */
            console.log('Current Time - ', moment().format('LLLL'));
            console.log('\nDays - ', moment(completed_time).diff(created_time, 'days'));
            console.log('Hours - ', moment(completed_time).diff(created_time, 'hours'));
            console.log('Minutes - ', moment(completed_time).diff(created_time, 'minutes'));
            console.log('\nStarting Hour - ', moment(created_time).format('H'));
            console.log('Remaining Time- ', (60 - moment(created_time).format('mm')));
            console.log('\nFinish Hour - ', moment(completed_time).format('H'));
            console.log('Remaining Time- ', (60 - moment(completed_time).format('mm')));

            let st = '';
            let fs = '';
            let execResArr = [];
            let obj = {};
            let totalHours = moment(completed_time).diff(created_time, 'hours')

            if (parseInt(days) > 0) {
                console.log("\n ---- More than a day -----", parseInt(days))
                st = moment(created_time).format('H'); //4 13
                fs = moment(completed_time).format('H') //5 16   5
                console.log("ST: ", parseInt(st), ' -- FS: ', parseInt(fs));

                for (let j = 0; j <= parseInt(days); j++) {
                    console.log('J -', j);
                    // moment(created_time).format('DD-MM-YYYY')

                    let dateTime = moment(created_time).format('YYYY-MM-DD');
                    let dateInDB = moment(dateTime, 'YYYY-MM-DD').add(j, 'days');

                    startTime_year = moment(dateInDB).format('Y');
                    startTime_month = moment(dateInDB).format('M');
                    startTime_date = moment(dateInDB).format('D');
                    startTime_week = moment(dateInDB).format('W');

                    let hour = 0;
                    let count = 24;

                    if (j == 0) {
                        count = (parseInt(24) - parseInt(st)); //24 - 13 = 11
                        hour = parseInt(st); // 13
                    }
                    if (parseInt(days) == j) {
                        count = parseInt(fs); // 16
                        hour = 0;
                    }

                    console.log("Count - ", parseInt(count));
                    console.log("Hour - ", parseInt(hour));

                    for (var i = 0; i < parseInt(count); i++) {

                        // const locationArrVal = Math.floor(Math.random() * locationArr.length);
                        // const chipsetArrVal = Math.floor(Math.random() * chipsetArr.length);

                        let hourVal = parseInt(hour + i);
                        let valueUpdate = 0;
                        console.log('hourVal: -', hourVal);

                        if (parseInt(st) == hourVal) {
                            if (j == 0) {
                                valueUpdate = (60 - moment(created_time).format('mm'));
                                console.log('Remaining Time- st', (60 - moment(created_time).format('mm')));
                            }

                        } else if (parseInt(days) == j) {
                            if (parseInt(fs) == (hourVal + 1)) {
                                valueUpdate = (60 - moment(completed_time).format('mm'));
                                console.log('Remaining Time- fs', (60 - moment(completed_time).format('mm')));
                            }
                        } else {
                            valueUpdate = 60; //Math.floor(Math.random() * 58); // 60
                        }

                        obj = {
                            "test_bed_macId": test_bed_macId,
                            "testbed_name": test_bed_name,
                            "execution_name": execution_name,
                            "execution_id": ObjectID(execution_id),
                            "location": execution_location,
                            "chipset_name": execution_soc,
                            "year": startTime_year,
                            "month": startTime_month,
                            "week": startTime_week,
                            "day": startTime_date,
                            "hour": hourVal,
                            "actual_utilization": valueUpdate, // Value in Minutes
                            "date": dateInDB.format('YYYY-MM-DD'), //new Date(created_time).toISOString(), //moment(created_time).format(),
                            "created_at": created_at,
                            "completed_at": completed_at
                        }
                        execResArr.push(obj);
                    }
                }

            } else {
                console.log("\n ---- Less than a day -----", parseInt(days))
                st = moment(created_time).format('H'); //10
                fs = moment(completed_time).format('H') //17   5
                console.log("ST: ", parseInt(st), ' -- FS: ', parseInt(fs));

                for (let i = parseInt(st); i <= parseInt(fs); i++) {

                    // const locationArrVal = Math.floor(Math.random() * locationArr.length);
                    // const chipsetArrVal = Math.floor(Math.random() * chipsetArr.length);

                    console.log('Hour: -', i);
                    let valueUpdate = 0;
                    let hour = i;
                    if (st == i) {
                        valueUpdate = (60 - moment(created_time).format('mm'));
                        console.log('Remaining Time- st', (60 - moment(created_time).format('mm')));
                    } else if (fs == i) {
                        valueUpdate = (60 - moment(completed_time).format('mm'));
                        console.log('Remaining Time- fs', (60 - moment(completed_time).format('mm')));
                    } else {
                        valueUpdate = 0;
                    }
                    obj = {
                        "test_bed_macId": test_bed_macId,
                        "testbed_name": test_bed_name,
                        "execution_name": execution_name,
                        "execution_id": ObjectID(execution_id),
                        "location": execution_location,
                        "chipset_name": execution_soc,
                        "year": startTime_year,
                        "month": startTime_month,
                        "week": startTime_week,
                        "day": startTime_date,
                        "hour": hour,
                        "actual_utilization": valueUpdate, // Value in Minutes
                        "date": moment(created_time, "HH:mm:ss").format('DD-MM-YYYY'), //new Date(created_time).toISOString(), //moment(created_time).format(),
                        "created_at": created_at,
                        "completed_at": completed_at
                    }
                    execResArr.push(obj);
                }
            }

            let testBedUtilRes = await testBedUtilImplObj.insertTestBedUtil(execResArr);
            console.log('\n----- Result -----');
            console.log('testBedUtilRes IDs -- ', testBedUtilRes.insertedIds);
            //console.log("execResArr --", execResArr);
            returnObj.message = 'Record Inserted Successfully'
        } else {
            returnObj.message = "Completed_time not updated for the Execution";
        }


        returnObj.data1 = executionDetails;
        returnObj.data2 = getTestbedDetails;
        returnObj.data3 = getExeResult;

        return returnObj;
    } catch (err) {
        console.log('\nError in Catch --\n', err)
        returnObj.status = false;
        returnObj.message = "Error while qtest Test Execution Implementation";
    }
}

/*
    This method get the Hourly, Daily, Monthly, Weekly, Yearly, Testbed wise and Chipset wise 
    by using the condition FromDate and ToDate 
*/
testBedUtil.prototype.getTestBedUtilization = async function(req, res) {

    let returnObj = {
        status: true
    };

    try {

        let testbedID_macId = req.body.macId;

        // Convert to YYYY-MM-DD
        let fromDate = moment(req.body.fromDate, 'DD-MM-YYYY').format('YYYY-MM-DD');
        let toDate = moment(req.body.toDate, 'DD-MM-YYYY').format('YYYY-MM-DD');
        let numHour = moment(toDate).diff(fromDate, 'hours');

        let type = req.body.type;
        let chipset_name = req.body.chipset;
        let view = req.body.view;
        let pipeline = [];
        let match = {};
        let xaxis_type = req.body.xaxis_type;
        //console.log('----- xaxis_type -- ', xaxis_type);
        // console.log('----- fromDate -- ', fromDate);
        // console.log('----- toDate -- ', toDate);

        let hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        if (view == 'testbed') {
            console.log("\n\n-------- Testbed View --------");
            if (type == 'hourly') { // Hourly
                console.log("\n-------- Type: Hourly --------\n");
                if (chipset_name == "ALL") {
                    match = {
                        "date": fromDate,
                        "test_bed_macId": testbedID_macId
                    }
                } else {
                    match = {
                        "date": fromDate, //, "$lte": toDate
                        "test_bed_macId": testbedID_macId,
                        "chipset_name": chipset_name
                    }
                }

                pipeline = [{
                    "$match": match
                }];
            } else if (type == 'day') { // Day View
                console.log("\n-------- Type: Daily --------\n");
                if (chipset_name == "ALL") {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId
                    }
                } else {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId,
                        "chipset_name": chipset_name
                    }
                }

                pipeline = [{
                        "$match": match
                    },
                    {
                        $group: {
                            _id: "$date",
                            actual_utilization: { $sum: "$actual_utilization" }
                        }
                    }
                ];
            } else if (type == 'week') { // Week
                console.log("\n-------- Type: Week --------\n");
                if (chipset_name == "ALL") {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId
                    }
                } else {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId,
                        "chipset_name": chipset_name
                    }
                }

                pipeline = [{
                        "$match": match
                    },
                    {
                        $group: {
                            _id: "$week",
                            actual_utilization: { $sum: "$actual_utilization" },
                            test_bed_macId: { $first: '$test_bed_macId' },
                            year: { $first: '$year' },
                            month: { $first: '$month' }
                        }
                    }
                ];
            } else if (type == 'month') { // Month
                console.log("\n-------- Type: Month --------\n");
                if (chipset_name == "ALL") {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId
                    }
                } else {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId,
                        "chipset_name": chipset_name
                    }
                }

                pipeline = [{
                        "$match": match
                    },
                    {
                        $group: {
                            _id: "$month",
                            actual_utilization: { $sum: "$actual_utilization" },
                            test_bed_macId: { $first: '$test_bed_macId' },
                            year: { $first: '$year' }
                        }
                    }
                ];
            } else if (type == 'year') {
                console.log("\n-------- Type: Year --------\n");
                if (chipset_name == "ALL") {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId
                    }
                } else {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "test_bed_macId": testbedID_macId,
                        "chipset_name": chipset_name
                    }
                }

                pipeline = [{
                        "$match": match
                    },
                    {
                        $group: {
                            _id: "$year",
                            actual_utilization: { $sum: "$actual_utilization" }
                        }
                    }
                ];
            } else {
                console.log("\n-------- Type: Not Found --------\n");
            }
        } else if (view == 'chipset') {
            console.log("\n\n-------- Chipset View --------");

            if (xaxis_type == 'testbed') {
                console.log("\n-------- Xaxis Type: Testbed --------\n");
                let groupBy = {};
                if (chipset_name == "ALL") {
                    match = { "date": { "$gte": fromDate, "$lte": toDate } };
                    groupBy = {
                        _id: "$testbed_name",
                        actual_utilization: { $sum: "$actual_utilization" }
                    }
                } else {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "chipset_name": chipset_name
                    };
                    groupBy = {
                        _id: "$testbed_name",
                        actual_utilization: { $sum: "$actual_utilization" }
                    }
                }

                pipeline = [{
                        "$match": match
                    },
                    {
                        $group: groupBy
                    }
                ];

            } else if (xaxis_type == 'location') {
                console.log("\n-------- Xaxis Type: Location --------\n");
                let groupBy = {};
                if (chipset_name == "ALL") {
                    match = { "date": { "$gte": fromDate, "$lte": toDate } };
                    groupBy = {
                        _id: "$location",
                        actual_utilization: { $sum: "$actual_utilization" }
                    }
                } else {
                    match = {
                        "date": { "$gte": fromDate, "$lte": toDate },
                        "chipset_name": chipset_name
                    };
                    groupBy = {
                        _id: "$location",
                        actual_utilization: { $sum: "$actual_utilization" }
                    }
                }

                pipeline = [{
                        "$match": match
                    },
                    {
                        $group: groupBy
                    }
                ];

            } else {

            }
        } else {
            console.log("\n-------- View: Not Found --------\n");
        }

        let testBedUtilRes = await testBedUtilImplObj.getTestBedUtil(testbedID_macId, fromDate, toDate, type, pipeline);

        console.log("\n-------- Results --------\n");
        console.log('TestBed Util Results -- ', testBedUtilRes.length);

        if (testBedUtilRes.length > 0) {
            /* Type is Day */

            //if (view == 'testbed') {
            if (type == 'hourly') {
                let totalVal = 0;
                let testBedUtilHours = [];
                let copyValueArr = [];
                for (let i = 0; i < testBedUtilRes.length; i++) {
                    delete testBedUtilRes[i]._id;
                    delete testBedUtilRes[i].execution_id;
                    delete testBedUtilRes[i].created_at;
                    delete testBedUtilRes[i].completed_at;
                    testBedUtilHours.push(testBedUtilRes[i].hour);
                }
                var copyValue = _.clone(testBedUtilRes[0]);
                let diffHours = _.difference(hours, testBedUtilHours);

                for (let i = 0; i < diffHours.length; i++) {
                    copyValue['hour'] = diffHours[i];
                    copyValue['actual_utilization'] = 0;
                    delete copyValue._id;
                    delete copyValue.execution_id;
                    delete copyValue.created_at;
                    delete copyValue.completed_at;
                    copyValueArr.push(_.clone(copyValue));
                }
                const obj = _.union(copyValueArr, testBedUtilRes);
                obj.sort((a, b) => (a.hour > b.hour) ? 1 : -1); // Sorting the hours 0 to 23

                for (let i = 0; i < obj.length; i++) {
                    let hour_num = obj[i].hour;
                    obj[i].xaxis_name = hour_num;
                    totalVal += obj[i].actual_utilization
                }

                returnObj.status = true;
                returnObj.message = "TestBed Utilization Data";
                returnObj.size = obj.length;
                returnObj.utilization_percentage = parseFloat(((totalVal / 60) / 24) * 100).toFixed(2);
                returnObj.data = obj;


                //  }
            } else {
                let totalVal = 0;
                /* Type is Week or Month */
                for (let i = 0; i < testBedUtilRes.length; i++) {

                    totalVal += testBedUtilRes[i].actual_utilization;
                    testBedUtilRes[i].actual_utilization = testBedUtilRes[i].actual_utilization;
                    testBedUtilRes[i].actual_utilization_hour = parseFloat((testBedUtilRes[i].actual_utilization / 60).toFixed(2));

                    if (view == 'testbed') {

                        if (type == 'week') {
                            testBedUtilRes[i]._id = parseInt(testBedUtilRes[i]._id);
                            let week_num = testBedUtilRes[i]._id;
                            testBedUtilRes[i].xaxis_name = week_num;
                        } else if (type == 'day') {
                            let daily_num = testBedUtilRes[i]._id;
                            testBedUtilRes[i].xaxis_name = moment(daily_num, 'YYYY-MM-DD').format('MM-DD-YYYY');
                        } else if (type == 'month') {
                            testBedUtilRes[i]._id = parseInt(testBedUtilRes[i]._id);
                            let month_num = testBedUtilRes[i]._id;
                            let year_num = testBedUtilRes[i].year;
                            testBedUtilRes[i].xaxis_name = months[(month_num - 1)] + "_" + year_num;;
                        } else if (type == 'year') {
                            let year_num = testBedUtilRes[i]._id;
                            testBedUtilRes[i].xaxis_name = year_num;
                        } else {
                            let num = testBedUtilRes[i]._id;
                            testBedUtilRes[i].xaxis_name = num;
                        }
                    }

                    if (view == 'chipset') {
                        let num = testBedUtilRes[i]._id;
                        testBedUtilRes[i].xaxis_name = num;
                    }
                }

                console.log("\n\nnumHour -", numHour);
                console.log("numMin -", totalVal);
                console.log("numHour -", totalVal / 60);
                console.log("utilization_percentage -", (totalVal / 60) / numHour);
                console.log("\n");

                const obj = testBedUtilRes;
                obj.sort((a, b) => (a._id > b._id) ? 1 : -1); // Sorting the hours 0 to 23
                returnObj.status = true;
                returnObj.message = "TestBed Utilization Data";
                returnObj.size = obj.length;
                returnObj.utilization_percentage = parseFloat(((totalVal / 60) / numHour) * 100).toFixed(2);
                returnObj.data = obj;
            }
        } else {
            returnObj.status = false;
            returnObj.message = "Data Not Found for TestBed Utilization";
            returnObj.data = '';
        }

        res.json(returnObj);

    } catch (err) {
        console.log('\nError in Catch --\n', err)
        returnObj.status = false;
        returnObj.message = "Error while Get TestBed Utilization";
    }
}

/*
    get Chipset list for TestBed Utilization  
*/
testBedUtil.prototype.getChipsetList = async function(req, res) {

    try {
        let responseObject = {
            status: true
        };

        testBed = await testBedUtilImplObj.getChipsetList();
        console.log("getChipsetList --", testBed);

        if (testBed.length > 0) {

            responseObject.message = "Success";
            responseObject.size = testBed.length;
            responseObject.data = testBed;

        } else {
            responseObject.status = false;
            responseObject.message = "No Chipset Found";
        }
        res.json(responseObject);
    } catch (err) {
        console.log('\nget ChipsetList --\n', err);
    }
}

/*
    chipset mapped to Qtest project Validation
*/
testBedUtil.prototype.chipsetValidation = async function(req, res) {

    let chipset = req.body.chipset;

    try {
        let responseObject = {
            status: true
        };

        let chipsetStatus = await testBedUtilImplObj.chipsetValidation(chipset);
        console.log("chipsetValidation --", chipsetStatus);

        if (chipsetStatus.length > 0) {
            if (chipsetStatus[0].qtestProjName != '') {
                responseObject.message = "Success";
                responseObject.size = chipsetStatus.length;
                responseObject.data = chipsetStatus;
            } else {
                responseObject.status = false;
                responseObject.message = "Please Contact Admin to Map Qtest Project";
            }
        } else {
            responseObject.status = false;
            responseObject.message = "Please Contact Admin to Map Qtest Project";
        }
        res.json(responseObject);
    } catch (err) {
        console.log('\nget chipset Validation --\n', err);
    }
}

/*
    get Chipset list for TestBed Utilization  
*/
testBedUtil.prototype.updateMappedChipset = async function(req, res) {

    let chipsetName = req.body.chipset;
    let qtestProjName = req.body.qtestProjName;
    let qtestProjId = req.body.qtestProjId;
    let createBy = req.body.createBy;
    let createOn = Date.now();

    try {
        let responseObject = {
            status: true
        };

        let query = { chipset: chipsetName };

        let update = {
            chipset: chipsetName,
            qtestProjName: qtestProjName,
            qtestProjId: qtestProjId,
            createBy: createBy,
            createOn: createOn
        };

        let options = { upsert: true };


        let chipsetStatus = await testBedUtilImplObj.updateMappedChipset(query, update, options);
        console.log("updateMappedChipset --", chipsetStatus.result);

        if (chipsetStatus.result.ok == 1) {
            responseObject.message = "Success";
            responseObject.data = chipsetStatus.result;
        } else {
            responseObject.status = false;
            responseObject.message = "Please Contact Admin to Map Qtest Project";
        }
        res.json(responseObject);
    } catch (err) {
        console.log('\nadd/ update Mapped Chipset --\n', err);
    }
}