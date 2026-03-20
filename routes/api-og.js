// routes/api-og.js
// GET /api/og?level=B1&score=15&total=25
// Returns a 1200×630 PNG image for social media previews.

const express = require('express');
const router = express.Router();
const { generateOGImage } = require('../lib/og-generator');

const VALID_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);

// In-memory LRU-style cache (level+score+total → Buffer)
// Keyed as "A1:7:25" — only ~15 unique combinations exist for a 25-question test
const cache = new Map();
const CACHE_MAX = 200;

router.get('/', async (req, res) => {
  try {
    const level = String(req.query.level || '').toUpperCase();
    const score = parseInt(req.query.score, 10);
    const total = parseInt(req.query.total || '25', 10);

    // ── Validation ──
    if (!VALID_LEVELS.has(level)) {
      return res.status(400).send('Invalid level. Use A1, A2, B1, B2, or C1.');
    }
    if (!Number.isFinite(score) || score < 0 || score > total) {
      return res.status(400).send('Invalid score.');
    }
    if (!Number.isFinite(total) || total < 1 || total > 200) {
      return res.status(400).send('Invalid total.');
    }

    const cacheKey = `${level}:${score}:${total}`;

    // ── Cache hit ──
    if (cache.has(cacheKey)) {
      const buf = cache.get(cacheKey);
      return sendImage(res, buf);
    }

    // ── Generate ──
    const buf = await generateOGImage(level, score, total);

    // Evict oldest if over limit
    if (cache.size >= CACHE_MAX) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, buf);

    sendImage(res, buf);
  } catch (err) {
    console.error('[GET /api/og]', err);
    res.status(500).send('Image generation failed.');
  }
});

function sendImage(res, buf) {
  res.set({
    'Content-Type': 'image/png',
    'Content-Length': buf.length,
    // Cache for 30 days in CDN / 1 day in browser
    'Cache-Control': 'public, max-age=86400, s-maxage=2592000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(buf);
}

module.exports = router;