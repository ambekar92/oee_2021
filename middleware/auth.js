module.exports = {
  ensureAuth: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect("/");
    }
  },
  ensureGuest: function (req, res, next) {
    if (req.isAuthenticated()) {
      //res.redirect("/home");
      let responseObject = {
        home: "Go to Home page middleware",
        data: req.user,
      };
      res.json(responseObject);
    } else {
      return next();
    }
  },
};
