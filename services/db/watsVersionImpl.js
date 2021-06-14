var mongodb = new (require('config/mongodb'));
var watsVersionImpl = function () {
};

module.exports = watsVersionImpl;

/** WATS Version Implementation */

/*
    This method creates a new wats version and inserts into wats_version collection.
*/
watsVersionImpl.prototype.createWatsVersion = function (newVersion) {

    let WatsVersion = mongodb.getCollection('wats_version');
    WatsVersion.createIndex( { version: 1 }, { unique: true } );

    return new Promise((resolve, reject) => {
        WatsVersion.insertOne(newVersion, function (createversionErr, createversionResult) {
            if (!createversionErr) {
                resolve(createversionResult);
            } else {
                reject(createversionErr);
            }
        });
    });

};

/*
    This method creates a new wats version and inserts into bats_version collection.
*/
watsVersionImpl.prototype.createBatsVersion = function (newVersion) {

    let BatsVersion = mongodb.getCollection('bats_version');
    BatsVersion.createIndex( { version: 1 }, { unique: true } );

    return new Promise((resolve, reject) => {
        BatsVersion.insertOne(newVersion, function (createversionErr, createversionResult) {
            if (!createversionErr) {
                resolve(createversionResult);
            } else {
                reject(createversionErr);
            }
        });
    });

};

/*
    This method returns all the documents from wats_version collection.
*/
watsVersionImpl.prototype.getAllWatsVersions = function () {

    let WatsVersion = mongodb.getCollection('wats_version');

    return new Promise((resolve, reject) => {
        WatsVersion.find({}).toArray(function (getversionErr, getversionResult) {
            if (!getversionErr) {
                resolve(getversionResult);
            } else {
                reject(getversionErr);
            }
        });
    });

};

/*
    This method returns all the documents from wats_version collection based on name
*/
watsVersionImpl.prototype.getWatsVersion = function (object) {

    let WatsVersion = mongodb.getCollection('wats_version');

    return new Promise((resolve, reject) => {
        WatsVersion.find(object).toArray(function (getversionErr, getversionResult) {
            if (!getversionErr) {
                resolve(getversionResult);
            } else {
                reject(getversionErr);
            }
        });
    });

};

/*
    This method returns all the documents from bats_version collection based on name
*/
watsVersionImpl.prototype.getBatsVersion = function (object) {

    let BatsVersion = mongodb.getCollection('bats_version');

    return new Promise((resolve, reject) => {
        BatsVersion.find(object).toArray(function (getversionErr, getversionResult) {
            if (!getversionErr) {
                resolve(getversionResult);
            } else {
                reject(getversionErr);
            }
        });
    });

};

/*
    This method returns all the documents from bats_version collection.
*/
watsVersionImpl.prototype.getAllBatsVersions = function () {

    let BatsVersion = mongodb.getCollection('bats_version');

    return new Promise((resolve, reject) => {
        BatsVersion.find({}).toArray(function (getversionErr, getversionResult) {
            if (!getversionErr) {
                resolve(getversionResult);
            } else {
                reject(getversionErr);
            }
        });
    });

};