// redis client config

var redis = require('redis');
var redisClient = redis.createClient();
const logger = console;

redisClient.on('connect', function() {
    logger.info("Redis : Connection established with server");
});

redisClient.on("error", function (err) {
    logger.error("Redis : ", err);
});

module.exports = redisClient;