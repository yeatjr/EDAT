const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cron = require('node-cron');
const { Datastore } = require('@google-cloud/datastore');
const { VertexAI } = require('@google-cloud/vertexai');
const { AnalystAgent, LegalAgent } = require('./agents');
const { router: govApiRouter, syncAllGtfs } = require('./routes/gov_api');
const admin = require('firebase-admin');

const fs = require('fs');

// Firebase Admin Initialization
const firebaseServiceAccountPath = './firebase-admin.json';
if (fs.existsSync(firebaseServiceAccountPath)) {
  const serviceAccount = require(firebaseServiceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("[FIREBASE] Admin SDK Initialized.");
} else {
  console.warn("[WARNING] firebase-admin.json not found. Backend Firebase features disabled.");
}

const JB_TRANSIT_LOOKUP = [
  { id: "J10", name: "JB Sentral to Kota Tinggi (myBAS)", fare: 5.00, operator: "Causeway Link" },
  { id: "J100", name: "JB Sentral to KSL (myBAS)", fare: 2.10, operator: "Causeway Link" },
  { id: "T11", name: "JB Sentral to Skudai (myBAS)", fare: 3.40, operator: "Causeway Link" },
  { id: "T31", name: "JB Sentral to Pasir Gudang", fare: 4.50, operator: "myBAS" }
];

// 1. Setup Environment
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// 2. Initialize Google Cloud Clients (safely)
let datastore = null;
let vertexAI = null;
let hasGCP = false;

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
if (fs.existsSync(credsPath)) {
  datastore = new Datastore();
  vertexAI = new VertexAI({ project: process.env.GOOGLE_PROJECT_ID, location: process.env.GOOGLE_LOCATION });
  hasGCP = true;
  console.log("[CLOUD] Google Cloud SDK Initialized.");
} else {
  console.warn(`[WARNING] Service account key not found at ${credsPath}. Running in Mock/Local mode.`);
}

// 3. Shared State (to be synced with Datastore/APIMS)
const dataHub = {
  roadIntensityMap: {
    "FEDERAL_HQ": 1.0,
    "E1_DUTA": 1.15,
    "E2_SKLAL": 1.0,
    "SPRINT": 1.0
  },
  lastSync: new Date().toLocaleTimeString()
};

// 4. Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Mount Government API routes (data.gov.my)
app.use('/api/gov', govApiRouter);

// 5. API Endpoints

/**
 * GET /api/environment
 * Fetches the latest APIMS/Weather data from Datastore
 */
app.get('/api/environment', async (req, res) => {
  try {
    if (!hasGCP) {
      return res.json({ timestamp: new Date(), api: 45, temperature: 30, rainfall: 0.0 });
    }
    const query = datastore.createQuery('EnvironmentSnapshot').order('timestamp', { descending: true }).limit(1);
    const [snapshots] = await datastore.runQuery(query);
    
    if (snapshots.length === 0) {
      return res.status(404).json({ error: "No environment data found in Datastore" });
    }
    
    res.json(snapshots[0]);
  } catch (error) {
    console.error("Datastore Error:", error);
    res.status(500).json({ error: "Failed to fetch from Google Cloud" });
  }
});

/**
 * POST /api/environment/sync
 * Scrapes/fetches the latest data from https://eqms.doe.gov.my/APIMS/main
 */
app.post('/api/environment/sync', async (req, res) => {
  console.log("[MET Malaysia] Fetching live weather data from data.gov.my...");
  
  try {
    // Fetch real weather from MET Malaysia via data.gov.my
    let weatherData = null;
    try {
      const weatherRes = await fetch('https://api.data.gov.my/weather/forecast?contains=Kuala Lumpur@location__location_name&limit=1');
      const weatherJson = await weatherRes.json();
      if (weatherJson && weatherJson.length > 0) {
        weatherData = weatherJson[0];
      }
    } catch (fetchErr) {
      console.warn('[MET Malaysia] Could not reach data.gov.my, using fallback.', fetchErr.message);
    }

    let apiValue, temperature, rainfall, source;

    if (weatherData) {
      // Derive values from real MET Malaysia forecast
      temperature = Math.round(((weatherData.min_temp || 28) + (weatherData.max_temp || 32)) / 2);
      
      // Estimate rainfall from Malay forecast text
      const summary = (weatherData.summary_forecast || '').toLowerCase();
      if (summary.includes('ribut petir')) rainfall = 15.0;
      else if (summary.includes('hujan di beberapa')) rainfall = 8.0;
      else if (summary.includes('hujan di satu dua')) rainfall = 3.0;
      else if (summary.includes('hujan')) rainfall = 5.0;
      else rainfall = 0.0;

      // Estimate API from haze forecast
      if (summary.includes('berjerebu')) apiValue = 120;
      else apiValue = 45;

      source = 'data.gov.my (MET Malaysia)';
      console.log(`[MET Malaysia] Live data: ${temperature}°C, ${rainfall}mm rain, forecast: ${weatherData.summary_forecast}`);
    } else {
      // Fallback to simulation if API is unreachable
      apiValue = Math.floor(Math.random() * (150 - 30 + 1) + 30);
      temperature = Math.floor(Math.random() * (38 - 26 + 1) + 26);
      rainfall = Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0.0;
      source = 'Simulation (MET Malaysia unreachable)';
    }
    
    const snapshot = {
      timestamp: new Date(),
      api: apiValue,
      temperature: temperature,
      rainfall: rainfall,
      source: source,
      raw_forecast: weatherData || null
    };

    // Save to Datastore (Graceful fallback)
    if (hasGCP) {
      try {
        const key = datastore.key('EnvironmentSnapshot');
        await datastore.save({ key, data: { ...snapshot, raw_forecast: JSON.stringify(snapshot.raw_forecast) } });
      } catch (dbError) {
        console.warn("[WARNING] Could not save environment to Datastore. Continuing.");
      }
    }

    // Update internal state
    dataHub.lastSync = snapshot.timestamp.toLocaleTimeString();
    
    res.json(snapshot);
  } catch (error) {
    console.error("Sync Error:", error);
    res.status(500).json({ error: "Failed to sync with MET Malaysia" });
  }
});

/**
 * POST /api/pricing/calculate

 * Master orchestration endpoint for the Multi-Agent system
 */
app.post('/api/pricing/calculate', async (req, res) => {
  const { baseToll, vehicleType, environment, hourOverride } = req.body;
  
  try {
    const { pricingFlow } = require('./agents');

    // Run the Genkit Flow
    const result = await pricingFlow({
      baseToll,
      vehicleType,
      environment,
      hourOverride
    });

    // Use Vertex AI RAG to generate the final legal justification
    const ragJustification = await getRagJustification({
      finalTotal: result.finalTotal,
      vehicleType: vehicleType,
      factors: { volumeMult: environment.occupancy, weatherMult: environment.rainfall } // Approximation for RAG
    });
    
    // Append the RAG justification to the enforcement response
    result.breakdown.enforcement = `${result.breakdown.enforcement} Legal Auditor Note: ${ragJustification.trim()}`;

    // PERSISTENCE: Save transaction to Google Cloud Datastore (Graceful fallback)
    if (hasGCP) {
      try {
        const transactionKey = datastore.key('TollTransaction');
        const entity = {
          key: transactionKey,
          data: {
            timestamp: new Date(),
            vehicleType,
            baseToll,
            finalTotal: result.finalTotal
          }
        };
        await datastore.save(entity);
      } catch (dbError) {
        console.warn("[WARNING] Could not save to Datastore. Continuing execution.");
      }
    }

    result.lastSync = hasGCP ? new Date().toLocaleTimeString() : 'Local Mode';
    res.json(result);
  } catch (error) {
    console.error("Pricing Error:", error);
    res.status(500).json({ error: "Internal Agent Error" });
  }
});

/**
 * Helper Function: Get RAG Justification
 * Uses Vertex AI (RAG) with Vertex AI Search Grounding
 */
async function getRagJustification(tollData) {
  if (!hasGCP) return "Standard regulatory pricing applied based on vehicle class and dynamic factors (MOCK).";
  
  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL,
      tools: [
        {
          retrieval: {
            vertexAiSearch: {
              datastore: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.VERTEX_AI_SEARCH_LOCATION}/collections/default_collection/dataStores/${process.env.VERTEX_AI_DATA_STORE_ID}`
            }
          }
        }
      ]
    });

    const prompt = `
      As a Legal Pricing Auditor, justify this toll charge based strictly on the retrieved regulatory documents:
      Price: RM ${tollData.finalTotal}
      Vehicle: ${tollData.vehicleType}
      Factors Applied: ${JSON.stringify(tollData.factors)}
      
      Generate a professional 1-sentence justification. If no relevant documents are found, fallback to standard justification.
    `;

    const response = await generativeModel.generateContent(prompt);
    return response.response.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Vertex AI Grounding Error:", error);
    return "Standard regulatory pricing applied based on vehicle class and dynamic factors.";
  }
}

/**
 * POST /api/pricing/justify
 * Exposes the RAG generation as a standalone endpoint if needed.
 */
app.post('/api/pricing/justify', async (req, res) => {
  const { tollData } = req.body;
  const justification = await getRagJustification(tollData);
  res.json({ justification });
});

// 5. Start Server
app.post('/api/routing/google-tolls', async (req, res) => {
  const { origin, destination } = req.body;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.log("[Google Routes] No API Key found, using dynamic mock based on coordinates.");
    
    // Estimate distance based on lat/lng difference if actual distance is unknown
    const latDiff = Math.abs(origin.lat - destination.lat);
    const lngDiff = Math.abs(origin.lng - destination.lng);
    const estDistKm = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lngDiff, 2)) * 111; // Rough km estimate
    const mockToll = Math.max(1.50, Math.round(estDistKm * 0.15 * 100) / 100);

    return res.json({ 
      isMock: true, 
      drive: { 
        distanceMeters: Math.round(estDistKm * 1000), 
        duration: `${Math.round(estDistKm * 60)}s`, 
        travelAdvisory: { 
          tollInfo: { estimatedPrice: [{ units: Math.floor(mockToll).toString(), nanos: (mockToll % 1 * 1e9).toString() }] } 
        } 
      },
      transit: { 
        distanceMeters: Math.round(estDistKm * 1000), 
        duration: `${Math.round(estDistKm * 120)}s`, 
        travelAdvisory: {
          transitFare: { currencyCode: "MYR", units: "3", nanos: 400000000 }
        }
      }
    });
  }

  try {
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const fieldMask = 'routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.transitDetails,routes.travelAdvisory.transitFare';

    // 1. Fetch Driving Route with Tolls
    const driveRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: "DRIVE",
        extraComputations: ["TOLLS"]
      })
    });
    const driveData = await driveRes.json();

    // 2. Fetch Transit Route
    const transitRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: "TRANSIT"
      })
    });
    const transitData = await transitRes.json();

    res.json({
      drive: driveData.routes ? driveData.routes[0] : null,
      transit: transitData.routes ? transitData.routes[0] : null
    });
  } catch (error) {
    console.error("[Google API Error]:", error);
    res.status(500).json({ error: "Failed to fetch Google route data" });
  }
});

app.post('/api/pricing/recommendation', async (req, res) => {
  const { googleDrivingData, googleTransitData, baseToll, difference, vehicleType } = req.body;

  const mockRecommendation = {
    comparison: {
      driving_total_rm: baseToll + difference,
      transit_total_rm: 3.40,
      price_difference: Math.abs((baseToll + difference) - 3.40)
    },
    recommendation: {
      choice: (baseToll + difference > 5.00) ? "Public Transit" : "Private Vehicle",
      reason: "Based on current dynamic tolls and estimated transit fares.",
      surcharge_breakdown: `Dynamic adjustments totaled RM ${difference.toFixed(2)}.`
    },
    display_message: "Consider public transit to avoid high dynamic tolls."
  };

  if (!hasGCP) {
    return res.json(mockRecommendation);
  }

  try {
    const generativeModel = vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL });
    const prompt = `
    Input Context:
    Google Driving Data: ${JSON.stringify(googleDrivingData)}
    Google Transit Data: ${JSON.stringify(googleTransitData)}
    Local JB Transit Knowledge (data.gov.my GTFS): ${JSON.stringify(JB_TRANSIT_LOOKUP)}
    
    My System's Pricing Rules:
    Base Toll: RM ${baseToll.toFixed(2)}
    Multi-Agent Surcharge (Carbon/Env/Safety): +RM ${difference.toFixed(2)}
    Final Private Total: RM ${(baseToll + difference).toFixed(2)}
    Vehicle Class: ${vehicleType}

    Instructions:
    1. Calculate the Total Driving Cost: Base Toll + Surcharges.
    2. Compare this against the Public Transit Cost (Use Google Transit Fare OR a matching route from Local JB Transit Knowledge).
    3. Identify the 'Cheapest Route' and the 'Fastest Route'.
    4. If the location is in Johor Bahru, mention that data is backed by myBAS Johor Bahru GTFS (api.data.gov.my).
    
    Output (Strict JSON):
    {
      "comparison": {
        "driving_total_rm": 0.00,
        "transit_total_rm": 0.00,
        "price_difference": 0.00
      },
      "recommendation": {
        "choice": "Public Transit / Private Vehicle",
        "route_id": "e.g. J10 or Google Transit",
        "reason": "Explain why (e.g., 'Saves RM 12.00')",
        "surcharge_breakdown": "Mention which specific agent fee (Carbon/Rain) made driving expensive."
      },
      "display_message": "A short, catchy recommendation title"
    }
  `;

    const result = await generativeModel.generateContent(prompt);
    const text = result.response.candidates[0].content.parts[0].text;
    
    // Clean JSON markdown block if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error("Vertex AI Recommendation Error:", error);
    res.json(mockRecommendation);
  }
});

// 6. Start Server
app.listen(port, () => {
  console.log(`[EDAT] Backend running at http://localhost:${port}`);
  console.log(`[CLOUD] Connected to Project: ${process.env.GOOGLE_PROJECT_ID}`);
  console.log(`[GOV API] data.gov.my routes mounted at /api/gov`);

  // Schedule daily GTFS sync at 4:00 AM (as recommended by data.gov.my)
  cron.schedule('0 4 * * *', () => {
    console.log('[CRON] Running daily GTFS sync from data.gov.my...');
    syncAllGtfs();
  });
  console.log('[CRON] Daily GTFS sync scheduled for 4:00 AM.');
});
