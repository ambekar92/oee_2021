var auth = require("config/auth");
var userImpl = require("services/db/userImpl.js");
var userImplObj = new userImpl();
var responseError = require("routes/errorHandler.js");
var config = require("config/config");
const logger = require("config/logger");
const util = require("util");
const bcrypt = require("bcrypt");
const _ = require("underscore");

var bcryptHash = util.promisify(bcrypt.hash);

var routes = function() {};

module.exports = routes;

/******* User Controller ******/

/**
 * This method is for login
 */
routes.prototype.login = async function(req, res) {
    let user;
    var token;
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {},
        token: "",
    };

    if (req.body.user == "guest") {
        user = {
            password: "p@ssw0rd",
            mail: "guest@nxp.com",
            role: "Guest",
            nxfID: "guest123",
        };

        token = auth.generateToken(user);
        responseObject.message = "Login successful!";
        responseObject.token = token;
        responseObject.data = user;
        //auth.traceUserActivity(req, responseObject, "Login");
        res.json(responseObject);
    } else {
        var email = req.body.email;
        var password = req.body.password;

        user = {
            password: password,
            email: email,
        };

        console.log("req body >>", req.body);
        try {
            // hashing the password to provide security (so no one except the user knows it :)
            // let passwordHash = await bcryptHash(password, saltRounds);
            // checking the user
            let newUser = await userImplObj.login(user);
            console.log("new user-", newUser);
            if (newUser) {
                token = auth.generateToken(user);
                responseObject.message = "Login successful!";
                responseObject.token = token;
                responseObject.data = newUser;
                //auth.traceUserActivity(req, responseObject, "Login");
                res.json(responseObject);
            }
        } catch (err) {
            console.log("loginError : ", err);
            responseError(res, responseObject, err);
        }
    }
};

routes.prototype.addGoogleUser = async function(req, res) {
    //console.log("req.body >>", req.body);
    let dataObj = req.body.userData;

    var responseObject = {
        status: true,
        responseCode: 200,
    };

    try {
        //console.log("dataObj.googleId >>", dataObj[0].googleId);
        let query = { googleId: dataObj[0].googleId };
        let users = await userImplObj.getUser(query);
        console.log("User Found -->", users);

        if (users !== null && users.googleId === dataObj[0].googleId) {
            responseError(res, responseObject, "User already present");
        } else {
            let newUser = await userImplObj.insertUser(dataObj[0]);
            responseObject.message = "User added successfully!";
            res.json(responseObject);
        }
    } catch (err) {
        console.log("addGoogleUser : ", err);
        responseError(res, responseObject, err);
    }
};

routes.prototype.addNormalUser = async function(req, res) {
    console.log("req.body >>", req.body);
    let email = req.body.email;
    let password = req.body.password;

    var responseObject = {
        status: true,
        responseCode: 200,
    };

    try {
        //console.log("dataObj.googleId >>", dataObj[0].googleId);
        let query = { email: email };
        let users = await userImplObj.getUsers(query);
        console.log("User Found -->", users);

        if (users !== null && users[0].email === email) {
            responseError(res, responseObject, "User already present");
        } else {
            let obj = {
                "email": email,
                "password": password
            }
            let newUser = await userImplObj.insertUser(obj);
            responseObject.message = "User added successfully!";
            res.json(responseObject);
        }
    } catch (err) {
        console.log("addNormalUser : ", err);
        responseError(res, responseObject, err);
    }
};

routes.prototype.getUsers = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        data: [],
    };

    try {
        let query = {};
        let users = await userImplObj.getUsers(query);
        //console.log(users);
        responseObject.message = "Users list";
        responseObject.elements = users.length;
        responseObject.data = users;
        res.json(responseObject);
    } catch (err) {
        console.log("getUsers : ", err);
        responseError(res, responseObject, "Unable to get users");
    }
};

routes.prototype.logout = async function(req, res) {
    console.log("in logout", req.body);

    const authHeader = req.headers["authorization"];

    var responseObject = {
        status: true,
        responseCode: 200,
        data: {},
    };

    try {

        var email = req.body.email;
        var password = req.body.password;

        let user = {
            email: email,
            password: password,
        };

        // Logout the user
        let newUser = await userImplObj.logout(user, authHeader);

        responseObject.message = "Logout successful!";
        //auth.traceUserActivity(req, responseObject, "Logout");
        res.json(responseObject);
    } catch (err) {
        console.log("loginError : ", err);
        responseError(res, responseObject, "Unable to logout");
    }
};