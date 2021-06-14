const { ObjectID } = require('mongodb');
// var ObjectId = require("mongodb").ObjectID;

var mongodb = new(require('config/mongodb'));
var testExecutionImpl = function() {};

module.exports = testExecutionImpl;

/***** Test Execution Implementation *****/
/*
    This method inserts the triggered execution in Test Execution collection with the provided details.
*/
testExecutionImpl.prototype.insertExecution = function(execution) {
    var Execution = mongodb.getCollection('test_execution');

    return new Promise((resolve, reject) => {
        Execution.insertOne(execution, function(insertExecutionErr, insertExecutionResult) {
            if (!insertExecutionErr) {
                resolve(insertExecutionResult);
            } else {
                reject(insertExecutionErr);
            }
        });
    });
};


/**This methos deletes the execution from given ID */
testExecutionImpl.prototype.deleteExecution = function(executionId) {
    var Execution = mongodb.getCollection('test_execution');

    return new Promise((resolve, reject) => {
        Execution.deleteOne({ _id: ObjectID(executionId) }, function(insertExecutionErr, insertExecutionResult) {
            if (!insertExecutionErr) {
                console.log("delted");
                resolve(insertExecutionResult);
            } else {
                reject(insertExecutionErr);
            }
        });
    });
};

/*
    This method fetches all records of execution for the given testbed_id
*/
testExecutionImpl.prototype.getExecutionsByTestBedId = function(id, pagination, query) {
    let result;
    var totalElements;
    var testexecution = mongodb.getCollection('test_execution');
    return new Promise((resolve, reject) => {
        if (pagination == false) {
            testexecution.find({ test_bed_id: id }).toArray(function(getAllExecutionsErr, getAllExecutionsResult) {
                if (!getAllExecutionsErr) {
                    totalElements = getAllExecutionsResult.length;
                    result = {
                        executionResult: getAllExecutionsResult,
                        elements: totalElements
                    }
                    resolve(result);

                } else {
                    reject(err);
                    console.log("err", getAllExecutionsErr);
                }
            });
        }
        if (pagination == true) {
            testexecution.find({ test_bed_id: id }).skip(query.skip).limit(query.limit).toArray(async function(getAllExecutionsErr, getAllExecutionsResult) {
                if (!getAllExecutionsErr) {
                    resolve(getAllExecutionsResult);
                } else {
                    reject(getAllExecutionsErr);
                }
            });
        }

    });

};
/*
    This method returns the list of executions for the given filter.
*/
testExecutionImpl.prototype.filterExecution = function(id) {

    var testexecution = mongodb.getCollection('test_execution');
    return new Promise((resolve, reject) => {
        testexecution.find({ _id: ObjectID(id), isApproved: "true" }).toArray(async function(filterExecutionErr, filterExecutionResult) {
            if (!filterExecutionErr) {
                resolve(filterExecutionResult);
            } else {
                reject(filterExecutionErr);
            }
        });
    });

};

/*
    This method inserts the testcases selected for the given execution in Test Execution Result collection
*/
testExecutionImpl.prototype.insertTestExeResult = function(result) {
    var ExecutionResult = mongodb.getCollection('test_execution_result');
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
    This method fetches all records of testcases in an execution
*/
testExecutionImpl.prototype.getExecutionResults = function(id) {

    var testexecution = mongodb.getCollection('test_execution_result');
    return new Promise((resolve, reject) => {
        testexecution.find({ execution_id: ObjectID(id) }).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });

};

/*
    This method fetches all records of testcases in an execution
*/
testExecutionImpl.prototype.getAllExecutionResults = function(object) {

    // console.log("id", id);
    var testexecution = mongodb.getCollection('test_execution_result');
    return new Promise((resolve, reject) => {
        if (object == 'ALL') {
            testexecution.find(object).toArray(function(getExecResultErr, getExecResult) {
                if (!getExecResultErr) {
                    resolve(getExecResult);
                } else {
                    reject(getExecResultErr);
                }
            });
        } else {
            testexecution.find(object).toArray(function(getExecResultErr, getExecResult) {
                if (!getExecResultErr) {
                    resolve(getExecResult);
                } else {
                    reject(getExecResultErr);
                }
            });
        }
    });

};

/*
    Fetches the records from test_exection table based on id
*/
testExecutionImpl.prototype.getExecution = function(execution_id) {
    let exId = execution_id.toString();
    var testexecution = mongodb.getCollection('test_execution');
    return new Promise((resolve, reject) => {
        testexecution.find({ _id: ObjectID(exId) }).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });

};

/*
    This method updates the testcase status as received from the mqtt from testbed
*/
testExecutionImpl.prototype.updateExecutionResults = function(message, testBedName) {
    console.log("message---" + message);
    let update;
    let query;
    let logPath;
    let log;
    let msg = message.split("#@|");
    console.log(msg);
    var testexecution = mongodb.getCollection('test_execution_result');
    if (msg[3] == "PASS" || msg[3] == "FAIL" || msg[3] == "SKIP") {
        let splitMsg = msg[9].split("/");
        log = msg[9].split("/").slice(4, splitMsg.length).join("/");
        logPath = "http://92.120.51.53/" + log + "/" + msg[0] + "-" + msg[1] + "/" + msg[0] + "-" + msg[1] + "_MAIN_CONSOLE.html"; //Changes as per STA-TP
        logPath = logPath.split("/")
        logPath.splice(4, 0, testBedName);
        logPath = logPath.join("/");
        msg[5] = msg[5].replace(/(<br>|<b>|<\/b>|<\/br>)/g, "");
        msg[6] = msg[6].replace(/(<br>|<b>|<\/b>|<\/br>)/g, "");
        query = {
            "test_suite_name": msg[0],
            "test_case": msg[2],
            "execution_id": ObjectID(msg[4]),
            "test_no": msg[1]
        }
        update = {
            $set: {
                "status": msg[3],
                "comments": msg[5],
                "throughput": msg[6],
                "start_time": msg[7],
                "execution_time": msg[8],
                "logLocation": logPath
            }
        }
    } else if (msg[3] == "IN PROGRESS") {
        query = {
            "test_suite_name": msg[0],
            "test_case": msg[2],
            "execution_id": ObjectID(msg[4]),
            "test_no": msg[1]
        }
        update = {
            $set: {
                "status": msg[3]
            }
        }
    } else {
        query = {
            "test_suite_name": msg[0],
            "test_case": msg[2],
            "execution_id": ObjectID(msg[4]),
            "test_no": msg[1]
        }
        update = {
            $set: {
                "status": msg[3],
                "comments": msg[5]
            }
        }
    }

    let options = {
        upsert: true
    }
    return new Promise(async(resolve, reject) => {
        // instead of id we need to pass msg[3]
        try {
            let result = await testexecution.updateOne(query, update, options);
            console.log(result.matchedCount);
            console.log(result);
            if (result.matchedCount == 1) {
                console.log("updated successfully");
                resolve(result.matchedCount);
            } else {
                reject("Update failure")
            }

        } catch (error) {
            console.log("err-", error);
        }

    })
}

testExecutionImpl.prototype.updatePassFailResults = function(data, testBedName) {
        console.log("message---" + data, testBedName);
        let update;
        let query;
        let logPath;
        let log;
        // let msg = message.split("#");
        // console.log(msg);
        var testexecution = mongodb.getCollection('test_execution_result');
        if (data['result'] == "PASS" || data['result'] == "FAIL" || data['result'] == "SKIP") {
            let splitMsg = data['logpath'].split("/");
            log = data['logpath'].split("/").slice(4, splitMsg.length).join("/");
            logPath = "http://92.120.51.53/" + log + "/" + data['testSuite'] + "-" + data['TestCaseID'] + "/" + data['testSuite'] + "-" + data['TestCaseID'] + "_MAIN_CONSOLE.html"; //Changes as per STA-TP
            logPath = logPath.split("/")
            logPath.splice(4, 0, testBedName);
            logPath = logPath.join("/");
            data['comment'] = data['comment'].replace(/(<br>|<b>|<\/b>|<\/br>)/g, "");
            data['throughput'] = data['throughput'].replace(/(<br>|<b>|<\/b>|<\/br>)/g, "");
            query = {
                "test_suite_name": data['testSuite'],
                "test_case": data['testCase'],
                "execution_id": ObjectID(data['executionID']),
                "test_no": data['TestCaseID']
            }
            update = {
                $set: {
                    "status": data['result'],
                    "comments": data['comment'],
                    "throughput": data['throughput'],
                    "start_time": data['start_time'],
                    "execution_time": data['execution_time'],
                    "logLocation": logPath
                }
            }
        } else if (data['result'] == "IN PROGRESS") {
            query = {
                "test_suite_name": data['testSuite'],
                "test_case": data['testCase'],
                "execution_id": ObjectID(data['executionID']),
                "test_no": data['TestCaseID']
            }
            update = {
                $set: {
                    "status": data['result']
                }
            }
        } else {
            query = {
                "test_suite_name": data['testSuite'],
                "test_case": data['testCase'],
                "execution_id": ObjectID(data['executionID']),
                "test_no": data['TestCaseID']
            }
            update = {
                $set: {
                    "status": data['result'],
                    "comments": data['comment']
                }
            }
        }

        let options = {
            upsert: true
        }
        return new Promise(async(resolve, reject) => {
            // instead of id we need to pass data['result']
            try {
                let result = await testexecution.updateOne(query, update, options);
                console.log(result.matchedCount);
                console.log(result);
                if (result.matchedCount == 1) {
                    console.log("updated successfully");
                    resolve(result.matchedCount);
                } else {
                    reject("Update failure")
                }

            } catch (error) {
                console.log("err-", error);
            }

        })
    }
    /*
        This method inserts the summary of the execution into Execution Summary collection
    */
testExecutionImpl.prototype.insertSummary = function(summary) {
    let Summary = mongodb.getCollection('execution_summary');

    return new Promise((resolve, reject) => {
        Summary.insertOne(summary, function(insertSummaryErr, insertSummaryResult) {
            if (!insertSummaryErr) {
                resolve(insertSummaryResult);
            } else {
                reject(insertSummaryErr);
            }
        });
    });
}

/*
    This method updates the summary of the execution into Execution Summary collection
*/
testExecutionImpl.prototype.updateExecutionSummary = function(id, obj, options) {
    let Summary = mongodb.getCollection('execution_summary');

    let filter = {
        "execution_id": ObjectID(id)
    };
    let update = {
        $set: obj
    };



    return new Promise(async(resolve, reject) => {

        let result = await Summary.updateOne(filter, update, options);
        console.log(result.matchedCount);
        if (result.matchedCount == 1 || result.matchedCount == 0) {
            resolve("Updated Successfully");
        } else {
            reject("Update failure")
        }
    });
}

/*
    This method fetches the summary details for the given execution
*/
testExecutionImpl.prototype.getExecutionSummary = function(executionId) {
    let Summary = mongodb.getCollection('execution_summary');

    return new Promise((resolve, reject) => {
        Summary.find({ execution_id: ObjectID(executionId) }).toArray(function(getSummaryErr, getSummaryResult) {
            if (!getSummaryErr) {
                resolve(getSummaryResult);
            } else {
                reject(getSummaryErr);
            }
        });
    });
};

/*
    This method returns the count of documents for the given condition.
*/
testExecutionImpl.prototype.getSummaryCount = function(query) {
    let Execution = mongodb.getCollection('test_execution_result');

    return new Promise((resolve, reject) => {
        Execution.countDocuments({ execution_id: parseInt(query.id), status: query.status, test_suite_name: query.suite },
            function(getCountErr, getCountResult) {
                if (!getCountErr) {
                    resolve(getCountResult);
                } else {
                    reject(getCountErr);
                }
            }
        );
    });
}

testExecutionImpl.prototype.updateExecution = function(executionId, obj) {
    var testexecution = mongodb.getCollection('test_execution');

    let filter = {
        "_id": ObjectID(executionId)
    }
    var update = {
        $set: obj
    }

    return new Promise(async(resolve, reject) => {

        let result = await testexecution.updateOne(filter, update);
        console.log(result.matchedCount);
        if (result.matchedCount == 1) {
            resolve("Updated Successfully");
        } else {
            reject("Update failure")
        }
    });
};


/*
    This method pushes the output_folder name received from Testbed into test_execution collection
*/
testExecutionImpl.prototype.updateOutputFolder = function(query, update) {
    var testexecution = mongodb.getCollection('test_execution');

    return new Promise((resolve, reject) => {
        let result = testexecution.updateOne(query, { $push: update });
        result.then((doc) => {
            if (doc.matchedCount == 1) {
                resolve("Updated Successfully");
            } else {
                reject("Update failure");
            }
        });
    });
}

testExecutionImpl.prototype.getLogCredentials = function() {
    var logCredentials = mongodb.getCollection('logs_credentials');

    return new Promise((resolve, reject) => {
        logCredentials.find().toArray(function(getLogCredentialsErr, getLogCredentialsResults) {
            if (!getLogCredentialsErr) {
                resolve(getLogCredentialsResults)

            } else {
                reject(err);
                console.log("err", getLogCredentialsErr);
            }
        });

    })
}


/*
    This method get the data of the test_no
*/
testExecutionImpl.prototype.getExecutionResultsTest_no = function(execution_id, test_no) {

    var testexecution = mongodb.getCollection('test_execution_result');
    return new Promise((resolve, reject) => {
        testexecution.find({ execution_id: ObjectID(execution_id), test_no: test_no }).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });
}

/*
    get Qtest Project from Mapped Chipset
*/
testExecutionImpl.prototype.getQtestProject = function(chipset) {
    var testexecution = mongodb.getCollection('chipset_qtest_mapping');
    return new Promise((resolve, reject) => {
        testexecution.find({ chipset: chipset }).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });
}

/**
 *  This method gets all the executions based on conditions
 */
testExecutionImpl.prototype.getAllExecutions = function(object, pagination, query) {
        var testexecution = mongodb.getCollection('test_execution');
        let totalElements;
        let result;

        return new Promise((resolve, reject) => {
            if (pagination == true) {

                testexecution.countDocuments(object,
                    function(getCountErr, getCountResult) {
                        if (!getCountErr) {
                            totalElements = getCountResult;
                            testexecution.find(object).sort({ "created_time": -1 }).skip(query.skip).limit(query.limit).toArray(async function(getExecErr, getExec) {
                                if (!getExecErr) {
                                    result = {
                                        elements: totalElements,
                                        data: getExec
                                    }
                                    resolve(result);
                                } else {
                                    reject(getExecErr);
                                }
                            });
                        } else {
                            reject(getCountErr);
                        }
                    }
                );

            } else {
                testexecution.find(object).toArray(function(getExecErr, getExec) {
                    if (!getExecErr) {
                        resolve(getExec);
                    } else {
                        reject(getExecErr);
                    }
                });
            }
        });
    }
    /*
        Update the qTest_status - 0 or 1 for execution_id, test_no
    */
testExecutionImpl.prototype.updateExecutionResultsTest_no = function(execu_id, test_no) {
    var testexecution = mongodb.getCollection('test_execution_result');

    let filter = {
        "execution_id": ObjectID(execu_id),
        "test_no": test_no
    }
    let update = {
        "qTest_status": 1
    }

    let options = {
        upsert: true
    }

    return new Promise(async(resolve, reject) => {
        let result = await testexecution.updateOne(filter, { $set: update }, options);
        console.log(result.matchedCount);
        if (result.matchedCount == 1 || result.matchedCount == 0) {
            console.log("updated successfully - ExecutionResultsTest_no");
            resolve(result.matchedCount);
        } else {
            reject("Update failure - ExecutionResultsTest_no")
        }

    });
}

/*
    This method inserts the Smart Merge of Test Execution Result to report collections
*/
testExecutionImpl.prototype.insertResultsReport = function(result) {
    var ExecutionResult = mongodb.getCollection('result_report');
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
testExecutionImpl.prototype.insertResultReportData = function(result) {
    var ExecutionResult = mongodb.getCollection('result_report_data');
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

testExecutionImpl.prototype.getExecutionObj = function(object) {
    var testexecution = mongodb.getCollection('test_execution');
    return new Promise((resolve, reject) => {
        testexecution.find(object).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });

};

testExecutionImpl.prototype.getReports = function(object) {
    var testexecution = mongodb.getCollection('result_report');
    return new Promise((resolve, reject) => {
        testexecution.find(object).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });

};

testExecutionImpl.prototype.detailReportList = function(object) {
    var testexecution = mongodb.getCollection('result_report_data');
    return new Promise((resolve, reject) => {
        testexecution.find(object).toArray(function(getExecResultErr, getExecResult) {
            if (!getExecResultErr) {
                resolve(getExecResult);
            } else {
                reject(getExecResultErr);
            }
        });
    });

};