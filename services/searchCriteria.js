// services/searchCriteria.js
// The LLM only *suggests* search criteria. Everything here is plain backend code that
// (1) validates those suggestions against a whitelist and
// (2) builds the MongoDB filter itself. The model never writes or runs a query.

const PROPERTY_TYPES = ["Apartment", "House", "Villa", "Cabin", "Cottage", "Hotel", "Hostel", "Treehouse", "Other"];
const TYPE_ALIASES = { flat: "Apartment", homestay: "House", bungalow: "Villa", chalet: "Cabin" };
const MAX_GUESTS = 20;
const MAX_BEDROOMS = 10;
const MAX_PRICE = 1000000;
// Words that carry no search value once the preference phrase is split into words
const STOP_WORDS = new Set(["a", "an", "the", "near", "nearby", "close", "to", "with", "and", "of", "in", "by", "for", "good", "has", "have"]);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Accepts 4000, "4000", 4000.7 -> 4000. Rejects negatives, NaN, absurd values.
function toInt(value, min, max) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Turns the raw LLM JSON into safe, typed criteria.
 * Returns { criteria, notes, conflict }.
 *  - notes:    friendly messages about values we dropped/ignored
 *  - conflict: a message if the request contradicts itself (we then do not search)
 */
function validateCriteria(raw) {
  const notes = [];
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  const criteria = {
    location: null,
    guests: toInt(src.guests, 1, MAX_GUESTS),
    bedrooms: toInt(src.bedrooms, 0, MAX_BEDROOMS),
    maxPrice: toInt(src.maxPrice, 1, MAX_PRICE),
    minPrice: toInt(src.minPrice, 0, MAX_PRICE),
    propertyType: null,
    preferences: [],
  };

  if (typeof src.location === "string") {
    const loc = src.location.replace(/[^\p{L}\p{N}\s,.'-]/gu, "").trim().slice(0, 60);
    if (loc.length >= 2) criteria.location = loc;
  }

  if (typeof src.propertyType === "string" && src.propertyType.trim()) {
    const key = src.propertyType.trim().toLowerCase();
    const match = PROPERTY_TYPES.find((t) => t.toLowerCase() === key) || TYPE_ALIASES[key];
    if (match) criteria.propertyType = match;
    else notes.push(`Property type "${key.slice(0, 20)}" isn't one we list, so it was ignored.`);
  }

  if (Array.isArray(src.preferences)) {
    criteria.preferences = [
      ...new Set(
        src.preferences
          .filter((p) => typeof p === "string")
          .map((p) => p.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().slice(0, 30))
          .filter((p) => p.length >= 2)
      ),
    ].slice(0, 5);
  }

  let conflict = null;
  if (criteria.minPrice !== null && criteria.maxPrice !== null && criteria.minPrice > criteria.maxPrice) {
    conflict = `Your minimum price (₹${criteria.minPrice}) is higher than your maximum (₹${criteria.maxPrice}). Please adjust your budget.`;
  }
  if (criteria.bedrooms !== null && criteria.guests !== null && criteria.bedrooms > criteria.guests && criteria.bedrooms >= 3) {
    notes.push("You asked for more bedrooms than guests — that's fine, but it may narrow the results.");
  }

  return { criteria, notes, conflict };
}

// True when the request gave us nothing to filter on
function isEmptyCriteria(c) {
  return !c.location && c.guests === null && c.bedrooms === null && c.maxPrice === null &&
    c.minPrice === null && !c.propertyType && c.preferences.length === 0;
}

/**
 * Builds the MongoDB filter from VALIDATED criteria only.
 * Preferences (peaceful, near beach...) are NOT hard filters; they are used for ranking.
 * `skip` lets us re-run the query without one filter to explain empty results.
 */
function buildListingQuery(c, skip = []) {
  const query = {};

  if (c.location) {
    const rx = new RegExp(escapeRegex(c.location), "i");
    query.$or = [{ location: rx }, { country: rx }, { title: rx }];
  }
  if (c.guests !== null) query.guests = { $gte: c.guests };
  if (c.bedrooms !== null && !skip.includes("bedrooms")) query.bedrooms = { $gte: c.bedrooms };
  if (c.propertyType) query.propertyType = c.propertyType;

  if ((c.minPrice !== null || c.maxPrice !== null) && !skip.includes("price")) {
    query.price = {};
    if (c.minPrice !== null) query.price.$gte = c.minPrice;
    if (c.maxPrice !== null) query.price.$lte = c.maxPrice;
  }
  return query;
}

// Which preference words appear in this listing's text? Used to rank and to explain matches.
function matchPreferences(listing, preferences) {
  const text = [
    listing.title, listing.description, listing.location,
    ...(listing.amenities || []), ...(listing.nearbyAttractions || []), ...(listing.tags || []),
  ].join(" ").toLowerCase();

  return preferences.filter((pref) => {
    const words = pref.split(/[\s-]+/).filter((w) => w && !STOP_WORDS.has(w));
    return words.length > 0 && words.every((w) => text.includes(w));
  });
}

module.exports = {
  PROPERTY_TYPES, validateCriteria, isEmptyCriteria, buildListingQuery, matchPreferences, escapeRegex,
};
