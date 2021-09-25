var mongoDb = new (require("config/mongodb"))();

var userImpl = function () {};

let pswd;
let addUser = false;

module.exports = userImpl;

/***** User Impl *****/

// Get user details
userImpl.prototype.getUser = function (query) {
  var User = mongoDb.getCollection("user");
  //console.log("CHeck --> ", User);
  return new Promise((resolve, reject) => {
    User.findOne(query, function (findOneUserErr, findOneUserResult) {
      if (!findOneUserErr) {
        resolve(findOneUserResult);
      } else {
        reject(findOneUserErr);
      }
    });
  });
};

/*This method inserts new record in User collection with the provided details.*/
userImpl.prototype.insertUser = function (query) {
  var User = mongoDb.getCollection("user");

  return new Promise((resolve, reject) => {
    User.insertOne(query, function (insertUserErr, insertUserResult) {
      if (!insertUserErr) {
        resolve(insertUserResult);
      } else {
        reject(insertUserErr);
      }
    });
  });
};

/*    This method fetches all records from User collection.*/
userImpl.prototype.getUsers = function (query) {
  var User = mongoDb.getCollection("user");
  return new Promise((resolve, reject) => {
    User.find(query).toArray(function (getTpErr, getTpResult) {
      if (!getTpErr) {
        resolve(getTpResult);
      } else {
        reject(getTpErr);
      }
    });
  });
};

userImpl.prototype.login = function (usr) {
  pswd = usr.password;
  var user = mongoDb.getCollection("user");

  return new Promise((resolve, reject) => {
    user
      .find({ nxfID: usr.nxfID })
      .toArray(async function (findUsererr, findUserResult) {
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
            resolve(findUserResult[0]);
          }
        } else {
          reject(findUsererr);
          console.log("error");
        }
      });
  });
};

userImpl.prototype.logout = function (user) {
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
