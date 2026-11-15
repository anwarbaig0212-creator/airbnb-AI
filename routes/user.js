// routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware");

// Render Signup Form
router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

// Signup Logic
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (typeof password !== "string" || password.length < 6) {
      req.flash("error", "Password must be at least 6 characters.");
      return res.redirect("/signup");
    }
    // Only these two roles can be chosen at signup
    const safeRole = role === "host" ? "host" : "guest";
    const newUser = new User({ email, username, role: safeRole });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to StayAI!");
      res.redirect("/listings");
    });
  } catch (e) {
    // Friendlier message for a duplicate email (Mongo duplicate key error)
    const message = e.code === 11000 ? "That email or username is already registered." : e.message;
    req.flash("error", message);
    res.redirect("/signup");
  }
});

// Render Login Form
router.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

// Login Logic — saveRedirectUrl copies the "page you wanted" out of the session before passport renews it
router.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Welcome back to StayAI!");
    res.redirect(res.locals.redirectUrl || "/listings");
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
