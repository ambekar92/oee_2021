var router = require("express").Router();
//let { ensureAuth, ensureGuest } = require("../middleware/auth");
var auth = require('../config/auth');
var user = require("routes/controller/user");
var userObj = new user();


// export the routes to our application
module.exports = {
    router: router,
};

// Render UI application
router.get("/", function(req, res) {
    //ensureGuest,
    res.render("login");
});

router.get("/home", function(req, res) {
    let responseObject = { home: "Go to Home page router" };
    //   res.render("home", {
    //     name: req.user.displayName,
    //   });
    res.json(responseObject);
});

//logout user
// router.get("/logout", (req, res) => {
//     req.logOut();
//     res.redirect("/");
// });

/* User APIs */
//auth.authenticate,
router.post("/api/addGoogleUser", userObj.addGoogleUser);

router.post("/api/login", userObj.login);

router.post("/api/addNewUser", userObj.addNormalUser);

router.get("/api/getUsers", auth.authenticate, userObj.getUsers);

router.get("/api/logout", auth.authenticate, userObj.logout);