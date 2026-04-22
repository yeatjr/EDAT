/* ── account.js ── */

document.addEventListener('DOMContentLoaded', () => {
  seedMockData();
  requireAuth();
  loadUser();
  initSidebarNav();
  initUserDropdown();
  renderOverview();
  renderHistory();
  renderRoutes();
  renderSuggestions();
  initSettings();
  initLogout();
  initExport();
  initRefresh();
});

/* ── Mock Data Seed ── */
function seedMockData() {
  // Seed demo user if none exists
  if (!localStorage.getItem('edat_user')) {
    localStorage.setItem('edat_user', JSON.stringify({
      name: 'Ahmad Faris',
      email: 'ahmad.faris@example.com',
      vehicle: 'Petrol Car',
      plate: 'WXY 1234'
    }));
  }

  // Seed journeys only if none exist
  if (localStorage.getItem('edat_journeys')) return;

  const corridors = [
    { name: 'LDP Highway', dir: 'Kelana Jaya → Damansara' },
    { name: 'PLUS Highway', dir: 'KL → Subang' },
    { name: 'MEX Highway', dir: 'Cheras → City Centre' },
    { name: 'SPRINT Highway', dir: 'Kerinchi → Bangsar' },
    { name: 'KESAS Highway', dir: 'Shah Alam → Klang' },
  ];

  const vehicles = ['Petrol Car', 'Petrol Car', 'Petrol Car', 'EV', 'Motorcycle'];
  const today = new Date();

  // Generate 30 mock journeys over the past 30 days
  const journeys = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const corr = corridors[i % corridors.length];
    const veh  = i < 26 ? 'Petrol Car' : vehicles[i % vehicles.length];
    const isRush = i % 3 !== 0;
    const hour = isRush ? (i % 2 === 0 ? '07' : '17') : '11';
    const min  = String(Math.floor(Math.random() * 59)).padStart(2, '0');
    const emission = veh === 'EV' ? 0.05 + Math.random() * 0.1 : 0.45 + Math.random() * 0.55;
    const baseToll = corr.name === 'PLUS Highway' ? 8.50 :
                     corr.name === 'KESAS Highway' ? 5.20 :
                     corr.name === 'MEX Highway'   ? 1.60 :
                     corr.name === 'SPRINT Highway'? 2.40 : 2.20;
    const toll = baseToll * (isRush ? 1.25 : 0.85) * (1 + Math.random() * 0.1);
    const confidence = 87 + Math.random() * 12;
    const hash = 'EDAT-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    journeys.push({
      date: dateStr,
      time: `${hour}:${min}`,
      corridor: corr.name,
      direction: corr.dir,
      hash,
      vehicle: veh,
      emission: parseFloat(emission.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(1)),
      toll: parseFloat(toll.toFixed(2)),
      isRoutine: i % 5 !== 0
    });
  }

  localStorage.setItem('edat_journeys', JSON.stringify(journeys));
}

/* ── Auth guard ── */
function requireAuth() {
  const u = getUser();
  if (!u) window.location.href = 'login.html';
}

/* ── Data helpers ── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('edat_user')); } catch { return null; }
}
function getJourneys() {
  try { return JSON.parse(localStorage.getItem('edat_journeys')) || []; } catch { return []; }
}

/* ── Load user into UI ── */
function loadUser() {
  const u = getUser();
  if (!u) return;

  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('user-avatar').textContent  = initials;
  document.getElementById('user-name-nav').textContent= u.name.split(' ')[0];
  document.getElementById('ud-name').textContent      = u.name;
  document.getElementById('ud-email').textContent     = u.email;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent  = u.name;
  document.getElementById('sidebar-email').textContent = u.email;
  document.getElementById('welcome-name').textContent  = u.name.split(' ')[0];
  const svEl = document.getElementById('sidebar-vehicle');
  if (svEl) svEl.textContent = vehicleEmoji(u.vehicle) + ' ' + u.vehicle;

  // Settings
  const sn = document.getElementById('set-name'); if (sn) sn.value = u.name;
  const se = document.getElementById('set-email'); if (se) se.value = u.email;
  const sv = document.getElementById('set-vehicle'); if (sv) sv.value = u.vehicle;

  // Quick sidebar stats
  const journeys = getJourneys();
  const thisMonth = journeys.filter(j => j.date.slice(0,7) === new Date().toISOString().slice(0,7));
  const total   = thisMonth.reduce((a,j) => a + j.toll, 0);
  const co2     = thisMonth.reduce((a,j) => a + j.emission * 12, 0);
  const avgConf = thisMonth.length ? thisMonth.reduce((a,j) => a + j.confidence, 0) / thisMonth.length : 0;

  setText('qs-total',    `RM ${total.toFixed(2)}`);
  setText('qs-journeys', thisMonth.length);
  setText('qs-co2',      `${co2.toFixed(1)} kg`);
  setText('qs-conf',     `${avgConf.toFixed(1)}%`);
}

/* ── Sidebar navigation ── */
function initSidebarNav() {
  document.querySelectorAll('.as-nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.dataset.section;
      document.querySelectorAll('.as-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.acc-section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`section-${section}`)?.classList.add('active');
    });
  });

  // Link buttons inside sections
  document.querySelectorAll('.link-btn-navy[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(`.as-nav-item[data-section="${btn.dataset.section}"]`)?.click();
    });
  });

  document.getElementById('aib-action')?.addEventListener('click', () => {
    document.querySelector('.as-nav-item[data-section="suggestions"]')?.click();
  });
}

/* ── User dropdown ── */
function initUserDropdown() {
  const pill     = document.getElementById('user-pill');
  const dropdown = document.getElementById('user-dropdown');
  pill?.addEventListener('click', e => {
    e.stopPropagation();
    dropdown?.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown?.classList.remove('open'));
}

/* ── Logout ── */
function initLogout() {
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('edat_user');
    localStorage.removeItem('edat_journeys');
    window.location.href = 'index.html';
  });
  document.getElementById('btn-delete-account')?.addEventListener('click', () => {
    if (confirm('This will permanently delete all your account data. Are you sure?')) {
      localStorage.clear();
      window.location.href = 'index.html';
    }
  });
}

/* ── Overview ── */
function renderOverview() {
  const journeys = getJourneys();
  if (!journeys.length) return;

  const total    = journeys.reduce((a,j) => a + j.toll, 0);
  const co2      = journeys.reduce((a,j) => a + j.emission * 12, 0);
  const avgConf  = journeys.reduce((a,j) => a + j.confidence, 0) / journeys.length;
  const savings  = journeys.length * 0.85; // simulated saving vs no-AI flat rate

  const u = getUser();
  const kpis = [
    { icon:'💰', val:`RM ${total.toFixed(2)}`, label:'Total Tolls Paid', delta:'↑ 12 journeys this week', cls:'', deltaCls:'pos' },
    { icon:'🌿', val:`${co2.toFixed(1)} kg`, label:'CO₂ Generated', delta:'vs national avg 32 kg', cls:'amber', deltaCls:'' },
    { icon:'🤖', val:`${avgConf.toFixed(1)}%`, label:'Avg AI Confidence', delta:'Above 85% threshold ✓', cls:'green', deltaCls:'pos' },
    { icon:'💡', val:`RM ${savings.toFixed(2)}`, label:'Estimated AI Savings', delta:'vs flat-rate pricing', cls:'green', deltaCls:'pos' },
  ];

  const grid = document.getElementById('ov-kpi-grid');
  if (grid) {
    grid.innerHTML = kpis.map(k => `
      <div class="ov-kpi">
        <div class="ov-kpi-icon">${k.icon}</div>
        <span class="ov-kpi-val ${k.cls}">${k.val}</span>
        <span class="ov-kpi-label">${k.label}</span>
        <span class="ov-kpi-delta ${k.deltaCls}">${k.delta}</span>
      </div>
    `).join('');
  }

  // AI insight
  const vehicle = u?.vehicle || 'Petrol Car';
  const insightText = vehicle === 'EV' || vehicle === 'Hybrid'
    ? `Your ${vehicle} produces ${co2.toFixed(0)} kg CO₂ this period. You're already in the top 15% of green commuters! Consider travelling 20 mins earlier on weekdays to save RM 0.80 per toll.`
    : `EDAT AI detected your daily commute pattern. Switching to an EV or Hybrid could save you up to RM ${(savings * 2.4).toFixed(0)} per month and reduce your emission index by 64%.`;
  setText('aib-text', insightText);

  // Recent journeys table (last 5)
  renderJourneyRows('recent-tbody', journeys.slice(0,5), true);

  // Charts
  renderWeeklyChart(journeys);
  renderEmissionTrendChart(journeys);
}

/* ── History ── */
function renderHistory() {
  const journeys = getJourneys();
  renderJourneyRows('history-tbody', journeys, false);

  // Filter
  document.getElementById('hist-filter')?.addEventListener('change', function() {
    const val = this.value;
    const filtered = val === 'all' ? journeys : journeys.filter(j => j.corridor === val);
    renderJourneyRows('history-tbody', filtered, false);
  });
}

function renderJourneyRows(tbodyId, journeys, compact) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = journeys.map(j => {
    const emClass = j.emission < 0.3 ? 't-em-low' : j.emission < 0.8 ? 't-em-mid' : 't-em-high';
    const badge   = j.isRoutine
      ? `<span class="badge-routine">🗓 Routine</span>`
      : `<span class="badge-single">Single</span>`;

    if (compact) return `
      <tr>
        <td>${formatDate(j.date)} ${j.time}</td>
        <td>${j.corridor}</td>
        <td class="t-hash">${j.hash}</td>
        <td>${vehicleEmoji(j.vehicle)} ${j.vehicle}</td>
        <td class="${emClass}">${j.emission.toFixed(3)}</td>
        <td class="t-toll">RM ${j.toll.toFixed(2)}</td>
        <td>${badge}</td>
      </tr>`;

    return `
      <tr>
        <td>${formatDate(j.date)}</td>
        <td>${j.time}</td>
        <td>${j.corridor}</td>
        <td>${j.direction}</td>
        <td class="t-hash">${j.hash}</td>
        <td>${vehicleEmoji(j.vehicle)} ${j.vehicle}</td>
        <td class="${emClass}">${j.emission.toFixed(3)}</td>
        <td style="color:${j.confidence>=90?'var(--green)':'var(--amber)'};font-weight:700;font-family:var(--mono);">${j.confidence.toFixed(1)}%</td>
        <td class="t-toll">RM ${j.toll.toFixed(2)}</td>
      </tr>`;
  }).join('');
}

/* ── Route Patterns ── */
function renderRoutes() {
  const journeys = getJourneys();
  const patterns = detectPatterns(journeys);
  const grid = document.getElementById('routes-grid');
  if (!grid) return;

  grid.innerHTML = patterns.map(p => `
    <div class="route-card">
      <div class="rc-top">
        <div class="rc-top-badge">
          <span class="badge badge-white">
            ${p.days.filter(Boolean).length}× per week
          </span>
          <span class="rc-freq">${p.timePeriod}</span>
        </div>
        <div class="rc-name">${p.name}</div>
        <div class="rc-sub">${p.corridor}</div>
      </div>
      <div class="rc-body">
        <div class="rc-stats">
          <div class="rc-stat">
            <span class="rc-stat-num" style="color:var(--navy);">RM ${p.avgToll}</span>
            <span class="rc-stat-label">Avg Toll</span>
          </div>
          <div class="rc-stat">
            <span class="rc-stat-num" style="color:var(--amber);">${p.avgEmission}</span>
            <span class="rc-stat-label">Avg Emission</span>
          </div>
          <div class="rc-stat">
            <span class="rc-stat-num" style="color:var(--green);">${p.count}</span>
            <span class="rc-stat-label">Trips</span>
          </div>
        </div>
        <div style="margin-bottom:12px;font-size:0.78rem;color:var(--text-muted);">Active Days:</div>
        <div class="rc-days">
          ${['M','T','W','T','F','S','S'].map((d,i) => `
            <div class="rc-day ${p.days[i] ? 'active' : ''}">${d}</div>
          `).join('')}
        </div>
        <div style="margin-top:14px;padding:12px;background:var(--sky);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--navy);">
          💡 ${p.tip}
        </div>
      </div>
    </div>
  `).join('');
}

function detectPatterns(journeys) {
  // Group journeys by corridor
  const byCorr = {};
  journeys.forEach(j => {
    const key = j.corridor;
    if (!byCorr[key]) byCorr[key] = [];
    byCorr[key].push(j);
  });

  const patterns = [];
  Object.entries(byCorr).forEach(([corridor, trips]) => {
    if (trips.length < 3) return;
    const avgToll     = (trips.reduce((a,t) => a + t.toll, 0) / trips.length).toFixed(2);
    const avgEmission = (trips.reduce((a,t) => a + t.emission, 0) / trips.length).toFixed(3);
    const hours       = trips.map(t => parseInt(t.time.split(':')[0]));
    const avgHour     = Math.round(hours.reduce((a,h) => a + h, 0) / hours.length);
    const timePeriod  = avgHour < 10 ? 'Morning Rush' : avgHour < 14 ? 'Midday' : avgHour < 18 ? 'Afternoon' : 'Evening Rush';

    // Detect weekdays
    const days = [false,false,false,false,false,false,false];
    trips.forEach(t => { const d = new Date(t.date).getDay(); days[d === 0 ? 6 : d - 1] = true; });

    // Name the route
    const isAM    = avgHour < 12;
    const name    = isAM ? `Morning Commute` : `Return Commute`;
    const weekdays = days.slice(0,5).filter(Boolean).length;

    patterns.push({
      name, corridor, avgToll, avgEmission, count: trips.length,
      timePeriod, days, weekdays,
      tip: weekdays >= 4
        ? `This looks like your daily commute! Travelling 15 mins earlier could save ~RM ${(parseFloat(avgToll) * 0.15).toFixed(2)} per trip.`
        : `Detected ${trips.length} trips on this route. Consider consolidating journeys to reduce per-trip emission.`,
    });
  });

  return patterns.slice(0, 4);
}

/* ── Suggestions ── */
function renderSuggestions() {
  const u        = getUser();
  const journeys = getJourneys();
  const vehicle  = u?.vehicle || 'Petrol Car';
  const avgToll  = journeys.length ? journeys.reduce((a,j) => a + j.toll, 0) / journeys.length : 3;

  const suggestions = buildSuggestions(vehicle, avgToll, journeys);
  const list = document.getElementById('suggestions-list');
  if (!list) return;

  setText('suggestion-count', suggestions.filter(s => s.priority === 'High').length);

  list.innerHTML = suggestions.map(s => `
    <div class="suggestion-card">
      <div class="sg-icon-wrap" style="background:${s.iconBg};">${s.icon}</div>
      <div class="sg-content">
        <div class="sg-title">${s.title}</div>
        <div class="sg-desc">${s.desc}</div>
        <div class="sg-impact">
          ${s.impactIcon} <strong>${s.impact}</strong> — ${s.impactDesc}
        </div>
      </div>
      <div class="sg-actions">
        <span class="sg-priority ${s.priorityCls}">${s.priority}</span>
        <button class="btn btn-red sg-cta" style="font-size:0.78rem;padding:8px 14px;" onclick="${s.action}">${s.cta}</button>
      </div>
    </div>
  `).join('');
}

function buildSuggestions(vehicle, avgToll, journeys) {
  const suggs = [];
  const isEV  = vehicle === 'EV';
  const monthlySavingEV = (avgToll * journeys.length * 0.6).toFixed(0);

  if (!isEV) {
    suggs.push({
      icon: '⚡', iconBg: 'rgba(0,184,148,0.1)',
      title: 'Switch to an Electric Vehicle',
      desc: `Based on your ${journeys.length} journeys, switching to an EV would qualify you for the ×0.2 carbon multiplier instead of ×0.8–2.1. You would save significantly on every toll.`,
      impact: `RM ${monthlySavingEV}/month`, impactIcon: '💰', impactDesc: 'estimated toll saving',
      priority: 'High', priorityCls: 'pri-high', cta: 'Learn More',
      action: `alert('EV incentive: Apply at myev.gov.my to register your EV and unlock the 0.2× carbon multiplier on all EDAT corridors.')`
    });
  }

  suggs.push({
    icon: '⏰', iconBg: 'rgba(245,158,11,0.1)',
    title: 'Travel 20 Minutes Earlier',
    desc: `EDAT detected you typically travel during peak hours (07:30–09:00). Shifting your departure 20 minutes earlier reduces your speed factor from ×1.3 to ×0.95, saving per toll.`,
    impact: `RM ${(avgToll * 0.18).toFixed(2)} per journey`, impactIcon: '📉', impactDesc: 'speed factor reduction',
    priority: 'High', priorityCls: 'pri-high', cta: 'Set Reminder',
    action: `alert('Reminder set for 07:10 on Mon–Fri commute days.')`
  });

  suggs.push({
    icon: '🛣️', iconBg: 'rgba(27,42,74,0.08)',
    title: 'Combine Errands on Off-Peak Days',
    desc: `Your Saturday journeys average RM ${(avgToll * 0.8).toFixed(2)} — 22% cheaper than weekday commutes. Consider running errands on Saturday mornings instead of weekday evenings.`,
    impact: '22% cheaper', impactIcon: '📊', impactDesc: 'off-peak vs peak pricing',
    priority: 'Medium', priorityCls: 'pri-medium', cta: 'See Route Stats',
    action: `document.querySelector('.as-nav-item[data-section="routes"]')?.click()`
  });

  if (vehicle === 'Motorcycle') {
    suggs.push({
      icon: '🏛️', iconBg: 'rgba(0,184,148,0.08)',
      title: 'Check B40 Motorcycle Exemption',
      desc: `Registered B40 motorcycles receive a permanent 50% reduction on all EDAT base rates. If your household income qualifies, register at the LHDN portal.`,
      impact: '50% off base rate', impactIcon: '🛡️', impactDesc: 'permanent discount',
      priority: 'High', priorityCls: 'pri-high', cta: 'Check Eligibility',
      action: `alert('Visit LHDN B40 portal: lhdn.gov.my/b40 to register your motorcycle for the EDAT exemption programme.')`
    });
  } else {
    suggs.push({
      icon: '🌳', iconBg: 'rgba(0,184,148,0.08)',
      title: 'Carbon Offset Programme',
      desc: `Your journeys generate approximately ${(journeys.reduce((a,j) => a + j.emission * 12, 0)).toFixed(0)} kg CO₂ per period. Offset this via MyCarbon Credits at a subsidised government rate.`,
      impact: 'Carbon Neutral', impactIcon: '🌿', impactDesc: 'offset your footprint',
      priority: 'Low', priorityCls: 'pri-low', cta: 'Offset Now',
      action: `alert('MyCarbon Credits portal: mycarbon.gov.my — offset your EDAT emissions at RM 8/tonne CO₂.')`
    });
  }

  return suggs;
}

/* ── Settings ── */
function initSettings() {
  document.getElementById('btn-save-profile')?.addEventListener('click', () => {
    const u = getUser();
    if (!u) return;
    u.name    = document.getElementById('set-name')?.value?.trim() || u.name;
    u.email   = document.getElementById('set-email')?.value?.trim() || u.email;
    u.vehicle = document.getElementById('set-vehicle')?.value || u.vehicle;
    localStorage.setItem('edat_user', JSON.stringify(u));
    loadUser();
    alert('Profile saved successfully!');
  });

  document.querySelectorAll('.toggle[data-pref]').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('active'));
  });
}

/* ── Export ── */
function initExport() {
  ['btn-export-acc','btn-export-hist'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', exportCSV);
  });
}

function exportCSV() {
  const journeys = getJourneys();
  const rows = [['Date','Time','Corridor','Direction','Hash','Vehicle','Emission','Confidence','Toll (RM)']];
  journeys.forEach(j => rows.push([
    j.date, j.time, j.corridor, j.direction, j.hash, j.vehicle, j.emission, j.confidence, j.toll
  ]));
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `edat-journeys-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/* ── Refresh ── */
function initRefresh() {
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    loadUser(); renderOverview();
    const btn = document.getElementById('btn-refresh');
    btn.textContent = '✓ Refreshed!';
    setTimeout(() => btn.textContent = '🔄 Refresh', 1500);
  });
}

/* ── Charts ── */
function renderWeeklyChart(journeys) {
  const ctx = document.getElementById('chart-weekly');
  if (!ctx) return;

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    const dayj = journeys.filter(j => j.date === ds);
    last7.push({
      label: d.toLocaleDateString('en-MY',{weekday:'short'}),
      total: dayj.reduce((a,j) => a + j.toll, 0)
    });
  }

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: last7.map(d=>d.label),
      datasets: [{ label:'Toll (RM)', data: last7.map(d=>d.total.toFixed(2)),
        backgroundColor: 'rgba(214,48,49,0.8)', borderRadius: 6, borderSkipped: false }]
    },
    options: chartOpts({ yLabel:'RM' })
  });
}

function renderEmissionTrendChart(journeys) {
  const ctx = document.getElementById('chart-emission-trend');
  if (!ctx) return;

  const sorted = [...journeys].sort((a,b) => a.date.localeCompare(b.date)).slice(-14);
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(j => j.date.slice(5)),
      datasets: [{ label:'Emission Index', data: sorted.map(j => j.emission.toFixed(3)),
        borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)',
        fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#F59E0B' }]
    },
    options: chartOpts({ yLabel:'Emission Idx', suggestedMax: 1.5 })
  });
}

function chartOpts(extra={}) {
  return {
    responsive: true, plugins: { legend:{ display:false } },
    scales: {
      y: { beginAtZero:true, grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ color:'#9CA3AF', font:{size:11} }, ...(extra.suggestedMax ? {suggestedMax:extra.suggestedMax} : {}) },
      x: { grid:{ display:false }, ticks:{ color:'#9CA3AF', font:{size:11} } }
    }
  };
}

/* ── Shared utils ── */
function vehicleEmoji(v) {
  return { 'EV':'⚡', 'Hybrid':'🔋', 'Petrol Car':'🚗', 'Diesel':'🛻', 'Motorcycle':'🏍️', 'Truck':'🚛' }[v] || '🚗';
}
function formatDate(d) {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-MY', {day:'2-digit', month:'short'});
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
