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

// ---------- 1. View engine & static & body parsing ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodoverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ---------- 2. Session & Flash ----------
const sessionOption = {
  secret: "stayai_super_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
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

// root
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ---------- 6. Error handler (MUST be last, MUST have 4 args) ----------
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "CastError") {
    req.flash("error", "Invalid ID");
    return res.redirect("/listings");
  }
  res.status(err.status || 500).render("error", { err });
});

// ---------- 7. DB + server ----------
async function connectDB() {
  try {
    await mongoose.connect("mongodb://localhost:27017/wanderlust");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
connectDB();

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});