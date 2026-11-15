// Test harness: mounts the REAL routers/views with fake auth and stubbed DB models.
// (No MongoDB is needed.) Run with: node --test tests/
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const ejsMate = require("ejs-mate");
const methodoverride = require("method-override");
const mongoose = require("mongoose");

const ExpressError = require("../utils/ExpressError");
const listingRoutes = require("../routes/listing");
const bookingRoutes = require("../routes/booking");
const aiRoutes = require("../ai_routes/ai");

const state = { user: null };
const oid = () => new mongoose.Types.ObjectId();

function buildApp() {
  const app = express();
  app.locals.imageFor = (l) => (l && l.image && /^https?:\/\//i.test(l.image.url || "") ? l.image.url : "/img/placeholder.svg");
  app.locals.inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.engine("ejs", ejsMate);
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodoverride("_method"));
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(session({ secret: "t", resave: false, saveUninitialized: false }));
  app.use(flash());
  app.use((req, res, next) => {
    req.user = state.user;
    req.isAuthenticated = () => Boolean(state.user);
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
  });
  app.use("/listings", listingRoutes);
  app.use("/bookings", bookingRoutes);
  app.use("/ai", aiRoutes);
  app.use((req, res, next) => next(new ExpressError("Page not found", 404)));
  app.use((err, req, res, next) => {
    if (req.originalUrl.startsWith("/ai/")) return res.status(err.statusCode || 500).json({ error: "Something went wrong. Please try again." });
    const status = err.statusCode || 500;
    res.status(status).render("error", { status, message: err.message });
  });
  return app;
}

async function start() {
  const server = buildApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => server.close() };
}

module.exports = { state, oid, start };
