const { ObjectID } = require('mongodb');

var mongodb = new(require('config/mongodb'));
var throughputImpl = function() {};

module.exports = throughputImpl;

/***** Throughput Implementation *****/

/*
    This method updates config file details in test_config collection
*/
throughputImpl.prototype.updateThroughput = function(query, update, options) {
    var Throughput = mongodb.getCollection('throughput_table');

    return new Promise(async(resolve, reject) => {
        let result = await Throughput.updateMany(query, { $set: update }, options);

        if (result.matchedCount >= 1) {
            resolve("Throughput Updated Successfully");
        } else if (result.matchedCount == 0) {
            resolve("Throughput Updated Successfully");
        } else {
            reject("Throughput update failure");
        }
    });
}

throughputImpl.prototype.insertThroughput = function(obj) {
    var Throughput = mongodb.getCollection('throughput_table');

    return new Promise(async(resolve, reject) => {
        Throughput.insertOne(obj, function(createversionErr, createversionResult) {
            if (!createversionErr) {
                resolve(createversionResult);
            } else {
                reject(createversionErr);
            }
        });
    });
}

/*
    This method returns the throughput data for given execution 
*/
throughputImpl.prototype.getThroughputData = function(id) {

    var Throughput = mongodb.getCollection('throughput_table');

    return new Promise((resolve, reject) => {
        Throughput.find({ execution_id: id }).toArray(function(getTpErr, getTpResult) {
            if (!getTpErr) {
                resolve(getTpResult);
            } else {
                reject(getTpErr);
            }
        });
    });

};

/*
    This method finds the matching throughput data from the throughput_table collection.
*/
throughputImpl.prototype.findThroughputData = function(object) {

    var Throughput = mongodb.getCollection('throughput_table');

    return new Promise((resolve, reject) => {
        Throughput.find(object).toArray(function(findTpErr, findTpResult) {
            if (!findTpErr) {
                resolve(findTpResult);
            } else {
                reject(findTpErr);
            }
        });
    });

};
/*
    This method finds the throughput data by _id field from the throughput_table collection.
*/
throughputImpl.prototype.findThroughputDataById = function(id) {

    var Throughput = mongodb.getCollection('throughput_table');

    return new Promise((resolve, reject) => {
        Throughput.findOne({ _id: ObjectID(id) }, function(findTpErr, findTpResult) {
            if (!findTpErr) {
                resolve(findTpResult);
            } else {
                reject(findTpErr);
            }
        });
    });

};

/*
    This method finds the matching mode from the mode collection.
*/
throughputImpl.prototype.findMode = function(name) {

    var Throughput = mongodb.getCollection('mode');

    return new Promise((resolve, reject) => {
        Throughput.findOne({ "name": name }, function(findModeErr, findModeResult) {
            if (!findModeErr) {
                resolve(findModeResult);
            } else {
                reject(findModeErr);
            }
        });
    });

};


/*
    This method inserts the Smart Merge of Test Execution Result to report collections
*/
throughputImpl.prototype.insertReport = function(result) {
    var ExecutionResult = mongodb.getCollection('report');
    ExecutionResult.createIndex({ filename: 1 }, { unique: true });
    // console.log("array--", result)
    return new Promise((resolve, reject) => {
        ExecutionResult.insertOne(result, function(insertTestExeErr, insertTestExeResult) {
            if (!insertTestExeErr) {
                resolve(insertTestExeResult);
            } else {
                reject(insertTestExeErr);
            }
        });
    });
};

/*
    This method inserts the Smart Merge of Test Execution Result to report data collections
*/
throughputImpl.prototype.insertReportData = function(result) {
    var ExecutionResult = mongodb.getCollection('report_data');
    // console.log("array--", result)
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
    This method to get Report List from collection.
*/
throughputImpl.prototype.getReportList = function(object) {

    var getReportList = mongodb.getCollection('report');

    return new Promise((resolve, reject) => {
        getReportList.find(object).toArray(function(findTpErr, findTpResult) {
            if (!findTpErr) {
                resolve(findTpResult);
            } else {
                reject(findTpErr);
            }
        });
    });

};

/*
    This method to get Detailed Report from report_data collection.
*/
throughputImpl.prototype.getDetailedReport = function(report_id) {

    let getDetailedReport = mongodb.getCollection('report_data');
    return new Promise((resolve, reject) => {
        getDetailedReport.find({ report_id: ObjectID(report_id) }).toArray(function(findTpErr, findTpResult) {
            if (!findTpErr) {
                resolve(findTpResult);
            } else {
                reject(findTpErr);
            }
        });
    });

};


/*
    This method finds the matching header from the template headers collection.
*/
throughputImpl.prototype.findHeader = function(template) {

    var Header = mongodb.getCollection('template_headers');

    return new Promise((resolve, reject) => {
        if (template == 'ALL') {
            Header.find({}).toArray(function(findHeaderErr, findHeaderResult) {
                if (!findHeaderErr) {
                    resolve(findHeaderResult);
                } else {
                    reject(findHeaderErr);
                }
            });
        } else {
            Header.findOne({ "template": template }, function(findHeaderErr, findHeaderResult) {
                if (!findHeaderErr) {
                    resolve(findHeaderResult);
                } else {
                    reject(findHeaderErr);
                }
            });
        }

    });

};

/*
    This method returns the throughput data for given execution as query  
*/
throughputImpl.prototype.getThroughputDataByQuery = function(query) {
    var Throughput = mongodb.getCollection('throughput_table');
    return new Promise((resolve, reject) => {
        Throughput.find(query).toArray(function(getTpErr, getTpResult) {
            if (!getTpErr) {
                resolve(getTpResult);
            } else {
                reject(getTpErr);
            }
        });
    });

};