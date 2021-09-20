var router = require("express").Router();
let { ensureAuth, ensureGuest } = require("../middleware/auth");

var user = require("routes/controller/user");
var userObj = new user();

// export the routes to our application
module.exports = {
  router: router,
};

// render angular application
router.get("/", function (req, res) {
  //ensureGuest,
  res.render("login");
});

router.get("/home", function (req, res) {
  //ensureAuth,
  console.log("Check-->", req.user);
  let responseObject = { home: "Go to Home page router", data: req.user };

  //   res.render("home", {
  //     name: req.user.displayName,
  //   });
  res.json(responseObject);
});

//logout user
router.get("/logout", (req, res) => {
  req.logOut();
  res.redirect("/");
});

/* User APIs */
router.post("/api/login", userObj.login);

router.post("/api/addUser", userObj.addUser);

router.get("/api/getUsers", userObj.getUsers);

router.post("/api/disableUser", userObj.disableUser);

router.post("/api/assignRole", userObj.assignRole);

router.post("/logout", userObj.logout);
