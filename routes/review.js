const express = require("express");
// mergeParams: true ensures we can access :id from router.use("/:id/reviews", reviewRoutes)
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Review = require("../models/review");
const { isLoggedIn, isReviewAuthor } = require("../middleware");

// 1. CREATE REVIEW ROUTE (POST /listings/:id/reviews)
router.post("/", isLoggedIn, async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = mongoose.Types.ObjectId.isValid(id) ? await Listing.findById(id) : null;
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    const { rating, comment } = req.body.review || {};
    const newReview = new Review({ rating: Number(rating), comment });
    newReview.author = req.user._id;

    try {
      await newReview.save(); // runs schema validation (rating 1-5, comment required)
    } catch (validationError) {
      if (validationError.name === "ValidationError") {
        req.flash("error", "Please choose a rating (1–5) and write a comment.");
        return res.redirect(`/listings/${id}`);
      }
      throw validationError;
    }
    listing.reviews.push(newReview);
    await listing.save();

    req.flash("success", "New Review Added!");
    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    next(err);
  }
});

// 2. DELETE REVIEW ROUTE (DELETE /listings/:id/reviews/:reviewId)
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
