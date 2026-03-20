// lib/og-generator.js
// Generates a 1200×630 PNG Open Graph image using SVG + sharp.
// No external services or paid APIs required.

const sharp = require('sharp');

// ── Constants ──────────────────────────────────────────────────────────────
const W = 1200;
const H = 630;

const LEVEL_COLORS = {
  A1: '#22c55e',
  A2: '#4ade80',
  B1: '#60c8f0',
  B2: '#818cf8',
  C1: '#c9a84c',
};

const LEVEL_NAMES = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Üst Orta',
  C1: 'İleri',
};

// ── Grid lines (pre-computed for performance) ─────────────────────────────
function buildGrid() {
  const lines = [];
  for (let x = 52; x < W; x += 52) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
  }
  for (let y = 52; y < H; y += 52) {
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
  }
  return `<g stroke="rgba(255,255,255,0.022)" stroke-width="1">${lines.join('')}</g>`;
}

const GRID = buildGrid(); // build once at module load

// ── SVG builder ────────────────────────────────────────────────────────────
function buildSVG(level, score, total) {
  const color = LEVEL_COLORS[level] || '#c9a84c';
  const levelName = LEVEL_NAMES[level] || '';
  const pct = Math.round((score / total) * 100);
  const barFill = Math.max(0, Math.min(600, Math.round((score / total) * 600)));
  const s = parseInt(score, 10);
  const t = parseInt(total, 10);

  // Glow colour with alpha
  const glowColor = color + '14'; // ~8% opacity

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
<defs>
  <!-- Background gradient -->
  <linearGradient id="bgGrad" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
    <stop offset="0%"   stop-color="#08080c"/>
    <stop offset="45%"  stop-color="#0d0d18"/>
    <stop offset="100%" stop-color="#08080c"/>
  </linearGradient>

  <!-- Level glow -->
  <radialGradient id="glow" cx="50%" cy="45%" r="45%">
    <stop offset="0%"   stop-color="${color}" stop-opacity="0.09"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </radialGradient>

  <!-- Badge gradient -->
  <linearGradient id="badgeGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="${color}" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0.07"/>
  </linearGradient>

  <!-- Progress bar gradient -->
  <linearGradient id="barGrad" x1="0" y1="0" x2="${barFill}" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0%"   stop-color="${color}" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="${color}"/>
  </linearGradient>

  <!-- Clip for bar -->
  <clipPath id="barClip">
    <rect x="300" y="432" width="${barFill}" height="8" rx="4"/>
  </clipPath>
</defs>

<!-- ── Background ── -->
<rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
${GRID}

<!-- ── Glow orb ── -->
<ellipse cx="600" cy="280" rx="360" ry="300" fill="url(#glow)"/>

<!-- ── Top accent stripe ── -->
<rect x="0" y="0" width="${W}" height="3"
      fill="${color}" opacity="0.55"/>

<!-- ── Logo block (top-left) ── -->
<rect x="48" y="46" width="34" height="34" rx="8"
      fill="${color}" opacity="0.9"/>
<text x="65" y="69"
      font-family="Arial Black, Arial, sans-serif"
      font-size="18" font-weight="900" fill="#070709"
      text-anchor="middle">A</text>
<text x="100" y="70"
      font-family="Arial, Helvetica, sans-serif"
      font-size="14" font-weight="700" fill="rgba(240,238,232,0.6)"
      dominant-baseline="middle">AlmancaPratik</text>

<!-- ── SHARE CARD (right column) ── -->
<!-- Decorative vertical line -->
<line x1="820" y1="80" x2="820" y2="550"
      stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

<!-- Right: call-to-action pill -->
<rect x="860" y="200" width="280" height="230" rx="18"
      fill="rgba(255,255,255,0.025)"
      stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
<text x="1000" y="258"
      font-family="Arial, Helvetica, sans-serif"
      font-size="13" fill="rgba(240,238,232,0.35)"
      text-anchor="middle" letter-spacing="3">SEN DE DENE</text>
<text x="1000" y="295"
      font-family="Arial Black, Arial, sans-serif"
      font-size="22" font-weight="900" fill="rgba(240,238,232,0.85)"
      text-anchor="middle">Almanca</text>
<text x="1000" y="325"
      font-family="Arial Black, Arial, sans-serif"
      font-size="22" font-weight="900" fill="rgba(240,238,232,0.85)"
      text-anchor="middle">Seviyeni</text>
<text x="1000" y="355"
      font-family="Arial Black, Arial, sans-serif"
      font-size="22" font-weight="900" fill="${color}"
      text-anchor="middle">Keşfet!</text>
<!-- CTA button mock -->
<rect x="890" y="375" width="220" height="38" rx="10"
      fill="${color}" opacity="0.85"/>
<text x="1000" y="399"
      font-family="Arial, Helvetica, sans-serif"
      font-size="14" font-weight="700" fill="#070709"
      text-anchor="middle">almancapratik.com</text>

<!-- ── Main content (left/center) ── -->

<!-- Level badge -->
<rect x="80" y="110" width="240" height="80" rx="14"
      fill="url(#badgeGrad)"
      stroke="${color}" stroke-width="1.5" stroke-opacity="0.3"/>
<text x="200" y="162"
      font-family="Arial Black, Arial, sans-serif"
      font-size="52" font-weight="900" fill="${color}"
      text-anchor="middle">${level}</text>

<!-- Level name -->
<text x="80" y="222"
      font-family="Arial, Helvetica, sans-serif"
      font-size="16" font-weight="600" fill="rgba(240,238,232,0.4)"
      letter-spacing="4">${levelName.toUpperCase()} SEVİYESİ</text>

<!-- Score number (big) -->
<text x="80" y="355"
      font-family="Arial Black, Arial, sans-serif"
      font-size="130" font-weight="900" fill="${color}"
      dominant-baseline="alphabetic">${s}</text>

<!-- /total -->
<text x="${80 + (s >= 10 ? 195 : 105)}" y="335"
      font-family="Arial, Helvetica, sans-serif"
      font-size="36" font-weight="400" fill="rgba(240,238,232,0.22)"
      dominant-baseline="alphabetic">/${t}</text>

<!-- "doğru cevap" label -->
<text x="80" y="380"
      font-family="Arial, Helvetica, sans-serif"
      font-size="15" fill="rgba(240,238,232,0.35)"
      letter-spacing="1">doğru cevap</text>

<!-- Progress bar track -->
<rect x="80" y="420" width="680" height="8" rx="4"
      fill="rgba(255,255,255,0.06)"/>
<!-- Progress bar fill -->
<rect x="80" y="420" width="${Math.round((barFill / 600) * 680)}" height="8" rx="4"
      fill="${color}"/>

<!-- Pct label -->
<text x="80" y="448"
      font-family="Arial, Helvetica, sans-serif"
      font-size="13" fill="rgba(240,238,232,0.28)">%${pct} başarı</text>

<!-- Tagline / motivational -->
<text x="80" y="510"
      font-family="Arial, Helvetica, sans-serif"
      font-size="17" fill="rgba(240,238,232,0.55)">"${getMotivational(level)}"</text>

<!-- ── Bottom branding ── -->
<line x1="80" y1="560" x2="760" y2="560"
      stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
<text x="80" y="584"
      font-family="Arial, Helvetica, sans-serif"
      font-size="12" font-weight="600"
      fill="rgba(240,238,232,0.18)" letter-spacing="2">ALMANCAPRATIK.COM — ÜCRETSİZ ALMANCA SEVİYE TESTİ</text>
</svg>`;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getMotivational(level) {
  return {
    A1: 'Almancaya ilk adımını attın – harika bir başlangıç!',
    A2: 'Temel iletişimi kurabiliyorsun – devam et!',
    B1: 'Günlük hayatta Almancayı kullanabiliyorsun!',
    B2: 'Karmaşık konularda iletişim kurabiliyorsun – muhteşem!',
    C1: 'Almancayı akıcı ve etkin kullanıyorsun – tebrikler!',
  }[level] || 'Harika bir sonuç!';
}

// ── Main export ─────────────────────────────────────────────────────────────
/**
 * Generate an OG PNG image buffer.
 * @param {string} level  – A1 | A2 | B1 | B2 | C1
 * @param {number} score  – correct answers
 * @param {number} total  – total questions
 * @returns {Promise<Buffer>}
 */
async function generateOGImage(level, score, total) {
  const svg = buildSVG(level, score, total);
  return sharp(Buffer.from(svg, 'utf8'))
    .png({ quality: 90, compressionLevel: 7 })
    .toBuffer();
}

module.exports = { generateOGImage };