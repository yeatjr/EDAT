/* ── dashboard.js ── */

document.addEventListener('DOMContentLoaded', () => {
  initSliders();
  initToggles();
  initCameraGrid();
  initCharts();
  initHeatmaps();
  initTransactionFeed();
  initKpiTickers();
  initAlertFeed();
});

/* ── Sliders ── */
function initSliders() {
  const defs = [
    { id: 'slider-base',   valId: 'val-base',   fmt: v => `${parseFloat(v).toFixed(2)}` },
    { id: 'slider-carbon', valId: 'val-carbon',  fmt: v => `×${parseFloat(v).toFixed(2)}` },
    { id: 'slider-speed',  valId: 'val-speed',   fmt: v => `×${parseFloat(v).toFixed(2)}` },
  ];
  defs.forEach(d => {
    const slider = document.getElementById(d.id);
    const valEl  = document.getElementById(d.valId);
    if (!slider || !valEl) return;
    const update = () => { valEl.textContent = d.fmt(slider.value); };
    slider.addEventListener('input', update);
    update();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    document.getElementById('slider-base').value   = 2.0;
    document.getElementById('slider-carbon').value = 1.0;
    document.getElementById('slider-speed').value  = 1.0;
    defs.forEach(d => {
      const slider = document.getElementById(d.id);
      const valEl  = document.getElementById(d.valId);
      if (slider && valEl) valEl.textContent = d.fmt(slider.value);
    });
  });

  document.getElementById('btn-apply')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-apply');
    btn.textContent = '✓ Applied!';
    btn.style.background = 'var(--green)';
    setTimeout(() => {
      btn.textContent = '✓ Apply Changes';
      btn.style.background = '';
    }, 2000);
  });
}

/* ── Toggles ── */
function initToggles() {
  document.querySelectorAll('.toggle').forEach(tog => {
    tog.addEventListener('click', () => {
      const active = tog.dataset.active === 'true';
      tog.dataset.active = (!active).toString();
      tog.classList.toggle('active', !active);
    });
  });
}

/* ── Camera Grid ── */
const CAMERAS = [
  { id: 'CAM-01A', label: 'E1 Northbound KM42', active: true  },
  { id: 'CAM-02B', label: 'E1 Southbound KM42', active: true  },
  { id: 'CAM-03A', label: 'KL-Seremban KM12',   active: true  },
  { id: 'CAM-04B', label: 'KL-Seremban KM12B',  active: true, lowConf: true },
  { id: 'CAM-05A', label: 'Sg Buloh Toll Gate',  active: true  },
  { id: 'CAM-07A', label: 'Penang Bridge North', active: false },
];

const VEHICLE_TYPES = ['EV Sedan', 'Petrol Car', 'Diesel SUV', 'Motorcycle', 'Hybrid', 'Truck'];
const COLORS = { 'EV Sedan':'var(--green)', 'Petrol Car':'var(--amber)', 'Diesel SUV':'var(--orange)', 'Motorcycle':'var(--blue)', 'Hybrid':'#00ffcc', 'Truck':'var(--red)' };

function randBbox() {
  return {
    x: 10 + Math.random() * 50,
    y: 20 + Math.random() * 40,
    w: 20 + Math.random() * 25,
    h: 15 + Math.random() * 20,
    vtype: VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)],
  };
}

function initCameraGrid() {
  const grid = document.getElementById('cam-grid');
  if (!grid) return;

  CAMERAS.forEach(cam => {
    const div = document.createElement('div');
    div.className = 'cam-feed' + (cam.active ? '' : ' offline');
    div.id = `feed-${cam.id}`;

    const boxes = [randBbox(), randBbox()];
    const bboxHtml = boxes.map(b => {
      const color = COLORS[b.vtype] || 'var(--green)';
      return `<div class="mini-bbox" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;border-color:${color};"></div>`;
    }).join('');

    const scanClass = cam.lowConf ? 'warn' : (cam.active ? 'active' : 'offline');
    const tollAmt = 'RM ' + (0.6 + Math.random() * 8).toFixed(2);

    div.innerHTML = `
      <div class="cam-feed-bg" style="background:linear-gradient(160deg,#0a1a14,#0d1a28,#0a1515);">
        ${cam.active ? bboxHtml : '<span>⚠ OFFLINE</span>'}
      </div>
      <div class="cam-feed-overlay"></div>
      <div class="cam-feed-badge"><span class="status-dot ${scanClass}"></span></div>
      <div class="cam-feed-label">
        <span class="cam-id">${cam.id}</span>
        ${cam.active ? `<span class="cam-toll">${tollAmt}</span>` : ''}
      </div>
    `;
    grid.appendChild(div);
  });

  // Animate toll prices
  setInterval(() => {
    document.querySelectorAll('.cam-toll').forEach(el => {
      el.textContent = 'RM ' + (0.6 + Math.random() * 8).toFixed(2);
    });
  }, 2400);
}

/* ── Charts (Chart.js) ── */
function makeGradient(ctx, color1, color2) {
  const g = ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, color1);
  g.addColorStop(1, color2);
  return g;
}

function generateHours(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - 1 - i) * 5 * 60 * 1000);
    return d.toTimeString().slice(0, 5);
  });
}

function initCharts() {
  const chartOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b8a9a', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b8a9a', font: { size: 10 } } },
    },
  };

  const labels = generateHours(24);

  // Revenue chart
  const revCtx = document.getElementById('chart-revenue');
  if (revCtx) {
    const ctx = revCtx.getContext('2d');
    const grad = makeGradient(ctx, 'rgba(0,255,136,0.3)', 'rgba(0,255,136,0)');
    const revData = Array.from({ length: 24 }, (_, i) => 40000 + Math.sin(i * 0.5) * 15000 + Math.random() * 8000);
    window.revChart = new Chart(revCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data: revData, borderColor: '#00ff88', backgroundColor: grad, borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4 }],
      },
      options: { ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: v => 'RM ' + (v/1000).toFixed(0) + 'K' } } } },
    });
    setInterval(() => {
      window.revChart.data.datasets[0].data.push(40000 + Math.random() * 20000);
      window.revChart.data.datasets[0].data.shift();
      window.revChart.data.labels.push(new Date().toTimeString().slice(0,5));
      window.revChart.data.labels.shift();
      window.revChart.update('none');
    }, 3000);
  }

  // Emission chart
  const emiCtx = document.getElementById('chart-emission');
  if (emiCtx) {
    const ctx = emiCtx.getContext('2d');
    const grad = makeGradient(ctx, 'rgba(245,158,11,0.25)', 'rgba(245,158,11,0)');
    const emiData = Array.from({ length: 24 }, () => 0.2 + Math.random() * 0.5);
    window.emiChart = new Chart(emiCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data: emiData, borderColor: '#f59e0b', backgroundColor: grad, borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4 }],
      },
      options: chartOpts,
    });
    setInterval(() => {
      window.emiChart.data.datasets[0].data.push(0.2 + Math.random() * 0.5);
      window.emiChart.data.datasets[0].data.shift();
      window.emiChart.update('none');
    }, 3000);
  }

  // Time btn
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* ── Heatmaps ── */
function drawHeatmap(canvasId, points, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a1520');
  bg.addColorStop(1, '#0d1a14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Road lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  [0.33, 0.66].forEach(x => {
    ctx.beginPath(); ctx.moveTo(W * x, 0); ctx.lineTo(W * x, H); ctx.stroke();
  });

  // Heat blobs
  points.forEach(p => {
    const x = p.x * W, y = p.y * H, r = p.r * Math.min(W, H);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.5, colors[1]);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  });

  // Grid overlay
  ctx.strokeStyle = 'rgba(0,180,255,0.05)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(W * i / 5, 0); ctx.lineTo(W * i / 5, H); ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4); ctx.stroke();
  }
}

function initHeatmaps() {
  const trafficPts = [
    { x:0.2, y:0.3, r:0.2 }, { x:0.5, y:0.6, r:0.15 }, { x:0.8, y:0.2, r:0.18 },
    { x:0.35, y:0.8, r:0.12 }, { x:0.7, y:0.5, r:0.22 },
  ];
  const emissionPts = [
    { x:0.3, y:0.4, r:0.22 }, { x:0.6, y:0.2, r:0.18 }, { x:0.75, y:0.7, r:0.16 },
  ];

  drawHeatmap('heatmap-traffic',  trafficPts,  ['rgba(255,107,53,0.7)', 'rgba(245,158,11,0.3)']);
  drawHeatmap('heatmap-emission', emissionPts, ['rgba(239,68,68,0.8)',   'rgba(245,158,11,0.3)']);

  setInterval(() => {
    trafficPts.forEach(p => {
      p.x += (Math.random() - 0.5) * 0.05;
      p.y += (Math.random() - 0.5) * 0.05;
      p.x = Math.max(0.05, Math.min(0.95, p.x));
      p.y = Math.max(0.05, Math.min(0.95, p.y));
    });
    drawHeatmap('heatmap-traffic',  trafficPts,  ['rgba(255,107,53,0.7)', 'rgba(245,158,11,0.3)']);
  }, 2000);
}

/* ── Transaction Feed ── */
const VEH_CLASSES = [
  { name:'EV Sedan',    color:'var(--green)',  minPrice:0.60, maxPrice:1.80, emMin:0.05, emMax:0.2  },
  { name:'Petrol Car',  color:'var(--amber)',  minPrice:2.40, maxPrice:4.20, emMin:0.4,  emMax:0.7  },
  { name:'Diesel SUV',  color:'var(--orange)', minPrice:4.80, maxPrice:8.00, emMin:0.7,  emMax:1.2  },
  { name:'Motorcycle',  color:'var(--blue)',   minPrice:0.60, maxPrice:1.20, emMin:0.1,  emMax:0.3  },
  { name:'Hybrid',      color:'#00ffcc',       minPrice:1.20, maxPrice:2.80, emMin:0.15, emMax:0.4  },
  { name:'Truck',       color:'var(--red)',    minPrice:6.00, maxPrice:12.0, emMin:1.0,  emMax:2.0  },
];

function randHex(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random()*16).toString(16).toUpperCase()).join('');
}

function makeTransaction() {
  const v = VEH_CLASSES[Math.floor(Math.random() * VEH_CLASSES.length)];
  const conf = 82 + Math.random() * 18;
  const price = v.minPrice + Math.random() * (v.maxPrice - v.minPrice);
  const emission = v.emMin + Math.random() * (v.emMax - v.emMin);
  const speed = 0.8 + Math.random() * 0.6;
  const now = new Date();
  return { hash:'SHA#'+randHex(4), cls:v, conf, price, emission, speed, time:now.toTimeString().slice(0,8) };
}

function initTransactionFeed() {
  const tbody = document.getElementById('txn-body');
  if (!tbody) return;

  // Initial rows
  for (let i = 0; i < 8; i++) {
    const txn = makeTransaction();
    tbody.appendChild(makeRow(txn, false));
  }

  // New rows
  setInterval(() => {
    const txn = makeTransaction();
    const row = makeRow(txn, true);
    tbody.insertBefore(row, tbody.firstChild);
    if (tbody.children.length > 20) tbody.removeChild(tbody.lastChild);

    // KPI counter update
    const kpiV = document.getElementById('kpi-vehicles');
    if (kpiV) {
      let n = parseInt(kpiV.textContent.replace(/,/g, '')) + 1;
      kpiV.textContent = n.toLocaleString();
    }
  }, 2200);
}

function makeRow(txn, isNew) {
  const tr = document.createElement('tr');
  if (isNew) tr.className = 'new-row';
  const confClass = txn.conf >= 85 ? 'conf-high' : 'conf-low';
  tr.innerHTML = `
    <td class="hash">${txn.hash}</td>
    <td style="color:${txn.cls.color};font-weight:600;">${txn.cls.name}</td>
    <td class="${confClass}">${txn.conf.toFixed(1)}%</td>
    <td style="color:var(--amber);">${txn.emission.toFixed(3)}</td>
    <td>×${txn.speed.toFixed(2)}</td>
    <td class="toll">RM ${txn.price.toFixed(2)}</td>
    <td class="mono" style="font-size:0.75rem;color:var(--text-dim);">${txn.time}</td>
    <td><span class="badge ${txn.conf>=85?'badge-green':'badge-amber'}">${txn.conf>=85?'OK':'Fallback'}</span></td>
  `;
  return tr;
}

/* ── KPI Tickers ── */
function initKpiTickers() {
  // Revenue
  const revEl = document.getElementById('kpi-revenue');
  let rev = 1_840_200;
  if (revEl) setInterval(() => {
    rev += Math.random() * 20 + 5;
    revEl.textContent = 'RM ' + (rev / 1_000_000).toFixed(3) + 'M';
  }, 1500);

  // Emission Index
  const emiEl = document.getElementById('kpi-emission');
  if (emiEl) setInterval(() => {
    emiEl.textContent = (0.38 + Math.random() * 0.08).toFixed(2);
  }, 3500);

  // Confidence
  const confEl = document.getElementById('kpi-confidence');
  if (confEl) setInterval(() => {
    confEl.textContent = (96 + Math.random() * 3).toFixed(1) + '%';
  }, 4000);

  // EV share
  const evEl = document.getElementById('kpi-ev');
  if (evEl) setInterval(() => {
    evEl.textContent = (33 + Math.random() * 3).toFixed(1) + '%';
  }, 5000);
}

/* ── Alert Feed ── */
const ALERTS = [
  { type:'warn',  icon:'⚠️', title:'Low Confidence — Cam 4B', msg:'Confidence dropped to 79%. Fallback pricing active.', time:'17:12' },
  { type:'info',  icon:'🌿', title:'Emission Spike — KL-Seremban', msg:'Emission index 1.24 detected. Hotspot flagged.', time:'17:09' },
  { type:'error', icon:'🔴', title:'Camera Offline — Cam 7A', msg:'Connection lost. Maintenance dispatched.', time:'17:05' },
  { type:'info',  icon:'⚡', title:'EV Surge Detected', msg:'34% EV ratio — green discount batch applied.', time:'17:02' },
];

function initAlertFeed() {
  const feed = document.getElementById('alert-feed');
  if (!feed) return;
  ALERTS.forEach(a => {
    const div = document.createElement('div');
    div.className = `alert-item ${a.type}`;
    div.innerHTML = `
      <span class="alert-icon">${a.icon}</span>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-msg">${a.msg}</div>
      </div>
      <span class="alert-time">${a.time}</span>
    `;
    feed.appendChild(div);
  });
}
