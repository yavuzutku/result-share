// routes/api-results.js
// POST /api/results  → save result, return shareUrl
// GET  /api/results/:id → return result JSON (no wrongs exposed)

const express = require('express');
const router = express.Router();
const { createResult, getResult } = require('../lib/store');

const VALID_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);

const LEVEL_NAMES = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Üst Orta',
  C1: 'İleri',
};

// ── POST /api/results ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { score, level, total, wrongs } = req.body;

    // ── Validation ──
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return res.status(400).json({ error: '`score` must be a number.' });
    }
    if (!level || !VALID_LEVELS.has(level)) {
      return res.status(400).json({ error: '`level` must be A1–C1.' });
    }
    if (typeof total !== 'number' || total < 1 || total > 200) {
      return res.status(400).json({ error: '`total` must be a number 1–200.' });
    }
    if (score < 0 || score > total) {
      return res.status(400).json({ error: '`score` out of range.' });
    }

    const id = await createResult({
      score,
      level,
      levelName: LEVEL_NAMES[level],
      total,
      wrongs: Array.isArray(wrongs) ? wrongs : [],
    });

    res.status(201).json({
      id,
      shareUrl: `${process.env.BASE_URL}/result/${id}`,
    });
  } catch (err) {
    console.error('[POST /api/results]', err);
    res.status(500).json({ error: 'Could not save result.' });
  }
});

// ── GET /api/results/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await getResult(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });

    // Strip internal wrongs array from public response
    const { wrongs, ...publicData } = result;
    res.json(publicData);
  } catch (err) {
    console.error('[GET /api/results/:id]', err);
    res.status(500).json({ error: 'Internal error.' });
  }
});

module.exports = router;