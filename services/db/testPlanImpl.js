const { ObjectID } = require('mongodb');

var mongodb = new (require('config/mongodb'));

var testPlanImpl = function () {
};

module.exports = testPlanImpl;

/** Test Plan Implementation */

/*
    This method adds test plans to the Test Plan collection.
*/
testPlanImpl.prototype.addTestPlan = function (testplan) {

    var TestPlan = mongodb.getCollection('test_plan');

    return new Promise((resolve, reject) => {
        TestPlan.insertOne(testplan, function (addTestPlanErr, addTestPlanResult) {
            if (!addTestPlanErr) {
                resolve(addTestPlanResult);
            } else {
                reject(addTestPlanErr);
            }
        });
    });

};

/*
    This method inserts newly added config file details into test_config collection
*/
testPlanImpl.prototype.insertConfig = function (configObj) {
    var Config = mongodb.getCollection('test_config');

    return new Promise((resolve, reject) => {
        Config.insertOne(configObj, function (insertConfigErr, insertConfigResult) {
            if (!insertConfigErr) {
                resolve(insertConfigResult);
            } else {
                reject(insertConfigErr);
            }
        });
    });
}

/*
    This method fetches all config file details from test_config collection for a given testbed
*/
testPlanImpl.prototype.getConfigInTestbed = function (id, version) {
    var Config = mongodb.getCollection('test_config');

    console.log("id and version", id, version);
    return new Promise((resolve, reject) => {
        Config.find({ testbed_id: ObjectID(id), version: version  }).toArray(function (getConfigErr, getConfigResult) {
            if (!getConfigErr) {
                resolve(getConfigResult);
            } else {
                reject(getConfigErr);
            }
        });
    });
}

/*
    This method updates config file details in test_config collection
*/
testPlanImpl.prototype.updateConfig = function (id, config) {
    var Config = mongodb.getCollection('test_config');

    return new Promise(async (resolve, reject) => {
        let result = await Config.updateOne({ _id: ObjectID(id) }, { $set: config });
        console.log(result.matchedCount);
        if (result.matchedCount == 1) {
            resolve("Updated Successfully");
        } else {
            reject("Update failure")
        }
    });
}

/*
    This method updates config file details in test_config collection
*/
testPlanImpl.prototype.updateConfigs = function (filter, update, options) {
    var Config = mongodb.getCollection('test_config');

    return new Promise(async (resolve, reject) => {
        let result = await Config.updateOne(filter, update, options);
        console.log(result.matchedCount);
        if (result.matchedCount == 1 || result.matchedCount == 0) {
            resolve("Updated Successfully");
        } else {
            reject("Update failure")
        }
    });
}

/*
    This method deletes config file details in test_config collection
*/
testPlanImpl.prototype.deleteConfig = function (version) {
    var Config = mongodb.getCollection('test_config');

    return new Promise(async (resolve, reject) => {
        Config.deleteMany({ version: version }, function (findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                resolve(findTestBedResult);
            } else {
                reject(findTestBedErr);
            }
        });
    });
}
/*
    This method adds primary config row numbers in primary_config collection
*/
testPlanImpl.prototype.getPrimaryConfig = function (config) {

    var Config = mongodb.getCollection('primary_config');

    return new Promise((resolve, reject) => {
        Config.findOne(config, function (getPrimaryErr, getPrimaryResult) {
            if (!getPrimaryErr) {
                resolve(getPrimaryResult);
            } else {
                reject(getPrimaryErr);
            }
        });
    });

};