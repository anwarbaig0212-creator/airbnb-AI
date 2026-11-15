const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isHost, isOwner } = require("../middleware");
const reviewRoutes = require("./review");
const { createBooking } = require("./booking");

router.use("/:id/reviews", reviewRoutes);

// Fields a host is allowed to set from a form. Anything else (owner, reviews...) is ignored.
const EDITABLE_FIELDS = [
  "title", "description", "location", "country", "price",
  "guests", "bedrooms", "beds", "bathrooms", "propertyType",
];

// "WiFi, Pool ,AC" -> ["WiFi", "Pool", "AC"]  (forms send one comma-separated string)
const toList = (v) =>
  (Array.isArray(v) ? v : String(v || "").split(","))
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 20);

// Builds a clean object from req.body.listing (whitelist + array parsing + image default)
function cleanListingInput(body = {}) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (body.amenities !== undefined) data.amenities = toList(body.amenities);
  if (body.nearbyAttractions !== undefined) data.nearbyAttractions = toList(body.nearbyAttractions);
  if (body.tags !== undefined) data.tags = toList(body.tags).map((t) => t.toLowerCase());

  // Only accept http(s) image URLs; an empty box means "use the schema default image"
  const url = body.image && typeof body.image.url === "string" ? body.image.url.trim() : "";
  if (/^https?:\/\//i.test(url)) data.image = { url, filename: "listingimage" };
  return data;
}

// Turns Mongoose validation errors into one readable flash message
function validationMessage(err) {
  return Object.values(err.errors || {}).map((e) => e.message).join(". ") || err.message;
}

// INDEX — all listings (public)
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const all_listing = await Listing.find({}).sort({ createdAt: -1 });
    res.render("listings/index.ejs", { all_listing });
  })
);

// NEW — form (logged in + host only)
router.get("/new", isLoggedIn, isHost, (req, res) => {
  res.render("listings/new.ejs");
});

// CREATE (logged in + host only)
router.post(
  "/",
  isLoggedIn,
  isHost,
  wrapAsync(async (req, res) => {
    const newListing = new Listing(cleanListingInput(req.body.listing));
    newListing.owner = req.user._id;
    try {
      await newListing.save();
    } catch (err) {
      if (err.name !== "ValidationError") throw err;
      req.flash("error", validationMessage(err));
      return res.redirect("/listings/new");
    }
    req.flash("success", "New Listing Created!");
    res.redirect(`/listings/${newListing._id}`);
  })
);

// SHOW (public)
router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    const listing = await Listing.findById(id)
      .populate("owner")
      .populate({ path: "reviews", populate: { path: "author" } });

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    res.render("listings/show", { listing });
  })
);

// EDIT — form (logged in + owner)
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    res.render("listings/edit.ejs", { listing });
  })
);

// UPDATE (logged in + owner)
router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    try {
      await Listing.findByIdAndUpdate(id, cleanListingInput(req.body.listing), { runValidators: true });
    } catch (err) {
      if (err.name !== "ValidationError") throw err;
      req.flash("error", validationMessage(err));
      return res.redirect(`/listings/${id}/edit`);
    }
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  })
);

// DELETE (logged in + owner)
router.delete(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  })
);

// BOOK a listing — the logic lives in routes/booking.js so it exists in only one place
router.post("/:id/bookings", isLoggedIn, createBooking);

module.exports = router;
