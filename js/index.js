/* ── index.js — Homepage JS ── */

document.addEventListener('DOMContentLoaded', () => {
  initRevenueTicker();
  initCamClock();
  initHashDemo();
  initLiveMetrics();
});

/* Live Revenue Ticker */
function initRevenueTicker() {
  const el = document.getElementById('rev-counter');
  if (!el) return;
  let value = 1_840_200;
  const fmt = v => 'RM ' + (v >= 1_000_000 ? (v / 1_000_000).toFixed(3) + 'M' : (v / 1000).toFixed(2) + 'K');
  el.textContent = fmt(value);
  setInterval(() => {
    value += Math.random() * 18 + 4;
    el.textContent = fmt(value);
  }, 1300);
}

/* Camera clock */
function initCamClock() {
  const el = document.getElementById('cam-time');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = d.toTimeString().slice(0, 8);
  };
  tick();
  setInterval(tick, 1000);
}

/* SHA-256 Hash Demo */
const SAMPLE_PLATES = [
  'WXY 1234', 'BKL 5678', 'PJB 9012', 'VBN 3456',
  'KLC 7890', 'SGP 2468', 'JHR 1357', 'PNG 8024',
];

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function initHashDemo() {
  const rawEl    = document.getElementById('raw-plate');
  const hashEl   = document.getElementById('hashed-plate');
  const rehashBtn= document.getElementById('rehash-btn');
  if (!rawEl || !hashEl) return;

  let idx = 0;
  const update = async () => {
    const plate = SAMPLE_PLATES[idx % SAMPLE_PLATES.length];
    idx++;
    
    // Display raw plate
    rawEl.textContent = plate;
    
    hashEl.textContent = 'Computing...';
    hashEl.style.color = 'var(--text-muted)';
    
    // Calculate hash using the salt to match edat-core.js
    const hash = await sha256(plate + "EDAT_SECURE_SALT_2026");
    hashEl.textContent = hash.substring(0, 16) + '...';
    hashEl.style.color = 'var(--green)';
  };

  await update();
  setInterval(update, 5000);
  rehashBtn?.addEventListener('click', update);
}

/* Live metric flickers */
function initLiveMetrics() {
  const confEl = document.getElementById('live-conf');
  const emiEl  = document.getElementById('live-emi');
  if (!confEl || !emiEl) return;

  setInterval(() => {
    confEl.textContent = (94 + Math.random() * 5).toFixed(1) + '%';
    emiEl.textContent  = (0.3 + Math.random() * 0.25).toFixed(2);
  }, 2800);
}
