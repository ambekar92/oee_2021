var multer = require('multer');
var util = require('util');
const fs = require('fs');
var excel = require('xlsx');
const fsPromises = require("fs").promises;

const config = require('config/config');
var responseError = require('routes/errorHandler.js');
const logger = require('config/logger');
var testPlanImpl = require('services/db/testPlanImpl.js');
var testPlanImplObj = new testPlanImpl();
var auth = require('config/auth');
const { ObjectID } = require('mongodb');
const { exec } = require('child_process');

var routes = function() {

};

module.exports = routes;
let filePresent = false;

async function readFolder(filePath, fileName) {
    try {
        fs.readdir(filePath, (err, files) => {
            try {
                if (err) {
                    throw err;
                } else {
                    console.log("files", files);
                    if (files.includes(fileName)) {
                        filePresent = true;
                    } else {
                        filePresent = false;
                    }
                }
            } catch (err) {
                logger.error("readFolder:", err);
            }
        });
    } catch (error) {
        logger.error("readFolder:", err);
    }

}

var storage = multer.diskStorage({ //multers disk storage settings
    destination: async function(req, file, cb) {
        let filePath;

        if (req.body.isConfig) {
            filePath = config.public.path + config.public.configuration + req.body.macId + '/' + req.body.folderName;
        } else {
            filePath = config.public.path + config.public.testplan + req.body.macId + '/' + req.body.folderName;
        }
        console.log('filePath', filePath);
        await readFolder(filePath, file.originalname);
        cb(null, filePath)
    },
    filename: function(req, file, cb) {
        console.log('file', file);
        cb(null, file.originalname);
    }
});

var upload = util.promisify(multer({ //multer settings
    storage: storage,
    fileFilter: function(req, file, callback) { //file filter
        console.log('file', file, req.body);

        if (req.body.macId === undefined || req.body.macId == '') {
            return callback("Please select a testbed to upload the file", null);
        }

        if (!req.body.isConfig) {
            if (req.body.folderName == '' || req.body.folderName === undefined) {
                return callback('Please select the appropriate folder in the testbed to upload', null);
            }
        }

        if (['xls'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback('Wrong extension type', null);
        }

        callback(null, true);
    }
}).single('file'));


// This method returns the list of files and folders in given path or the database
routes.prototype.testPlanList = async function(req, res) {
    var responseObject = {
        status: true,
        data: {}
    };

    try {
        let fileList = [];
        let testFolder;
        console.log('in tplist', req.body);
        if (req.body.isConfig) {
            // testFolder = './public/Configurations/' + req.body.testbedName + '/' + req.body.folderName;
            fileList = await testPlanImplObj.getConfigInTestbed(req.body.testbedId, req.body.folderName);
            responseObject.data = fileList;
            res.json(responseObject);
        } else {
            testFolder = config.public.path + config.public.testplan + req.body.testbedName + '/' + req.body.folderName;
            console.log(testFolder);

            fs.readdir(testFolder, (err, files) => {
                try {
                    if (err) {
                        throw err;
                    } else {
                        files.forEach(file => {
                            fileList.push(file)
                            return file;
                        });
                        console.log('readFileList', fileList);

                        if (!fileList.length && req.body.folderName == '') {
                            throw "No Wats versions available for this testbed. Please add a version!"
                        }

                        if (!fileList.length && req.body.folderName) {
                            throw "No Test Plans available in this folder. Please upload a file!"
                        }
                        responseObject.data = fileList;
                        res.json(responseObject);
                    }
                } catch (err) {
                    logger.error("testPlanList:", err);
                    responseError(res, responseObject, err);
                }
            });
        }
    } catch (err) {
        logger.error("testPlanList:", err);
        responseError(res, responseObject, "Unable to get the test plans");
    }
}


// This method will provide get the file as input and save in the respective folder structure 
// and stored in the TestPlan table 
routes.prototype.testPlanUpload = async function(req, res) {
    var responseObject = {
        status: true,
        data: {}
    };
    let configObj;
    try {
        await upload(req, res);
        console.log('in TestPLANUPLOAD', req.body);
        console.log('in TestPLANUPLOAD', req.file);

        if (req.body.isConfig) {
            const { fd } = await fsPromises.open(`${config.public.path + config.public.configuration + req.body.macId + '/' + req.body.folderName + '/' + req.file.filename}`, "r")
            fs.fchmod(fd, 0o755, err => {
                if (err) throw err;
                exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + req.body.macId + '/' + req.body.folderName}`);
            })
        } else {
            const { fd } = await fsPromises.open(`${config.public.path + config.public.testplan + req.body.macId + '/' + req.body.folderName + '/' + req.file.filename}`, "r")
            fs.fchmod(fd, 0o755, err => {
                if (err) throw err;
                exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + req.body.macId + '/' + req.body.folderName}`);

            })
        }
        if (req.body.isConfig) {
            if (filePresent == true) {
                if (req.body.folderName.includes("BATS")) {
                    configObj = {
                        macId: req.body.macId,
                        name: req.file.filename,
                        testbed_id: ObjectID(req.body.testbedId),
                        testbed_name: req.body.displayName,
                        version: req.body.folderName,
                        updated_by: req.body.createdBy,
                        updated_time: Date.now()
                    }
                }
                if (req.body.folderName.includes("WATS")) {
                    configObj = {
                        macId: req.body.macId,
                        name: req.file.filename,
                        testbed_id: ObjectID(req.body.testbedId),
                        testbed_name: req.body.displayName,
                        version: req.body.folderName,
                        updated_by: req.body.createdBy,
                        updated_time: Date.now()
                    }
                }
            } else {
                if (req.body.folderName.includes("BATS")) {
                    configObj = {
                        macId: req.body.macId,
                        name: req.file.filename,
                        testbed_id: ObjectID(req.body.testbedId),
                        testbed_name: req.body.displayName,
                        version: req.body.folderName,
                        created_by: req.body.createdBy,
                        updated_by: null,
                        created_time: Date.now(),

                    }
                }
                if (req.body.folderName.includes("WATS")) {
                    configObj = {
                        macId: req.body.macId,
                        name: req.file.filename,
                        testbed_id: ObjectID(req.body.testbedId),
                        testbed_name: req.body.displayName,
                        version: req.body.folderName,
                        created_by: req.body.createdBy,
                        updated_by: null,
                        created_time: Date.now(),

                    }
                }
            }
            console.log(configObj);

            // let configFile = config.public.path + config.public.configuration + req.body.testBedName + '/' + req.file.filename;
            // let sheets = ['Setup', 'Configuration'];
            // let workbook = excel.readFile(configFile);
            // for (let s of sheets) {
            //     let data = excel.utils.sheet_to_json(workbook.Sheets[s], {header:"A", raw: false, defval:'', blankrows:true});
            //     excel.utils.sheet_add_json(workbook.Sheets[s], data, {skipHeader: true});
            //     excel.writeFile(workbook, configFile);
            // }
            let filter = {
                "testbed_id": ObjectID(req.body.testbedId),
                "version": req.body.folderName,
                "name": req.file.filename
            }
            let update = {
                $set: configObj
            }
            let options = {
                upsert: true
            }
            await testPlanImplObj.updateConfigs(filter, update, options);
        }
        auth.traceUserActivity(req, responseObject, "Create");
        res.json(responseObject);
    } catch (err) {
        logger.error("testPlanUpload:", err);
        responseError(res, responseObject, err);
    }
}

/*
    This method lists all the config files present in selected testbed
*/
routes.prototype.listConfigFiles = async function(req, res) {
    var responseObject = {
        status: true,
        data: {}
    };
    let version = req.query.folderName.split("/")[0];
    try {
        let files = await testPlanImplObj.getConfigInTestbed(req.query.testbedId, version);
        responseObject.data = files;
        res.json(responseObject);
    } catch (err) {
        logger.error("listConfigFiles:", err);
        responseError(res, responseObject, 'Unable to get configuration file list!');
    }
}