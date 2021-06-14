const { ObjectID } = require('mongodb');
var mongodb = new(require('config/mongodb'));
var testBedImpl = function() {};

module.exports = testBedImpl;

/** Test bed Implementation */

/** This method gives the testbed details based on conditions */
testBedImpl.prototype.getTestBedObjects = function(object) {

    var testbed = mongodb.getCollection('test_bed');
    return new Promise((resolve, reject) => {

        testbed.find(object).toArray(function(findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                resolve(findTestBedResult);
            } else {
                reject(findTestBedErr);
            }
        });
    });

};

/*
    This method adds test beds to the test_bed collection.
*/
testBedImpl.prototype.addTestBeds = function(filter, update, options) {

    var testbed = mongodb.getCollection('test_bed');
    testbed.createIndex({ name: 1 }, { unique: true });

    return new Promise(async(resolve, reject) => {
        let result = await testbed.updateOne(filter, update, options);
        console.log(result.matchedCount);
        if (result.matchedCount == 1 || result.matchedCount == 0) {
            resolve(result);
        } else {
            reject("Update failure")
        }
    });

};

/*
    This method fetches a record from Testbed collection.
*/
testBedImpl.prototype.getAllTestBeds = function(query, qStr) {

    var totalElements;
    var result;
    var testbed = mongodb.getCollection('test_bed');
    console.log('query->', query);
    console.log('qStr->', qStr);
    return new Promise((resolve, reject) => {
        testbed.find(qStr).skip(query.skip).limit(query.limit).toArray(async function(findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                totalElements = await testbed.estimatedDocumentCount();
                result = {
                    elements: totalElements,
                    data: findTestBedResult
                }
                resolve(result);
            } else {
                reject(findTestBedErr);
            }
        });
    });

};

/*
    This method fetches the test beds which are favorite
*/
testBedImpl.prototype.getFavTestBeds = function() {

    var testbed = mongodb.getCollection('test_bed');
    return new Promise((resolve, reject) => {
        testbed.find({ is_favorite: "true" }).toArray(function(findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                console.log(findTestBedResult);
                resolve(findTestBedResult);
            } else {
                reject(findTestBedErr);
            }
        });
    });

};



/*
    This method deletes a record from Testbed collection.
*/
testBedImpl.prototype.deleteTestBeds = function(testbed_id) {
    console.log(`ObjectId("${testbed_id}")`);
    var testbed = mongodb.getCollection('test_bed');

    return new Promise((resolve, reject) => {
        testbed.deleteOne({ _id: ObjectID(testbed_id) }, function(findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                resolve(findTestBedResult);
            } else {
                reject(findTestBedErr);
            }
        });
    });
};

testBedImpl.prototype.updateTestbed = function(filter, update) {

    var testbed = mongodb.getCollection('test_bed');

    return new Promise(async(resolve, reject) => {
        let result = await testbed.updateOne(filter, update);
        console.log(result.matchedCount);
        if (result.matchedCount == 1) {
            resolve("Updated Successfully");
        } else {
            reject("Update failure")
        }
    });

};

testBedImpl.prototype.getTestBed = function(testbedName) {

    var testbed = mongodb.getCollection('test_bed');
    return new Promise((resolve, reject) => {
        if (testbedName == 'ALL') {
            testbed.find({}).toArray(function(findTestBedErr, findTestBedResult) {
                if (!findTestBedErr) {
                    resolve(findTestBedResult);
                } else {
                    reject(findTestBedErr);
                }
            });
        } else {

            testbed.find({ name: testbedName }).toArray(function(findTestBedErr, findTestBedResult) {
                if (!findTestBedErr) {
                    resolve(findTestBedResult);
                } else {
                    reject(findTestBedErr);
                }
            });
        }


    });

};

testBedImpl.prototype.getByTestBedId = function(id) {

    var testbed = mongodb.getCollection('test_bed');
    return new Promise((resolve, reject) => {
        testbed.find({ _id: ObjectID(id) }).toArray(function(findTestBedErr, findTestBedResult) {
            if (!findTestBedErr) {
                console.log(findTestBedResult);
                resolve(findTestBedResult);
            } else {
                reject(findTestBedErr);
            }
        });
    });

};