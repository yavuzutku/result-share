// server.js — AlmancaPratik Result Share Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const resultsRouter = require('./routes/api-results');
const ogRouter = require('./routes/api-og');
const { getResult, getLevelPercentage } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = (process.env.BASE_URL || 'https://almancapratik.com').replace(/\/$/, '');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

// ── Security & middleware ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // result pages load external fonts
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // OG images served to crawlers
}));

app.use(cors({
  origin: function (origin, callback) {
    // Origin yoksa (curl, Postman, server-to-server) geçir
    if (!origin) return callback(null, true);
    const allowed = (process.env.ALLOWED_ORIGINS || '*');
    if (allowed === '*' || allowed.split(',').map(s => s.trim()).includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: not allowed → ' + origin));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200   // IE11 için
}));

app.use(express.json({ limit: '50kb' }));

// ── Rate limiting ──────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests – please slow down.' },
});

const ogLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max: 60,              // 60 OG images/min per IP
  message: 'Rate limited.',
});

const resultPageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/results', apiLimiter, resultsRouter);
app.use('/api/og', ogLimiter, ogRouter);

// ── Result page (SSR for OG meta tags) ────────────────────────────────────
app.get('/result/:id', resultPageLimiter, async (req, res) => {
  try {
    const result = await getResult(req.params.id);
    if (!result) {
      return res.status(404).set('Content-Type', 'text/html').send(render404());
    }
    const html = renderResultPage(result, req.params.id, BASE_URL);
    res
      .set('Content-Type', 'text/html; charset=utf-8')
      .set('Cache-Control', 'public, max-age=300') // 5-min cache
      .send(html);
  } catch (err) {
    console.error('[/result/:id]', err);
    res.status(500).send('Server error.');
  }
});

// ── Static files (result-client.js, result.css, etc.) ─────────────────────
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  AlmancaPratik result-share server → http://localhost:${PORT}`);
  console.log(`📦  Base URL: ${BASE_URL}`);
});

// ══════════════════════════════════════════════════════════════════════════════
//  SSR helpers
// ══════════════════════════════════════════════════════════════════════════════

const RESULT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, 'templates', 'result.html'),
  'utf8'
);

function renderResultPage(result, id, baseUrl) {
  const { level, levelName, score, total, createdAt } = result;
  const pct = Math.round((score / total) * 100);
  const ogImage = `${baseUrl}/api/og?level=${encodeURIComponent(level)}&score=${encodeURIComponent(score)}&total=${encodeURIComponent(total)}`;
  const pageUrl = `${baseUrl}/result/${id}`;
  const testUrl = `${baseUrl}/seviyeler/seviyetespit/`;
  const levelPct = getLevelPercentage(level);

  const motivational = {
    A1: 'Almancaya ilk adımını attın – harika bir başlangıç! 🌱',
    A2: 'Temel iletişimi başarıyla kurabiliyorsun! 📗',
    B1: 'Günlük hayatta Almancayı rahatça kullanabiliyorsun! 📘',
    B2: 'Karmaşık konularda iletişim kurabiliyorsun – muhteşem! 📙',
    C1: 'Almancayı akıcı ve etkin kullanıyorsun – tebrikler! 🏆',
  }[level] || 'Harika bir test sonucu!';

  const shareText = encodeURIComponent(
    `Almanca seviye testinde ${score}/${total} puan aldım ve ${level} (${levelName}) seviyesindeyim! Sen de dene 👇`
  );
  const dateStr = new Date(createdAt || Date.now()).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return RESULT_TEMPLATE
    .replace(/\{\{BASE_URL\}\}/g, baseUrl)
    .replace(/\{\{PAGE_URL\}\}/g, pageUrl)
    .replace(/\{\{TEST_URL\}\}/g, testUrl)
    .replace(/\{\{OG_IMAGE\}\}/g, ogImage)
    .replace(/\{\{LEVEL\}\}/g, esc(level))
    .replace(/\{\{LEVEL_NAME\}\}/g, esc(levelName))
    .replace(/\{\{SCORE\}\}/g, score)
    .replace(/\{\{TOTAL\}\}/g, total)
    .replace(/\{\{PCT\}\}/g, pct)
    .replace(/\{\{LEVEL_PCT\}\}/g, levelPct)
    .replace(/\{\{MOTIVATIONAL\}\}/g, esc(motivational))
    .replace(/\{\{SHARE_TEXT\}\}/g, shareText)
    .replace(/\{\{DATE\}\}/g, dateStr)
    .replace(/\{\{ID\}\}/g, id);
}

function render404() {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Sonuç Bulunamadı – AlmancaPratik</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{background:#070709;color:#f0eee8;font-family:sans-serif;min-height:100vh;
display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;}
h1{font-size:72px;color:rgba(240,238,232,0.12);margin-bottom:12px;}
p{color:rgba(240,238,232,0.5);margin-bottom:24px;font-size:16px;}
a{display:inline-block;padding:12px 28px;background:#c9a84c;color:#070709;
border-radius:10px;text-decoration:none;font-weight:700;}</style>
</head><body>
<div><h1>404</h1><p>Bu test sonucu bulunamadı veya süresi dolmuş olabilir.</p>
<a href="/seviyeler/seviyetespit/">Testi Yeniden Çöz</a></div>
</body></html>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = app; // for testing