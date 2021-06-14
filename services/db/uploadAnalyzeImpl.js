const { ObjectID } = require('mongodb');

var mongodb = new(require('config/mongodb'));
var uploadAnaluze = function() {};

module.exports = uploadAnaluze;

/***** Upload & Analyze test execution Implementation *****/

/*
    This method updates config file details in test_config collection
*/
uploadAnaluze.prototype.insertUploadedData = function(result) {
    var uploadedData = mongodb.getCollection('throughput_table');
    //console.log("res --", result);
    return new Promise(async(resolve, reject) => {
        uploadedData.insertMany(result, function(insertTestExeErr, insertTestExeResult) {

            if (!insertTestExeErr) {
                resolve(insertTestExeResult);
            } else {
                reject(insertTestExeErr);
            }
        });

    });
}

// throughputImpl.prototype.insertReportData = function(result) {
//     var ExecutionResult = mongodb.getCollection('report_data');

//     return new Promise((resolve, reject) => {
//         ExecutionResult.insertMany(result, function(insertTestExeErr, insertTestExeResult) {
//             if (!insertTestExeErr) {
//                 resolve(insertTestExeResult);
//             } else {
//                 reject(insertTestExeErr);
//             }
//         });
//     });
// };