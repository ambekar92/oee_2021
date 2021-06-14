var responseError = require('routes/errorHandler.js');
const logger = require('config/logger');
var watsVersionImpl = require('services/db/watsVersionImpl.js');
var versionImplObj = new watsVersionImpl();

var routes = function() {

};

module.exports = routes;

/*
    This method creates a new wats version
*/
routes.prototype.createWatsVersion = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        let watsVersionObj = {
            version: req.body.version,
            created_by: req.body.created_by,
            updated_by: null,
            created_time: Date.now(),
            updated_time: null
        }

        await versionImplObj.createWatsVersion(watsVersionObj);

        responseObject.message = "Successfully created WATS Version";
        res.json(responseObject);
    } catch (err) {
        logger.error("createWatsVersion : ", err);
        if (err.code == '11000') {
            responseError(res, responseObject, "Wats version with this name already exists!");
        } else {
            responseError(res, responseObject, "Unable to create new wats version");
        }
    }
}

/*
    This method gets the list of all wats versions available
*/
routes.prototype.listVersions = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let watsVersions;
    let batsVersions;

    try {
        watsVersions = await versionImplObj.getAllWatsVersions();

        batsVersions = await versionImplObj.getAllBatsVersions();


        responseObject.wats = watsVersions;
        responseObject.bats = batsVersions;
        res.json(responseObject);
    } catch (err) {
        logger.error("listWatsVersions : ", err);
        responseError(res, responseObject, err);
    }
}