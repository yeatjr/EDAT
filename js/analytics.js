/* ── analytics.js (Personalized Analytics) ── */

document.addEventListener('DOMContentLoaded', () => {
  Chart.defaults.color = '#6b8a9a';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  initWeeklySpending();
  initCarbonTrend();
  initEcoCommuteChart();
  initFrequentRoutesTable();
  initDateSelector();
});

// ── 1. Travel Patterns (Donut/Bar) ──
// ── 1. Main Trends ──

// ── 3. Weekly Spending ──
function initWeeklySpending() {
  const ctx = document.getElementById('chart-revenue-stacked');
  if (!ctx) return;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const spendData = [4.50, 4.50, 5.20, 4.50, 6.80, 2.00, 0.00];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        { label: 'Daily Toll (RM)', data: spendData, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'}},
        y:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{callback:v=>'RM '+v.toFixed(2)}},
      },
    },
  });
}

// ── 4. Carbon Footprint vs Average ──
function initCarbonTrend() {
  const ctx = document.getElementById('chart-carbon-trend');
  if (!ctx) return;
  const labels30 = Array.from({length:14},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-13+i);
    return d.toLocaleDateString('en',{month:'short',day:'numeric'});
  });
  
  const myCarbon = Array.from({length:14},(_,i) => 1.2 + (Math.random()-0.5)*0.4);
  const avgCarbon = Array.from({length:14}, () => 1.8);
  
  const gradCtx = ctx.getContext('2d');
  const grad = gradCtx.createLinearGradient(0,0,0,260);
  grad.addColorStop(0,'rgba(245, 158, 11, 0.3)'); grad.addColorStop(1,'rgba(245, 158, 11, 0)');

  new Chart(ctx, {
    type:'line',
    data:{
      labels:labels30,
      datasets:[
        { label:'My Daily CO₂', data:myCarbon, borderColor:'#F59E0B', backgroundColor:grad, borderWidth:2, fill:true, tension:0.4, pointRadius:2 },
        { label:'City Average', data:avgCarbon, borderColor:'rgba(0,180,255,0.5)', borderDash:[5,5], borderWidth:1, fill:false, pointRadius:0 },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:10,font:{size:11}}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'}},
        y:{grid:{color:'rgba(255,255,255,0.04)'}},
      },
    },
  });
}

// ── 5. Eco Commute (Donut) ──
function initEcoCommuteChart() {
  const ctx = document.getElementById('chart-eco-commute');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Off-Peak (Eco)', 'Peak Hour'],
      datasets: [{
        data: [68, 32],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['#10B981', '#EF4444'],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: 'var(--text-muted)' } }
      }
    }
  });
}

// ── 6. Frequent Routes Table ──
const MY_ROUTES = [
  { route:'KL-Seremban Highway', count:12, toll:28.50, speed:85, co2:8.4, rebate:'+ RM 1.20' },
  { route:'Federal Highway (PJ to KL)', count:8, toll:14.00, speed:45, co2:6.1, rebate:'+ RM 0.80' },
  { route:'LDP (Puchong to Subang)', count:4, toll:6.00, speed:60, co2:3.7, rebate:'+ RM 0.00' }
];

function initFrequentRoutesTable() {
  const tbody = document.getElementById('esg-table-body');
  if (!tbody) return;
  MY_ROUTES.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600;color:var(--text);">${r.route}</td>
      <td>${r.count}</td>
      <td style="color:var(--red);font-family:var(--mono);">RM ${r.toll.toFixed(2)}</td>
      <td>${r.speed} km/h</td>
      <td style="color:var(--amber);">${r.co2} kg</td>
      <td style="color:var(--green); font-weight: 700;">${r.rebate}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── UI Utilities ──
function initDateSelector() {
  document.querySelectorAll('.ds-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ds-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
