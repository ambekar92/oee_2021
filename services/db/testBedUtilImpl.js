const { ObjectID } = require('mongodb');
const moment = require('moment');

var mongodb = new(require('config/mongodb'));
var testBedUtil = function() {};

module.exports = testBedUtil;

/***** TestBed Utilization  Implementation *****/

/*
    This method inserts the value in testbed_util collection
*/
testBedUtil.prototype.addTestBedUtil = function(filter, update, options) {
    var testbedUtil = mongodb.getCollection('testbed_util');
    //testbedUtil.createIndex({ name: 1 }, { unique: true });
    return new Promise(async(resolve, reject) => {
        let result = await testbedUtil.updateMany(filter, update, options);
        if (result.matchedCount == 1 || result.matchedCount == 0) {
            resolve(result);
        } else {
            reject("testbed Util Update failure")
        }
    });

};

/*
    This method fetches all records of testcases in an execution
*/
testBedUtil.prototype.getTestBedUtil = function(macId, fromDate, toDate, type, pipeline) {
    console.log("\nmacId: ", macId, "\nfromDate: ", fromDate, "\ntoDate: ", toDate, "\nType: ", type, "\nPipeline: ", pipeline, "\n");

    var getTestBedUtil = mongodb.getCollection('testbed_util');
    return new Promise((resolve, reject) => {
        getTestBedUtil.aggregate(pipeline).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });
};

/*
    This method inserts the  collection
*/
testBedUtil.prototype.insertTestBedUtil = function(result) {
    var ExecutionResult = mongodb.getCollection('testbed_util');
    return new Promise((resolve, reject) => {
        ExecutionResult.insertMany(result, function(insertTestExeErr, insertTestExeResult) {
            if (!insertTestExeErr) {
                resolve(insertTestExeResult);
            } else {
                reject(insertTestExeErr);
            }
        });
    });
};

/*
    This method Update the testbed_util collection
*/
testBedUtil.prototype.updateTestBedUtil = function(query, update, options) {
    var updateTestBedUtil = mongodb.getCollection('testbed_util');

    return new Promise(async(resolve, reject) => {
        let result = await updateTestBedUtil.updateOne(query, { $set: update }, options);

        if (result.matchedCount >= 1) {
            resolve("updateTestBedUtil Updated Successfully");
        } else if (result.matchedCount == 0) {
            resolve("updateTestBedUtil Updated Successfully");
        } else {
            reject("updateTestBedUtil update failure");
        }
    });
}


/*
    Get all chipset
*/
testBedUtil.prototype.getChipsetList = function() {

    var chipset = mongodb.getCollection('chipset_qtest_mapping');
    return new Promise((resolve, reject) => {
        chipset.find().toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });

};

/*
    Validating the Chipset is Mapped to Qtest projects
*/
testBedUtil.prototype.chipsetValidation = function(chipset) {
    var chipsetImpl = mongodb.getCollection('chipset_qtest_mapping');
    return new Promise((resolve, reject) => {
        chipsetImpl.find({ chipset: chipset }).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });
};

/*
    add the chipset mapped to qTest Project
*/
testBedUtil.prototype.updateMappedChipset = function(filter, update, options) {
    var updateMappedChipset = mongodb.getCollection('chipset_qtest_mapping');
    return new Promise(async(resolve, reject) => {
        let result = await updateMappedChipset.updateMany(filter, { $set: update }, options);
        if (result.matchedCount == 1 || result.matchedCount == 0) {
            resolve(result);
        } else {
            reject("testbed Util Update failure")
        }
    });
};

/*
    Get the testbed utilizatio details for Execution ID and Testbed Mac ID
*/
testBedUtil.prototype.getTestbedUtilByExeMacID = function(execution_id, testbedMac_id) {
    var testbed = mongodb.getCollection('testbed_util');
    //let obj = { test_bed_macId: testbedMac_id, execution_id: ObjectID(execution_id), day: agent_date, hour: agent_hour };
    let obj = { test_bed_macId: testbedMac_id, execution_id: ObjectID(execution_id) };
    console.log("OBJ -->", obj);
    return new Promise((resolve, reject) => {
        testbed.find(obj).sort({ _id: 1 }).toArray(function(findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                console.log(findTestBedResult);
                resolve(findTestBedResult);
            } else {
                reject(findTestBedErr);
            }
        });
    });
};