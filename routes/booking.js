const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const wrapAsync = require("../utils/wrapAsync");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { isLoggedIn, isBookingGuest } = require("../middleware");

const MAX_NIGHTS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Strictly parses "YYYY-MM-DD" (what <input type="date"> sends) as a UTC date, or returns null
function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + "T00:00:00.000Z");
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

// true when another confirmed booking already covers any night in [checkIn, checkOut)
async function hasOverlap(listingId, checkIn, checkOut) {
  const existing = await Booking.findOne({
    listing: listingId,
    status: "confirmed",
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
  return Boolean(existing);
}

/* ---------- CREATE booking: POST /listings/:id/bookings (mounted from routes/listing.js) ---------- */
async function createBooking(req, res) {
  const { id } = req.params;
  const back = `/listings/${id}`;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  if (listing.owner && listing.owner.equals(req.user._id)) {
    req.flash("error", "You cannot book your own listing");
    return res.redirect(back);
  }

  const { checkIn, checkOut, guests } = req.body.booking || {};
  const inDate = parseDate(checkIn);
  const outDate = parseDate(checkOut);
  const guestCount = Number(guests);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  if (!inDate || !outDate || outDate <= inDate || inDate < today) {
    req.flash("error", "Please choose valid dates (check-in today or later, check-out after check-in).");
    return res.redirect(back);
  }
  const nights = Math.round((outDate - inDate) / DAY_MS);
  if (nights > MAX_NIGHTS) {
    req.flash("error", `You can book at most ${MAX_NIGHTS} nights at a time.`);
    return res.redirect(back);
  }
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > (listing.guests || 1)) {
    req.flash("error", `This listing allows 1–${listing.guests} guests`);
    return res.redirect(back);
  }
  if (await hasOverlap(id, inDate, outDate)) {
    req.flash("error", "Those dates are already booked. Please pick different dates.");
    return res.redirect(back);
  }

  const totalPrice = nights * listing.price;
  await Booking.create({
    listing: listing._id,
    guest: req.user._id,
    checkIn: inDate,
    checkOut: outDate,
    guests: guestCount,
    totalPrice,
    status: "confirmed",
  });

  req.flash("success", `Booking confirmed! ${nights} night${nights > 1 ? "s" : ""} · ₹${totalPrice.toLocaleString("en-IN")}`);
  res.redirect("/bookings");
}

/* ---------- LIST my bookings (My Trips) ---------- */
router.get(
  "/",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const bookings = await Booking.find({ guest: req.user._id }).populate("listing").sort({ checkIn: 1 });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const upcoming = bookings.filter((b) => b.status === "confirmed" && b.checkOut > today);
    const past = bookings.filter((b) => b.status === "confirmed" && b.checkOut <= today);
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    res.render("bookings/index", { upcoming, past, cancelled });
  })
);

/* ---------- CANCEL (soft delete) ---------- */
router.delete(
  "/:id",
  isLoggedIn,
  isBookingGuest,
  wrapAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (booking.status === "cancelled") {
      req.flash("error", "This booking is already cancelled");
    } else if (booking.checkOut <= new Date()) {
      req.flash("error", "Past trips cannot be cancelled");
    } else {
      booking.status = "cancelled";
      await booking.save();
      req.flash("success", "Booking cancelled");
    }
    res.redirect("/bookings");
  })
);

module.exports = router;
module.exports.createBooking = wrapAsync(createBooking);
