/* ── transparency.js ── */

document.addEventListener('DOMContentLoaded', () => {
  initHashLookup();
  initSampleChips();
});

/* SHA-256 helper */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str.toUpperCase().replace(/\s+/g, ' ').trim()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* Simulated EDAT database */
const VEH_CLASSES = [
  { name:'EV Sedan',    emMin:0.04, emMax:0.18, pMin:0.60, pMax:1.80, cmult:0.2, color:'var(--green)'  },
  { name:'Petrol Car',  emMin:0.38, emMax:0.72, pMin:2.20, pMax:4.50, cmult:1.0, color:'var(--amber)'  },
  { name:'Diesel SUV',  emMin:0.72, emMax:1.30, pMin:4.80, pMax:9.20, cmult:1.8, color:'var(--orange)' },
  { name:'Motorcycle',  emMin:0.10, emMax:0.28, pMin:0.60, pMax:1.20, cmult:0.4, color:'var(--blue)'   },
  { name:'Hybrid',      emMin:0.14, emMax:0.38, pMin:1.20, pMax:2.80, cmult:0.5, color:'#00ffcc'       },
  { name:'Truck',       emMin:1.00, emMax:2.10, pMin:6.00, pMax:12.0, cmult:2.1, color:'var(--red)'    },
];

function seedFromHash(hash) {
  // Deterministic pseudo-random seeded from hash
  let seed = 0;
  for (let i = 0; i < Math.min(hash.length, 8); i++) {
    seed = (seed * 31 + hash.charCodeAt(i)) >>> 0;
  }
  return seed;
}

function seededRandom(seed, min, max) {
  const r = ((seed * 1664525 + 1013904223) >>> 0) / 0xFFFFFFFF;
  return min + r * (max - min);
}

function buildRecord(hash) {
  const seed  = seedFromHash(hash);
  const vIdx  = seed % VEH_CLASSES.length;
  const veh   = VEH_CLASSES[vIdx];
  const r1    = seededRandom(seed, 0, 1);
  const r2    = seededRandom(seed + 1, 0, 1);
  const r3    = seededRandom(seed + 2, 0, 1);

  const conf      = 82 + r2 * 17;
  const emission  = veh.emMin + r1 * (veh.emMax - veh.emMin);
  const speed     = 0.75 + r3 * 0.6;
  const baseRate  = 2.00;
  const toll      = baseRate * (1 + emission * veh.cmult) * speed;
  const tollCapped= Math.max(veh.pMin, Math.min(veh.pMax, toll));

  const now   = new Date();
  const time  = now.toLocaleString('en-GB', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short', year:'numeric' });

  return { hash: 'SHA#' + hash.slice(0,4).toUpperCase(), veh, conf, emission, speed, cmult:veh.cmult, toll:tollCapped, time, fallback: conf < 85 };
}

function buildReasons(rec) {
  const reasons = [];

  // Vehicle class reason
  reasons.push({
    icon: rec.veh.color === 'var(--green)' ? '⚡' : rec.veh.color === 'var(--orange)' ? '🚛' : '🚗',
    text: `Vehicle classified as ${rec.veh.name} (carbon multiplier ×${rec.veh.cmult.toFixed(1)})`,
    impact: `+${((rec.veh.cmult - 0.2) * 100).toFixed(0)}%`,
    impactColor: rec.veh.cmult <= 0.5 ? 'var(--green)' : rec.veh.cmult <= 1.2 ? 'var(--amber)' : 'var(--red)',
  });

  // Emission index reason
  reasons.push({
    icon: '🌿',
    text: `Emission index scored ${rec.emission.toFixed(3)} (${rec.emission < 0.3 ? 'Tier 1 Green' : rec.emission < 0.8 ? 'Tier 2 Standard' : 'Tier 3 High Impact'})`,
    impact: rec.emission < 0.3 ? 'Low' : rec.emission < 0.8 ? 'Medium' : 'High',
    impactColor: rec.emission < 0.3 ? 'var(--green)' : rec.emission < 0.8 ? 'var(--amber)' : 'var(--red)',
  });

  // Speed factor
  reasons.push({
    icon: '⚡',
    text: `Speed factor applied: ×${rec.speed.toFixed(2)} ${rec.speed > 1.1 ? '(above average speed)' : '(normal speed)'}`,
    impact: rec.speed > 1.1 ? '+surcharge' : 'Normal',
    impactColor: rec.speed > 1.1 ? 'var(--amber)' : 'var(--green)',
  });

  if (rec.fallback) {
    reasons.push({
      icon: '⚠️',
      text: `AI confidence below 85% (${rec.conf.toFixed(1)}%) — conservative fallback pricing applied`,
      impact: 'Fallback',
      impactColor: 'var(--amber)',
    });
  }

  return reasons;
}

/* Hash Lookup */
function initHashLookup() {
  const btn    = document.getElementById('btn-lookup');
  const input  = document.getElementById('plate-input');

  // Format input on type
  input?.addEventListener('input', () => {
    const raw = input.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    input.value = raw;
  });

  btn?.addEventListener('click', async () => {
    const plate = input?.value?.trim();
    if (!plate || plate.length < 2) {
      input?.focus();
      input?.classList.add('shake');
      setTimeout(() => input?.classList.remove('shake'), 500);
      return;
    }
    await performLookup(plate);
  });

  input?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') btn?.click();
  });

  document.getElementById('btn-dispute')?.addEventListener('click', () => {
    alert('Dispute form submitted. You will receive a reference number via SMS within 24 hours.\n\nNote: All disputes are handled under the Personal Data Protection Act 2010 using your anonymous hash only.');
  });
}

async function performLookup(plate) {
  const btn      = document.getElementById('btn-lookup');
  const hashPreview = document.getElementById('hash-preview');
  const resultSection = document.getElementById('result-section');
  const placeholder   = document.getElementById('result-placeholder');

  btn.textContent = '⏳ Hashing...';
  btn.disabled = true;

  const hash = await sha256(plate);

  // Show hash preview
  document.getElementById('hp-value').textContent = hash;
  hashPreview.style.display = 'block';

  await new Promise(r => setTimeout(r, 600));
  btn.textContent = '🔍 Check Hash';
  btn.disabled = false;

  const rec = buildRecord(hash);
  populateResult(rec);

  resultSection.style.display = 'block';
  placeholder.style.display   = 'none';
  resultSection.scrollIntoView({ behavior:'smooth', block:'start' });
}

function populateResult(rec) {
  document.getElementById('rc-hash').textContent    = rec.hash;
  document.getElementById('rc-toll').textContent    = `RM ${rec.toll.toFixed(2)}`;
  document.getElementById('rc-vtype').textContent   = rec.veh.name;
  document.getElementById('rc-vtype').style.color   = rec.veh.color;
  document.getElementById('rc-conf').textContent    = rec.conf.toFixed(1) + '%';
  document.getElementById('rc-conf').style.color    = rec.conf >= 85 ? 'var(--green)' : 'var(--amber)';
  document.getElementById('rc-emission').textContent= rec.emission.toFixed(3);
  document.getElementById('rc-speed').textContent   = '×' + rec.speed.toFixed(2);
  document.getElementById('rc-carbon').textContent  = '×' + rec.cmult.toFixed(1);
  document.getElementById('rc-fairness').textContent= rec.fallback ? '⚠️ Fallback Applied' : '✓ None Required';
  document.getElementById('rc-time').textContent    = rec.time;

  // Formula
  document.getElementById('rcb-formula').innerHTML = `
    <span style="color:var(--green)">RM ${rec.toll.toFixed(2)}</span> = 
    RM 2.00 × (1 + ${rec.emission.toFixed(3)} × ${rec.cmult.toFixed(1)}) × ×${rec.speed.toFixed(2)}
    ${rec.fallback ? '<br/>⚠️ Fallback pricing applied (confidence < 85%)' : ''}
  `;

  // Reasons
  const reasonsEl = document.getElementById('rc-reasons');
  reasonsEl.innerHTML = '';
  buildReasons(rec).forEach(r => {
    const div = document.createElement('div');
    div.className = 'reason-tag';
    div.innerHTML = `
      <span class="reason-icon">${r.icon}</span>
      <span class="reason-text">${r.text}</span>
      <span class="reason-impact" style="color:${r.impactColor}">${r.impact}</span>
    `;
    reasonsEl.appendChild(div);
  });
}

/* Sample Chips */
function initSampleChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('plate-input');
      if (input) {
        input.value = chip.dataset.plate;
        document.getElementById('btn-lookup')?.click();
      }
    });
  });
}
