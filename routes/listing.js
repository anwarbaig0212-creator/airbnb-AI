const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isOwner } = require("../middleware");

// ══════════════════════════════════════════════
// INDEX — all listings
// ══════════════════════════════════════════════
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const all_listing = await Listing.find({});
    res.render("listings/index.ejs", { all_listing });
  })
);

// ══════════════════════════════════════════════
// NEW — form
// ══════════════════════════════════════════════
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

// ══════════════════════════════════════════════
// CREATE
// ══════════════════════════════════════════════
router.post(
  "/",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    console.log("=== POST /listings ===");
    console.log("req.user._id      :", req.user ? req.user._id : "NO USER");

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    console.log("after assign owner:", newListing.owner);

    await newListing.save();
    console.log("saved owner       :", newListing.owner);

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  })
);

// ══════════════════════════════════════════════
// SHOW
// ══════════════════════════════════════════════
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

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    res.render("listings/show", { listing });
  })
);

// ══════════════════════════════════════════════
// EDIT — form
// ══════════════════════════════════════════════
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { listing });
  })
);

// ══════════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════════
router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  })
);

// ══════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════
router.delete(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  })
);

module.exports = router;