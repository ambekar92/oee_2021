var mongoDb = new(require('config/mongodb'));
var ldap = require('ldapjs');
//var redisClient = require('config/redis.js');
const fs = require('fs');

var userImpl = function() {};

let pswd;
let addUser = false;

module.exports = userImpl;


/***** User Impl *****/
/*
    This method inserts new record in User collection with the provided details.
*/
userImpl.prototype.insertUser = function(user) {
    var User = mongodb.db.collection('users');

    return new Promise((resolve, reject) => {
        User.insertOne(user, function(insertUserErr, insertUserResult) {
            if (!insertUserErr) {
                resolve(insertUserResult);
            } else {
                reject(insertUserErr);
            }
        });
    });
};

/*
    This method fetches a record from User collection based on emailId.
*/
userImpl.prototype.getUserByEmail = function(emailId) {
    var User = mongoDb.getCollection('user');

    return new Promise((resolve, reject) => {
        User.findOne({ mail: emailId }, function(findOneUserErr, findOneUserResult) {
            if (!findOneUserErr) {
                resolve(findOneUserResult);
            } else {
                reject(findOneUserErr);
            }
        });
    });
};

/*
    This method fetches all records from User collection.
*/
userImpl.prototype.getUsers = function(query) {

    var totalElements;
    var result;

    var User = mongoDb.getCollection('user');

    return new Promise((resolve, reject) => {
        User.find().skip(query.skip).limit(query.limit).toArray(async function(findOneUserErr, findOneUserResult) {
            if (!findOneUserErr) {
                totalElements = await User.estimatedDocumentCount();
                result = {
                    elements: totalElements,
                    data: findOneUserResult
                }
                console.log('in userImp get Users', result);
                resolve(result);
            } else {
                reject(findOneUserErr);
            }
        });
    });
};

userImpl.prototype.getUsersList = function() {
    var User = mongoDb.getCollection('user');

    return new Promise((resolve, reject) => {
        User.find({}).toArray(function(findOneUserErr, findOneUserResult) {
            if (!findOneUserErr) {
                resolve(findOneUserResult);
            } else {
                reject(findOneUserErr);
            }
        });
    });
};

userImpl.prototype.login = function(usr) {

    pswd = usr.password;
    var user = mongoDb.getCollection('user');

    return new Promise((resolve, reject) => {
        user.find({ nxfID: usr.nxfID }).toArray(async function(findUsererr, findUserResult) {
            if (!findUsererr) {
                console.log(findUserResult);
                console.log(findUserResult.length);
                if (findUserResult.length == 0) {
                    console.log("user not found");
                    reject("User not found. Please ask your administrator to enable");
                } else {
                    if (usr.nxfID == "nxpadmin@nxp.com") {
                        resolve(findUserResult[0]);
                    }
                    // verify ldap
                    // try {
                    //     var res = await verifyLdap(findUserResult[0]);
                    //     res["nxfID"] = res.cn;
                    //     res["role"] = findUserResult[0].role;
                    //     console.log("res--", res);
                    //     resolve(res);
                    // } catch (error) {
                    //     console.log("error", error);
                    //     reject(error);
                    // }

                    // resolve(res);
                    resolve(findUserResult[0]);
                }
            } else {
                reject(findUsererr);
                console.log("error");
            }
        });
    });
};

function verifyLdap(user) {
    let nxfID = user.nxfID;
    let password = pswd;
    let email = user.mail;
    return new Promise((resolve, reject) => {
        var tlsOptions = {
            ca: fs.readFileSync('/opt/nxp-cloudapptool/web-app/tls-ca-bundle.pem'),
            // rejectUnauthorized: false
        };
        var client = ldap.createClient({
            url: ['ldaps://us-ldap.nxp.com:636', 'ldaps://eu-ldap.nxp.com:636', 'ldaps://ap-ldap.nxp.com:636'],
            tlsOptions: tlsOptions

        });
        console.log("user--", user);
        client.bind('cn=srv_wireless_automation, OU=SRV Accounts,OU=Accounts,OU=Service Delivery,DC=WBI,DC=NXP,DC=COM', 'xA$ikRA35s57ppG7XQSl^#R&', function(err) {

            if (err) {
                console.log("Error in connection", err);
            } else {
                console.log("successfull");
                var opts = {
                    filter: `(|(cn=${nxfID})(mail=${email}))`,
                    scope: 'sub',
                    attributes: ['cn', 'objectCategory', 'mail', 'dn', 'objectClass', 'sAMAccountName', 'displayName'],
                    timeLimit: 3,
                };
                let userObject = false;
                client.search('DC=WBI,DC=NXP,DC=COM', opts, function(err, res) {
                    if (err) {
                        console.log("Error in search " + err)
                    } else {
                        res.on('searchEntry', function(entry) {
                            console.log('entry: ', entry);
                            userObject = true;
                            console.log("entry.object.dn", entry.object.dn);
                            if (addUser == true) {
                                resolve(entry.object);
                            } else if (addUser == false) {
                                client.bind(entry.object.dn, password, function(err) {
                                    if (err) {
                                        console.log("invalid credentials");
                                        reject("invalid credentials")
                                    } else {
                                        console.log("success pass");
                                        resolve(entry.object);
                                    }
                                });
                            }

                        });
                        res.on('searchReference', function(referral) {
                            console.log('referral: ' + referral.uris.join());
                        });
                        res.on('error', function(err) {
                            console.error('error: ' + err.message);
                            reject(err.mesage);
                        });
                        res.on('end', function(result) {
                            console.log(userObject);
                            if (userObject == false) {
                                console.log('status: ' + result.status);
                                reject("No user in LDAP");
                            }

                        });
                    }
                });
            }
        });
    })
};

userImpl.prototype.getLdapDetails = function(user) {

    return new Promise(async(resolve, reject) => {

        try {
            addUser = true;
            var res = await verifyLdap(user);
            console.log("res-", res);
            if (res) {
                resolve(res);
            }

        } catch (error) {
            reject(error);
        }


    })
}


userImpl.prototype.insertUser = function(user) {
    console.log(user);
    var User = mongoDb.getCollection('user');

    return new Promise((resolve, reject) => {
        User.insertOne(user, function(insertUserErr, insertUserResult) {
            if (!insertUserErr) {
                resolve(insertUserResult);
            } else {
                reject(insertUserErr);
            }
        });
    });
};

userImpl.prototype.logout = function(user) {
    console.log("logout--", user);
    return new Promise((resolve, reject) => {
        //redisClient.del(`${user.nxfID}`, function(err, res) {
        // if (!err) {
        //     resolve("Logged out", res);
        // } else {
        //     reject("Unable to logout");
        // }
        //});

    });
};

userImpl.prototype.assignRole = function(usr) {
    var user = mongoDb.getCollection('user');
    let filter = {
        "mail": { "$in": usr.mail }
    }
    var update = {
        $set: { "role": usr.role, "assignedBy": usr.assignedBy }
    }
    console.log("usr", usr);
    const options = {
        multi: true
    }
    return new Promise(async(resolve, reject) => {

        let result = await user.updateMany(filter, update, options);
        console.log(result.matchedCount);
        if (result.matchedCount >= 1) {
            resolve("Updated Successfully");
        } else {
            reject("Update failure")
        }
    });
};

userImpl.prototype.disableUser = function(user) {
    var User = mongoDb.getCollection('user');

    return new Promise((resolve, reject) => {
        User.deleteOne({ nxfID: user.nxfID }, function(insertUserErr, insertUserResult) {
            if (!insertUserErr) {
                resolve(insertUserResult);
            } else {
                reject(insertUserErr);
            }
        });
    });
};

userImpl.prototype.insertActivity = function(user) {
    var User = mongoDb.getCollection('user_activity');

    return new Promise((resolve, reject) => {
        User.insertOne(user, function(insertUserErr, insertUserResult) {
            if (!insertUserErr) {
                resolve(insertUserResult);
            } else {
                reject(insertUserErr);
            }
        });
    });

}