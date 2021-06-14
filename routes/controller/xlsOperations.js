var excel = require('xlsx');
var excelJs = require('exceljs');
const fs = require('fs');
const path = require('path');
const util = require('util');
const libre = require('libreoffice-convert');
const _ = require('underscore');

const config = require('config/config');
const logger = require('config/logger');
var responseError = require('routes/errorHandler.js');
var testPlanImpl = require('services/db/testPlanImpl.js');
var testPlanImplObj = new testPlanImpl();
var auth = require('config/auth');
const { ObjectID } = require('mongodb');
const { exec } = require('child_process');

var routes = function() {

};
module.exports = routes;

/******* XLS Operations Controller ******/

/*
    This function takes the workbook name as parameter.
    Returns the sheet names.
*/
var getSheetNames = async function(filename) {
    try {
        // reading and parsing the file
        let workbook = excel.readFile(filename);

        return workbook.SheetNames;
    } catch (err) {
        logger.error("getSheetNames : ", err);
    }
}

/*
    This function takes the workbook and sheet number as parameters.
    Converts the sheet to json format and returns the array of objects.
*/
var getSheetdataWATS = async function(filename, sheet_num, isConfig) {
    try {
        console.log("inside WATS");
        // reading and parsing the file
        let workbook = excel.readFile(filename);
        let sheets = workbook.SheetNames; // get the sheet names
        let data;
        let row;
        let currentSheet = workbook.Sheets[sheets[sheet_num]];
        let ref = currentSheet['!ref'].split(':')[0];
        ref = ref.match(/\d/g)[0]; // to get start row number
        for (let key of Object.keys(currentSheet)) {
            if (currentSheet[key].v != undefined && typeof(currentSheet[key].v) === 'string') {
                if (currentSheet[key].v.match(/Test[\s\_]*(No|Id)/ig)) {
                    row = key.match(/\d+/g); // to get start row number
                    row = Number(row[0]);
                    break;
                }
            }
        }

        // convert sheet to json format
        if (isConfig) {
            data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '', blankrows: true });
        } else {
            data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '', blankrows: true });
        }
        // console.log("row", row);
        // console.log("ref", ref);
        // console.log("data", data);
        if (Number(ref) != row) {
            for (let key of Object.keys(currentSheet)) {
                if (currentSheet[key].v != undefined && typeof(currentSheet[key].v) === 'string') {
                    if (currentSheet[key].v.match(/Test[\s\_]*(No|Id)/ig)) {
                        ref = key.match(/\d+/g); // to get start row number
                        break;
                    }
                }
            }
            console.log("data", data);
            ref = ref[0];
            for (let i = 0; i < (row - 1); i++) {
                data = _.rest(data);
            }
        }
        // console.log("data", data);

        let result = { data: data, startRow: ref };
        return result;
    } catch (err) {
        logger.error("getSheetdata : ", err);
    }
}

var getSheetdataBATS = async function(filename, sheet_num, isConfig) {
    try {
        // reading and parsing the file
        let workbook = excel.readFile(filename);
        let sheets = workbook.SheetNames; // get the sheet names
        let data;
        let row;
        let currentSheet = workbook.Sheets[sheets[sheet_num]];
        let ref = currentSheet['!ref'].split(':')[0];
        ref = ref.match(/\d/g)[0]; // to get start row number
        for (let key of Object.keys(currentSheet)) {
            if (currentSheet[key].v != undefined && typeof(currentSheet[key].v) === 'string') {
                if (currentSheet[key].v.match(/Test[\s\_]*(No|Id)/ig)) {
                    row = key.match(/\d+/g); // to get start row number
                    row = Number(row[0]);
                    break;
                }
            }
        }

        // convert sheet to json format
        if (isConfig) {
            data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '', blankrows: true });
        } else {
            data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '', blankrows: true });
        }

        if (Number(ref) != row) {
            for (let key of Object.keys(currentSheet)) {
                if (currentSheet[key].v != undefined && typeof(currentSheet[key].v) === 'string') {
                    if (currentSheet[key].v.match(/Test[\s\_]*(No|Id)/ig)) {
                        ref = key.match(/\d+/g); // to get start row number
                        break;
                    }
                }
            }
            console.log("data", data);
            ref = ref[0];
            for (let i = 0; i < (row - 2); i++) {
                data = _.rest(data);
            }
        }

        let result = { data: data, startRow: ref };
        return result;
    } catch (err) {
        logger.error("getSheetdata : ", err);
    }
}
var getSheetdataBATSS = async function(filename, sheet_num, isConfig) {
    try {
        // reading and parsing the file
        let workbook = excel.readFile(filename);
        let sheets = workbook.SheetNames; // get the sheet names
        let data;
        let currentSheet = workbook.Sheets[sheets[sheet_num]];
        let ref = currentSheet['!ref'].split(':')[0];
        ref = ref.match(/\d/g)[0]; // to get start row number

        // convert sheet to json format
        if (isConfig) {
            data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '', blankrows: true });
        } else {
            data = excel.utils.sheet_to_json(workbook.Sheets[sheets[sheet_num]], { header: "A", raw: false, defval: '', blankrows: true });
        }

        let result = { data: data, startRow: ref };
        return result;
    } catch (err) {
        logger.error("getSheetdata : ", err);
    }
}

/*
    This function takes the filename, sheetname and data (array) as parameters.
    Writes the modified cell values in the file and returns the workbook.
*/
var editSheetData = async function(filename, sheetname, data) {
    try {
        // reading and parsing the file

        let workbook = excel.readFile(filename);
        let sheet = workbook.Sheets[sheetname]; // passing the sheet name

        // looping the array of modified cells and their values
        for (let cell of data) {
            console.log("cell:", cell);
            //sheet[cell[0]].v = cell[1]; 
            excel.utils.sheet_add_aoa(sheet, [
                [cell[1]]
            ], { origin: cell[0] }); // assigning the modified cell values in the sheet
        }

        let newWorkbook = excel.writeFile(workbook, filename); // writing the original file with modified changes
        await convertFile(filename, filename);

        return newWorkbook;
    } catch (err) {
        logger.error("editSheetdata : ", err);
        responseError(res, responseObject, "Unable to edit the xls data");
    }
}


/*
    This method takes the filename from the request body, reads and parses the file in the path given.
    Sends the sheet names and specified sheet data.
*/
routes.prototype.parsexls = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let file;
    let isConfig;
    let newfile;
    var newFileName = req.query.testplan + "x"
    let sheetData;

    try {
        if (req.query.isConfig) {
            let queryObj = { name: 'SetUpConfiguration.xls', testbed_name: 'TestBed1' };
            file = config.public.path + config.public.configuration + req.query.testBed + '/' + req.query.folderName + "/" + req.query.testplan;
            newfile = config.public.path + config.public.configuration + req.query.testBed + '/' + req.query.folderName + "/" + newFileName;
            let primary = await testPlanImplObj.getPrimaryConfig(queryObj);
            responseObject.primary = primary;
            isConfig = 1;
        } else {
            isConfig = 0;
            file = config.public.path + config.public.testplan + req.query.testBed + '/' + req.query.folderName + req.query.testplan;
            newfile = config.public.path + config.public.testplan + req.query.testBed + '/' + req.query.folderName + "/" + newFileName;
        }
        await convertFile(file, newfile);
        // get sheet names in the file
        let sheetnames = await getSheetNames(file);

        // get the sheet data for the specified sheet name
        let framework = req.query.folderName.split("/")[0];
        if (framework.includes("WATS")) {
            sheetData = await getSheetdataWATS(file, req.query.sheet_id, isConfig);
        } else if (framework.includes("BATS")) {
            sheetData = await getSheetdataBATS(file, req.query.sheet_id, isConfig);
        }
        //let runSheet = await getSheetdata(file, req.query.sheet);

        responseObject.data.SheetNames = sheetnames;
        responseObject.data.Sheets = sheetData.data;
        responseObject.data.startRow = sheetData.startRow;
        res.json(responseObject);

    } catch (err) {
        logger.error("parsexls : ", err);
        responseError(res, responseObject, "Unable to load the xls data");
    }
};

/*
    This method updates the given xls file with the modified cell values.
    Returns the next sheet data in json format. 
*/
routes.prototype.editxls = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        let file;
        let nextSheet;
        if (req.body.isConfig) {
            file = config.public.path + config.public.configuration + req.body.testBed + '/' + req.body.folderName + "/" + req.body.testplan;
        } else {
            file = config.public.path + config.public.testplan + req.body.testBed + '/' + req.body.folderName + "/" + req.body.testplan;
        }

        let configObj = {
            updated_by: req.body.updatedBy,
            updated_time: Date.now()
        };

        if (req.body.data.length) {
            await editSheetData(file, req.body.sheetName, req.body.data); // update sheet with modified values
            await editXlsxSheetData(file + "x", req.body.sheetName, req.body.data);
        }
        let framework = req.body.folderName.split("/")[0];
        if (framework.includes("WATS")) {
            nextSheet = await getSheetdataWATS(file, req.body.nextSheet); // read & parse the next sheet and return the object
        } else if (framework.includes("BATS")) {
            nextSheet = await getSheetdataBATSS(file, req.body.nextSheet); // read & parse the next sheet and return the object
        }
        if (req.body.configFileId) {
            await testPlanImplObj.updateConfig(req.body.configFileId, configObj);
        }

        responseObject.data.Sheets = nextSheet.data;
        responseObject.data.startRow = nextSheet.startRow;
        res.json(responseObject);
    } catch (err) {
        logger.error("editxls : ", err);
        responseError(res, responseObject, "Unable to update the xls data");
    }
};

var editXlsxSheetData = async function(filename, sheetname, data) {
    try {
        console.log(filename);
        let workbook = new excelJs.Workbook();
        let filePath = path.join('/opt/nxp-cloudapptool/web-app', filename);
        console.log(filePath);
        await workbook.xlsx.readFile(filePath);
        let worksheet = workbook.getWorksheet(sheetname);



        for (let cell of data) {
            let updateCell = worksheet.getCell(cell[0]);
            updateCell.value = cell[1];
        }
        await workbook.xlsx.writeFile(filePath);
    } catch (err) {
        console.log(err);
    }
}

/*
    This function converts the file from one type to another type.
*/
async function convertFile(fileToRead, newFileName) {
    let newFileFormat = newFileName.substr(newFileName.lastIndexOf('.'), newFileName.length);
    const enterPath = path.join('/opt/nxp-cloudapptool/web-app', fileToRead);
    const outputPath = path.join('/opt/nxp-cloudapptool/web-app', newFileName);
    let libreConvert = util.promisify(libre.convert);

    try {
        // read file
        const file = fs.readFileSync(enterPath);
        // create new file with requested format
        let newFile = await libreConvert(file, newFileFormat, undefined);
        fs.writeFileSync(outputPath, newFile);
        exec(`chown -R nxp:nxp ${outputPath}`);
    } catch (e) {
        console.log(e);
        console.log("Unable to convert");
    }
    return newFileName;
}

/*
    This method creates a copy of given config file by parsing the file and writing it into another file. 
*/
routes.prototype.createConfigCopy = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        let file = config.public.path + config.public.configuration + req.body.macId + '/' + req.body.folderName + '/' + req.body.configFile; // source file
        let filename = config.public.path + config.public.configuration + req.body.macId + '/' + req.body.folderName + '/' + req.body.filename; //destination file

        let workbook = excel.readFile(file);
        excel.writeFile(workbook, filename);
        exec(`chown -R nxp:nxp ${config.public.path + config.public.configuration + req.body.macId + '/' + req.body.folderName + '/' + req.body.filename}`);

        let configObj = {
            macId: req.body.macId,
            name: req.body.filename,
            testbed_id: ObjectID(req.body.testbedId),
            testbed_name: req.body.testBedName,
            version: req.body.folderName,
            created_by: req.body.createdBy,
            updated_by: null,
            created_time: Date.now(),
            updated_time: Date.now()
        }

        let filter = {
            "testbed_id": ObjectID(req.body.testbedId),
            "version": req.body.folderName,
            "name": req.body.filename
        }
        let update = {

            $set: configObj
        }
        let options = {
            upsert: true
        }
        await testPlanImplObj.updateConfigs(filter, update, options);

        responseObject.data.message = "Successfully created a copy!";
        auth.traceUserActivity(req, responseObject, "Create");
        res.json(responseObject);
    } catch (err) {
        logger.error("createConfigCopy : ", err);
        responseError(res, responseObject, "Unable to create a copy of config file!");
    }
}

/*
    This method exports the selected config file
*/
routes.prototype.exportConfig = async function(req, res) {
    try {
        let file = path.join(__dirname, '../..', config.public.path, config.public.configuration, req.body.testBedName, req.body.folderName, req.body.configFile);
        res.download(file);
    } catch (err) {
        logger.error("exportConfig : ", err);
        responseError(res, responseObject, "Unable to export the config file!");
    }
}

/*
    This method dynamically adds new column in the specified file
*/
routes.prototype.addColumns = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        console.log(req.body);
        let readFilePath = config.public.path + config.public.configuration + req.body.testBedName + '/' + req.body.filename;
        let workbook = excel.readFile(readFilePath);

        let sheetData = excel.utils.sheet_to_json(workbook.Sheets[req.body.sheet], { header: 1 });

        // insert columns
        let col_num = req.body.columns; // number of columns to be added
        let col = Array(col_num).fill(' '); // array of length 'num' with empty strings
        sheetData.forEach(item => item.splice(req.body.columnNumber, 0, ...col));

        excel.utils.sheet_add_json(workbook.Sheets[req.body.sheet], sheetData, { skipHeader: true });
        excel.writeFile(workbook, readFilePath);

        responseObject.message = "Added columns respectively!"
        res.json(responseObject);
    } catch (err) {
        logger.error("addColumns : ", err);
        responseError(res, responseObject, "Unable to add columns in this file!");
    }
}

/*
    This method dynamically adds new rows in the specified file
*/
routes.prototype.addRows = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        console.log(req.body);
        let readFilePath = config.public.path + config.public.configuration + req.body.testBedName + '/' + req.body.filename;
        let workbook = excel.readFile(readFilePath);

        let sheetData = excel.utils.sheet_to_json(workbook.Sheets[req.body.sheet], { header: 1 });

        // insert rows
        let row_num = req.body.rows; // number of rows to insert
        let row = [];
        for (let i = 0; i < row_num; i++) {
            row.push(Array(sheetData[0].length).fill(' '));
        }
        sheetData.splice(req.body.rowNumber, 0, ...row);

        excel.utils.sheet_add_json(workbook.Sheets[req.body.sheet], sheetData, { skipHeader: true });
        excel.writeFile(workbook, readFilePath);

        responseObject.message = "Added rows respectively!"
        res.json(responseObject);
    } catch (err) {
        logger.error("addRows : ", err);
        responseError(res, responseObject, "Unable to add rows in this file!");
    }
}