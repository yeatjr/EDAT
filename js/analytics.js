/* ── analytics.js ── */

document.addEventListener('DOMContentLoaded', () => {
  Chart.defaults.color = '#6b8a9a';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("[ANALYTICS] Syncing with Firebase...");
      initAnalytics(user.uid);
    } else {
      // Fallback for Ahmad Demo
      initAnalytics('ahmad_mock_123');
    }
  });

  initDateSelector();
});

async function initAnalytics(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid).collection('history').get();
    const journeys = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    if (!journeys.length) {
      console.warn("No analytics data found.");
      return;
    }

    renderKPIs(journeys);
    renderWeeklySpending(journeys);
    renderCarbonTrend(journeys);
    renderEcoCommute(journeys);
    renderFrequentRoutes(journeys);
  } catch (err) {
    console.error("Analytics sync failed:", err);
  }
}

function renderKPIs(journeys) {
  const totalToll = journeys.reduce((a,j) => a + (j.totalCharge || 0), 0);
  const totalDist = journeys.reduce((a,j) => a + parseFloat(j.distance || 0), 0);
  const totalCO2  = journeys.reduce((a,j) => a + (j.co2 || 0), 0).toFixed(1);
  const ecoTrips  = journeys.filter(j => parseFloat(j.trafficFee) <= 1).length;
  const ecoScore  = Math.round((ecoTrips / journeys.length) * 100);

  updateVal('.kpi-hero-item:nth-child(1) .kpi-hero-val', `RM ${totalToll.toFixed(2)}`);
  updateVal('.kpi-hero-item:nth-child(2) .kpi-hero-val', journeys.length);
  updateVal('.kpi-hero-item:nth-child(3) .kpi-hero-val', `${totalCO2} kg`);
  updateVal('.kpi-hero-item:nth-child(4) .kpi-hero-val', `${ecoScore} / 100`);
}

function renderWeeklySpending(journeys) {
  const ctx = document.getElementById('chart-revenue-stacked');
  if (!ctx) return;
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const spendByDay = [0,0,0,0,0,0,0];

  journeys.forEach(j => {
    const date = j.timestamp ? j.timestamp.toDate() : new Date();
    spendByDay[date.getDay()] += (j.totalCharge || 0);
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [{ label: 'Daily Toll (RM)', data: spendByDay, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 }],
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{callback:v=>'RM '+v.toFixed(0)}} } }
  });
}

function renderCarbonTrend(journeys) {
  const ctx = document.getElementById('chart-carbon-trend');
  if (!ctx) return;

  const dates = [];
  const spendMap = {};
  for(let i=13; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(5,10);
    dates.push(ds);
    spendMap[ds] = 0;
  }

  journeys.forEach(j => {
    if (!j.timestamp) return;
    const ds = j.timestamp.toDate().toISOString().slice(5,10);
    if (spendMap[ds] !== undefined) spendMap[ds] += (j.co2 || 0);
  });

  const myCarbon = dates.map(d => spendMap[d]);
  const avgCarbon = dates.map(() => 8.5); // National avg for commute

  new Chart(ctx, {
    type:'line',
    data:{
      labels:dates,
      datasets:[
        { label:'My Daily CO₂', data:myCarbon, borderColor:'#F59E0B', backgroundColor:'rgba(245,158,11,0.1)', fill:true, tension:0.4, pointRadius:3 },
        { label:'City Avg', data:avgCarbon, borderColor:'rgba(0,180,255,0.4)', borderDash:[5,5], pointRadius:0, fill:false }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{boxWidth:10}}} }
  });
}

function renderEcoCommute(journeys) {
  const ctx = document.getElementById('chart-eco-commute');
  if (!ctx) return;

  const offPeak = journeys.filter(j => parseFloat(j.trafficFee) <= 1).length;
  const peak = journeys.length - offPeak;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Off-Peak (Eco)', 'Peak Hour'],
      datasets: [{ data: [offPeak, peak], backgroundColor: ['#10B981', '#EF4444'], borderWidth: 0 }]
    },
    options: { responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{legend:{position:'bottom'}} }
  });
}

function renderFrequentRoutes(journeys) {
  const tbody = document.getElementById('esg-table-body');
  if (!tbody) return;

  const routes = {};
  journeys.forEach(j => {
    const key = `${j.entry} → ${j.exit}`;
    if (!routes[key]) routes[key] = { count:0, toll:0, co2:0, corridor: j.corridor };
    routes[key].count++;
    routes[key].toll += (j.totalCharge || 0);
    routes[key].co2 += 4.2;
  });

  tbody.innerHTML = Object.entries(routes).slice(0, 8).map(([route, data]) => {
    const avgToll = (data.toll / data.count).toFixed(2);
    const incentive = data.count > 3 ? 'Qualified' : 'Pending';
    const incentiveCls = data.count > 3 ? 'badge-green' : 'badge-amber';
    
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:32px; height:32px; background:var(--gray-50); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">📍</div>
            <div>
              <div style="font-weight:700; color:var(--navy); line-height:1.2;">${route.replace(' (EDAT)', '')}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Corridor: ${data.corridor}</div>
            </div>
          </div>
        </td>
        <td style="text-align:center;">
          <span style="font-weight:700; background:var(--gray-50); padding:4px 10px; border-radius:6px;">${data.count}</span>
        </td>
        <td>
          <div style="font-weight:700; color:var(--red);">RM ${data.toll.toFixed(2)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Avg: RM ${avgToll}</div>
        </td>
        <td>
          <div style="font-weight:600;">${(Math.random() * 20 + 65).toFixed(0)} km/h</div>
          <div style="font-size:0.75rem; color:var(--green);">Optimal Speed</div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--amber);">${data.co2.toFixed(1)} kg</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Emissions</div>
        </td>
        <td style="text-align:right;">
          <span class="badge ${incentiveCls}" style="font-size:0.7rem; letter-spacing:0.5px;">${incentive}</span>
          <div style="font-size:0.75rem; color:var(--green); font-weight:700; margin-top:4px;">+ RM ${(data.count * 0.25).toFixed(2)}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateVal(selector, val) {
  const el = document.querySelector(selector);
  if (el) el.textContent = val;
}

function initDateSelector() {
  document.querySelectorAll('.ds-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ds-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
