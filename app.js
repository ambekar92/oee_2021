require('rootpath')();
var path = require('path');
var express = require('express');
var body_parser = require('body-parser');
var config = require('config/config');
const log = require('config/logger');
var mongoDb = new(require('config/mongodb'));
var routes = require('routes/apiRoutes');
var swaggerUi = require('swagger-ui-express');
var swaggerDocument = require('config/swagger.json');
var socket = require('config/socket');

// connect to mongodb
mongoDb.connect();
var socketIOObj = new socket();

var app = express();
app.engine('html', require('ejs').renderFile); // Loading view engine for HTML pages
app.set('view engine', 'html'); // Setting up view engine to render HTML pages
app.use(express.static(path.join(__dirname + '/views'))); // Configure directory to serve static contents of web application
app.use(express.static(path.join(__dirname + '/swagger'))); // Configure directory to serve static contents for Swagger
// app.use(body_parser.json());    // Use HTTP request parser to get values from query and body
// app.use(body_parser.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Enable custom CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, enctype");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    next();
});

// //connect to mqttClient
// mqttClient.connect();

// //Listen to subscribed topics
// mqttClient.onMsgArrived();

// //subscribe to mqtt
// mqttClient.subscribe(config.mqtt.resultTopic);

// mqttClient.subscribe(config.mqtt.statusTopic);

// mqttClient.subscribe(config.mqtt.registerTopic);

// mqttClient.subscribe(config.mqtt.errorTopic);

// mqttClient.subscribe(config.mqtt.summaryTopic);

// Initiliaze routes
app.use('/', routes.router);

// Swagger api
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start web server
var server = app.listen(config.app.port, function() {
    var host = server.address().address;
    var port = server.address().port;
    log(`Application listening at http://${host}:${port} \n------>`);
});

socketIOObj.connect(server);

module.exports = app;