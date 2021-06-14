const MongoClient = require('mongodb').MongoClient;
const config = require('config/config');
const util = require('util');
const logger = require('config/logger');

var mongoConnect = util.promisify(MongoClient.connect);

// Connection URL
const url = `mongodb://${config.mongodb.host}:${config.mongodb.port}`;

// Database Name
const dbName = config.mongodb.schema;

// Array of tables to be created
var tables = ['test_plan', 'test_suite', 'test_bed', 'user', 'user_roles', 'testcase_section', 'wats_version', 'bats_version',
    'testcases', 'test_execution', 'test_execution_result', 'throughput_table', 'execution_summary', 'test_config',
    'mode', 'primary_config', 'report', 'report_data', 'template_headers', 'user_activity', 'logs_credentials', 'testbed_util',
    'chipset_qtest_mapping', 'result_report', 'result_report_data'
];

var mongoClient, db;

var mongoDB = function() {

}

mongoDB.prototype.connect = () => {
    // Use connect method to connect to the server
    return new Promise(async(resolve, reject) => {
        try {
            mongoClient = await mongoConnect(url, { useUnifiedTopology: true });
            db = mongoClient.db(dbName);
            logger.log("Connected successfully to Mongo DB");
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
            logger.error("Mongo DB connection failed", err);
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