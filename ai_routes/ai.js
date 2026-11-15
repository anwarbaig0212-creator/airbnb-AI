// ai_routes/ai.js  (mounted at /ai in app.js)
const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const rateLimit = require("../utils/rateLimit");
const { apiAuth } = require("../middleware");
const Listing = require("../models/listing");
const { generateListingDescription, parseTravelQuery, explainResults } = require("../services/ai");
const {
  validateCriteria, isEmptyCriteria, buildListingQuery, matchPreferences,
} = require("../services/searchCriteria");

// AI calls cost money/quota, so every AI route needs a login AND a per-user rate limit
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const MAX_QUERY_LENGTH = 300;
const MAX_RESULTS = 12;

// Very small guard against the classic "ignore previous instructions" attempts.
// The real protection is that the AI output is whitelisted + validated; this just gives a clear message.
const INJECTION_PATTERN =
  /(ignore|disregard|forget)\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)|system\s+prompt|developer\s+message|reveal\s+(your|the)\s+(prompt|instructions|key)|api[\s_-]?key/i;

// Validates the free-text query. Returns { query } or { error }.
function cleanQuery(raw) {
  if (typeof raw !== "string") return { error: "Please type your travel request." };
  // collapse whitespace and drop control characters
  const query = raw.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
  if (query.length < 5) return { error: "Please describe your trip in a few more words." };
  if (query.length > MAX_QUERY_LENGTH) {
    return { error: `Your request is too long. Please keep it under ${MAX_QUERY_LENGTH} characters.` };
  }
  if (INJECTION_PATTERN.test(query)) {
    return { error: "I can only help with finding stays. Try something like “2-bedroom villa in Goa under ₹5000”." };
  }
  return { query };
}

/* ---------- Listing description generator (existing feature) ---------- */
router.post(
  "/generate-description",
  apiAuth,
  aiLimiter,
  wrapAsync(async (req, res) => {
    const { location, propertyType, bedrooms, amenities, nearbyAttractions, specialFeatures } = req.body || {};

    if (!location || typeof location !== "string" || location.trim().length < 2) {
      return res.status(400).json({ error: "Location is required (min 2 characters)" });
    }

    // Normalize arrays (browser may send strings or arrays), and cap sizes
    const toArr = (v) =>
      (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
        .map((s) => String(s).trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 15);

    try {
      const result = await generateListingDescription({
        location: location.trim().slice(0, 100),
        propertyType: typeof propertyType === "string" ? propertyType.trim().slice(0, 40) : "",
        bedrooms: Number(bedrooms) || null,
        amenities: toArr(amenities),
        nearbyAttractions: toArr(nearbyAttractions),
        specialFeatures: toArr(specialFeatures),
      });
      return res.json({ title: result.title, description: result.description, tags: result.tags });
    } catch (err) {
      console.error("[AI] generate-description failed:", err.message);
      return res.status(502).json({ error: "AI generation failed. Please try again." });
    }
  })
);

/* ---------- Travel assistant, step 1: text -> validated criteria ---------- */
router.post(
  "/assistant/parse",
  apiAuth,
  aiLimiter,
  wrapAsync(async (req, res) => {
    const cleaned = cleanQuery((req.body || {}).query);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });

    try {
      const { criteria: raw } = await parseTravelQuery(cleaned.query);
      const { criteria, notes, conflict } = validateCriteria(raw);
      return res.json({ criteria, notes, conflict });
    } catch (err) {
      console.error("[AI] assistant/parse failed:", err.message);
      return res.status(502).json({ error: "Could not understand the request. Please rephrase." });
    }
  })
);

/* ---------- Travel assistant, full flow: text -> criteria -> DB query -> explanation ---------- */
router.post(
  "/assistant/search",
  apiAuth,
  aiLimiter,
  wrapAsync(async (req, res) => {
    const cleaned = cleanQuery((req.body || {}).query);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const { query } = cleaned;

    // 1. AI extracts criteria (can fail: network, bad JSON...)
    let raw;
    try {
      ({ criteria: raw } = await parseTravelQuery(query));
    } catch (err) {
      console.error("[AI] assistant/search parse failed:", err.message);
      return res.status(502).json({ error: "The AI assistant is unavailable right now. Please try again in a moment." });
    }

    // 2. Backend validates the AI output
    const { criteria, notes, conflict } = validateCriteria(raw);
    if (conflict) return res.json({ criteria, notes, conflict, listings: [], summary: conflict, html: [] });
    if (isEmptyCriteria(criteria)) {
      return res.json({
        criteria, notes, listings: [], html: [],
        summary: "I couldn't find anything to search on. Try mentioning a place, budget, number of guests or bedrooms.",
        needsMoreInfo: true,
      });
    }

    // 3. Backend builds the query and reads the database
    const candidates = await Listing.find(buildListingQuery(criteria)).limit(60).lean();

    // 4. Rank by how many "soft" preferences (peaceful, near beach...) each listing matches
    const ranked = candidates
      .map((l) => ({ listing: l, matched: matchPreferences(l, criteria.preferences) }))
      .sort((a, b) => b.matched.length - a.matched.length || a.listing.price - b.listing.price)
      .slice(0, MAX_RESULTS);

    if (!criteria.location) notes.push("No location was mentioned, so I searched all destinations.");

    // 5a. Nothing found -> explain what could be relaxed (computed by us, not by AI)
    if (ranked.length === 0) {
      const hints = [];
      if (criteria.maxPrice !== null || criteria.minPrice !== null) {
        const n = await Listing.countDocuments(buildListingQuery(criteria, ["price"]));
        if (n > 0) hints.push(`${n} stay${n > 1 ? "s" : ""} match everything except your budget`);
      }
      if (criteria.bedrooms !== null) {
        const n = await Listing.countDocuments(buildListingQuery(criteria, ["bedrooms"]));
        if (n > 0) hints.push(`${n} stay${n > 1 ? "s" : ""} match if you accept fewer bedrooms`);
      }
      const summary = hints.length
        ? `No exact matches. However, ${hints.join(", and ")}.`
        : "No stays matched your request. Try a different location or loosen some requirements.";
      return res.json({ criteria, notes, listings: [], html: [], summary });
    }

    // 5b. AI explains the results; if it fails we still return the listings with a plain summary
    const facts = ranked.map(({ listing: l, matched }) => ({
      title: String(l.title).slice(0, 80),
      location: l.location,
      pricePerNight: l.price,
      propertyType: l.propertyType,
      bedrooms: l.bedrooms,
      guests: l.guests,
      matched,
    }));
    let summary;
    try {
      ({ summary } = await explainResults(query, facts));
    } catch (err) {
      console.error("[AI] explainResults failed:", err.message);
      summary = `I found ${ranked.length} stay${ranked.length > 1 ? "s" : ""} that match your request.`;
    }

    // 6. Render the same card partial the listings page uses (EJS escapes all text for us)
    const html = await Promise.all(
      ranked.map(
        ({ listing, matched }) =>
          new Promise((resolve, reject) =>
            req.app.render("includes/listingCard", { listing, matched }, (err, out) => (err ? reject(err) : resolve(out)))
          )
      )
    );

    res.json({
      criteria,
      notes,
      summary,
      count: ranked.length,
      listings: ranked.map(({ listing: l, matched }) => ({ id: l._id, title: l.title, price: l.price, matched })),
      html,
    });
  })
);

module.exports = router;
