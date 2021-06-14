var responseError = require('routes/errorHandler.js');
const logger = require('config/logger');
var testBedImpl = require('services/db/testBedImpl.js');
var testBedImplObj = new testBedImpl();
const fs = require('fs');
var rimraf = require("rimraf");
const fse = require('fs-extra');
var ncp = require('ncp').ncp;
var AdmZip = require('adm-zip');
const _ = require('underscore');
var util = require('util');
var multer = require('multer');
var watsVersionImpl = require('services/db/watsVersionImpl.js');
var versionImplObj = new watsVersionImpl();
var testPlanImpl = require('services/db/testPlanImpl.js');
var testPlanImplObj = new testPlanImpl();
const { ObjectID } = require('mongodb');
var lodash = require('lodash');
const config = require('config/config');
var auth = require('config/auth');
const { exec } = require('child_process');

var routes = function() {

};

module.exports = routes;


/******* Test Bed Controller ******/

let filePresent = false;

var readFolder = function(filePath, fileName) {
    return new Promise((resolve, reject) => {
        fs.readdir(filePath, (err, files) => {
            if (err) {
                filePresent = false;
                reject(filePresent);
            } else {
                if (files.includes(fileName)) {
                    filePresent = true;
                } else {
                    filePresent = false;
                }
                resolve(filePresent);
            }
        });
    });
};
var storageWATS = multer.diskStorage({ //multers disk storage settings
    destination: async function(req, file, cb) {

        let filePath;
        let name = req.body.version;
        try {
            let folder = await readFolder(config.public.path + config.public.watsversions, name);
            if (!folder) {
                let result = await createWatsDir(name);
                filePath = config.public.path + config.public.watsversions + name;
                cb(null, filePath)
            } else {
                throw "Already present";
            }
        } catch (error) {
            cb(error, "already present");
        }
    },
    filename: function(req, file, cb) {
        console.log('file', file);
        cb(null, file.originalname);
    }
});

var uploadWATS = util.promisify(multer({ //multer settings
    storage: storageWATS,
    fileFilter: function(req, file, callback) { //file filter
        console.log('file', file, req.body);
        let watsFolder;

        watsFolder = config.public.path + config.public.watsversions;
        if (['zip'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback('Wrong extension type', null);
        }
        if (file.originalname != "Input.zip") {
            return callback('Upload a proper input file in the name of Input.zip ', null);
        }

        callback(null, true);
    }
}).single('file'));

var storageBATS = multer.diskStorage({ //multers disk storage settings
    destination: async function(req, file, cb) {

        let filePath;
        let name = req.body.version;
        const match = ["application/x-zip-compressed", "application/vnd.ms-excel", "application/zip"];

        if (match.indexOf(file.mimetype) === -1) {
            var message = `${file.originalname} is invalid`;
            return cb(message, null);
        }
        try {
            if (file.originalname == "Input.zip") {
                let folder = await readFolder(config.public.path + config.public.batsversions, name);
                console.log("folder", folder);
                if (!folder) {
                    let result = await createBatsDir(name);
                    filePath = config.public.path + config.public.batsversions + name;
                    cb(null, filePath)
                } else {
                    throw "Already BATS is present";
                }
            } else {
                let result = await createBatsDir(name);
                filePath = config.public.path + config.public.batsversions + name;
                cb(null, filePath)
            }
        } catch (error) {
            cb(error, "already present");
        }
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

var uploadBATS = util.promisify(multer({ //multer settings
    storage: storageBATS,
    fileFilter: function(req, file, callback) { //file filter
        console.log('file inside fileFilter', file, req.body);

        if (file.mimetype == "application/x-zip-compressed" || file.mimetype == "application/zip") {
            if (file.originalname != "Input.zip") {
                return callback('Upload a proper file with name Input.zip', null);
            }
        }

        callback(null, true);
    }
}).array('file', 2));


var createWatsDir = function(name) {

    return new Promise((resolve, reject) => {
        fs.mkdir((config.public.path + config.public.watsversions + name), { recursive: true }, (err) => {
            if (err) {
                reject("Unable to create WATS folder");
                logger.error("addWatsFolder : ", err);
            } else {
                exec(`chown -R nxp:nxp ${config.public.path + config.public.watsversions + name}`);
                resolve(true);
            }
        });
    });
};
var createBatsDir = function(name) {

    return new Promise((resolve, reject) => {
        fs.mkdir((config.public.path + config.public.batsversions + name), { recursive: true }, (err) => {
            if (err) {
                reject("Unable to create BATS folder");
                logger.error("addBatsFolder : ", err);
            } else {
                exec(`chown -R nxp:nxp ${config.public.path + config.public.batsversions + name}`);
                resolve(true);
            }
        });
    });
};

/*
    This method register a test bed by taking the necessary details required from the testbed agent.
*/
routes.prototype.registerTestBed = async function(req, res) {
    // console.log(JSON.parse(req));
    var mqttObj = JSON.parse(req);
    let wats = [];
    let bats = [];

    var testbedObj = {
        name: mqttObj.macAddressWithoutColon,
        hostIp: mqttObj.testbedHostIp,
        displayName: mqttObj.name,
        macID: mqttObj.macAddressWithoutColon,
        watsVersion: mqttObj.watsVersion,
        batsVersion: mqttObj.batsVersion,
        created_by: "GES",
        updated_by: "GES",
        created_time: Date.now(),
        updated_time: Date.now()

    }
    try {

        let testbed = await testBedImplObj.getTestBed(testbedObj.name);
        if (testbed.length > 0) {
            let dbWats = testbed[0].watsVersion;
            let dbBats = testbed[0].batsVersion;

            if (lodash.isEmpty(lodash.xor(dbWats, testbedObj.watsVersion)) && lodash.isEmpty(lodash.xor(dbBats, testbedObj.batsVersion))) {
                console.log("Testbed already present");
            } else { // Testbed present but different  versions
                if (!lodash.isEmpty(lodash.xor(dbWats, testbedObj.watsVersion))) {
                    console.log("Inside wats");
                    console.log(lodash.xor(dbWats, testbedObj.watsVersion));
                    await unLinkVersionsToTestbed(testbedObj.watsVersion, dbWats, testbedObj);
                    await linkVersionsToTestbed(testbedObj.watsVersion, dbWats, testbedObj);
                }
                if (!lodash.isEmpty(lodash.xor(dbBats, testbedObj.batsVersion))) {
                    console.log("Inside bats");
                    console.log(lodash.xor(dbBats, testbedObj.batsVersion));
                    await unLinkVersionsToTestbed(testbedObj.batsVersion, dbBats, testbedObj);
                    await linkVersionsToTestbed(testbedObj.batsVersion, dbBats, testbedObj);
                }
            }

        } else { // New Testbed
            if (testbedObj.watsVersion.length == 0 && testbedObj.batsVersion.length == 0) {
                await createFolder(testbedObj);
                await createConfigFolder(testbedObj);
            } else {

                for (let element of testbedObj.watsVersion) {
                    let watsVersionObj = {
                        "version": element
                    }
                    let watsVersion = await versionImplObj.getWatsVersion(watsVersionObj);
                    console.log(watsVersion);
                    if (watsVersion.length > 0) {
                        fs.mkdir((config.public.path + config.public.configuration + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + testbedObj.macID}`);
                        });
                        await copyConfigFile(testbedObj, element);
                        fs.mkdir((config.public.path + config.public.testplan + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + testbedObj.macID}`);
                        });
                        await createVersionFolders(testbedObj, element);
                    } else {
                        fs.mkdir((config.public.path + config.public.configuration + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + testbedObj.macID}`);
                        });
                        fs.mkdir((config.public.path + config.public.testplan + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + testbedObj.macID}`);
                        });
                    }
                }
                console.log("after wats folder creation");
                for (let element of testbedObj.batsVersion) {
                    let batsVersionObj = {
                        "version": element
                    }
                    let batsVersion = await versionImplObj.getBatsVersion(batsVersionObj);
                    console.log(batsVersion);
                    if (batsVersion.length > 0) {
                        fs.mkdir((config.public.path + config.public.configuration + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + testbedObj.macID}`);
                        });
                        await copyConfigFile(testbedObj, element);
                        fs.mkdir((config.public.path + config.public.testplan + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + testbedObj.macID}`);
                        });
                        await createVersionFolders(testbedObj, element);
                    } else {
                        fs.mkdir((config.public.path + config.public.configuration + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + testbedObj.macID}`);
                        });
                        fs.mkdir((config.public.path + config.public.testplan + testbedObj.macID), { recursive: true }, (err) => {
                            if (err) {
                                logger.error("addTestBedFolder : ", err);
                            }
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + testbedObj.macID}`);
                        });
                    }
                }
                console.log("after bats folder creation");
            }
            console.log("before read");
            fs.readdir(config.public.path + config.public.testplan + testbedObj.macID, async(err, files) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("files--", files);
                    for (let version of files) {
                        if (version.includes("WATS")) {
                            wats.push(version);
                        } else if (version.includes("BATS")) {
                            bats.push(version);
                        }
                    }
                    let location = await getLocation(testbedObj);
                    let filter = {
                        "macId": testbedObj.macID
                            // "name": testbedObj.name
                    }
                    var update = {
                        $set: {
                            "name": testbedObj.name,
                            "displayName": testbedObj.displayName,
                            "location": location,
                            "watsVersion": wats,
                            "batsVersion": bats,
                            "created_by": "GES",
                            "updated_by": "GES",
                            "created_time": Date.now(),
                            "updated_time": Date.now()
                        }
                    }
                    const options = { upsert: true };
                    // create a testbed and store in db
                    let testBeds = await testBedImplObj.addTestBeds(filter, update, options);
                    console.log("Testbed added", testBeds.upsertedId._id);
                    for (let element of wats) {
                        let configObj = {
                            macId: testbedObj.name,
                            name: "SetUpConfiguration.xls",
                            testbed_id: ObjectID(testBeds.upsertedId._id),
                            testbed_name: testbedObj.displayName,
                            version: element,
                            created_by: testbedObj.created_by,
                            updated_by: null,
                            created_time: Date.now(),
                            updated_time: null
                        }
                        console.log(configObj);
                        await testPlanImplObj.insertConfig(configObj);

                    }
                    for (let element of bats) {
                        let configObj = {
                            macId: testbedObj.name,
                            name: "SetupConfigurations.xls",
                            testbed_id: ObjectID(testBeds.upsertedId._id),
                            testbed_name: testbedObj.displayName,
                            version: element,
                            created_by: testbedObj.created_by,
                            updated_by: null,
                            created_time: Date.now(),
                            updated_time: null
                        }
                        console.log(configObj);
                        await testPlanImplObj.insertConfig(configObj);

                    }
                }
            });
        }

    } catch (err) {
        logger.error("registerTestBeds : ", err);
        if (err.code == '11000') {
            console.log(res);

        } else {
            console.log(err);

        }
    }
};

async function getLocation(testbedObj) {
    let location;

    if (testbedObj.hostIp.match(/10.17.1[2-5].[0-9]+/g)) {
        location = "Shanghai";
    } else if (testbedObj.hostIp.match(/10.17.8[0-3].[0-9]+/g)) {
        location = "Pune";
    } else if (testbedObj.hostIp.match(/10.17.10[6-7].[0-9]+/g)) {
        location = "Hsinchu";
    } else if (testbedObj.hostIp.match(/10.17.11[0-1].[0-9]+/g)) {
        location = "Taipei";
    } else if (testbedObj.hostIp.match(/10.17.12[0-3].[0-9]+/g)) {
        location = "San Jose";
    } else {

    }
    return location;

}

async function copyConfigFile(testbedObj, element) {
    let srcDir;
    let destDir;
    return new Promise(async(resolve, reject) => {

        fs.mkdir((config.public.path + config.public.configuration + testbedObj.macID + '/' + element), { recursive: true }, (err) => {
            if (err) {
                logger.error("addWatsFolder : ", err);
            } else {
                exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + testbedObj.macID + '/' + element}`);
                if (element.includes("WATS")) {
                    srcDir = config.public.path + config.public.watsversions + element + '/SetUpConfiguration.xls';
                    destDir = config.public.path + config.public.configuration + testbedObj.macID + '/' + element + '/' + "SetUpConfiguration.xls";
                }
                if (element.includes("BATS")) {
                    srcDir = config.public.path + config.public.batsversions + element + '/SetupConfigurations.xls';
                    destDir = config.public.path + config.public.configuration + testbedObj.macID + '/' + element + '/' + "SetupConfigurations.xls";
                }
                console.log("src--", srcDir);
                console.log("dest--", destDir);
                ncp.limit = 0;
                fs.copyFile(srcDir, destDir, (err) => {
                    if (err) throw err;
                    console.log('source was copied to destination');
                    resolve("copied")
                });
            }
        });
    });
}

async function createFolder(testbedObj) {
    return new Promise((resolve, reject) => {
        fs.mkdir((config.public.path + config.public.testplan + testbedObj.macID), { recursive: true }, (err) => {
            if (err) {
                logger.error("addTestBedFolder : ", err);
            }
            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + testbedObj.macID}`);
            console.log("after ");
            resolve("done");
        });
    });
}

async function createConfigFolder(testbedObj) {
    return new Promise((resolve, reject) => {
        fs.mkdir((config.public.path + config.public.configuration + testbedObj.macID), { recursive: true }, (err) => {
            if (err) {
                logger.error("addTestBedFolder : ", err);
            }
            exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + testbedObj.macID}`);
            console.log("after ");
            resolve("done");
        });
    });
}

async function removeConfig(testbedObj, folder) {
    console.log("In remove wats folders");
    await testPlanImplObj.deleteConfig(folder);
    let path = config.public.path + config.public.configuration + testbedObj.macID + '/';

    return new Promise((resolve, reject) => {
        fs.rmdir(path + folder, { force: true, recursive: true }, (err) => {
            if (err) {
                console.log(err);
                reject(err)
            } else {
                console.log("del");
                resolve('deleted')
            }
        });
    });
}

async function unLinkVersionsToTestbed(versions, dbVersions, testbedObj) {
    let version = [];
    var update;
    console.log("versions-", versions);
    console.log("dbVersion", dbVersions);
    for (let item of dbVersions) {
        if (versions.includes(item)) {
            version.push(item);
        } else {
            //remove folder
            await removeVersionfolders(testbedObj, item);
            await removeConfig(testbedObj, item);
        }
    }
    console.log(version);

    let filter = {
        "macId": testbedObj.macID
            // "name": testbedObj.name
    }
    if (versions.length == 0) {
        if (testbedObj.watsVersion.length == 0) {
            update = {
                $set: {
                    "watsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
        }
        if (testbedObj.batsVersion.length == 0) {
            update = {
                $set: {
                    "batsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
        }
    } else {
        if (versions[0].includes("WATS")) {
            update = {
                $set: {
                    "watsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
        }
        if (versions[0].includes("BATS")) {
            console.log("ins bats");
            update = {
                $set: {
                    "batsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
        }
    }
    const options = { upsert: false };
    // create a testbed and store in db
    let testBeds = await testBedImplObj.addTestBeds(filter, update, options);

}

async function linkVersionsToTestbed(versions, dbVersions, testbedObj) {
    let version = [];
    let vers;
    let configObj;
    let filters;
    let updates;
    var update;
    const options = { upsert: false };
    console.log(versions);
    console.log(dbVersions);
    for (let item of versions) {
        let versionObject = {
            "version": item
        }
        if (item.includes("WATS")) {
            vers = await versionImplObj.getWatsVersion(versionObject);
            console.log(vers);
        }
        if (item.includes("BATS")) {
            vers = await versionImplObj.getBatsVersion(versionObject);
            console.log(vers);
        }

        if (vers.length > 0) {
            if (dbVersions.includes(item)) {
                console.log("Version is already linked to Testbed");
                version.push(item);
            } else {
                //create folder
                version.push(item);
                console.log("before new bats", item);
                await createVersionFolders(testbedObj, item);
                await copyConfigFile(testbedObj, item);
            }
        } else {
            // No Wats version plz upload
            console.log(`No wats version ${item} plz upload`);
        }

    }
    let testBeds = await testBedImplObj.getTestBed(testbedObj.macID);
    console.log("updated wats-", version);
    let filter = {
        "macId": testbedObj.macID
            // "name": testbedObj.name
    }
    if (versions.length == 0) {
        if (testbedObj.watsVersion.length == 0) {
            update = {
                $set: {
                    "watsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
        }
        if (testbedObj.batsVersion.length == 0) {
            update = {
                $set: {
                    "batsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
        }
    } else {
        if (versions[0].includes("WATS")) {
            update = {
                $set: {
                    "watsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
            for (let element of version) {
                configObj = {
                    macId: testbedObj.name,
                    name: "SetUpConfiguration.xls",
                    testbed_id: ObjectID(testBeds[0]._id),
                    testbed_name: testbedObj.displayName,
                    version: element,
                    created_by: testbedObj.created_by,
                    updated_by: null,
                    created_time: Date.now(),
                    updated_time: null
                }
                filters = {
                    "testbed_id": ObjectID(testBeds[0]._id),
                    "version": element,
                    "name": configObj.name
                }
                updates = {
                    $set: configObj
                }

                await testPlanImplObj.updateConfigs(filters, updates, { upsert: true });
            }
        }
        if (versions[0].includes("BATS")) {
            update = {
                $set: {
                    "batsVersion": version,
                    "created_by": "GES",
                    "updated_by": "GES",
                    "updated_time": Date.now()
                }
            }
            for (let element of version) {
                configObj = {
                    macId: testbedObj.name,
                    name: "SetupConfigurations.xls",
                    testbed_id: ObjectID(testBeds[0]._id),
                    testbed_name: testbedObj.displayName,
                    version: element,
                    created_by: testbedObj.created_by,
                    updated_by: null,
                    created_time: Date.now(),
                    updated_time: null
                }
                filters = {
                    "testbed_id": ObjectID(testBeds[0]._id),
                    "version": element,
                    "name": configObj.name
                }
                updates = {
                    $set: configObj
                }
                await testPlanImplObj.updateConfigs(filters, updates, { upsert: true });
            }
        }
    }
    // create a testbed and store in db
    let testBed = await testBedImplObj.addTestBeds(filter, update, options);
    console.log("Wats--", version);

}

function createVersionFolders(testbedObj, element) {
    let srcDir;
    return new Promise(async(resolve, reject) => {

        fs.mkdir((config.public.path + config.public.testplan + testbedObj.macID + '/' + element), { recursive: true }, (err) => {
            if (err) {
                logger.error("addWatsFolder : ", err);
            } else {

                if (element.includes("WATS")) {
                    srcDir = config.public.path + config.public.watsversions + element;
                }
                if (element.includes("BATS")) {
                    srcDir = config.public.path + config.public.batsversions + element;
                }
                let destDir = config.public.path + config.public.testplan + testbedObj.macID + '/' + element + '/';
                console.log("src--", srcDir);
                console.log("dest--", destDir);
                ncp.limit = 0;
                ncp(srcDir, destDir, { stopOnErr: true }, function(err) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log('done!');
                    exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + testbedObj.macID + '/' + element}`);
                    resolve('Added');
                });

            }
        });
    });
}

async function removeVersionfolders(testbedObj, folder) {
    console.log("In remove wats folders");
    let path = config.public.path + config.public.testplan + testbedObj.macID + '/';

    return new Promise((resolve, reject) => {
        fs.rmdir(path + folder, { force: true, recursive: true }, (err) => {
            if (err) {
                console.log(err);
                reject(err)
            } else {
                console.log("del");
                resolve('deleted')
            }
        });
    });
}

/** This methos adds the default files to the WatsVersions folder */

routes.prototype.uploadWATSFiles = async function(req, res) {
    console.log("inside watsversion upload");
    var responseObject = {
        status: true,
        data: {}
    };
    let folder;
    try {
        await uploadWATS(req, res);
        folder = config.public.path + config.public.watsversions;


        console.log("req.file-", req.file);
        console.log("req.body-", req.body);

        let name = req.body.version;
        let versionObj = {
            version: name,
            created_by: req.body.created_by,
            updated_by: null,
            created_time: Date.now(),
            updated_time: null
        }

        await versionImplObj.createWatsVersion(versionObj);

        if (req.file.filename != "Input.zip") {
            responseError(res, responseObject, "Upload a proper input file in the name of 'Input.zip' ");
        }
        var zip = new AdmZip(folder + name + "/" + req.file.filename);
        zip.extractAllTo( /*target path*/ folder + name, /*overwrite*/ true);

        fs.unlink(folder + name + "/Input.zip", (err) => {
            if (err) {
                console.log(err);
            }
        });

        fs.readdir(folder + name + "/" + "Input", (err, files) => {
            if (err) {
                console.log('error', err);

            } else {
                let srcDir = folder + name + "/" + "Input/";
                let destDir = folder + name;
                console.log("src--", srcDir);
                console.log("dest--", destDir);
                ncp.limit = 0;
                ncp(srcDir, destDir, { stopOnErr: true }, async function(err) {
                    if (err) {
                        console.error(err);
                        responseError(res, responseObject, err);
                    }
                    console.log('done!');
                    fs.rmdir(folder + name + "/" + "Input", { force: true, recursive: true }, (err) => {
                        if (err) {
                            console.log(err);
                            responseError(res, responseObject, error);
                        } else {
                            console.log("del");
                            responseObject.message = "version created successfully.";
                            auth.traceUserActivity(req, responseObject, "Create");
                            res.json(responseObject);
                        }
                    });
                });
            }
        });
    } catch (error) {

        if (error.code == '11000') {
            responseError(res, responseObject, "version with this name already exists!");
        } else {
            logger.error("createWatsVersion : ", error);
            responseError(res, responseObject, error);
        }
    }
}


/** This methos adds the default files to the BatsVersions folder */

routes.prototype.uploadBATSFiles = async function(req, res) {
    console.log("inside batsversion upload");
    var responseObject = {
        status: true,
        data: {}
    };
    let folder;
    try {
        await uploadBATS(req, res);
        folder = config.public.path + config.public.batsversions;


        console.log("req.file-", req.files);
        console.log("req.body-", req.body);

        let name = req.body.version;
        let versionObj = {
            version: name,
            created_by: req.body.created_by,
            updated_by: null,
            created_time: Date.now(),
            updated_time: null
        }
        await versionImplObj.createBatsVersion(versionObj);

        let file = _.where(req.files, { originalname: 'Input.zip' });
        if (file.length > 0) {
            var zip = new AdmZip(folder + name + "/" + files[0].originalname);
            zip.extractAllTo( /*target path*/ folder + name, /*overwrite*/ true);

            fs.unlink(folder + name + "/Input.zip", (err) => {
                if (err) {
                    console.log(err);
                }
            });

            fs.readdir(folder + name + "/" + "Input", (err, files) => {
                if (err) {
                    console.log('error', err);

                } else {
                    let srcDir = folder + name + "/" + "Input/";
                    let destDir = folder + name;
                    ncp.limit = 0;
                    ncp(srcDir, destDir, { stopOnErr: true }, async function(err) {
                        if (err) {
                            console.error(err);
                            responseError(res, responseObject, error);
                        }
                        console.log('done!');
                        fs.rmdir(folder + name + "/" + "Input", { force: true, recursive: true }, (err) => {
                            if (err) {
                                console.log(err);
                                responseError(res, responseObject, error);
                            } else {
                                console.log("del");
                                responseObject.message = "version created successfully.";
                                auth.traceUserActivity(req, responseObject, "Create");
                                res.json(responseObject);
                            }
                        });
                    });
                }
            });
        }
    } catch (error) {

        if (error.code == '11000') {
            responseError(res, responseObject, "version with this name already exists!");
        } else {
            logger.error("createWatsVersion : ", error);
            responseError(res, responseObject, error);
        }
    }
}


/*
    This method adds a new wats version to the specified testbed.
*/
routes.prototype.addWatsVersion = async function(req, res) {

    console.log("req--", req.body);
    let responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {
        let testBed = await testBedImplObj.getTestBed(req.body.testbed_name);
        let testBedObj = {
            name: req.body.testbed_name,
            ip: "92.120.51.51", //testBed[0].ip
            watsVersion: []
        }
        console.log(testBed);
        if (testBed[0].watsVersion.includes(req.body.version)) {
            throw 'ERR100';
        }
        testBed[0].watsVersion.forEach(element => {
            testBedObj.watsVersion.push(element);
        });
        testBedObj.watsVersion.push(req.body.version)

        console.log(testBedObj);
        let filter = {
            "name": testBedObj.name
        }
        var update = {
            $set: {
                "watsVersion": testBedObj.watsVersion
            }
        }
        await testBedImplObj.updateTestbed(filter, update);

        let filepath = config.public.path + config.public.testplan + req.body.testbed_name + '/' + req.body.version;
        if (fs.existsSync(filepath)) {
            throw 'ERR100';
        } else {
            let srcDir = config.public.path + config.public.watsversions + "/" + req.body.version;
            let destDir = filepath;
            fs.mkdir((config.public.path + config.public.testplan + req.body.testbed_name + '/' + req.body.version), { recursive: true }, (err) => {
                if (err) {
                    logger.error("addTestBedFolder : ", err);
                } else {
                    console.log("src--", srcDir);
                    console.log("dest--", destDir);
                    ncp.limit = 0;
                    ncp(srcDir, destDir, { stopOnErr: true }, async function(err) {
                        if (err) {
                            return console.error(err);
                        } else {
                            console.log('done!');
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + req.body.testbed_name + '/' + req.body.version}`);
                            responseObject.message = "Successfully added WATS Version."
                            auth.traceUserActivity(req, responseObject, "Create");
                            res.json(responseObject);
                        }
                    });
                }
            });
        }
    } catch (err) {
        logger.error("addWatsVersion : ", err);
        if (err == 'ERR100') {
            responseError(res, responseObject, "Selected WATS version is already present for this Testbed!");
        } else {
            responseError(res, responseObject, "Unable to add new wats version");
        }
    }
};

/*
    This method adds a new bats version to the specified testbed.
*/
routes.prototype.addBatsVersion = async function(req, res) {

    console.log("req--", req.body);
    let responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {
        let testBed = await testBedImplObj.getTestBed(req.body.testbed_name);
        let testBedObj = {
            name: req.body.testbed_name,
            ip: "92.120.51.51", //testBed[0].ip
            batsVersion: []
        }
        console.log(testBed);
        if (testBed[0].batsVersion.includes(req.body.version)) {
            throw 'ERR100';
        }
        testBed[0].batsVersion.forEach(element => {
            testBedObj.batsVersion.push(element);
        });
        testBedObj.batsVersion.push(req.body.version)

        console.log(testBedObj);
        let filter = {
            "name": testBedObj.name
        }
        var update = {
            $set: {
                "batsVersion": testBedObj.batsVersion
            }
        }
        await testBedImplObj.updateTestbed(filter, update);

        let filepath = config.public.path + config.public.testplan + req.body.testbed_name + '/' + req.body.version;
        if (fs.existsSync(filepath)) {
            throw 'ERR100';
        } else {
            let srcDir = config.public.path + config.public.batsversions + "/" + req.body.version;
            let destDir = filepath;
            fs.mkdir((config.public.path + config.public.testplan + req.body.testbed_name + '/' + req.body.version), { recursive: true }, (err) => {
                if (err) {
                    logger.error("addTestBedFolder : ", err);
                } else {
                    console.log("src--", srcDir);
                    console.log("dest--", destDir);
                    ncp.limit = 0;
                    ncp(srcDir, destDir, { stopOnErr: true }, async function(err) {
                        if (err) {
                            return console.error(err);
                        } else {
                            console.log('done!');
                            exec(`chown -R nxp:nxp ${config.public.path + config.public.testplan + req.body.testbed_name + '/' + req.body.version}`);
                            responseObject.message = "Successfully added BATS Version."
                            auth.traceUserActivity(req, responseObject, "Create");
                            res.json(responseObject);
                        }
                    });
                }
            });
        }
    } catch (err) {
        logger.error("addBatsVersion : ", err);
        if (err == 'ERR100') {
            responseError(res, responseObject, "Selected BATS version is already present for this Testbed!");
        } else {
            responseError(res, responseObject, "Unable to add new bats version");
        }
    }
};


/*
    This method get all the available test beds 
*/
routes.prototype.getAllTestBeds = async function(req, res) {
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(req.query.size);
    var q = req.query.q;
    var query = {};
    let qStr;

    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    // query.skip = pageNo - 1;
    query.skip = ((size * pageNo) - size);
    query.limit = size

    try {
        // get all the test beds from db
        if (q == 'undefined') {
            qStr = { displayName: { '$regex': '', '$options': 'i' } };
        } else {
            qStr = { displayName: { '$regex': q, '$options': 'i' } };
        }

        let testBeds = await testBedImplObj.getAllTestBeds(query, qStr);
        responseObject.message = "Successfull";
        responseObject.data = testBeds.data;
        responseObject.elements = testBeds.elements;
        checkTestBedSync(testBeds);
        res.json(responseObject);
    } catch (err) {
        logger.error("getAllTestBeds : ", err);
        responseError(res, responseObject, "Unable to get the testbeds");
    }
};

/*
    This method gets the favorite test beds.
*/
routes.prototype.getFavoriteTestBeds = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };
    let arr = [];

    try {
        // get all the test beds from db
        let testBeds = await testBedImplObj.getTestBedObjects();
        for (let element of testBeds) {
            let check = _.where(element.users, { "nxfId": req.query.nxfId });
            if (check.length > 0) {
                arr.push(element);
            }
        }
        responseObject.message = "Successfull";
        responseObject.data = arr;
        res.json(responseObject);
    } catch (err) {
        logger.error("getAllTestBeds : ", err);
        responseError(res, responseObject, "Unable to get the testbeds");
    }
};


/**
 * This methos is used add a testbed as favorites.
 */
routes.prototype.addFavoriteTestBeds = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {
        let obj = {
            nxfId: req.body.nxfId,
            isFav: true
        }
        let update;

        let filter = { "_id": ObjectID(req.body.testBedId) };
        let testBeds = await testBedImplObj.getTestBedObjects(filter);
        if (testBeds[0].users) {
            let available = testBeds[0].users.filter((o) => {
                return o.nxfId == req.body.nxfId;
            });
            if (available.length > 0) {
                responseObject.message = "Already present";
            } else {
                update = { $push: { "users": obj } }
                let testBeds = await testBedImplObj.updateTestbed(filter, update);
                responseObject.message = "Successfull";
            }
        } else {
            update = { $push: { "users": obj } }
            let testBeds = await testBedImplObj.updateTestbed(filter, update);
            responseObject.message = "Successfull";
        }
        res.json(responseObject);
    } catch (err) {
        logger.error("getAllTestBeds : ", err);
        responseError(res, responseObject, "Unable to get the testbeds");
    }
};

routes.prototype.removeFavoriteTestBeds = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {
        let obj = {
            nxfId: req.body.nxfId,
            isFav: true
        }

        let filter = { "_id": ObjectID(req.body.testBedId) };
        let testBeds = await testBedImplObj.getTestBedObjects(filter);
        let available = testBeds[0].users.filter((o) => {
            return o.nxfId == req.body.nxfId;
        });
        if (available.length > 0) {
            let update = { $pull: { "users": obj } }
            let testBeds = await testBedImplObj.updateTestbed(filter, update);
            responseObject.message = "Successfull";
        }
        res.json(responseObject);
    } catch (err) {
        logger.error("getAllTestBeds : ", err);
        responseError(res, responseObject, "Unable to get the testbeds");
    }
};


/*
    This method deletes the test bed which the user wants to delete.
*/
routes.prototype.deleteTestBeds = async function(req, res) {
    var testBedId = req.body.id;
    var testBedName = req.body.testBedName; //required parameters

    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {
        // delete the test beds from db
        let testBeds = await testBedImplObj.deleteTestBeds(testBedId);
        // await testPlanImplObj.deleteConfig();
        responseObject.message = "Successfull";
        let removetestbedDir = await removeTestbedDir(testBedName);
        let removeconfigDir = await removeConfigDir(testBedName);

        auth.traceUserActivity(req, responseObject, "Delete");
        res.json(responseObject);
    } catch (err) {
        logger.error("deleteTestBeds : ", err);
        responseError(res, responseObject, "Unable to delete the testbeds");
    }
};

function removeTestbedDir(testBedName) {
    testFolder = './public/Testplans/';
    return new Promise((resolve, reject) => {
        try {
            fs.readdir(testFolder, (err, files) => {
                if (err) {
                    console.log('error', err);
                    reject("Unable to delete the testbed", err);

                } else {
                    for (let index = 0; index < files.length; index++) {
                        if (files[index] == testBedName) {
                            console.log("REMOVED: ", testBedName)
                            rimraf(testFolder + testBedName, (err, testFolder) => {
                                console.log("The deleted testbed is : ", testBedName);
                            });
                        }
                    }
                    resolve("Delete test bed successfully")
                }
            });
        } catch (err) {
            logger.error("removeDir : ", err);
            reject("Unable to delete the testbed", err);
        }
    })
};

function removeConfigDir(testBedName) {

    configFolder = config.public.path + config.public.configuration;
    return new Promise((resolve, reject) => {
        try {
            fs.readdir(configFolder, (err, files) => {
                if (err) {
                    console.log('error', err);
                    reject("Unable to delete the testbed", err);

                } else {
                    for (let index = 0; index < files.length; index++) {
                        if (files[index] == testBedName) {
                            console.log("REMOVED: ", testBedName)
                            rimraf(configFolder + testBedName, (err, testFolder) => {
                                console.log("The deleted testbed is : ", testBedName);
                            });
                        }
                    }
                    resolve("Delete test bed successfully")
                }
            });
        } catch (err) {
            logger.error("removeDir : ", err);
            reject("Unable to delete the testbed", err);
        }
    })
};

async function checkTestBedSync(testBeds) {
    testFolder = './public/Testplans/';
    let testBedList = [];
    let objLength = Object.keys(testBeds.data).length;

    try {

        fs.readdir(testFolder, (err, files) => {
            if (err) console.log('error', err);

            for (let index = 0; index < objLength; index++) {
                testBedList.push(testBeds.data[index].name);
            }
            console.log("Directorys :", files.length, "Database :", objLength);
            if (files.length === objLength) {
                console.log("List of TestBeds in directory", files);
                console.log("List of TestBeds in DataBase", testBedList);

                for (let index = 0; index < objLength; index++) {
                    if (testBedList.includes(files[index])) {
                        console.log("Testbed ", files[index], "exists in database");
                    } else {
                        console.log("Testbed", files[index], " does not exists in database")
                    }
                }
            } else {
                console.log("Database and public direcory are not in sync");
            }

        });
    } catch (err) {
        logger.error("checkTestBedSync : ", err);
    }

};