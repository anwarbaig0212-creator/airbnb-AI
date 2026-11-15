// Tiny in-memory rate limiter (no extra npm package needed).
// Good enough for a single-server student project; use Redis-backed limits if you ever scale out.
module.exports = function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // key -> { count, resetAt }

  // Clean up expired entries so the Map cannot grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.user ? `u:${req.user._id}` : `ip:${req.ip}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        error: message || "Too many requests. Please wait a moment and try again.",
      });
    }
    next();
  };
};
