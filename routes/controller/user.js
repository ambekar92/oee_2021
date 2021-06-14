var auth = require('config/auth');
var userImpl = require('services/db/userImpl.js');
var userImplObj = new userImpl();
var responseError = require('routes/errorHandler.js');
var config = require('config/config');
const logger = require('config/logger');
const util = require('util');
const bcrypt = require('bcrypt');
const _ = require('underscore');

var bcryptHash = util.promisify(bcrypt.hash);

var routes = function() {

};

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
        token: ''
    };

    if (req.body.user == "guest") {
        user = {
            password: "p@ssw0rd",
            mail: "guest@nxp.com",
            role: "Guest",
            nxfID: "guest123"
        };

        token = auth.generateToken(user);
        responseObject.message = "Login successful!";
        responseObject.token = token;
        responseObject.data = user;
        auth.traceUserActivity(req, responseObject, "Login");
        res.json(responseObject);

    } else {
        var emailId = req.body.email;
        var password = req.body.password;

        user = {
            password: password,
            nxfID: emailId,
        };

        console.log("req", req.body);
        try {
            // hashing the password to provide security (so no one except the user knows it :) 
            // let passwordHash = await bcryptHash(password, saltRounds);
            // checking the user
            let newUser = await userImplObj.login(user)
            console.log("new user-", newUser);
            if (newUser) {
                token = auth.generateToken(user);
                responseObject.message = "Login successful!";
                responseObject.token = token;
                responseObject.data = newUser;
                auth.traceUserActivity(req, responseObject, "Login");
                res.json(responseObject);
            }

        } catch (err) {
            logger.error("loginError : ", err);
            responseError(res, responseObject, err);
        }
    }

};

routes.prototype.addUser = async function(req, res) {
    var emailId = req.body.email;
    var assignedBy = req.body.assignedBy;
    let user;
    console.log('req.body', req.body);
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {

        user = {
            mail: emailId,
            assignedBy: assignedBy,
            role: "User"
        };
        console.log(user);
        let users = await userImplObj.getUsersList();
        console.log("users--", users);
        if (users.some(usr => usr.mail === user.mail)) {
            responseError(res, responseObject, "User already present");
        } else {
            // inserting user details in database
            let usr = await userImplObj.getLdapDetails(user);
            user = {
                mail: usr.mail,
                nxfID: usr.cn,
                name: usr.displayName,
                assignedBy: assignedBy,
                role: user.role
            }
            let newUser = await userImplObj.insertUser(user);
            responseObject.message = "User added successfully!";
            auth.traceUserActivity(req, responseObject, "Create");
            res.json(responseObject);
        }
    } catch (err) {
        logger.error("addUser : ", err);
        responseError(res, responseObject, err);
    }
};

routes.prototype.getUsers = async function(req, res) {
    console.log('in get Users', req.query);
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(req.query.size);

    var query = {};
    query.skip = ((size * pageNo) - size);
    query.limit = size
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {
        let users = await userImplObj.getUsers(query);
        console.log(users);
        responseObject.data.users = users;
        responseObject.elements = users.elements;
        responseObject.message = "Users list found!";
        res.json(responseObject);
    } catch (err) {
        logger.error("getUsers : ", err);
        responseError(res, responseObject, "Unable to get users");
    }
};

routes.prototype.logout = async function(req, res) {
    console.log('in logout', req.body);
    var emailId = req.body.email;
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {},

    };

    try {

        let user = {
            mail: emailId,
            nxfID: req.body.nxfID
        };

        // checking the user
        let newUser = await userImplObj.logout(user)
        console.log("new user-", newUser);

        responseObject.message = "Logout successful!";
        auth.traceUserActivity(req, responseObject, "Logout");
        res.json(responseObject);

    } catch (err) {
        logger.error("loginError : ", err);
        responseError(res, responseObject, "Unable to logout");
    }
};

routes.prototype.assignRole = async function(req, res) {
    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {

        let mail = _.pluck(req.body.usersToBeAssign, "email");
        console.log("mail", mail);
        let role = req.body.usersToBeAssign[0].role;
        let assignedBy = req.body.usersToBeAssign[0].assignedBy;

        let user = {
            mail: mail,
            role: role,
            assignedBy: assignedBy
        }

        // inserting user details in database
        let newUser = await userImplObj.assignRole(user);

        responseObject.message = "Assigned role successfully!";
        auth.traceUserActivity(req, responseObject, "Update");
        res.json(responseObject);
    } catch (err) {
        logger.error("addUser : ", err);
        responseError(res, responseObject, "update failure");
    }
};

routes.prototype.disableUser = async function(req, res) {
    console.log('in disableUser', req.body);
    var nxfID = req.body.nxfID;

    var responseObject = {
        status: true,
        responseCode: 200,
        data: {}
    };

    try {

        let user = {
            nxfID: nxfID,
        };
        // inserting user details in database
        let User = await userImplObj.disableUser(user);
        responseObject.message = "User disabled successfully!";
        auth.traceUserActivity(req, responseObject, "Delete");
        res.json(responseObject);
    } catch (err) {
        logger.error("disableUser : ", err);
        responseError(res, responseObject, "Unable to disable user");
    }
};