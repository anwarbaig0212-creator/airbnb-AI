// routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");

// Render Signup Form
router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

// Signup Logic
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const newUser = new User({ email, username, role });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to StayAI!");
      res.redirect("/listings");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});

// Render Login Form
router.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

// Login Logic
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Welcome back to StayAI!");
    res.redirect("/listings");
  }
);

// Logout Logic
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You are logged out!");
    res.redirect("/listings");
  });
});

module.exports = router;