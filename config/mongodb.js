const MongoClient = require('mongodb').MongoClient;
const config = require('config/config');
const util = require('util');
const log = require('config/logger');

var mongoConnect = util.promisify(MongoClient.connect);

// Connection URL
const url = `mongodb://${config.mongodb.host}:${config.mongodb.port}`;

// Database Name
const dbName = config.mongodb.schema;

// Array of tables to be created
var tables = ['user'];

var mongoClient, db;

var mongoDB = function() {

}

mongoDB.prototype.connect = () => {
    // Use connect method to connect to the server
    return new Promise(async(resolve, reject) => {
        try {
            mongoClient = await mongoConnect(url, { useUnifiedTopology: true });
            db = mongoClient.db(dbName);
            log("Connected successfully to Mongo DB");
            var collections = await db.collections();
            if (collections) {
                collections = collections.map(c => {
                    return c.s.namespace.collection;
                })
                tables.forEach((table) => {
                    if (!collections.includes(table)) {
                        db.createCollection(table, function(err, res) {
                            if (err) throw err;
                            console.log(table, " created");
                        });
                    }
                });
            }
            resolve(mongoClient);
        } catch (err) {
            log("Mongo DB connection failed", err);
            reject(err);
        };
    });
};

mongoDB.prototype.disconnect = () => {
    mongoClient.close();
}

mongoDB.prototype.getCollection = (collectionName) => {
    return db.collection(collectionName);
}

module.exports = mongoDB;