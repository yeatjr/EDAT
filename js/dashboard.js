/* ── dashboard.js (Advanced Routing & Geocoding) ── */

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initAutocomplete('jp-start', 'jp-start-results', true);
  initAutocomplete('jp-end', 'jp-end-results', false);
  initCalculator();
});

const OFFICIAL_TOLL_RATES = [
  { plaza: "Duta (PLUS)", rate: 3.40, highway: "E1" },
  { plaza: "Subang (PLUS)", rate: 2.10, highway: "E1" },
  { plaza: "Damansara (PLUS)", rate: 1.00, highway: "E1" },
  { plaza: "Sg Besi (PLUS)", rate: 2.30, highway: "E2" },
  { plaza: "Kajang (PLUS)", rate: 1.10, highway: "E2" },
  { plaza: "Skudai (PLUS)", rate: 4.20, highway: "E2" },
  { plaza: "Kempas (PLUS)", rate: 2.10, highway: "E2" },
  { plaza: "Gombak (LPT)", rate: 6.00, highway: "E8" },
  { plaza: "Bentong (LPT)", rate: 3.50, highway: "E8" },
  { plaza: "LDP Penchala", rate: 2.10, highway: "E11" },
  { plaza: "LDP Petaling Jaya", rate: 2.10, highway: "E11" },
  { plaza: "LDP Puchong Selatan", rate: 2.10, highway: "E11" },
  { plaza: "MEX Salak Selatan", rate: 2.20, highway: "E20" },
  { plaza: "MEX Seri Kembangan", rate: 2.20, highway: "E20" },
  { plaza: "MEX Putrajaya", rate: 3.50, highway: "E20" },
  { plaza: "KESAS Sunway", rate: 2.00, highway: "E5" },
  { plaza: "KESAS Awan Besar", rate: 2.00, highway: "E5" },
  { plaza: "DUKE Ayer Panas", rate: 2.50, highway: "E33" },
  { plaza: "SPRINT Damansara", rate: 2.00, highway: "E23" },
  { plaza: "AKLEH", rate: 2.50, highway: "E12" },
  { plaza: "SMART Tunnel", rate: 3.00, highway: "E38" },
  { plaza: "Tanjung Kupang", rate: 7.50, highway: "E3" }
];

let map, currentRouteLayer, startMarker, endMarker;
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

let isSidebarOpen = true;

// Define Base URL for API calls to switch between local and Cloud Run
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://edat-backend-production.up.railway.app'; // Replace with Cloud Run URL

function initMap() {
  const mapContainer = document.getElementById('edat-map');
  if (!mapContainer) return;

  map = L.map('edat-map', {
    zoomControl: false
  }).setView([3.1000, 101.6000], 10);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
  
  // Trigger toll detection for entry/exit points
  detectClosestToll({ lat, lng: lon }, isStart ? 'start' : 'end');
}

// ─── Toll Detection Logic ───────────────────────────────────────
async function detectClosestToll(latlng, type) {
  const labelId = type === 'start' ? 'entry-plaza-label' : 'exit-plaza-label';
  const label = document.getElementById(labelId);
  if (!label) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/gov/toll/closest?lat=${latlng.lat}&lng=${latlng.lng}`);
    const data = await res.json();
    if (data.found) {
      label.textContent = `📍 ${type === 'start' ? 'Entry' : 'Exit'}: ${data.plaza} (${data.distance_km}km away)`;
      label.style.color = '#10b981';
      label.dataset.rate = data.rate;
      label.dataset.plaza = data.plaza;
    } else {
      label.textContent = `📍 No major toll detected near ${type === 'start' ? 'start' : 'end'}`;
      label.style.color = '#6b7280';
      label.dataset.rate = 0;
      label.dataset.plaza = '';
    }
  } catch (err) {
    console.warn('Toll detection failed:', err);
  }
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

    // Time Input Initialization
    const timeInp = document.getElementById('jp-time');
    if (timeInp) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      timeInp.value = `${hh}:${mm}`;
      
      timeInp.addEventListener('change', () => {
        const hour = parseInt(timeInp.value.split(':')[0]);
        const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
        const tipEl = document.getElementById('peak-tip');
        if (isPeak) {
          tipEl.style.display = 'block';
        } else {
          tipEl.style.display = 'none';
        }
        
        // Refresh the environment UI (Load Bar/Text) based on the new time
        if (window.EDATCore && window.EDATCore.Analyst) {
          window.EDATCore.Analyst.analyze(hour); 
          updateEnvironmentWidgets();
        }
        
        // Auto-recalculate if results are already shown
        if (startCoords && endCoords) fetchAndRenderRoute();
      });
    }
  }
}

function fetchAndRenderRoute() {
  if (!startCoords || !endCoords) {
    return;
  }

  const btnCalc = document.getElementById('btn-calc');
  const resPanel = document.getElementById('jp-results');
  const vClass = document.getElementById('jp-vehicle').value;
  const selectedTime = document.getElementById('jp-time')?.value || null;
  const hourOverride = selectedTime ? parseInt(selectedTime.split(':')[0]) : null;

  btnCalc.textContent = "Loading Route...";
  btnCalc.style.opacity = '0.7';

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;

  Promise.all([
    fetch(osrmUrl).then(r => r.json()),
    fetch(`${API_BASE_URL}/api/routing/google-tolls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: startCoords[0], lng: startCoords[1] },
        destination: { lat: endCoords[0], lng: endCoords[1] }
      })
    }).then(r => r.json()).catch(() => ({}))
  ]).then(async ([osrmData, googleData]) => {
    if (osrmData.code !== 'Ok') {
      alert("Could not find a valid driving route.");
      resetCalcButton();
      return;
    }

    const route = osrmData.routes[0];
    const geojson = route.geometry;
    
    const drive = googleData.drive || {};
    const transit = googleData.transit || {};

    // 1. Detect Nearest Toll / Highway Entry
    // (Detailed detection is handled later in renderRoute via aiContext.crossedPlazas)

    // 2. Determine Distance & Duration
    // Use OSRM as primary for map consistency, but override with Google if real
    let distKm = route.distance / 1000;
    let durationSecs = route.duration;
    
    if (!googleData.isMock) {
      if (drive.distanceMeters) distKm = parseFloat(drive.distanceMeters) / 1000;
      if (drive.duration) durationSecs = parseInt(drive.duration);
    }

    // 2. Determine Base Toll (STRICT: Entry/Exit > Route Scanning > Google Routes > RM 0.00)
    let baseToll = 0; 
    let tollSource = 'None Detected';
    let crossedPlazas = [];

    // --- NEW: Sync with Entry/Exit labels shown at the top ---
    const entryEl = document.getElementById('entry-plaza-label');
    const exitEl = document.getElementById('exit-plaza-label');
    const entryLabel = entryEl ? entryEl.textContent : '';
    const exitLabel = exitEl ? exitEl.textContent : '';
    
    // Check if we found plazas at the markers
    const plazasAtMarkers = [];
    [entryLabel, exitLabel].forEach(label => {
      // Clean the label: Remove emojis, "Entry:", "Exit:", and everything after the first "(" that is a distance
      if (label && (label.includes('Entry:') || label.includes('Exit:')) && !label.includes('No major toll')) {
        // Example: "📍 Exit: Skudai (PLUS) (6.48km away)"
        let cleaned = label.replace(/[^\x00-\x7F]/g, "") // Remove emojis
                           .replace('Entry:', '')
                           .replace('Exit:', '')
                           .trim();
        
        // Now we have "Skudai (PLUS) (6.48km away)"
        // We want to keep the first set of parentheses if it's the highway name, but remove the second one if it's distance
        // Logic: If there are multiple "(", split by " (" and take the parts that match our DB
        OFFICIAL_TOLL_RATES.forEach(p => {
          if (cleaned.includes(p.plaza)) {
            if (!plazasAtMarkers.some(m => m.name === p.plaza)) {
              plazasAtMarkers.push({ name: p.plaza, rate: p.rate, highway: p.highway });
            }
          }
        });
      }
    });

    // Try Route Polyline Scanning (Best Accuracy for middle tolls)
    if (geojson && geojson.coordinates) {
      try {
        const scannerRes = await fetch(`${API_BASE_URL}/api/gov/toll/match-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ polyline: geojson.coordinates.map(c => [c[1], c[0]]) }) // [lat, lng]
        });
        const scanData = await scannerRes.json();
        if (scanData.found) {
          crossedPlazas = scanData.plazas;
        }
      } catch (scanErr) {
        console.warn('Route toll scanning failed:', scanErr);
      }
    }

    // Merge Marker Plazas and Scanned Plazas (Unique)
    plazasAtMarkers.forEach(p => {
      if (!crossedPlazas.some(cp => cp.name === p.name)) {
        crossedPlazas.push(p);
      }
    });

    if (crossedPlazas.length > 0) {
      baseToll = crossedPlazas.reduce((sum, p) => sum + p.rate, 0);
      tollSource = `LLM Verified (${crossedPlazas.length} Plazas)`;
    }

    // --- NEW: Smart Heuristic (Match Highway Names in OSRM Summary) ---
    if (baseToll === 0 && route.summary) {
      const summary = route.summary.toUpperCase();
      // Common Malaysian Highway Codes and Names
      const highwayKeywords = ["LEBUHRAYA", "EXPRESSWAY", "HIGHWAY", "BRIDGE", "TUNNEL", "PLUS", "LDP", "MEX", "KESAS", "DUKE", "SPRINT", "AKLEH", "SMART"];
      const hasHighwayKeyword = highwayKeywords.some(k => summary.includes(k)) || /E\d+/.test(summary);

      if (hasHighwayKeyword) {
        // Try to match specific highway codes (e.g. E1, E2) or names
        const bestMatch = OFFICIAL_TOLL_RATES.find(p => 
          summary.includes(p.highway) || 
          summary.includes(p.plaza.toUpperCase().split(' ')[0])
        );

        if (bestMatch) {
          baseToll = bestMatch.rate;
          tollSource = `AI Context: ${bestMatch.highway} Detected`;
          crossedPlazas.push({ 
            name: `Predicted ${bestMatch.highway} Toll`, 
            rate: bestMatch.rate, 
            highway: bestMatch.highway,
            isHeuristic: true 
          });
        }
      }
    }

    // Fallback ONLY to Google Toll Info (if they have data we missed)
    if (baseToll === 0 && drive.travelAdvisory && drive.travelAdvisory.tollInfo) {
      const priceList = drive.travelAdvisory.tollInfo.estimatedPrice;
      if (priceList && priceList.length > 0) {
        baseToll = parseFloat(priceList[0].units || 0) + (parseFloat(priceList[0].nanos || 0) / 1e9);
        tollSource = 'Google Routes API';
      }
    }
    
    console.log(`[EDAT] Final Base Toll: RM ${baseToll.toFixed(2)} (${tollSource})`);

    // 3. Determine Transit Data
    // Priority: data.gov.my GTFS > Google Transit API > Distance Fallback
    let transitFare = 1.00 + (distKm * 0.20); // Distance-based fallback
    let transitDurationSecs = durationSecs * 2.2; // Fallback estimate
    let transitFareSource = 'Distance Estimate';

    // Try Government GTFS fare first
    try {
      const isJohor = destination.lat < 2.0; // Simple lat check for Johor area
      const govFareUrl = isJohor ? `${API_BASE_URL}/api/gov/bus-fare?agency=johor` : `${API_BASE_URL}/api/gov/bus-fare`;
      const govFareRes = await fetch(govFareUrl);
      const govFareData = await govFareRes.json();
      
      if (govFareData.fares && govFareData.fares.length > 0) {
        const validFare = govFareData.fares[0];
        if (validFare && validFare.price > 0) {
          transitFare = validFare.price;
          transitFareSource = `${validFare.source_agency}`;
        }
      }
    } catch (govErr) {
      console.log('[Gov GTFS] Fare lookup unavailable, trying Google...');
    }

    // If Gov API didn't provide a fare, try Google Transit API
    if (transitFareSource === 'Distance Estimate') {
      if (transit.travelAdvisory && transit.travelAdvisory.transitFare) {
        const fare = transit.travelAdvisory.transitFare;
        transitFare = parseFloat(fare.units || 0) + (parseFloat(fare.nanos || 0) / 1e9);
        transitFareSource = 'Google Routes API';
      } else {
        // Final estimate for intercity/long distance if no API data
        transitFare = 2.00 + (distKm * 0.12); 
        transitFareSource = 'Intercity Estimate (RM 0.12/km)';
      }
    }
    if (transit.duration) transitDurationSecs = parseInt(transit.duration);

    await renderRoute(geojson, distKm, durationSecs, vClass, baseToll, {
      googleDrivingData: drive,
      googleTransitData: transit,
      transitFare: transitFare,
      transitDurationSecs: transitDurationSecs,
      transitFareSource: transitFareSource,
      tollSource: tollSource,
      crossedPlazas: crossedPlazas
    }, hourOverride);

    btnCalc.textContent = "Calculated ✓";
    btnCalc.style.background = '#9CA3AF';
    btnCalc.style.borderColor = '#9CA3AF';
    btnCalc.style.color = '#FFFFFF';
    btnCalc.style.opacity = '1';
    resPanel.style.display = 'block';
  }).catch(err => {
    console.error("Routing Error:", err);
    resetCalcButton();
    btnCalc.style.opacity = '1';
  });
}

async function renderRoute(geojson, distKm, baseDurationSecs, vClass, baseToll, aiContext, hourOverride) {
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
  
  // Remove random traffic simulation to keep time realistic
  const finalTimeMins = Math.round(baseDurationSecs / 60);

  const hours = Math.floor(finalTimeMins / 60);
  const mins = finalTimeMins % 60;
  const timeStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

  // Get Quote from EDAT Multi-Agent System (Cloud Backend)
  // Skip if base toll is zero
  let quote = { finalTotal: 0, breakdown: { analyst: [], legal: [] } };
  if (baseToll > 0 && window.EDATCore && window.EDATCore.Pricing) {
    // PASS THE HOUR TO THE SYSTEM
    quote = await window.EDATCore.Pricing.calculateQuote(baseToll, vClass, hourOverride);
  } else {
    // Fill dummy data for 0 toll or if EDATCore is missing
    quote.breakdown.analyst = [
      {mult:1, fee:0, reason: 'System Initializing...'}, 
      {mult:1, fee:0, reason: 'System Initializing...'}, 
      {mult:1, fee:0, reason: 'System Initializing...'}, 
      {mult:1, fee:0, reason: 'System Initializing...'}
    ];
    quote.breakdown.legal = [{mult:1, fee:0}, {mult:1, fee:0}];
    quote.finalTotal = baseToll;
  }

  document.getElementById('res-time').textContent = timeStr;
  document.getElementById('res-dist').textContent = `${distKm.toFixed(1)} km`;
  document.getElementById('res-base').textContent = `RM ${baseToll.toFixed(2)}`;
  
  // Highlight the Toll Source
  const baseLabel = document.querySelector('span[id="res-base"]').previousElementSibling;
  if (baseLabel) {
    baseLabel.innerHTML = `<span style="color:#3b82f6;">●</span> Base Toll (${aiContext.tollSource || 'Estimated'})`;
  }

  // --- RESTORED: Update Plaza list in UI ---
  const detectorPanel = document.getElementById('res-toll-detector');
  if (detectorPanel) {
    if (aiContext.crossedPlazas && aiContext.crossedPlazas.length > 0) {
      detectorPanel.innerHTML = `
        <div style="font-weight:bold; margin-bottom: 5px; color: #10b981; font-size: 0.8rem;">✅ Verified Toll Crossings:</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${aiContext.crossedPlazas.map(p => `<div style="font-size: 0.75rem; color: #374151;">🛣️ ${p.name}: <b>RM ${p.rate.toFixed(2)}</b></div>`).join('')}
        </div>
      `;
      detectorPanel.style.background = "#f0fdf4";
      detectorPanel.style.borderLeft = "3px solid #10b981";
      detectorPanel.style.padding = "10px";
      detectorPanel.style.borderRadius = "4px";
    } else {
      detectorPanel.innerHTML = `<div style="font-size: 0.75rem; color: #64748b;">✅ No Tolls detected on this route.</div>`;
      detectorPanel.style.background = "#f8fafc";
      detectorPanel.style.borderLeft = "3px solid #e2e8f0";
    }
  }

    // --- RESTORED: Detailed Multi-Agent Pricing Breakdown ---
    // Analyst Factors
    const vMult = quote.breakdown.analyst[0].mult;
    const vFee = (baseToll * vMult) - baseToll;
    document.getElementById('res-vol-multi').textContent = `(×${vMult.toFixed(2)})`;
    document.getElementById('res-vol-fee').textContent = `${vFee >= 0 ? '+' : ''} RM ${vFee.toFixed(2)}`;
    document.getElementById('res-vol-fee').style.color = vFee > 0 ? '#ef4444' : '#fbbf24';

    const wMult = quote.breakdown.analyst[1].mult;
    const wFee = (baseToll * wMult) - baseToll;
    document.getElementById('res-wea-multi').textContent = `(×${wMult.toFixed(2)})`;
    document.getElementById('res-wea-fee').textContent = `${wFee >= 0 ? '+' : ''} RM ${wFee.toFixed(2)}`;
    document.getElementById('res-wea-fee').style.color = wFee > 0 ? '#ef4444' : '#fbbf24';

    const rMult = quote.breakdown.analyst[3].mult;
    const rFee = (baseToll * rMult) - baseToll;
    document.getElementById('res-road-multi').textContent = `(×${rMult.toFixed(2)})`;
    document.getElementById('res-road-fee').textContent = `${rFee >= 0 ? '+' : ''} RM ${rFee.toFixed(2)}`;
    document.getElementById('res-road-fee').style.color = rFee > 0 ? '#ef4444' : '#fbbf24';

    const tMult = quote.breakdown.analyst[2].mult;
    const tFee = (baseToll * tMult) - baseToll;
    document.getElementById('res-temp-multi').textContent = `(×${tMult.toFixed(2)})`;
    document.getElementById('res-temp-fee').textContent = `${tFee >= 0 ? '+' : ''} RM ${tFee.toFixed(2)}`;
    document.getElementById('res-temp-fee').style.color = tFee > 0 ? '#ef4444' : '#fbbf24';

    // Legal Factors
    const aMult = quote.breakdown.legal[0].mult;
    const aFee = (baseToll * aMult) - baseToll;
    document.getElementById('res-aqi-multi').textContent = `(×${aMult.toFixed(2)})`;
    document.getElementById('res-aqi-fee').textContent = `${aFee >= 0 ? '+' : ''} RM ${aFee.toFixed(2)}`;
    document.getElementById('res-aqi-fee').style.color = aFee > 0 ? '#ef4444' : '#fbbf24';

    const cMult = quote.breakdown.legal[1].mult;
    const cFee = (baseToll * cMult) - baseToll;
    document.getElementById('res-carb-multi').textContent = `(×${cMult.toFixed(2)})`;
    const carbonDisplayFee = Math.abs(cFee).toFixed(2);
    document.getElementById('res-carb-fee').textContent = `${cFee >= 0 ? '+' : ''} RM ${carbonDisplayFee}`;
    document.getElementById('res-carb-fee').style.color = cFee > 0 ? '#ef4444' : '#4ade80';

    document.getElementById('res-total').textContent = `RM ${quote.finalTotal.toFixed(2)}`;

    // --- Comparison Header Logic ---
    const compHeader = document.getElementById('comparison-header');
    if (compHeader) {
      compHeader.style.display = 'flex';
      document.getElementById('comp-drive').textContent = `Driving: RM ${quote.finalTotal.toFixed(2)}`;
      document.getElementById('comp-transit').textContent = `Transit: RM ${aiContext.transitFare.toFixed(2)}`;
    }

    // --- Detailed Transit Card Logic ---
    const tDurMin = Math.round(aiContext.transitDurationSecs / 60);
    const resTimeTransit = document.getElementById('res-time-transit');
    if (resTimeTransit) resTimeTransit.textContent = `${Math.floor(tDurMin/60)} hr ${tDurMin%60} min`;
    
    const resTotalTransit = document.getElementById('res-total-transit');
    if (resTotalTransit) resTotalTransit.textContent = `RM ${aiContext.transitFare.toFixed(2)}`;
    
    const resTransitPrice = document.getElementById('res-transit-price-tag');
    if (resTransitPrice) resTransitPrice.textContent = `💰 RM ${aiContext.transitFare.toFixed(2)}`;

    // Parse Google Transit Steps for Chips & Times
    const stepsContainer = document.getElementById('transit-steps-container');
    const depLabel = document.getElementById('res-dep-time');
    const arrLabel = document.getElementById('res-arr-time');
    
    if (stepsContainer && depLabel && arrLabel) {
      stepsContainer.innerHTML = ''; // Clear
      
      const hasGoogleData = aiContext.googleTransitData && aiContext.googleTransitData.legs && aiContext.googleTransitData.legs[0].steps;
      
      if (hasGoogleData) {
        const steps = aiContext.googleTransitData.legs[0].steps;
        
        // Extract Overall Times
        let firstTransit = steps.find(s => s.transitDetails);
        let lastTransit = [...steps].reverse().find(s => s.transitDetails);
        
        if (firstTransit && firstTransit.transitDetails.stopDetails.departureTime) {
          const d = new Date(firstTransit.transitDetails.stopDetails.departureTime);
          depLabel.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (lastTransit && lastTransit.transitDetails.stopDetails.arrivalTime) {
          const a = new Date(lastTransit.transitDetails.stopDetails.arrivalTime);
          arrLabel.textContent = a.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Create Chips
        steps.forEach((step, idx) => {
          if (step.transitDetails) {
            const line = step.transitDetails.transitLine;
            const vType = line.vehicle.type;
            const icon = (vType === 'BUS') ? '🚌' : (vType === 'HEAVY_RAIL' || vType === 'SUBWAY' || vType === 'RAIL') ? '🚆' : '🚐';
            const bgColor = line.color || '#3b82f6';
            const txtColor = line.textColor || '#ffffff';
            
            const chip = document.createElement('div');
            chip.style.cssText = `background: ${bgColor}; color: ${txtColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
            chip.innerHTML = `<span>${icon}</span> <span>${line.shortName || line.name}</span>`;
            stepsContainer.appendChild(chip);
          } else if (step.travelMode === 'WALKING' && step.distanceMeters > 100) {
            const walk = document.createElement('span');
            walk.style.cssText = 'font-size: 1rem; opacity: 0.4;';
            walk.textContent = '🚶';
            stepsContainer.appendChild(walk);
          }
          if (idx < steps.length - 1 && steps[idx+1].transitDetails) {
            const arrow = document.createElement('span');
            arrow.style.cssText = 'font-size: 0.6rem; opacity: 0.3;';
            arrow.textContent = '▶';
            stepsContainer.appendChild(arrow);
          }
        });
      } else {
        // FALLBACK: Generic Label
        depLabel.textContent = "Scheduled";
        arrLabel.textContent = "Service";
        
        const estChip = document.createElement('div');
        estChip.style.cssText = `background: var(--navy); color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 6px;`;
        estChip.innerHTML = `<span>🚌</span> <span>Express Bus / Intercity</span>`;
        stepsContainer.appendChild(estChip);
      }
    }

    // --- NEW: Trip History & Automatic Voucher Logic (Firebase Version) ---
    saveTripToHistory(quote, aiContext);

    async function saveTripToHistory(quote, context) {
      const user = auth.currentUser;
      const trafficFee = quote.breakdown.analyst[0].fee;

      // Prepare current trip data
      const newTrip = {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        entry: document.getElementById('entry-plaza-label').textContent.replace('📍 Entry: ', ''),
        exit: document.getElementById('exit-plaza-label').textContent.replace('📍 Exit: ', ''),
        totalCharge: quote.finalTotal,
        trafficFee: trafficFee,
        distance: document.getElementById('res-dist').textContent
      };

      if (user) {
        // --- LOGGED IN: Save to Firebase Firestore ---
        try {
          const userRef = db.collection('users').doc(user.uid);
          
          // 1. Add to user's history subcollection
          await userRef.collection('history').add(newTrip);
          
          // 2. If it's a green trip (no traffic fee), increment counter
          if (trafficFee === 0) {
            await db.runTransaction(async (transaction) => {
              const userDoc = await transaction.get(userRef);
              const newCount = (userDoc.data().greenTripCount || 0) + 1;
              transaction.update(userRef, { greenTripCount: newCount });
              
              console.log(`[FIREBASE] Green Trip #${newCount} recorded for ${user.displayName}`);

              // 3. Check for Milestone (Every 10 trips)
              if (newCount > 0 && newCount % 10 === 0) {
                const voucherCode = 'EVOUCH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                const voucherData = {
                  userId: user.uid,
                  code: voucherCode,
                  type: 'Smooth Traffic Reward',
                  value: 'RM 2.00 Discount',
                  awardedAt: firebase.firestore.FieldValue.serverTimestamp(),
                  status: 'active'
                };
                
                const vRef = db.collection('vouchers').doc();
                transaction.set(vRef, voucherData);
                
                // Show notification after transaction success
                setTimeout(() => showVoucherNotification({ id: voucherCode, value: 'RM 2.00 Discount' }), 1000);
              }
            });
          }
        } catch (err) {
          console.error("[FIREBASE] History sync failed:", err);
        }
      } else {
        // --- ANONYMOUS: Fallback to LocalStorage (Original Logic) ---
        let history = JSON.parse(localStorage.getItem('edat_trip_history') || '[]');
        history.push({...newTrip, timestamp: new Date().toISOString()});
        localStorage.setItem('edat_trip_history', JSON.stringify(history));

        const greenTrips = history.filter(t => t.trafficFee === 0);
        if (greenTrips.length > 0 && greenTrips.length % 10 === 0) {
          const vCode = 'VOUCH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
          showVoucherNotification({ id: vCode, value: 'RM 2.00 Discount' });
        }
      }
    }

    function awardAutomaticVoucher(count) {
      let vouchers = JSON.parse(localStorage.getItem('edat_vouchers') || '[]');
      const newVoucher = {
        id: 'VOUCH-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        type: 'Smooth Traffic Reward',
        value: 'RM 2.00 Discount',
        reason: `Awarded for ${count} Green Trips`,
        date: new Date().toLocaleDateString()
      };
      
      vouchers.push(newVoucher);
      localStorage.setItem('edat_vouchers', JSON.stringify(vouchers));

      // Show UI Notification
      showVoucherNotification(newVoucher);
    }

    function showVoucherNotification(voucher) {
      const notify = document.createElement('div');
      notify.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: #10b981; color: white; padding: 20px; border-radius: 12px;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        width: 300px; border-left: 5px solid #064e3b;
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      `;
      notify.innerHTML = `
        <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 5px;">🎉 Milestone Reached!</div>
        <div style="font-size: 0.85rem; opacity: 0.9;">You've completed 10 low-congestion trips.</div>
        <div style="margin-top: 15px; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 6px; font-family: monospace; font-weight: bold; text-align: center; border: 1px dashed white;">
          CODE: ${voucher.id}
        </div>
        <div style="font-size: 0.7rem; margin-top: 10px; text-align: right;">${voucher.value}</div>
      `;
      document.body.appendChild(notify);
      
      setTimeout(() => {
        notify.style.transform = 'translateX(400px)';
        notify.style.opacity = '0';
        setTimeout(() => notify.remove(), 500);
      }, 8000);
    }

    // --- Google Maps Transit Integration ---
    const transitCard = document.getElementById('card-transit');
    if (transitCard) {
      transitCard.style.cursor = 'pointer';
      transitCard.title = "Click to view live bus/train schedule on Google Maps";
      
      // Remove any existing listeners
      const newCard = transitCard.cloneNode(true);
      transitCard.parentNode.replaceChild(newCard, transitCard);
      
      newCard.addEventListener('click', () => {
        const startInput = document.getElementById('jp-start');
        const endInput = document.getElementById('jp-end');
        const start = encodeURIComponent(startInput ? startInput.value : '');
        const end = encodeURIComponent(endInput ? endInput.value : '');
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}&travelmode=transit`;
        window.open(mapsUrl, '_blank');
      });
    }



      // Show data source badge for transit fare
      const srcBadge = document.getElementById('transit-fare-source');
      if (srcBadge) {
        srcBadge.textContent = `Source: ${aiContext.transitFareSource || 'Unknown'}`;
        srcBadge.style.display = 'inline-block';
      }
}


// --- Live Environment Widget Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const simSelect = document.getElementById('sim-scenario');
  if(simSelect) {
    simSelect.addEventListener('change', (e) => {
      if(window.EDATCore) {
        window.EDATCore.setScenario(e.target.value);
        updateEnvironmentWidgets();
        // If route is already calculated, recalculate
        if(document.getElementById('jp-results').style.display === 'block') {
           document.getElementById('btn-calc').click();
        }
      }
    });
    
    // Slight delay to ensure EDATCore is fully loaded
    setTimeout(() => {
      if(window.EDATCore) updateEnvironmentWidgets();
    }, 100);

    const btnSync = document.getElementById('btn-sync-apims');
    if(btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.textContent = "Syncing MET Malaysia...";
        try {
          const res = await fetch(`${API_BASE_URL}/api/environment/sync`, { method: 'POST' });
          const data = await res.json();
          
          // Update local state with live MET Malaysia data
          if (window.EDATCore && window.EDATCore.Analyst) {
            window.EDATCore.Analyst.currentState.api = data.api;
            window.EDATCore.Analyst.currentState.temperature = data.temperature;
            window.EDATCore.Analyst.currentState.rainfall = data.rainfall;
          }
          if (window.EDATCore && window.EDATCore.DataHub) {
            window.EDATCore.DataHub.lastSync = new Date(data.timestamp).toLocaleTimeString();
          }
          
          // Show the data source on the widget
          const sourceLabel = document.getElementById('env-source-label');
          if (sourceLabel) {
            sourceLabel.textContent = data.source || 'Unknown';
            sourceLabel.style.color = data.source && data.source.includes('MET Malaysia') ? '#10b981' : '#fbbf24';
          }
          
          updateEnvironmentWidgets();
          
          if(document.getElementById('jp-results').style.display === 'block') {
             document.getElementById('btn-calc').click();
          }
        } catch (e) {
          console.error("MET Malaysia Sync Failed", e);
        } finally {
          btnSync.textContent = "Sync MET Malaysia";
        }
      });
    }
  }
});

function updateEnvironmentWidgets() {
  if (!window.EDATCore || !window.EDATCore.Analyst) return;
  const state = window.EDATCore.Analyst.currentState;
  
  // Update Load
  const loadPct = Math.round(state.occupancy * 100);
  document.getElementById('env-load-text').textContent = `Highway Load: ${loadPct}%`;
  document.getElementById('env-load-bar').style.width = `${loadPct}%`;
  
  let statusColor = '#4ade80', statusText = 'Normal';
  if(loadPct > 85) { statusColor = '#ef4444'; statusText = 'Peak'; }
  else if(loadPct >= 60) { statusColor = '#fbbf24'; statusText = 'Rising'; }
  
  document.getElementById('env-load-status').textContent = statusText;
  document.getElementById('env-load-status').style.color = statusColor;
  document.getElementById('env-load-bar').style.background = statusColor;

  // Update Weather
  let wIcon = '☀️', wText = `Clear (${state.rainfall}mm/h)`;
  if(state.rainfall > 50) { wIcon = '⛈️'; wText = `Storm (${state.rainfall}mm/h)`; }
  else if(state.rainfall > 10) { wIcon = '🌧️'; wText = `Heavy Rain (${state.rainfall}mm/h)`; }
  else if(state.rainfall > 0) { wIcon = '🌦️'; wText = `Rain (${state.rainfall}mm/h)`; }
  
  document.getElementById('env-weather-icon').textContent = wIcon;
  document.getElementById('env-weather-text').textContent = wText;
  
  // Update Temperature
  if (document.getElementById('env-temp-text')) {
    document.getElementById('env-temp-text').textContent = `${state.temperature}°C`;
  }

  // Update AQI
  let aText = `API: ${state.api} (Good)`;
  if(state.api > 300) aText = `API: ${state.api} (Hazardous)`;
  else if(state.api > 200) aText = `API: ${state.api} (V. Unhealthy)`;
  else if(state.api > 100) aText = `API: ${state.api} (Unhealthy)`;
  else if(state.api > 50) aText = `API: ${state.api} (Moderate)`;
  
  document.getElementById('env-aqi-text').textContent = aText;

  // Update Sync Status
  document.getElementById('sync-status').textContent = `Last Sync: ${window.EDATCore.DataHub.lastSync}`;

  // Refresh Heatmap if active
  if(currentMapMode === 'carbon') {
    renderCarbonHeatmap();
  }
}

// --- Carbon Heatmap Mode Logic ---
let currentMapMode = 'standard';
let heatmapLayerGroup = L.layerGroup();

const carbonHotspots = [
  { id: "FEDERAL_HQ", name: "Federal Highway PJ", lat: 3.1073, lng: 101.6375 },
  { id: "E1_DUTA", name: "Jalan Duta / NKVE", lat: 3.1742, lng: 101.6678 },
  { id: "E2_SKLAL", name: "Sungai Besi / SKLAL", lat: 3.0601, lng: 101.7067 },
  { id: "SPRINT", name: "Damansara SPRINT", lat: 3.1364, lng: 101.6212 }
];

const modeStd = document.getElementById('mode-std');
const modeCarbon = document.getElementById('mode-carbon');
if (modeStd && modeCarbon) {
  modeStd.addEventListener('click', () => switchMapMode('standard'));
  modeCarbon.addEventListener('click', () => switchMapMode('carbon'));
}

function switchMapMode(mode) {
  currentMapMode = mode;
  document.getElementById('mode-std').classList.toggle('active', mode === 'standard');
  document.getElementById('mode-carbon').classList.toggle('active', mode === 'carbon');

  if (mode === 'carbon') {
    renderCarbonHeatmap();
    if (currentRouteLayer) currentRouteLayer.setStyle({ opacity: 0.3 });
  } else {
    heatmapLayerGroup.clearLayers();
    if (currentRouteLayer) currentRouteLayer.setStyle({ opacity: 0.9 });
  }
}

function renderCarbonHeatmap() {
  heatmapLayerGroup.clearLayers();
  const intensityMap = window.EDATCore.DataHub.roadIntensityMap;

  carbonHotspots.forEach(spot => {
    const intensity = intensityMap[spot.id] || 1.0;
    
    let color = '#4ade80', radius = 800, opacity = 0.2;
    if (intensity >= 1.25) { color = '#ef4444'; radius = 2500; opacity = 0.6; } // Hazardous
    else if (intensity >= 1.15) { color = '#fbbf24'; radius = 1800; opacity = 0.4; } // Unhealthy
    else if (intensity > 1.0) { color = '#facc15'; radius = 1200; opacity = 0.3; } // Moderate

    const circle = L.circle([spot.lat, spot.lng], {
      color: color,
      fillColor: color,
      fillOpacity: opacity,
      radius: radius,
      weight: 1
    }).bindPopup(`<b>${spot.name}</b><br>Intensity: ${intensity}x`);
    
    heatmapLayerGroup.addLayer(circle);
  });

  heatmapLayerGroup.addTo(map);
}
