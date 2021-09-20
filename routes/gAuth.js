const express = require("express");
var router = require("express").Router();
var passport = require("passport");

module.exports = {
  router: router,
};

//google auth
router.get("/google", passport.authenticate("google", { scope: ["profile"] }));

//google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    //res.redirect("/home");
    let responseObject = { home: "Go to Home page gAuth", data: req.user };
    res.json(responseObject);
  }
);
