/* ── dashboard.js (Advanced Routing & Geocoding) ── */

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initAutocomplete('jp-start', 'jp-start-results', true);
  initAutocomplete('jp-end', 'jp-end-results', false);
  initCalculator();
});

let map;
let currentRouteLayer = null;
let startCoords = null; // [lat, lon]
let endCoords = null;   // [lat, lon]
let markers = { start: null, end: null };

function resetCalcButton() {
  const btnCalc = document.getElementById('btn-calc');
  if (btnCalc) {
    btnCalc.style.background = '';
    btnCalc.style.borderColor = '';
    btnCalc.style.color = '';
    btnCalc.textContent = "Calculate";
  }
}

function initMap() {
  const mapContainer = document.getElementById('edat-map');
  if (!mapContainer) return;

  map = L.map('edat-map', {
    zoomControl: false
  }).setView([3.1000, 101.6000], 10);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  }).addTo(map);

  // Handle Map Clicks to set locations
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    const startInp = document.getElementById('jp-start');
    const endInp = document.getElementById('jp-end');
    
    // Fill start if empty, otherwise fill end
    if (!startInp.value.trim()) {
      reverseGeocode(lat, lng, 'jp-start', true);
    } else {
      reverseGeocode(lat, lng, 'jp-end', false);
    }
  });
}

// ── Geocoding (Nominatim API) ──
let typingTimer;
const doneTypingInterval = 500;

function initAutocomplete(inputId, resultsId, isStart) {
  const inputEl = document.getElementById(inputId);
  const resultsEl = document.getElementById(resultsId);

  inputEl.addEventListener('input', () => {
    clearTimeout(typingTimer);
    resultsEl.innerHTML = '';
    
    if (inputEl.value.length < 3) return;

    typingTimer = setTimeout(() => {
      fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(inputEl.value)}&maxLocations=5`)
        .then(response => response.json())
        .then(data => {
          resultsEl.innerHTML = '';
          if (data.candidates && data.candidates.length > 0) {
            data.candidates.forEach(item => {
              const div = document.createElement('div');
              const addressStr = item.address || '';
              const parts = addressStr.split(',').map(p => p.trim());
              const name = parts[0] || addressStr;
              const subtext = parts.slice(1).join(', ');
              
              div.innerHTML = `<strong>${name}</strong><br><span style="font-size:0.8rem;color:#666">${subtext}</span>`;
              
              div.addEventListener('click', () => {
                inputEl.value = addressStr;
                const lat = parseFloat(item.location.y);
                const lon = parseFloat(item.location.x);
              
              if (isStart) startCoords = [lat, lon];
              else endCoords = [lat, lon];
              
              updateMarker(lat, lon, isStart, addressStr);
              resultsEl.innerHTML = '';
              resetCalcButton();
            });
            resultsEl.appendChild(div);
          });
          }
        })
        .catch(err => console.error(err));
    }, doneTypingInterval);
  });

  // Close when clicking outside
  document.addEventListener('click', function (e) {
    if (e.target !== inputEl) {
      resultsEl.innerHTML = '';
    }
  });
}

// ── Reverse Geocoding ──
async function reverseGeocode(lat, lon, inputId, isStart) {
  try {
    const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lon},${lat}`);
    const data = await res.json();
    
    let shortName = `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    if (data && data.address && data.address.Match_addr) {
      shortName = data.address.Match_addr;
    }
    
    const inp = document.getElementById(inputId);
    inp.value = shortName;
    
    if (isStart) startCoords = [lat, lon];
    else endCoords = [lat, lon];
    
    updateMarker(lat, lon, isStart, shortName);
    resetCalcButton();
  } catch (err) {
    console.error('Reverse geocode failed:', err);
  }
}

function updateMarker(lat, lon, isStart, label) {
  const key = isStart ? 'start' : 'end';
  if (markers[key]) map.removeLayer(markers[key]);
  
  markers[key] = L.circleMarker([lat, lon], {
    radius: 6,
    fillColor: isStart ? 'var(--navy)' : 'var(--red)',
    color: '#fff',
    weight: 2,
    fillOpacity: 1
  }).addTo(map).bindPopup(`<b>${isStart ? 'Start' : 'End'}:</b> ${label}`).openPopup();
  
  map.setView([lat, lon], 13);
}

// ── Routing & Calculation ──
function initCalculator() {
  const btnCalc = document.getElementById('btn-calc');
  btnCalc.addEventListener('click', () => {
    fetchAndRenderRoute();
  });
  
  const vehicleSelect = document.getElementById('jp-vehicle');
  const modeBtns = document.querySelectorAll('.gm-mode-btn');

  if (vehicleSelect && modeBtns.length) {
    // Dropdown change updates buttons
    vehicleSelect.addEventListener('change', () => {
      resetCalcButton();
      modeBtns.forEach(btn => btn.classList.remove('active'));
      const activeBtn = Array.from(modeBtns).find(b => b.dataset.val === vehicleSelect.value);
      if (activeBtn) activeBtn.classList.add('active');
    });

    // Buttons click updates dropdown
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.val) {
          vehicleSelect.value = btn.dataset.val;
          resetCalcButton();
          // Optionally auto-calculate if route is ready
          if (startCoords && endCoords) fetchAndRenderRoute();
        }
      });
    });
  }
}

function fetchAndRenderRoute() {
  if (!startCoords || !endCoords) {
    return;
  }

  const btnCalc = document.getElementById('btn-calc');
  const resPanel = document.getElementById('jp-results');
  const vClass = document.getElementById('jp-vehicle').value;

  btnCalc.textContent = "Loading Route...";
  btnCalc.style.opacity = '0.7';

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;

  fetch(osrmUrl)
    .then(response => response.json())
    .then(data => {
      if (data.code !== 'Ok') {
        alert("Could not find a valid driving route.");
        return;
      }

      const route = data.routes[0];
      const distKm = route.distance / 1000;
      const durationSecs = route.duration;
      const geojson = route.geometry;

      renderRoute(geojson, distKm, durationSecs, vClass);

      btnCalc.textContent = "Calculated ✓";
      btnCalc.style.background = '#9CA3AF';
      btnCalc.style.borderColor = '#9CA3AF';
      btnCalc.style.color = '#FFFFFF';
      btnCalc.style.opacity = '1';
      resPanel.style.display = 'block';
    })
    .catch(err => {
      console.error(err);
      resetCalcButton();
      btnCalc.style.opacity = '1';
    });
}

function renderRoute(geojson, distKm, baseDurationSecs, vClass) {
  if (currentRouteLayer) {
    map.removeLayer(currentRouteLayer);
  }

  currentRouteLayer = L.geoJSON(geojson, {
    style: {
      color: '#1A73E8',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }
  }).addTo(map);

  map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50] });

  const baseToll = Math.max(1.50, distKm * 0.15); 
  
  const trafficFactors = [
    { label: 'Clear', multi: 0.8, color: 'var(--green)', timeMod: 1.0 },
    { label: 'Moderate', multi: 1.0, color: 'var(--amber)', timeMod: 1.3 },
    { label: 'Heavy', multi: 1.4, color: 'var(--red)', timeMod: 1.8 }
  ];
  const tState = trafficFactors[Math.floor(Math.random() * trafficFactors.length)];

  let cMulti = 0.8;
  if (vClass === 'EV') cMulti = 0.2;
  if (vClass === 'Diesel') cMulti = 1.8;

  const finalTimeMins = Math.round((baseDurationSecs * tState.timeMod) / 60);

  const hours = Math.floor(finalTimeMins / 60);
  const mins = finalTimeMins % 60;
  const timeStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

  const trafficSurcharge = baseToll * tState.multi - baseToll;
  const carbonSurcharge = baseToll * cMulti - baseToll;
  const totalFee = baseToll + trafficSurcharge + carbonSurcharge;

  document.getElementById('res-time').textContent = timeStr;
  document.getElementById('res-dist').textContent = `${distKm.toFixed(1)} km`;
  document.getElementById('res-base').textContent = `RM ${baseToll.toFixed(2)}`;
  document.getElementById('res-traf-multi').textContent = `(×${tState.multi.toFixed(1)})`;
  document.getElementById('res-traf-fee').textContent = `${trafficSurcharge >= 0 ? '+' : ''} RM ${trafficSurcharge.toFixed(2)}`;
  document.getElementById('res-carb-multi').textContent = `(×${cMulti.toFixed(1)})`;
  document.getElementById('res-carb-fee').textContent = `${carbonSurcharge >= 0 ? '+' : ''} RM ${carbonSurcharge.toFixed(2)}`;
  document.getElementById('res-total').textContent = `RM ${Math.max(0, totalFee).toFixed(2)}`;
}
