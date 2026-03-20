// server.js — AlmancaPratik Result Share Server
require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');

const app      = express();
const PORT     = process.env.PORT || 3001;
const BASE_URL = (process.env.BASE_URL || 'https://almancapratik.com').replace(/\/$/, '');

// ── 1. CORS — her middleware'den önce, manuel ─────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── 2. Güvenlik & Body parser ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '50kb' }));

// ── 3. Rate limiting ──────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

// ── 4. Store (dosya tabanlı) ──────────────────────────────────────────────
const STORE_PATH = path.join(__dirname, 'data', 'results.json');

function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, '{}', 'utf8');
}

function readStore() {
  try { ensureStore(); return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return {}; }
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data), 'utf8');
}

function makeId(len) {
  len = len || 14;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── 5. OG Image (saf SVG — sharp/PNG gerektirmez) ────────────────────────
const LEVEL_COLORS = { A1:'#22c55e', A2:'#4ade80', B1:'#60c8f0', B2:'#818cf8', C1:'#c9a84c' };
const LEVEL_NAMES  = { A1:'Başlangıç', A2:'Temel', B1:'Orta', B2:'Üst Orta', C1:'İleri' };
const MOTIVATIONAL = {
  A1:'Almancaya ilk adımını attın!',
  A2:'Temel iletişimi kurabiliyorsun!',
  B1:'Günlük hayatta Almancayı kullanabiliyorsun!',
  B2:'Karmaşık konularda iletişim kurabiliyorsun!',
  C1:'Almancayı akıcı kullanıyorsun – tebrikler!',
};

function buildOGSvg(level, score, total) {
  const color = LEVEL_COLORS[level] || '#c9a84c';
  const name  = (LEVEL_NAMES[level] || '').toUpperCase();
  const mot   = MOTIVATIONAL[level] || '';
  const pct   = Math.round((score / total) * 100);
  const barW  = Math.round((score / total) * 680);

  return '<?xml version="1.0" encoding="UTF-8"?>' +
'<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">' +
'<defs>' +
'<linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">' +
'<stop offset="0%" stop-color="#08080c"/><stop offset="100%" stop-color="#0d0d18"/>' +
'</linearGradient>' +
'<radialGradient id="glow" cx="40%" cy="50%" r="45%">' +
'<stop offset="0%" stop-color="' + color + '" stop-opacity="0.1"/>' +
'<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
'</radialGradient>' +
'</defs>' +
'<rect width="1200" height="630" fill="url(#bg)"/>' +
'<ellipse cx="480" cy="315" rx="400" ry="320" fill="url(#glow)"/>' +
'<rect x="0" y="0" width="1200" height="4" fill="' + color + '" opacity="0.7"/>' +
'<rect x="48" y="44" width="36" height="36" rx="9" fill="' + color + '"/>' +
'<text x="66" y="68" font-family="Arial Black,Arial" font-size="20" font-weight="900" fill="#070709" text-anchor="middle">A</text>' +
'<text x="96" y="68" font-family="Arial,Helvetica" font-size="14" font-weight="700" fill="rgba(240,238,232,0.55)" dominant-baseline="middle">AlmancaPratik</text>' +
'<line x1="800" y1="80" x2="800" y2="550" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>' +
'<rect x="840" y="190" width="300" height="250" rx="18" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>' +
'<text x="990" y="255" font-family="Arial,Helvetica" font-size="13" fill="rgba(240,238,232,0.35)" text-anchor="middle" letter-spacing="3">SEN DE DENE</text>' +
'<text x="990" y="295" font-family="Arial Black,Arial" font-size="24" font-weight="900" fill="rgba(240,238,232,0.85)" text-anchor="middle">Almanca</text>' +
'<text x="990" y="330" font-family="Arial Black,Arial" font-size="24" font-weight="900" fill="rgba(240,238,232,0.85)" text-anchor="middle">Seviyeni</text>' +
'<text x="990" y="365" font-family="Arial Black,Arial" font-size="24" font-weight="900" fill="' + color + '" text-anchor="middle">Kesfet!</text>' +
'<rect x="870" y="385" width="240" height="40" rx="10" fill="' + color + '" opacity="0.9"/>' +
'<text x="990" y="410" font-family="Arial,Helvetica" font-size="15" font-weight="700" fill="#070709" text-anchor="middle">almancapratik.com</text>' +
'<rect x="80" y="105" width="220" height="85" rx="14" fill="' + color + '18" stroke="' + color + '" stroke-width="1.5" stroke-opacity="0.35"/>' +
'<text x="190" y="165" font-family="Arial Black,Arial" font-size="56" font-weight="900" fill="' + color + '" text-anchor="middle">' + level + '</text>' +
'<text x="80" y="222" font-family="Arial,Helvetica" font-size="15" font-weight="600" fill="rgba(240,238,232,0.38)" letter-spacing="4">' + name + ' SEVIYESI</text>' +
'<text x="80" y="358" font-family="Arial Black,Arial" font-size="132" font-weight="900" fill="' + color + '">' + score + '</text>' +
'<text x="' + (score >= 10 ? 275 : 182) + '" y="335" font-family="Arial,Helvetica" font-size="38" fill="rgba(240,238,232,0.2)">/' + total + '</text>' +
'<text x="80" y="383" font-family="Arial,Helvetica" font-size="15" fill="rgba(240,238,232,0.32)">dogru cevap</text>' +
'<rect x="80" y="418" width="680" height="8" rx="4" fill="rgba(255,255,255,0.06)"/>' +
'<rect x="80" y="418" width="' + barW + '" height="8" rx="4" fill="' + color + '"/>' +
'<text x="80" y="444" font-family="Arial,Helvetica" font-size="13" fill="rgba(240,238,232,0.28)">%' + pct + ' basari</text>' +
'<text x="80" y="505" font-family="Arial,Helvetica" font-size="17" fill="rgba(240,238,232,0.5)">' + mot + '</text>' +
'<line x1="80" y1="558" x2="760" y2="558" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>' +
'<text x="80" y="582" font-family="Arial,Helvetica" font-size="12" font-weight="600" fill="rgba(240,238,232,0.16)" letter-spacing="2">ALMANCAPRATIK.COM</text>' +
'</svg>';
}

// ── 6. Routes ─────────────────────────────────────────────────────────────

app.get('/health', function(_req, res) {
  res.json({ status: 'ok', ts: Date.now() });
});

app.get('/api/og', function(req, res) {
  try {
    var VALID  = ['A1','A2','B1','B2','C1'];
    var level  = String(req.query.level || 'B1').toUpperCase();
    var score  = parseInt(req.query.score, 10) || 0;
    var total  = parseInt(req.query.total, 10) || 25;
    var safeL  = VALID.includes(level) ? level : 'B1';
    var safeS  = Math.max(0, Math.min(score, total));
    var svg    = buildOGSvg(safeL, safeS, total);
    res.set({ 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
    res.send(svg);
  } catch(err) {
    console.error('[/api/og]', err);
    res.status(500).send('Image error');
  }
});

app.post('/api/results', function(req, res) {
  try {
    var body  = req.body;
    var score = body.score;
    var level = body.level;
    var total = body.total;
    var wrongs = body.wrongs;
    var VALID = ['A1','A2','B1','B2','C1'];
    var NAMES = { A1:'Baslangic', A2:'Temel', B1:'Orta', B2:'Ust Orta', C1:'Ileri' };

    if (typeof score !== 'number') return res.status(400).json({ error: 'score gerekli' });
    if (!VALID.includes(level))    return res.status(400).json({ error: 'level gecersiz' });
    if (typeof total !== 'number') return res.status(400).json({ error: 'total gerekli' });

    var id    = makeId(14);
    var store = readStore();
    store[id] = {
      score: score,
      level: level,
      levelName: NAMES[level],
      total: total,
      wrongs: Array.isArray(wrongs) ? wrongs.slice(0, 50) : [],
      createdAt: Date.now(),
    };
    writeStore(store);

    res.status(201).json({ id: id, shareUrl: BASE_URL + '/result/' + id });
  } catch(err) {
    console.error('[POST /api/results]', err);
    res.status(500).json({ error: 'Kayit hatasi' });
  }
});

app.get('/api/results/:id', function(req, res) {
  try {
    var store  = readStore();
    var result = store[req.params.id];
    if (!result) return res.status(404).json({ error: 'Bulunamadi' });
    var pub = Object.assign({}, result);
    delete pub.wrongs;
    res.json(pub);
  } catch(err) {
    res.status(500).json({ error: 'Hata' });
  }
});

app.get('/result/:id', function(req, res) {
  try {
    var store  = readStore();
    var result = store[req.params.id];
    if (!result) return res.status(404).set('Content-Type','text/html').send(render404());

    var tmplPath = path.join(__dirname, 'templates', 'result.html');
    if (!fs.existsSync(tmplPath)) return res.status(500).send('Template bulunamadi');

    var tmpl = fs.readFileSync(tmplPath, 'utf8');
    res.set('Content-Type', 'text/html; charset=utf-8').send(renderPage(tmpl, result, req.params.id));
  } catch(err) {
    console.error('[/result/:id]', err);
    res.status(500).send('Sunucu hatasi');
  }
});

// ── 7. Başlat ─────────────────────────────────────────────────────────────
ensureStore();
app.listen(PORT, function() {
  console.log('Server calisiyor port: ' + PORT);
  console.log('BASE_URL: ' + BASE_URL);
});

// ── SSR Helpers ───────────────────────────────────────────────────────────
var LEVEL_DIST = { A1:14, A2:24, B1:31, B2:21, C1:10 };

function renderPage(tmpl, result, id) {
  var level    = result.level;
  var levelName = result.levelName;
  var score    = result.score;
  var total    = result.total;
  var createdAt = result.createdAt;
  var pct      = Math.round((score / total) * 100);
  var ogImage  = BASE_URL + '/api/og?level=' + level + '&score=' + score + '&total=' + total;
  var pageUrl  = BASE_URL + '/result/' + id;
  var testUrl  = BASE_URL + '/seviyeler/seviyetespit/';
  var levelPct = LEVEL_DIST[level] || 0;
  var MOTS     = { A1:'Almancaya ilk adimini attin \uD83C\uDF31', A2:'Temel iletisimi kurabiliyorsun \uD83D\uDCD7', B1:'Gunluk hayatta Almancayi kullanabiliyorsun \uD83D\uDCD8', B2:'Karmasik konularda iletisim kurabiliyorsun \uD83D\uDCD9', C1:'Almancayi akici kullaniyorsun \uD83C\uDFC6' };
  var mot      = MOTS[level] || '';
  var shareText = encodeURIComponent('Almanca seviye testinde ' + score + '/' + total + ' puan aldim, seviyem ' + level + '! Sen de dene');
  var dateStr  = new Date(createdAt || Date.now()).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });

  return tmpl
    .replace(/\{\{BASE_URL\}\}/g,     BASE_URL)
    .replace(/\{\{PAGE_URL\}\}/g,     pageUrl)
    .replace(/\{\{TEST_URL\}\}/g,     testUrl)
    .replace(/\{\{OG_IMAGE\}\}/g,     ogImage)
    .replace(/\{\{LEVEL\}\}/g,        esc(level))
    .replace(/\{\{LEVEL_NAME\}\}/g,   esc(levelName))
    .replace(/\{\{SCORE\}\}/g,        score)
    .replace(/\{\{TOTAL\}\}/g,        total)
    .replace(/\{\{PCT\}\}/g,          pct)
    .replace(/\{\{LEVEL_PCT\}\}/g,    levelPct)
    .replace(/\{\{MOTIVATIONAL\}\}/g, esc(mot))
    .replace(/\{\{SHARE_TEXT\}\}/g,   shareText)
    .replace(/\{\{DATE\}\}/g,         dateStr)
    .replace(/\{\{ID\}\}/g,           id);
}

function render404() {
  return '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Bulunamadi</title>' +
'<style>body{background:#070709;color:#f0eee8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}' +
'h1{font-size:64px;opacity:.15;margin-bottom:12px}p{opacity:.5;margin-bottom:24px}' +
'a{padding:12px 28px;background:#c9a84c;color:#070709;border-radius:10px;text-decoration:none;font-weight:700}</style>' +
'</head><body><div><h1>404</h1><p>Bu sonuc bulunamadi.</p><a href="/seviyeler/seviyetespit/">Testi Coz</a></div></body></html>';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

module.exports = app;