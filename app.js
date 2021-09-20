require("rootpath")();
const express = require("express");
const dotenv = require("dotenv");

var path = require("path");
var body_parser = require("body-parser");
var config = require("config/config");

var mongoDb = new (require("config/mongodb"))();
var routes = require("routes/apiRoutes");
var gAuth = require("routes/gAuth");

var swaggerUi = require("swagger-ui-express");
var swaggerDocument = require("config/swagger.json");
const log = require("config/logger");

var socket = require("config/socket");

const session = require("express-session");
const passport = require("passport");

// connect to mongodb
mongoDb.connect();
var socketIOObj = new socket();

//Load env file
dotenv.config({ path: "./config/init.env" });

//Passport config
require("./config/googlePassport")(passport);

//Engine Starts
var app = express();
app.engine("html", require("ejs").renderFile); // Loading view engine for HTML pages
app.set("view engine", "html"); // Setting up view engine to render HTML pages
app.use(express.static(path.join(__dirname + "/views"))); // Configure directory to serve static contents of web application
app.use(express.static(path.join(__dirname + "/swagger"))); // Configure directory to serve static contents for Swagger
// app.use(body_parser.json());    // Use HTTP request parser to get values from query and body
// app.use(body_parser.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

// Sessions
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Enable custom CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, enctype"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

// Initiliaze routes
app.use("/", routes.router);
app.use("/Auth", gAuth.router);

// Swagger api
//app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start web server
//const PORT = process.env.PORT || 5000; // testing
var server = app.listen(config.app.port, function () {
  var host = server.address().address;
  var port = server.address().port;
  log(
    `\n<< Server Running in ${process.env.NODE_ENV} -> http://127.0.0.1:${port} >>`
  );
});

socketIOObj.connect(server);

module.exports = app;
