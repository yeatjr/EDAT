/* ── analytics.js ── */

document.addEventListener('DOMContentLoaded', () => {
  Chart.defaults.color = '#6b8a9a';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  initVehicleCharts();
  initScatterChart();
  initRevenueStacked();
  initCarbonTrend();
  initPriceHistogram();
  initConfidenceChart();
  initEvTrend();
  initEsgTable();
  initExportButtons();
  initDateSelector();
  initChartToggles();
});

const MONTHS  = ['Oct','Nov','Dec','Jan','Feb','Mar'];
const HOURS   = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);

const VEH_DATA = {
  labels: ['EV Sedan', 'Petrol Car', 'Diesel SUV', 'Motorcycle', 'Hybrid', 'Truck'],
  data:   [34, 28, 13, 12, 8, 5],
  colors: ['#00ff88','#f59e0b','#ff6b35','#00b4ff','#00ffcc','#ef4444'],
};

function initVehicleCharts() {
  const donutCtx = document.getElementById('chart-vehicle-donut');
  const barCtx   = document.getElementById('chart-vehicle-bar');
  if (!donutCtx || !barCtx) return;

  // Legend
  const leg = document.getElementById('vehicle-legend');
  if (leg) {
    VEH_DATA.labels.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'legend-item';
      div.innerHTML = `<span class="legend-dot" style="background:${VEH_DATA.colors[i]}"></span>${l} (${VEH_DATA.data[i]}%)`;
      leg.appendChild(div);
    });
  }

  window.donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: VEH_DATA.labels,
      datasets: [{ data: VEH_DATA.data, backgroundColor: VEH_DATA.colors.map(c => c + '99'), borderColor: VEH_DATA.colors, borderWidth: 2 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: '65%',
    },
  });

  window.barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: VEH_DATA.labels,
      datasets: [{ data: VEH_DATA.data, backgroundColor: VEH_DATA.colors.map(c => c + '66'), borderColor: VEH_DATA.colors, borderWidth: 1, borderRadius: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color:'rgba(255,255,255,0.04)' } },
        y: { grid: { color:'rgba(255,255,255,0.04)' }, ticks: { callback: v => v + '%' } },
      },
    },
  });
}

function initScatterChart() {
  const ctx = document.getElementById('chart-scatter');
  if (!ctx) return;
  const ptColors = { 'EV':'#00ff88', 'Petrol':'#f59e0b', 'Diesel':'#ff6b35', 'Motorcycle':'#00b4ff', 'Truck':'#ef4444' };
  const generatePoints = (type, baseEmi, emiFactor, count) =>
    Array.from({length:count}, () => {
      const speed = 60 + Math.random() * 80;
      const emission = baseEmi + (speed - 60) * emiFactor * 0.005 + (Math.random()-0.5) * 0.1;
      return { x: speed, y: Math.max(0, emission), color: ptColors[type] };
    });

  const allPts = [
    ...generatePoints('EV',       0.06, 0.4, 40),
    ...generatePoints('Petrol',   0.45, 1.0, 50),
    ...generatePoints('Diesel',   0.85, 1.5, 30),
    ...generatePoints('Motorcycle',0.12, 0.6, 35),
    ...generatePoints('Truck',    1.20, 2.0, 20),
  ];

  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: Object.keys(ptColors).map(k => ({
        label: k,
        data: allPts.filter(p => p.color === ptColors[k]).map(p => ({x:p.x, y:p.y})),
        backgroundColor: ptColors[k] + '88',
        pointRadius: 4, pointHoverRadius: 6,
        borderColor: 'transparent',
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth:10, font:{size:11} } } },
      scales: {
        x: { title:{display:true,text:'Speed (km/h)',color:'#6b8a9a'}, grid:{color:'rgba(255,255,255,0.04)'} },
        y: { title:{display:true,text:'Emission Index',color:'#6b8a9a'}, grid:{color:'rgba(255,255,255,0.04)'} },
      },
    },
  });
}

function initRevenueStacked() {
  const ctx = document.getElementById('chart-revenue-stacked');
  if (!ctx) return;
  const gen = (base, variance, mult) => HOURS.map(() => (base + Math.random() * variance) * mult);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: HOURS,
      datasets: [
        { label:'EV',         data: gen(1200,400,1),  backgroundColor:'rgba(0,255,136,0.7)',  stack:'a', borderRadius:2 },
        { label:'Petrol',     data: gen(3500,800,1),  backgroundColor:'rgba(245,158,11,0.7)', stack:'a', borderRadius:0 },
        { label:'Diesel SUV', data: gen(2200,600,1),  backgroundColor:'rgba(255,107,53,0.7)', stack:'a', borderRadius:0 },
        { label:'Motorcycle', data: gen(600,200,1),   backgroundColor:'rgba(0,180,255,0.7)',  stack:'a', borderRadius:0 },
        { label:'Truck',      data: gen(4000,1200,1), backgroundColor:'rgba(239,68,68,0.7)',  stack:'a', borderRadius:0 },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{boxWidth:10,font:{size:11}}} },
      scales:{
        x:{stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{maxTicksLimit:12}},
        y:{stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{callback:v=>'RM'+Math.round(v/1000)+'K'}},
      },
    },
  });
}

function initCarbonTrend() {
  const ctx = document.getElementById('chart-carbon-trend');
  if (!ctx) return;
  const labels30 = Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-29+i);
    return d.toLocaleDateString('en',{month:'short',day:'numeric'});
  });
  const actual = Array.from({length:30},(_,i) => 0.6 - i * 0.006 + (Math.random()-0.5)*0.05);
  const target  = Array.from({length:30}, () => 0.45);
  const gradCtx = ctx.getContext('2d');
  const grad = gradCtx.createLinearGradient(0,0,0,260);
  grad.addColorStop(0,'rgba(0,255,136,0.3)'); grad.addColorStop(1,'rgba(0,255,136,0)');
  new Chart(ctx, {
    type:'line',
    data:{
      labels:labels30,
      datasets:[
        { label:'Actual', data:actual, borderColor:'#00ff88', backgroundColor:grad, borderWidth:2, fill:true, tension:0.4, pointRadius:0 },
        { label:'Target', data:target, borderColor:'rgba(0,180,255,0.5)', borderDash:[5,5], borderWidth:1, fill:false, pointRadius:0 },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:10,font:{size:11}}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{maxTicksLimit:6}},
        y:{grid:{color:'rgba(255,255,255,0.04)'}},
      },
    },
  });
}

function initPriceHistogram() {
  const ctx = document.getElementById('chart-price-hist');
  if (!ctx) return;
  const bands = ['<RM1','1-2','2-3','3-4','4-5','5-6','6-8','8-10','>10'];
  const counts= [8,14,22,18,15,10,7,4,2];
  const colors= ['#00ff88','#00ffaa','#f59e0b','#f59e0b','#ff6b35','#ff6b35','#ef4444','#ef4444','#ef4444'];
  new Chart(ctx,{
    type:'bar',
    data:{ labels:bands, datasets:[{ data:counts, backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:1, borderRadius:4 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'}},
        y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'%'}},
      },
    },
  });
}

function initConfidenceChart() {
  const ctx = document.getElementById('chart-confidence');
  if (!ctx) return;
  const bands = ['<70%','70-80%','80-85%','85-90%','90-95%','95-100%'];
  const data  = [0.5,1.2,3.8,12.5,28.4,53.6];
  const colors= ['#ef4444','#ef4444','#f59e0b','#f59e0b','#00b4ff','#00ff88'];
  new Chart(ctx,{
    type:'bar',
    data:{ labels:bands, datasets:[{ data, backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:1, borderRadius:4 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'}},
        y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'%'}},
      },
    },
  });
}

function initEvTrend() {
  const ctx = document.getElementById('chart-ev-trend');
  if (!ctx) return;
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data2025 = [18,19,20,22,22,24,25,27,28,29,31,33];
  const data2026 = [34,null,null,null,null,null,null,null,null,null,null,null];
  const cCtx = ctx.getContext('2d');
  const grad = cCtx.createLinearGradient(0,0,0,220);
  grad.addColorStop(0,'rgba(0,255,136,0.25)'); grad.addColorStop(1,'rgba(0,255,136,0)');
  new Chart(ctx,{
    type:'line',
    data:{
      labels:mons,
      datasets:[
        { label:'2025', data:data2025, borderColor:'#00b4ff', borderWidth:2, pointRadius:3, fill:false, tension:0.4 },
        { label:'2026', data:data2026, borderColor:'#00ff88', backgroundColor:grad, borderWidth:2, pointRadius:3, fill:true, tension:0.4 },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:10,font:{size:11}}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'}},
        y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'%'}},
      },
    },
  });
}

/* ESG Table */
const CORRIDORS = [
  { name:'E1 North-South (N)', vehicles:48200, revenue:1420000, ev:38, co2:1820, conf:98.1, score:'A' },
  { name:'E1 North-South (S)', vehicles:41300, revenue:1180000, ev:35, co2:1560, conf:97.4, score:'A' },
  { name:'KL-Seremban',        vehicles:12600, revenue:380000,  ev:29, co2:480,  conf:95.8, score:'B' },
  { name:'Penang Bridge',      vehicles:8400,  revenue:210000,  ev:41, co2:320,  conf:96.7, score:'A' },
  { name:'Johor-SG Link',      vehicles:6200,  revenue:160000,  ev:27, co2:220,  conf:94.2, score:'B' },
  { name:'Sg Buloh Toll',      vehicles:8130,  revenue:195000,  ev:33, co2:288,  conf:97.1, score:'A' },
];

function initEsgTable() {
  const tbody = document.getElementById('esg-table-body');
  if (!tbody) return;
  CORRIDORS.forEach(c => {
    const avgToll = c.revenue / c.vehicles;
    const trees   = Math.round(c.co2 / 21);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600;color:var(--text);">${c.name}</td>
      <td>${c.vehicles.toLocaleString()}</td>
      <td style="color:var(--green);font-family:var(--mono);">RM ${(c.revenue/1000).toFixed(0)}K</td>
      <td style="font-family:var(--mono);">RM ${avgToll.toFixed(2)}</td>
      <td style="color:var(--blue);">${c.ev}%</td>
      <td style="color:var(--amber);">${c.co2.toLocaleString()} kg</td>
      <td>${trees}</td>
      <td style="${c.conf>=95?'color:var(--green)':'color:var(--amber)'};">${c.conf}%</td>
      <td><span class="esg-score ${c.score}">${c.score}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function initExportButtons() {
  ['btn-esg-export','btn-esg-pdf','btn-esg-xlsx','btn-dl-table'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      const btn = document.getElementById(id);
      const orig = btn.textContent;
      btn.textContent = '✓ Preparing...';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  });
}

function initDateSelector() {
  document.querySelectorAll('.ds-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ds-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function initChartToggles() {
  document.querySelectorAll('.chart-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.chart;
      document.querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const donut = document.getElementById('chart-vehicle-donut');
      const bar   = document.getElementById('chart-vehicle-bar');
      if (!donut || !bar) return;
      if (c === 'donut') { donut.style.display = ''; bar.style.display = 'none'; }
      else               { donut.style.display = 'none'; bar.style.display = ''; }
    });
  });
}
