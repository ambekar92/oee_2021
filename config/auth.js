var jwt = require('jsonwebtoken');
//var redisClient = require('config/redis.js');
const config = require('config/config');
var userImpl = require('services/db/userImpl.js');
var userImplObj = new userImpl();
const log = require('config/logger');

var responseError = require('routes/errorHandler.js');

var responseObject = {
    status: true,
    responseCode: 200,
    data: {},

};

/*
    This method accepts a payload and generates a JWT with configured timeout
*/

function generateToken(payload) {
    var sessionTimeout = config.jwt.sessionTimeout;
    console.log("payload--", payload);
    console.log(typeof(config.jwt.secretKey));
    var token = jwt.sign(payload, config.jwt.secretKey, {
        expiresIn: config.jwt.tokenTimeout
    });
    //redisClient.set(payload.nxfID, token);
    //redisClient.expire(payload.nxfID, sessionTimeout);
    return token;
}

/*
    This method is used for Authenticating User Active Session.
    The checks for valid JSON Web Token in Header for every HTTP request and also checks redis for active user session.
*/
function authenticate(req, res, next) {
    console.log(req.headers['authorization']);
    var token = req.headers['authorization'].split(' ')[1];

    if (!token) {
        authError(res);
    } else {
        try {

            jwt.verify(token, config.jwt.secretKey, function(verifyErr, payload) {
                console.log("payload-------", payload);
                if (!verifyErr) {
                    // redisClient.exists(payload.nxfID, function(sessionError, reply) {
                    //  if (reply) {
                    console.log("reply---", reply);
                    req.user = payload;
                    next();
                    // } else {
                    // authError(res);
                    // }
                    // });
                } else {
                    authError(res);
                }
            });

        } catch (error) {
            console.log(error);
        }

    }
}

function verifyRole(req, res, next) {
    console.log("in auth--", req.body);
    if (req.body.role == 'Guest') {
        prohibitError(res);
    } else {
        next();
    }
}

function prohibitError(res) {
    responseObject.responseCode = 402;
    responseError(res, responseObject, "You do not have permission to perform this action");
}


async function traceUserActivity(req, res, action) {
    // console.log("In trace--", req);
    let User;
    let userObj = {
        api: req.url,
        action: action,
        userId: null,
        userEmail: null,
        userRole: null,
        request: req.body,
        response: res
    }
    try {
        // get user details in database
        if (req.url == "/login") {
            User = await userImplObj.getUserByEmail(req.body.email);
        } else {
            User = await userImplObj.getUserByEmail(req.user.email);

        }
        console.log("user--", User);
        userObj.userId = User._id;
        userObj.userEmail = User.mail;
        userObj.userRole = User.role;
        console.log(userObj);
        await userImplObj.insertActivity(userObj);

    } catch (err) {
        log("traceUserActivity : ", err);

    }
}
/*
    This method is used for handling Authentication Error
*/
function authError(res) {
    responseObject.responseCode = 403;
    responseError(res, responseObject, "Session Timeout")
        // res.status(401).send({ status: false, message: 'You do not have permission to perform this action - Session timeout ' });
}

var auth = {
    authenticate: authenticate,
    generateToken: generateToken,
    traceUserActivity: traceUserActivity,
    verifyRole: verifyRole
}

module.exports = auth;