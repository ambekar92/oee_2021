var testXlsConversionImpl = require('services/db/testXlsConversionImpl.js');
var testXlsConversionImplObj = new testXlsConversionImpl();
var xlsToJson = require("xls-to-json-lc");
var xlsxToJson = require("xlsx-to-json-lc");
var excelReader = require("convert-excel-to-json");
var multer = require('multer');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var config = require('config/config')

var routes = function(){
    
};
module.exports = routes;

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './uploads/') //Read the path from config
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});

var upload = util.promisify(multer({ //multer settings
    storage: storage,
    fileFilter : function(req, file, callback) { //file filter
        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
            return callback(new Error('Wrong extension type'));
        }
        callback(null, true);
    }
}).single('file'));

var readTestSuites = function(runSheetObject){
    var testSuiteList = [];
    var variableList = _.pluck(runSheetObject, 'variable');
    _.each(variableList, function(variable, index){
        if(variable.startsWith("RUN_")){
            testSuiteList.push(variable.replace("RUN_", ""));
        }
    });
    return _.without(testSuiteList, "TEST");
};

var readTestSuiteData = function(filePath, testSuite, xlToJson) {
    return new Promise((resolve, reject) => {
        try {
            xlToJson({
                input : filePath,
                output : null,
                sheet : testSuite,
                lowerCaseHeaders:true
            }, function(err, testSuiteData){
                if(!err){
                    resolve(testSuiteData);
                } else {
                    reject(err);
                }
            });
        }catch(e) {
            console.log(e);
        }
    });
}

var processTestSuiteSheet = async function(testSuiteSheet, testSuiteId, testPlanId, testSuiteName) {
    try {
        console.log("Processing - "+testSuiteName)
        for(i=0;i<testSuiteSheet.length;i++){
            let testSuiteRow = testSuiteSheet[i];
            if(testSuiteRow["test script"]===""){
//                console.log(testSuiteRow);
                let subSectionInsertObject = testSuiteRow;
                subSectionInsertObject.test_suite_id = testSuiteId;
                subSectionInsertObject.test_plan_id = testPlanId;
                subSectionInsertObject.parent_section_id = null;
                subSectionInsertObject.is_have_parent = false;
                
            }
        }
        return
    } catch(e) {
        console.log(e);
    }
    
}

var processTestSuites = async function(filePath, testSuiteList, xlToJson, testPlanId) {
    console.log("Inside Test Suite");
    var sheetData = [];
    try {
        for(i=0;i<testSuiteList.length;i++){
            let testSuite = testSuiteList[i];

            let testSuiteInsertObject = {
                test_plan_id : testPlanId,
                name : testSuite,
                created_by : "",
                updated_by : "",
                created_time : new Date(),
                updated_time : new Date()
            };

            let testSuiteObject = await testXlsConversionImplObj.getTestSuite(testSuiteInsertObject);

            if(!testSuiteObject) {
                testSuiteObject = await testXlsConversionImplObj.insertTestSuite(testSuiteInsertObject);
            }

            let testSuiteSheet = await readTestSuiteData(filePath, testSuite, xlToJson);
            
            let testcaseData = await processTestSuiteSheet(testSuiteSheet, testSuiteObject._id, testPlanId, testSuiteInsertObject.name);
            sheetData.push(testSuiteSheet);
        }
    }catch(e){
        console.log(e);
    }
    
    return sheetData;
}

routes.prototype.processxlsfile = async function(req, res) {
    
    var responseObject = {
        status : true,
        data:{}
    };
    var testPlanName;
    var xlToJson;
    
    try {
        await upload(req, res);
        
        if(!req.file){
            responseObject.err = "No file passed";
            res.json(responseObject);
        } else {
            testPlanName = req.file.originalname;  
        }

        var testPlanInsertObject = {
            name : testPlanName,
            created_by : "",
            updated_by : "",
            created_time : new Date(),
            updated_time : new Date(),
            wats_version : ""
        };
        
        let testPlanObj = await testXlsConversionImplObj.getTestPlan(testPlanInsertObject);
        
        if(!testPlanObj) {
            testPlanObj = await testXlsConversionImplObj.insertTestPlan(testPlanInsertObject);
        }
        
        if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx') {
            xlToJson = xlsxToJson;
        } else {
            xlToJson = xlsToJson;
        }

        let readRunSheet = util.promisify(xlToJson);
        
        let runSheet = await readRunSheet({
            input : req.file.path,
            output : null,
            sheet : config.xlsConversion.runSheetName,
            lowerCaseHeaders:true
        });
        
        let testSuiteList = readTestSuites(runSheet);
        
        let testSuiteData = await processTestSuites(req.file.path, testSuiteList, xlToJson, testPlanObj._id);
        responseObject.data = testSuiteData;
        res.json(responseObject);
        
    } catch(err) {
        responseObject.err = err;
        res.json(responseObject);
    }
}