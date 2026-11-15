const mongoose = require("mongoose");
const Listing = require("./models/listing");
const Review = require("./models/review");
const Booking = require("./models/booking");

// Checks if the user is authenticated
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // Only remember GET pages; redirecting back to a POST/DELETE URL would 404
    if (req.method === "GET") req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to perform this action!");
    return res.redirect("/login");
  }
  next();
};

// Saves redirectUrl to res.locals
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// Only allows users with the "host" role
module.exports.isHost = (req, res, next) => {
  if (!req.user) {
    req.flash("error", "You must be logged in first.");
    return res.redirect("/login");
  }
  if (req.user.role !== "host") {
    req.flash("error", "Only users with a Host account can create or manage listings!");
    return res.redirect("/listings");
  }
  next();
};

// Checks if the logged-in user is the owner of the listing
module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You do not have permission to edit or delete this listing!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

//File to protect your routes and check if the user is the author of a review
module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }
  const review = await Review.findById(reviewId);

  if (!review) { 
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }

  if (!review.author || !review.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to delete this review!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};
//checks whether the logged-in user is the guest who owns a particular booking.
//  It prevents another user from viewing or modifying that booking through a protected route
module.exports.isBookingGuest = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings");
  }
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings");
  }
  if (!booking.guest.equals(req.user._id)) {
    req.flash("error", "You are not allowed to do that");
    return res.redirect("/bookings");
  }
  next();
};

// Same as isLoggedIn, but for fetch()/JSON endpoints: answers 401 JSON instead of redirecting to /login
module.exports.apiAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Please log in to use this feature." });
  }
  next();
};
