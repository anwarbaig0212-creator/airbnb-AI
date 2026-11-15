require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodoverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user");
const userRoutes = require("./routes/user");
const listingRoutes = require("./routes/listing");
const reviewRoutes = require("./routes/review");
const bookingRoutes = require("./routes/booking");
const aiRoutes = require("./ai_routes/ai");
const ExpressError = require("./utils/ExpressError");




// Used by every view: returns the listing's image URL, or a local placeholder if it is missing/invalid
app.locals.imageFor = (listing) =>
  listing && listing.image && /^https?:\/\//i.test(listing.image.url || "") ? listing.image.url : "/img/placeholder.svg";
app.locals.inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// ---------- 1. View engine & static & body parsing ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodoverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ---------- 2. Session & Flash ----------
// Put SESSION_SECRET in your .env for real use; the fallback is only for local development
if (!process.env.SESSION_SECRET) {
  console.warn("Warning: SESSION_SECRET is not set in .env - using an insecure development secret.");
}
const sessionOption = {
  secret: process.env.SESSION_SECRET || "stayai_super_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax", // browser won't send the cookie on cross-site POSTs (basic CSRF protection)
  },
};
app.use(session(sessionOption));
app.use(flash());

// ---------- 3. Passport init + strategy ----------
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ---------- 4. Locals middleware ----------
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ---------- 5. Routes ----------
app.use("/", userRoutes);            // /signup, /login, /logout
app.use("/listings", listingRoutes); // everything /listings/* — including "/"
app.use("/bookings", bookingRoutes);
app.use("/ai", aiRoutes);

// root -> the listings page is our home page
app.get("/", (req, res) => res.redirect("/listings"));

// Unknown URL -> 404 page
app.use((req, res, next) => next(new ExpressError("Page not found", 404)));

// ---------- 6. Error handler (MUST be last, MUST have 4 args) ----------
app.use((err, req, res, next) => {
  console.error(err);
  // JSON clients (the AI assistant) should get JSON, not an HTML page
  if (req.originalUrl.startsWith("/ai/")) {
    return res.status(err.statusCode || 500).json({ error: "Something went wrong. Please try again." });
  }
  if (err.name === "CastError") {
    req.flash("error", "Invalid ID");
    return res.redirect("/listings");
  }
  const status = err.statusCode || err.status || 500;
  res.status(status).render("error", { status, message: status === 404 ? err.message : "Something went wrong on our side." });
});

// ---------- 7. DB + server ----------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/wanderlust");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Only start the DB + server when run directly (`node app.js`); tests can require("./app") safely
if (require.main === module) {
  connectDB();
  app.listen(process.env.PORT || 3000, () => {
    console.log("Server is running on port " + (process.env.PORT || 3000));
  });
}

module.exports = app;
