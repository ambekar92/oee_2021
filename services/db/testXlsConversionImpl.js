var mongodb = new(require('config/mongodb'));
//var mongodb = require('mongodb');
var testXlsConversionImpl = function(){
};

testXlsConversionImpl.prototype.getTestPlan = function(testPlan) {
    var TestPlan = mongodb.getCollection('testplan');
    
    return new Promise((resolve, reject) => {
        TestPlan.findOne({name:testPlan.name}, function(findOneTestPlanErr, findOneTestPlanReult){
            if(!findOneTestPlanErr) {
                resolve(findOneTestPlanReult);
            } else {
                reject(findOneTestPlanErr);
            }
        });
    });
}

testXlsConversionImpl.prototype.insertTestPlan = function(testPlan){
    var TestPlan = mongodb.getCollection('testplan');
    
    return new Promise ((resolve, reject) => {
        TestPlan.insertOne(testPlan, function(insertTestPlanErr, insertTestPlanResult){
            if(!insertTestPlanErr) {
                resolve(insertTestPlanResult.ops[0]);
            } else {
                reject(insertTestPlanErr);
            }
        });
    });
};

testXlsConversionImpl.prototype.getTestSuite = function(testSuite) {
    var TestSuite = mongodb.getCollection('testsuite');
    
    return new Promise((resolve, reject) => {
        TestSuite.findOne({name:testSuite.name}, function(findOneTestSuiteErr, findOneTestSuiteResult){
            if(!findOneTestSuiteErr) {
                resolve(findOneTestSuiteResult);
            } else {    
                reject(findOneTestSuiteErr);
            }
        });
    });
}

testXlsConversionImpl.prototype.insertTestSuite = function(testSuite) {
    var TestSuite = mongodb.getCollection('testsuite');
    
    return new Promise ((resolve, reject) => {
        TestSuite.insertOne(testSuite, function(insertTestSuiteErr, insertTestSuiteResult){
            if(!insertTestSuiteErr) {
                resolve(insertTestSuiteResult,ops[0]);
            } else {
                reject(insertTestSuiteErr);
            }
        });
    });
};

testXlsConversionImpl.prototype.getSubSection = function(subSection) {
    var SubSection = mongodb.getCollection('subsection');
    
    return new Promise((resolve, reject) => {
        SubSection.findOne({'test case': subSection['test case'], test_suite_id:subSection.test_suite_id, test_plan_id:subSection.test_plan_id}, function(findOneSubSectionErr, findOneSubSectionResult){
            if(!findOneSubSectionErr){
                resolve(findOneSubSectionResult);
            } else {
                reject(findOneSubSectionErr);
            }
        });
    });
}

module.exports = testXlsConversionImpl;