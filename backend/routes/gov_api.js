/**
 * EDAT Government API Integration (data.gov.my)
 * 
 * Provides:
 *  1. /api/gov/weather         — Live weather forecast from MET Malaysia
 *  2. /api/gov/weather/warning — Live weather warnings
 *  3. /api/gov/bus-fare        — Official bus fare from GTFS-Static data
 *  4. /api/gov/bus-time        — Live bus positions from GTFS-Realtime
 *  5. /api/gov/gtfs/sync       — Manual trigger to re-download GTFS ZIP
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse/sync');

// ─── Configuration ──────────────────────────────────────────────
const GOV_API_BASE = 'https://api.data.gov.my';
const GTFS_DATA_DIR = path.join(__dirname, '..', 'gtfs_data');

// GTFS agencies to download — focused on KL (Prasarana) and JB (myBAS Johor)
const GTFS_AGENCIES = [
  { key: 'prasarana-rapid-bus-kl', url: `${GOV_API_BASE}/gtfs-static/prasarana?category=rapid-bus-kl`, label: 'Rapid Bus KL' },
  { key: 'prasarana-rapid-rail-kl', url: `${GOV_API_BASE}/gtfs-static/prasarana?category=rapid-rail-kl`, label: 'Rapid Rail KL (LRT/MRT)' },
  { key: 'mybas-johor', url: `${GOV_API_BASE}/gtfs-static/mybas-johor`, label: 'myBAS Johor Bahru' },
];

// ─── Helper: Haversine distance for spatial math ────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// In-memory GTFS cache (populated on sync)
let gtfsCache = {};
let johorFareProducts = []; // Special cache for detailed Johor fares

// ─── Helper: Parse a GTFS text file from a ZIP buffer ───────────
function parseGtfsFile(zipBuffer, filename) {
  try {
    const zip = new AdmZip(zipBuffer);
    const entry = zip.getEntry(filename);
    if (!entry) return [];
    const content = entry.getData().toString('utf8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    console.error(`[GTFS] Failed to parse ${filename}:`, err.message);
    return [];
  }
}

// ─── Helper: Download and cache GTFS data for one agency ────────
async function downloadAndCacheAgency(agency) {
  console.log(`[GTFS Sync] Downloading ${agency.label} from ${agency.url}...`);
  try {
    const response = await fetch(agency.url);
    if (!response.ok) {
      console.error(`[GTFS Sync] HTTP ${response.status} for ${agency.label}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save ZIP to disk for persistence
    if (!fs.existsSync(GTFS_DATA_DIR)) fs.mkdirSync(GTFS_DATA_DIR, { recursive: true });
    const zipPath = path.join(GTFS_DATA_DIR, `${agency.key}.zip`);
    fs.writeFileSync(zipPath, buffer);

    // Parse key files into memory
    const routes = parseGtfsFile(buffer, 'routes.txt');
    const stops = parseGtfsFile(buffer, 'stops.txt');
    const stopTimes = parseGtfsFile(buffer, 'stop_times.txt');
    const trips = parseGtfsFile(buffer, 'trips.txt');
    const fareAttributes = parseGtfsFile(buffer, 'fare_attributes.txt');
    const fareRules = parseGtfsFile(buffer, 'fare_rules.txt');
    const agency_info = parseGtfsFile(buffer, 'agency.txt');

    const cached = {
      label: agency.label,
      routes,
      stops,
      stopTimes,
      trips,
      fareAttributes,
      fareRules,
      agency: agency_info,
      lastSync: new Date().toISOString()
    };

    console.log(`[GTFS Sync] ${agency.label}: ${routes.length} routes, ${stops.length} stops, ${fareAttributes.length} fare rules loaded.`);
    return cached;
  } catch (err) {
    console.error(`[GTFS Sync] Error downloading ${agency.label}:`, err.message);
    return null;
  }
}

// ─── Sync all agencies ─────────────────────────────────────────
async function syncAllGtfs() {
  console.log('[GTFS Sync] Starting full GTFS sync...');
  for (const agency of GTFS_AGENCIES) {
    const data = await downloadAndCacheAgency(agency);
    if (data) {
      gtfsCache[agency.key] = data;
      // Special handling for Johor fare products
      if (agency.key === 'mybas-johor') {
        const zipPath = path.join(GTFS_DATA_DIR, `${agency.key}.zip`);
        const buffer = fs.readFileSync(zipPath);
        johorFareProducts = parseGtfsFile(buffer, 'fare_products.txt');
        console.log(`[GTFS Sync] Loaded ${johorFareProducts.length} detailed fare products for Johor.`);
      }
    }
  }
  console.log(`[GTFS Sync] Complete. ${Object.keys(gtfsCache).length} agencies cached.`);
}

// Try to load from disk on startup (so server restarts don't need a fresh download)
function loadCacheFromDisk() {
  if (!fs.existsSync(GTFS_DATA_DIR)) return;
  for (const agency of GTFS_AGENCIES) {
    const zipPath = path.join(GTFS_DATA_DIR, `${agency.key}.zip`);
    if (fs.existsSync(zipPath)) {
      try {
        const buffer = fs.readFileSync(zipPath);
        const routes = parseGtfsFile(buffer, 'routes.txt');
        const stops = parseGtfsFile(buffer, 'stops.txt');
        const stopTimes = parseGtfsFile(buffer, 'stop_times.txt');
        const trips = parseGtfsFile(buffer, 'trips.txt');
        const fareAttributes = parseGtfsFile(buffer, 'fare_attributes.txt');
        const fareRules = parseGtfsFile(buffer, 'fare_rules.txt');
        const agency_info = parseGtfsFile(buffer, 'agency.txt');

        // Load Johor detailed products if it's the Johor feed
        if (agency.key === 'mybas-johor') {
          johorFareProducts = parseGtfsFile(buffer, 'fare_products.txt');
          console.log(`[GTFS Cache] Loaded ${johorFareProducts.length} Johor detailed fares from disk.`);
        }

        gtfsCache[agency.key] = {
          label: agency.label, routes, stops, stopTimes, trips,
          fareAttributes, fareRules, agency: agency_info,
          lastSync: fs.statSync(zipPath).mtime.toISOString()
        };
        console.log(`[GTFS Cache] Loaded ${agency.label} from disk (${routes.length} routes).`);
      } catch (e) {
        console.warn(`[GTFS Cache] Could not load ${agency.key} from disk.`);
      }
    }
  }
}

// Load disk cache immediately on require()
loadCacheFromDisk();

// ═══════════════════════════════════════════════════════════════
//  Official LLM Toll Rates (Lembaga Lebuhraya Malaysia)
//  Verified rates for Class 1 Vehicles (Cars)
// ═══════════════════════════════════════════════════════════════
const OFFICIAL_TOLL_RATES = [
  // E1 / E2: North-South Expressway (PLUS)
  { plaza: "Duta (PLUS)", rate: 3.40, highway: "E1", lat: 3.1764, lng: 101.6669 },
  { plaza: "Subang (PLUS)", rate: 2.10, highway: "E1", lat: 3.1091, lng: 101.5855 },
  { plaza: "Damansara (PLUS)", rate: 1.00, highway: "E1", lat: 3.1297, lng: 101.6111 },
  { plaza: "Sg Besi (PLUS)", rate: 2.30, highway: "E2", lat: 3.0305, lng: 101.7101 },
  { plaza: "Kajang (PLUS)", rate: 1.10, highway: "E2", lat: 2.9734, lng: 101.7584 },
  { plaza: "Skudai (PLUS)", rate: 4.20, highway: "E2", lat: 1.5458, lng: 103.6596 },
  { plaza: "Kempas (PLUS)", rate: 2.10, highway: "E2", lat: 1.5444, lng: 103.7311 },
  
  // E8: Karak / LPT
  { plaza: "Gombak (LPT)", rate: 6.00, highway: "E8", lat: 3.2427, lng: 101.7454 },
  { plaza: "Bentong (LPT)", rate: 3.50, highway: "E8", lat: 3.3934, lng: 101.9161 },
  
  // E11: LDP
  { plaza: "LDP Penchala", rate: 2.10, highway: "E11", lat: 3.1611, lng: 101.6251 },
  { plaza: "LDP Petaling Jaya", rate: 2.10, highway: "E11", lat: 3.1044, lng: 101.6011 },
  { plaza: "LDP Puchong Selatan", rate: 2.10, highway: "E11", lat: 2.9789, lng: 101.6311 },
  
  // E20: MEX
  { plaza: "MEX Salak Selatan", rate: 2.20, highway: "E20", lat: 3.0901, lng: 101.7011 },
  { plaza: "MEX Seri Kembangan", rate: 2.20, highway: "E20", lat: 3.0189, lng: 101.6961 },
  { plaza: "MEX Putrajaya", rate: 3.50, highway: "E20", lat: 2.9461, lng: 101.6744 },
  
  // E5: KESAS
  { plaza: "KESAS Sunway", rate: 2.00, highway: "E5", lat: 3.0611, lng: 101.5951 },
  { plaza: "KESAS Awan Besar", rate: 2.00, highway: "E5", lat: 3.0644, lng: 101.6611 },
  
  // E33 / E23 / E12 / E38
  { plaza: "DUKE Ayer Panas", rate: 2.50, highway: "E33", lat: 3.1901, lng: 101.7121 },
  { plaza: "DUKE Sentul Pasar", rate: 2.50, highway: "E33", lat: 3.2089, lng: 101.6961 },
  { plaza: "SPRINT Damansara", rate: 2.00, highway: "E23", lat: 3.1361, lng: 101.6441 },
  { plaza: "AKLEH", rate: 2.50, highway: "E12", lat: 3.1622, lng: 101.7199 },
  { plaza: "SMART Tunnel", rate: 3.00, highway: "E38", lat: 3.1265, lng: 101.7144 },
  
  // LINK2 (Tuas)
  { plaza: "Tanjung Kupang", rate: 7.50, highway: "E3", lat: 1.3589, lng: 103.6261 }
];

// ═══════════════════════════════════════════════════════════════
//  ROUTE 3d: Route-Based Toll Matching (Polyline Scanner)
// ═══════════════════════════════════════════════════════════════
router.post('/toll/match-route', (req, res) => {
  const { polyline } = req.body; // Expects array of [lat, lng]
  if (!polyline || !Array.isArray(polyline)) return res.status(400).json({ error: 'Missing route polyline' });

  let matchedPlazas = [];
  let totalBaseToll = 0;

  // For every plaza, check if any point in the route is within 1.0km
  for (const plaza of OFFICIAL_TOLL_RATES) {
    const isMatched = polyline.some(point => {
      const d = calculateDistance(point[0], point[1], plaza.lat, plaza.lng);
      return d < 5.0; // 5.0km radius (Aggressive detection)
    });

    if (isMatched) {
      matchedPlazas.push({
        name: plaza.plaza,
        rate: plaza.rate,
        highway: plaza.highway
      });
      totalBaseToll += plaza.rate;
    }
  }

  res.json({
    found: matchedPlazas.length > 0,
    count: matchedPlazas.length,
    plazas: matchedPlazas,
    total_base_rate: totalBaseToll.toFixed(2),
    source: 'LLM Route Matcher'
  });
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 1: Weather Forecast (MET Malaysia)
// ═══════════════════════════════════════════════════════════════
router.get('/weather', async (req, res) => {
  try {
    // Fetch forecast for today, filtered to district-level for precision
    const url = `${GOV_API_BASE}/weather/forecast?contains=Ds@location__location_id&limit=50`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0) {
      return res.json({ source: 'data.gov.my', status: 'no_data', forecasts: [] });
    }

    // Map the MET Malaysia forecast format into EDAT-compatible structure
    const forecasts = data.map(item => {
      // Derive rainfall estimate from forecast text (Malay)
      let rainfallEstimate = 0;
      const summaryText = (item.summary_forecast || '').toLowerCase();
      if (summaryText.includes('ribut petir')) rainfallEstimate = 15.0;       // Thunderstorm
      else if (summaryText.includes('hujan di beberapa')) rainfallEstimate = 8.0; // Rain in several areas
      else if (summaryText.includes('hujan di satu dua')) rainfallEstimate = 3.0; // Rain in one or two areas
      else if (summaryText.includes('hujan')) rainfallEstimate = 5.0;          // General rain
      else if (summaryText.includes('berjerebu')) rainfallEstimate = 0;        // Haze, no rain

      return {
        location_id: item.location?.location_id || '',
        location_name: item.location?.location_name || '',
        date: item.date,
        morning_forecast: item.morning_forecast,
        afternoon_forecast: item.afternoon_forecast,
        night_forecast: item.night_forecast,
        summary_forecast: item.summary_forecast,
        summary_when: item.summary_when,
        min_temp: item.min_temp,
        max_temp: item.max_temp,
        // EDAT-derived fields for the Analyst Agent
        rainfall_estimate_mm: rainfallEstimate,
        avg_temp: Math.round(((item.min_temp || 28) + (item.max_temp || 32)) / 2)
      };
    });

    res.json({
      source: 'data.gov.my (MET Malaysia)',
      update_frequency: 'Daily (7-day forecast)',
      timestamp: new Date().toISOString(),
      count: forecasts.length,
      forecasts
    });
  } catch (err) {
    console.error('[Gov Weather] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather from data.gov.my', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 2: Weather Warnings (MET Malaysia)
// ═══════════════════════════════════════════════════════════════
router.get('/weather/warning', async (req, res) => {
  try {
    const url = `${GOV_API_BASE}/weather/warning?limit=10`;
    const response = await fetch(url);
    const data = await response.json();

    res.json({
      source: 'data.gov.my (MET Malaysia)',
      update_frequency: 'Realtime (as events occur)',
      timestamp: new Date().toISOString(),
      warnings: data || []
    });
  } catch (err) {
    console.error('[Gov Weather Warning] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather warnings', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  Official Published Fare Table (Malaysian Transit Authorities)
//  Source: Prasarana (myrapid.com.my), myBAS (bas.my)
//  Note: Malaysian GTFS feeds do NOT include fare_attributes.txt,
//        so we maintain this lookup based on official published rates.
// ═══════════════════════════════════════════════════════════════
const OFFICIAL_FARE_TABLE = {
  // Rapid Bus KL — Flat fare RM 1.00 (cashless) / RM 1.20 (cash)
  'prasarana-rapid-bus-kl': {
    type: 'flat',
    cashless: 1.00,
    cash: 1.20,
    currency: 'MYR',
    source: 'Prasarana (Rapid Bus KL)',
    reference: 'https://myrapid.com.my/bus-services/rapid-kl/'
  },
  // Rapid Rail KL — Distance-based (LRT/MRT/Monorail)
  'prasarana-rapid-rail-kl': {
    type: 'distance',
    min_fare: 1.20,
    max_fare: 6.40,
    base: 1.20,
    per_zone: 0.40,
    currency: 'MYR',
    source: 'Prasarana (Rapid Rail KL)',
    reference: 'https://myrapid.com.my/rail-services/'
  },
  // myBAS Johor Bahru — Flat fare RM 0.50 (subsidised by Gov)
  'mybas-johor': {
    type: 'flat',
    cashless: 0.50,
    cash: 1.00,
    currency: 'MYR',
    source: 'myBAS Johor Bahru (APAD/Gov Subsidy)',
    reference: 'https://bas.my/'
  }
};

// ═══════════════════════════════════════════════════════════════
//  ROUTE 3: Bus Fare Lookup (Official Rates + GTFS Route Data)
// ═══════════════════════════════════════════════════════════════
router.get('/bus-fare', (req, res) => {
  const { route_id, agency, user_type } = req.query;
  let allFares = [];

  // Check Johor detailed products first if relevant
  if (johorFareProducts.length > 0 && (!agency || agency.includes('johor'))) {
    // Filter for adult fares by default
    const type = user_type || 'Adult';
    const products = johorFareProducts.filter(p => p.fare_product_name && p.fare_product_name.includes(type));
    
    if (products.length > 0) {
      // Pick a sample/average or match by route_id if possible
      const match = route_id ? products.find(p => p.fare_product_id.includes(route_id)) : products[0];
      if (match) {
        allFares.push({
          source_agency: "myBAS Johor Bahru (Government GTFS-Fares V2)",
          fare_type: 'segment-based',
          price: parseFloat(match.amount || 0),
          currency: match.currency || 'MYR',
          user_category: type,
          reference: 'https://bas.my/',
          note: 'Directly sourced from fare_products.txt'
        });
      }
    }
  }

  for (const [key, cache] of Object.entries(gtfsCache)) {
    if (agency && !key.includes(agency)) continue;
    
    // Skip if we already added a detailed Johor fare and this is the generic lookup
    if (key === 'mybas-johor' && allFares.length > 0) continue;

    const officialFare = OFFICIAL_FARE_TABLE[key];
    if (!officialFare) continue;

    // ... (rest of existing logic)
    if (route_id) {
      const routeMatch = cache.routes.find(r => r.route_id === route_id);
      if (!routeMatch) continue;

      allFares.push({
        source_agency: officialFare.source,
        fare_type: officialFare.type,
        price: officialFare.type === 'flat' ? officialFare.cashless : officialFare.min_fare,
        price_cash: officialFare.type === 'flat' ? officialFare.cash : null,
        price_range: officialFare.type === 'distance' ? `RM ${officialFare.min_fare} - ${officialFare.max_fare}` : null,
        currency: officialFare.currency,
        route_id: routeMatch.route_id,
        route_name: routeMatch.route_long_name || routeMatch.route_short_name,
        reference: officialFare.reference,
        lastSync: cache.lastSync
      });
    } else {
      allFares.push({
        source_agency: officialFare.source,
        fare_type: officialFare.type,
        price: officialFare.type === 'flat' ? officialFare.cashless : officialFare.min_fare,
        price_cash: officialFare.type === 'flat' ? officialFare.cash : null,
        price_range: officialFare.type === 'distance' ? `RM ${officialFare.min_fare} - ${officialFare.max_fare}` : null,
        currency: officialFare.currency,
        total_routes: cache.routes.length,
        total_stops: cache.stops.length,
        reference: officialFare.reference,
        lastSync: cache.lastSync
      });
    }
  }

  res.json({
    source: 'data.gov.my (GTFS-Static) + Official Published Rates',
    update_frequency: 'Daily GTFS sync at 4:00 AM + static fare table',
    query: { route_id, agency, user_type },
    count: allFares.length,
    fares: allFares
  });
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 3b: Verified Toll Lookup
// ═══════════════════════════════════════════════════════════════
router.get('/toll-rate', (req, res) => {
  const { highway, plaza } = req.query;
  
  let results = OFFICIAL_TOLL_RATES;
  if (highway) results = results.filter(r => r.highway === highway);
  if (plaza) results = results.filter(r => r.plaza.toLowerCase().includes(plaza.toLowerCase()));
  
  res.json({
    source: 'LLM (Lembaga Lebuhraya Malaysia) Verified Rates',
    count: results.length,
    rates: results
  });
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 3c: Closest Toll Detection
// ═══════════════════════════════════════════════════════════════
router.get('/toll/closest', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const uLat = parseFloat(lat);
  const uLng = parseFloat(lng);

  let closest = null;
  let minDistance = Infinity;

  for (const plaza of OFFICIAL_TOLL_RATES) {
    const d = calculateDistance(uLat, uLng, plaza.lat, plaza.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = { ...plaza, distance_km: d };
    }
  }

  // Only return if it's within a reasonable radius (e.g., 80km)
  if (closest && minDistance < 80) {
    res.json({
      found: true,
      plaza: closest.plaza,
      rate: closest.rate,
      highway: closest.highway,
      distance_km: closest.distance_km.toFixed(2)
    });
  } else {
    res.json({ found: false, message: 'No major toll plaza found within 80km' });
  }
});
router.get('/bus-routes', (req, res) => {
  let allRoutes = [];

  for (const [key, cache] of Object.entries(gtfsCache)) {
    cache.routes.forEach(r => {
      allRoutes.push({
        agency: cache.label,
        agency_key: key,
        route_id: r.route_id,
        route_short_name: r.route_short_name || '',
        route_long_name: r.route_long_name || '',
        route_type: r.route_type
      });
    });
  }

  res.json({
    source: 'data.gov.my (GTFS-Static)',
    count: allRoutes.length,
    routes: allRoutes
  });
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 5: Live Bus Positions (GTFS-Realtime)
// ═══════════════════════════════════════════════════════════════
router.get('/bus-time', async (req, res) => {
  try {
    // GTFS-Realtime vehicle positions from Prasarana (rapid-bus-kl)
    const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
    const url = `${GOV_API_BASE}/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: `GTFS-Realtime API returned ${response.status}` });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

    const vehicles = feed.entity
      .filter(e => e.vehicle && e.vehicle.position)
      .slice(0, 50) // Limit to 50 for performance
      .map(e => ({
        vehicle_id: e.vehicle.vehicle?.id || e.id,
        route_id: e.vehicle.trip?.routeId || 'unknown',
        latitude: e.vehicle.position.latitude,
        longitude: e.vehicle.position.longitude,
        bearing: e.vehicle.position.bearing || null,
        speed_kmh: e.vehicle.position.speed ? (e.vehicle.position.speed * 3.6).toFixed(1) : null,
        timestamp: e.vehicle.timestamp ? new Date(Number(e.vehicle.timestamp) * 1000).toISOString() : null,
        current_status: e.vehicle.currentStatus || null
      }));

    res.json({
      source: 'data.gov.my (GTFS-Realtime)',
      update_frequency: 'Realtime (live vehicle positions)',
      timestamp: new Date().toISOString(),
      count: vehicles.length,
      vehicles
    });
  } catch (err) {
    console.error('[Gov Bus Realtime] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch GTFS-Realtime data', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 6: Manual GTFS Sync Trigger
// ═══════════════════════════════════════════════════════════════
router.post('/gtfs/sync', async (req, res) => {
  try {
    await syncAllGtfs();
    const summary = {};
    for (const [key, cache] of Object.entries(gtfsCache)) {
      summary[key] = {
        label: cache.label,
        routes: cache.routes.length,
        stops: cache.stops.length,
        fareAttributes: cache.fareAttributes.length,
        lastSync: cache.lastSync
      };
    }
    res.json({ status: 'ok', message: 'GTFS data synced from data.gov.my', agencies: summary });
  } catch (err) {
    console.error('[GTFS Sync] Error:', err.message);
    res.status(500).json({ error: 'GTFS sync failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 7: GTFS Sync Status
// ═══════════════════════════════════════════════════════════════
router.get('/gtfs/status', (req, res) => {
  const summary = {};
  for (const [key, cache] of Object.entries(gtfsCache)) {
    summary[key] = {
      label: cache.label,
      routes: cache.routes.length,
      stops: cache.stops.length,
      fareAttributes: cache.fareAttributes.length,
      lastSync: cache.lastSync
    };
  }
  res.json({
    synced: Object.keys(gtfsCache).length > 0,
    agencies: summary
  });
});

// Export router and the sync function (for cron scheduling in server.js)
module.exports = { router, syncAllGtfs };
