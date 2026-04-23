/* ============================================================
   EDAT Core Backend System Simulation
   This simulates the 10 requested backend logic & architecture
   layers for the EDAT prototype.
   ============================================================ */

/**
 * Utility: Strict Data Storage
 * Simulates databases by using isolated LocalStorage keys.
 */
class EDATDatabase {
  static get(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
  static set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
}

/**
 * Utility: Simple SHA-256 Mock for Client-side Hashing
 */
async function mockSHA256(message) {
  const msgBuffer = new TextEncoder().encode(message);                    
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 2. User Opt-In & Vehicle Registration System (Identity Layer)
 * 7. Privacy-Preserving Architecture (Separation of Concerns)
 * Stores User Account <-> Vehicle <-> Hashed ID mapping.
 */
class IdentityLayer {
  constructor() {
    this.dbKey = 'edat_core_identity';
  }

  async registerUser(name, email, plateNumber, paymentMethod) {
    const db = EDATDatabase.get(this.dbKey);
    // Hash plate number with salt
    const salt = "EDAT_SECURE_SALT_2026";
    const hashedId = await mockSHA256(plateNumber + salt);

    const newUser = {
      userId: 'U' + Date.now(),
      name,
      email,
      plateNumber, // Kept secure in identity layer only
      paymentMethod, // RFID or TNG
      hashedId,
      walletBalance: 0
    };

    db.push(newUser);
    EDATDatabase.set(this.dbKey, db);
    return newUser;
  }

  getIdentityByHash(hashedId) {
    const db = EDATDatabase.get(this.dbKey);
    return db.find(u => u.hashedId === hashedId);
  }
  
  creditRebate(userId, amount) {
    const db = EDATDatabase.get(this.dbKey);
    const user = db.find(u => u.userId === userId);
    if(user) {
      user.walletBalance += amount;
      EDATDatabase.set(this.dbKey, db);
    }
  }
}

/**
 * 4. Behaviour Tracking Engine
 * Stores travel patterns against Hashed IDs only. 
 * NO personal identity is ever stored here. (Rule 7)
 */
class BehaviourLayer {
  constructor() {
    this.dbKey = 'edat_core_behaviour';
  }

  recordTransaction(transaction) {
    // transaction MUST ONLY have hashedId, no PII
    if(transaction.plateNumber || transaction.name) {
      console.error("PRIVACY VIOLATION: PII detected in Behaviour Engine");
      return;
    }
    const db = EDATDatabase.get(this.dbKey);
    db.push(transaction);
    EDATDatabase.set(this.dbKey, db);
  }

  getBehaviourByHash(hashedId) {
    const db = EDATDatabase.get(this.dbKey);
    return db.filter(t => t.hashedId === hashedId);
  }
}

/**
 * 3. Transaction Matching Engine
 * Connects raw PMB data to users via Hash, pushes to Behaviour.
 */
class TransactionMatchingEngine {
  constructor(identityLayer, behaviourLayer) {
    this.identity = identityLayer;
    this.behaviour = behaviourLayer;
  }

  async processRawTransaction(rawTx) {
    // 1. Convert incoming plate/RFID to hash to check if user opted-in
    const salt = "EDAT_SECURE_SALT_2026";
    const hashedId = await mockSHA256(rawTx.plateNumber + salt);

    const matchedUser = this.identity.getIdentityByHash(hashedId);

    const cleanTx = {
      txId: rawTx.sessionId,
      timestamp: rawTx.timestamp,
      plaza: rawTx.plaza,
      isPeakHour: this.isPeak(rawTx.timestamp),
      baseToll: rawTx.baseToll
    };

    if (matchedUser) {
      // 3. Attach hashedId and send to behaviour tracking
      cleanTx.hashedId = hashedId;
      this.behaviour.recordTransaction(cleanTx);
    } else {
      // If no match, store as anonymous global traffic data only (no hashed ID attached)
      cleanTx.hashedId = "ANONYMOUS";
      this.behaviour.recordTransaction(cleanTx);
    }
  }
  
  isPeak(timestamp) {
    const d = new Date(timestamp);
    const hr = d.getHours();
    return (hr >= 7 && hr <= 9) || (hr >= 17 && hr <= 19);
  }
}

/**
 * 1. PMB Data Integration Layer
 * Ingests toll data from API/Sensors. 
 */
class PMBIngestor {
  constructor(matchingEngine) {
    this.matchingEngine = matchingEngine;
    this.rawDbKey = 'edat_core_raw_pmb';
  }

  async ingestData(timestamp, plaza, paymentMethod, plateNumber, baseToll) {
    // Tag with temp session ID
    const rawTx = {
      sessionId: 'SESS_' + Math.random().toString(36).substr(2, 9),
      timestamp,
      plaza,
      paymentMethod,
      plateNumber,
      baseToll
    };
    
    // Store in short-term raw storage
    const rawDb = EDATDatabase.get(this.rawDbKey);
    rawDb.push(rawTx);
    EDATDatabase.set(this.rawDbKey, rawDb);

    // Pass to matching engine for processing
    await this.matchingEngine.processRawTransaction(rawTx);
  }
}

/**
 * EnvironmentalDataHub: Manages hourly snapshots from official sources (APIMS/Weather).
 * Simulates a Spatio-Temporal mapping of roads to monitoring stations.
 */
class EnvironmentalDataHub {
  constructor() {
    this.lastSync = new Date().toLocaleTimeString();
    // Localized multipliers for specific road segments
    this.roadIntensityMap = {
      "FEDERAL_HQ": 1.0,
      "E1_DUTA": 1.0,
      "E2_SKLAL": 1.0,
      "SPRINT": 1.0
    };
  }

  // Simulates the hourly official sync
  async syncAPIMS() {
    console.log("[SYSTEM] Syncing with Official APIMS Station Data...");
    
    // Simulate real-time fluctuation for each road
    for (let road in this.roadIntensityMap) {
       // Random API reading simulation (40-180)
       const simulatedAPI = 40 + Math.floor(Math.random() * 140); 
       
       if (simulatedAPI > 150) {
         this.roadIntensityMap[road] = 1.25; // Hazardous road load
       } else if (simulatedAPI > 100) {
         this.roadIntensityMap[road] = 1.15; // Unhealthy road load
       } else if (simulatedAPI > 50) {
         this.roadIntensityMap[road] = 1.05; // Moderate road load
       } else {
         this.roadIntensityMap[road] = 1.0;  // Clean air
       }
    }
    
    this.lastSync = new Date().toLocaleTimeString();
    return this.roadIntensityMap;
  }
}

/**
 * Agent 1: Analyst Agent (Environment & Load)
 * Analyzes traffic volume, weather, and air quality.
 */
class AnalystAgent {
  constructor(dataHub) {
    this.dataHub = dataHub;
    this.currentState = {
      occupancy: 0.65, // 65% load
      rainfall: 0.0,   // mm/h
      api: 45,         // Global Air Pollutant Index
      temperature: 30, // Celsius
      currentRoadId: "FEDERAL_HQ" 
    };
  }

  setScenario(scenario) {
    if (scenario === 'STORM_PEAK') {
      this.currentState = { ...this.currentState, occupancy: 0.90, rainfall: 15.0, api: 45, temperature: 26 };
    } else if (scenario === 'HAZE_NORMAL') {
      this.currentState = { ...this.currentState, occupancy: 0.50, rainfall: 0.0, api: 150, temperature: 34 };
    } else if (scenario === 'HEAT_WAVE') {
      this.currentState = { ...this.currentState, occupancy: 0.40, rainfall: 0.0, api: 60, temperature: 38 };
    } else {
      this.currentState = { ...this.currentState, occupancy: 0.40, rainfall: 0.0, api: 30, temperature: 30 };
    }
  }

  analyze(overrideHour = null) {
    const { rainfall, api, temperature, currentRoadId } = this.currentState;
    
    // Time-based Peak Logic (STATIC FACTOR)
    const hour = overrideHour !== null ? overrideHour : new Date().getHours();
    const isMorningPeak = (hour >= 7 && hour <= 9);
    const isEveningPeak = (hour >= 17 && hour <= 20);
    const isClockPeak = isMorningPeak || isEveningPeak;

    // AUTO-ADJUST OCCUPANCY BASED ON TIME (unless overridden)
    // If it's peak time, road is heavy (85%), else it's light (35%)
    if (overrideHour !== null) {
      this.currentState.occupancy = isClockPeak ? 0.85 : 0.35;
    }
    const occupancy = this.currentState.occupancy;

    let staticMult = 1.0;
    if (isClockPeak) {
      staticMult = 1.7; // Static Peak is higher (1.7x)
    }

    // Sensor-based Logic (DYNAMIC FACTOR)
    let dynamicMult = 1.0;
    if (occupancy > 0.85) {
      dynamicMult = 1.4; // Dynamic Peak is slightly lower (1.4x)
    } else if (occupancy >= 0.60) {
      dynamicMult = 1.15;
    }

    // Final Volume Multiplier (Combined - using the higher of the two)
    const volumeMult = Math.max(staticMult, dynamicMult);
    let volumeReason = "Normal Highway Load";
    
    if (isClockPeak && occupancy > 0.85) volumeReason = "Critical Peak (Time + High Load)";
    else if (isClockPeak) volumeReason = "Scheduled Peak Hour";
    else if (occupancy > 0.85) volumeReason = "Dynamic Congestion Detected";
    else if (occupancy >= 0.60) volumeReason = "Moderate Traffic Flow";

    // LOWERED Rain Multipliers
    let weatherMult = 1.0, weatherReason = "Clear/Dry";
    if (rainfall > 10.0) { weatherMult = 1.08; weatherReason = "Heavy Rain Safety Surcharge"; }
    else if (rainfall > 2.5) { weatherMult = 1.05; weatherReason = "Moderate Rain Safety Surcharge"; }
    else if (rainfall > 0.5) { weatherMult = 1.02; weatherReason = "Light Rain Safety Surcharge"; }

    // Temperature Multiplier (Heat Stress)
    let tempMult = 1.0, tempReason = "Optimal Temperature";
    if (temperature > 35) { tempMult = 1.05; tempReason = "Extreme Heat Stress Surcharge"; }
    else if (temperature > 32) { tempMult = 1.02; tempReason = "High Temperature Warning"; }

    // Road Specific Carbon Intensity from DataHub (Official Sources)
    const roadCarbonMult = this.dataHub.roadIntensityMap[currentRoadId] || 1.0;
    let roadReason = roadCarbonMult > 1.0 
      ? `Road Environmental Load: High Localized Emissions (${currentRoadId})`
      : "Road Environmental Health: Good";

    let aqiMult = 1.0, aqiReason = "Good Global Air Quality";
    if (api > 300) { aqiMult = 1.2; aqiReason = "Hazardous Air Quality Penalty"; }
    else if (api > 200) { aqiMult = 1.15; aqiReason = "Very Unhealthy Air Quality Penalty"; }
    else if (api > 100) { aqiMult = 1.1; aqiReason = "Unhealthy Air Quality Penalty"; }
    else if (api > 50) { aqiMult = 1.05; aqiReason = "Moderate Air Quality Penalty"; }

    return {
      factors: { volumeMult, weatherMult, aqiMult, roadCarbonMult, tempMult },
      reasons: { volumeReason, weatherReason, aqiReason, roadReason, tempReason },
      raw: this.currentState,
      lastSync: this.dataHub.lastSync
    };
  }
}

/**
 * Agent 2: Legal Agent (Policy & RAG)
 * Enforces Carbon Multipliers and Price Caps based on simulated regulations.
 */
class LegalAgent {
  constructor() {
    this.knowledgeBase = {
      "Act_1987_Section_44": "Maximum toll surcharges cannot exceed 3.5x base rate.",
      "EV_Incentive_2024": "Zero-emission vehicles must receive a minimum 80% reduction (0.2x multiplier).",
      "Diesel_Penalty_2025": "High-emission diesel vehicles receive a 1.8x carbon multiplier."
    };
  }

  evaluatePolicy(vehicleType, analystData) {
    let carbonMult = 1.0, carbonReason = "Standard Emission Vehicle";
    let exemptFromAQI = false;

    if (vehicleType === 'EV') {
      carbonMult = 0.6; carbonReason = "Zero Emissions Incentive"; exemptFromAQI = true;
    } else if (vehicleType === 'Hybrid') {
      carbonMult = 0.8; carbonReason = "Low Emissions Incentive"; exemptFromAQI = true;
    } else if (vehicleType === 'Diesel') {
      carbonMult = 1.5; carbonReason = "Heavy Emissions / Particulate Penalty";
    } else if (vehicleType === 'Motorcycle') {
      carbonMult = 0.5; carbonReason = "Motorcycle Base Rate";
    }

    let effectiveAqiMult = analystData.factors.aqiMult;
    let effectiveAqiReason = analystData.reasons.aqiReason;
    let effectiveRoadMult = analystData.factors.roadCarbonMult;
    let effectiveRoadReason = analystData.reasons.roadReason;
    let effectiveTempMult = analystData.factors.tempMult;
    let effectiveTempReason = analystData.reasons.tempReason;

    // RULE: Green Vehicles are exempt from Environmental Surcharges
    if (exemptFromAQI) {
      if (effectiveAqiMult > 1.0) {
        effectiveAqiMult = 1.0; effectiveAqiReason = "AQI Surcharge Waived (Green Vehicle)";
      }
      if (effectiveRoadMult > 1.0) {
        effectiveRoadMult = 1.0; effectiveRoadReason = "Road Env. Load Waived (Green Vehicle)";
      }
      if (effectiveTempMult > 1.0) {
        effectiveTempMult = 1.0; effectiveTempReason = "Heat Surcharge Waived (Green Vehicle)";
      }
    }

    return {
      factors: { carbonMult, effectiveAqiMult, effectiveRoadMult, effectiveTempMult },
      reasons: { carbonReason, effectiveAqiReason, effectiveRoadReason, effectiveTempReason },
      citations: [this.knowledgeBase["EV_Incentive_2024"], this.knowledgeBase["Act_1987_Section_44"]]
    };
  }

  enforceCaps(proposedTotal, baseToll) {
    const MAX_CAP = 3.5;
    const limit = baseToll * MAX_CAP;
    if (proposedTotal > limit) {
      return { capped: true, finalTotal: limit, reason: `Capped at RM ${limit.toFixed(2)} (Regulatory Limit: 3.5x Base)` };
    }
    return { capped: false, finalTotal: proposedTotal, reason: "Within regulatory limits." };
  }
}

/**
 * Agent 3: Pricing Agent (Orchestration)
 * Combines everything and generates the final quote.
 */
class PricingAgent {
  constructor(analystAgent, legalAgent) {
    this.analyst = analystAgent;
    this.legal = legalAgent;
  }

  async calculateQuote(baseToll, vehicleType = 'Petrol', hourOverride = null) {
    // 1. Update the Analyst state based on time before calculating
    this.analyst.analyze(hourOverride);
    
    const environment = this.analyst.currentState;
    
    try {
      const response = await fetch('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseToll, vehicleType, environment, hourOverride })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Backend Offline: Using Local Pricing Engine");
      
      // Use the analysis we performed at the start of this function
      const analysis = this.analyst.analyze(hourOverride);
      
      // Calculate Final Total based on multipliers
      const f = analysis.factors;
      const combinedMult = (f.volumeMult * f.weatherMult * f.tempMult * f.roadCarbonMult);
      let proposedTotal = baseToll * combinedMult;
      
      // Simple EV Rebate logic for local fallback
      if (vehicleType === 'EV') proposedTotal *= 0.8;

      return {
        baseToll: baseToll,
        finalTotal: proposedTotal,
        isCapped: false,
        breakdown: {
          analyst: [
            { factor: 'Traffic Volume', mult: f.volumeMult, reason: analysis.reasons.volumeReason, fee: (baseToll * f.volumeMult) - baseToll },
            { factor: 'Weather (Rain)', mult: f.weatherMult, reason: analysis.reasons.weatherReason, fee: (baseToll * f.weatherMult) - baseToll },
            { factor: 'Heat Stress', mult: f.tempMult, reason: analysis.reasons.tempReason, fee: (baseToll * f.tempMult) - baseToll },
            { factor: 'Road Carbon Load', mult: f.roadCarbonMult, reason: analysis.reasons.roadReason, fee: (baseToll * f.roadCarbonMult) - baseToll }
          ],
          legal: [
            { factor: 'Air Quality', mult: f.aqiMult, reason: analysis.reasons.aqiReason, fee: (baseToll * f.aqiMult) - baseToll },
            { factor: 'Vehicle Policy', mult: vehicleType === 'EV' ? 0.8 : 1.0, reason: vehicleType === 'EV' ? 'EV Discount' : 'Standard', fee: vehicleType === 'EV' ? -(baseToll * 0.2) : 0 }
          ],
          enforcement: "Local Analysis Engine Active"
        },
        rawState: environment,
        lastSync: new Date().toLocaleTimeString()
      };
    }
  }
}

/**
 * 6. Rebate Calculation Engine & 8. Rebate Distribution Flow
 * Analyses behaviour and credits rebate via mapping.
 */
class RebateEngine {
  constructor(identityLayer, behaviourLayer) {
    this.identity = identityLayer;
    this.behaviour = behaviourLayer;
  }

  runMonthlyDistribution() {
    const allIdentities = EDATDatabase.get(this.identity.dbKey);
    
    allIdentities.forEach(user => {
      const trips = this.behaviour.getBehaviourByHash(user.hashedId);
      if (trips.length === 0) return;

      const offPeakTrips = trips.filter(t => !t.isPeakHour).length;
      const offPeakRatio = offPeakTrips / trips.length;

      // Logic: Assign rebate score based on off-peak usage
      let rebateAmount = 0;
      if (offPeakRatio > 0.8) {
        rebateAmount = trips.length * 0.50; // RM 0.50 per trip
      } else if (offPeakRatio > 0.5) {
        rebateAmount = trips.length * 0.20; // RM 0.20 per trip
      }

      if (rebateAmount > 0) {
        this.identity.creditRebate(user.userId, rebateAmount);
        console.log(`[Rebate Engine] Distributed RM${rebateAmount.toFixed(2)} to User ${user.userId}`);
      }
    });
  }
}

/**
 * 9. Predictive Recommendation Engine
 * Estimates future toll/traffic.
 */
class PredictiveRecommendationEngine {
  constructor(pricingEngine) {
    this.pricing = pricingEngine;
  }
  
  predictOptimalTime(baseRate) {
    const now = new Date();
    // Simulate predictions for the next 3 hours
    const predictions = [];
    for(let i=1; i<=3; i++) {
      const future = new Date(now.getTime() + i*60*60*1000);
      
      // Simulate historical congestion (higher during typical peaks)
      const hr = future.getHours();
      let estCongestion = 0.4;
      if (hr >= 7 && hr <= 9) estCongestion = 0.8;
      if (hr >= 17 && hr <= 19) estCongestion = 0.9;

      // Temporarily set the analyst state to predict
      const originalOccupancy = this.pricing.analyst.currentState.occupancy;
      this.pricing.analyst.currentState.occupancy = estCongestion;
      const estPrice = this.pricing.calculateQuote(baseRate, 'Petrol').finalTotal;
      this.pricing.analyst.currentState.occupancy = originalOccupancy; // Restore
      
      predictions.push({
        time: future.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        congestion: Math.round(estCongestion * 100) + '%',
        price: estPrice
      });
    }
    return predictions;
  }
}

/**
 * 10. Data Lifecycle & Retention
 * Auto-deletes old data.
 */
class DataLifecycleManager {
  constructor(pmbIngestor, behaviourLayer) {
    this.rawDbKey = pmbIngestor.rawDbKey;
    this.behaviourDbKey = behaviourLayer.dbKey;
  }

  runPurge() {
    const now = Date.now();
    
    // Purge raw transactions older than 24 hours
    const rawDb = EDATDatabase.get(this.rawDbKey);
    const validRaw = rawDb.filter(tx => (now - new Date(tx.timestamp).getTime()) < (24 * 60 * 60 * 1000));
    EDATDatabase.set(this.rawDbKey, validRaw);

    // Purge behaviour data older than 90 days
    const behavDb = EDATDatabase.get(this.behaviourDbKey);
    const validBehav = behavDb.filter(tx => (now - new Date(tx.timestamp).getTime()) < (90 * 24 * 60 * 60 * 1000));
    EDATDatabase.set(this.behaviourDbKey, validBehav);
    
    console.log("[Data Lifecycle] Purge complete. Outdated raw & behaviour data removed.");
  }
}

/**
 * Facade Class bridging all modules
 */
class EDATSystemArchitecture {
  constructor() {
    this.Identity = new IdentityLayer();
    this.Behaviour = new BehaviourLayer();
    this.Matching = new TransactionMatchingEngine(this.Identity, this.Behaviour);
    this.PMB = new PMBIngestor(this.Matching);
    
    // Multi-Agent System with Official Data Hub
    this.DataHub = new EnvironmentalDataHub();
    this.Analyst = new AnalystAgent(this.DataHub);
    this.Legal = new LegalAgent();
    this.Pricing = new PricingAgent(this.Analyst, this.Legal);
    
    this.Rebate = new RebateEngine(this.Identity, this.Behaviour);
    this.Predictive = new PredictiveRecommendationEngine(this.Pricing);
    this.Lifecycle = new DataLifecycleManager(this.PMB, this.Behaviour);
  }

  setScenario(scenarioName) {
    this.Analyst.setScenario(scenarioName);
    console.log(`[EDAT Simulation] Scenario set to: ${scenarioName}`);
  }

  // Demonstration method to test the architecture in console
  async runSystemSimulation() {
    console.log("=== Starting EDAT Core Backend Simulation ===");
    
    // 1. User Opts In
    const user = await this.Identity.registerUser("Test User", "test@edat.com", "WXY1234", "RFID");
    console.log("User Opted In & Hashed:", user);

    // 2. PMB Ingests Data
    await this.PMB.ingestData(new Date().toISOString(), "E1 North", "RFID", "WXY1234", 2.50);
    await this.PMB.ingestData(new Date().toISOString(), "Sg Buloh", "TNG", "BCC9999", 3.00);
    console.log("Behaviour DB state:", EDATDatabase.get(this.Behaviour.dbKey));

    // 3. Multi-Agent Pricing Demo
    this.setScenario('STORM_PEAK');
    const quote = this.Pricing.calculateQuote(2.50, 'Diesel');
    console.log("Pricing Agent Quote (Diesel in Storm/Peak):", quote);

    this.setScenario('CLEAR_NORMAL');
    const evQuote = this.Pricing.calculateQuote(2.50, 'EV');
    console.log("Pricing Agent Quote (EV in Clear/Normal):", evQuote);

    // 4. Predictive Engine
    console.log("Predictive Engine Outputs:", this.Predictive.predictOptimalTime(2.50));

    // 5. Rebate Flow
    this.Rebate.runMonthlyDistribution();

    // 6. Data Purge
    this.Lifecycle.runPurge();
    
    console.log("=== EDAT Core Backend Simulation Complete ===");
  }
}

// Expose globally
window.EDATCore = new EDATSystemArchitecture();
