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
 * 5. Dynamic Pricing Engine (Simulation Layer)
 * Formula: Toll = Base Rate + (Congestion Factor × Time Multiplier)
 */
class DynamicPricingEngine {
  calculateToll(baseRate, congestionLevel, dateObj = new Date()) {
    // Time Multiplier
    const hr = dateObj.getHours();
    let timeMultiplier = 1.0;
    
    if ((hr >= 7 && hr <= 9) || (hr >= 17 && hr <= 19)) {
      timeMultiplier = 1.5; // Peak hour penalty
    } else if (hr >= 22 || hr <= 5) {
      timeMultiplier = 0.8; // Night time discount
    }

    // Congestion factor ranges from 0.0 (empty) to 1.0 (gridlock)
    // Dynamic component adds up to 50% extra to the base rate during heavy congestion
    const congestionFactor = congestionLevel * 0.5;

    const finalToll = baseRate + (baseRate * congestionFactor * timeMultiplier);
    return parseFloat(finalToll.toFixed(2));
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
      let estCongestion = 0.3;
      if (hr >= 7 && hr <= 9) estCongestion = 0.8;
      if (hr >= 17 && hr <= 19) estCongestion = 0.9;

      const estPrice = this.pricing.calculateToll(baseRate, estCongestion, future);
      
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
    this.Pricing = new DynamicPricingEngine();
    this.Rebate = new RebateEngine(this.Identity, this.Behaviour);
    this.Predictive = new PredictiveRecommendationEngine(this.Pricing);
    this.Lifecycle = new DataLifecycleManager(this.PMB, this.Behaviour);
  }

  // Demonstration method to test the architecture in console
  async runSystemSimulation() {
    console.log("=== Starting EDAT Core Backend Simulation ===");
    
    // 1. User Opts In
    const user = await this.Identity.registerUser("Test User", "test@edat.com", "WXY1234", "RFID");
    console.log("User Opted In & Hashed:", user);

    // 2. PMB Ingests Data (One matching user, one anonymous)
    await this.PMB.ingestData(new Date().toISOString(), "E1 North", "RFID", "WXY1234", 2.50);
    await this.PMB.ingestData(new Date().toISOString(), "Sg Buloh", "TNG", "BCC9999", 3.00);
    
    console.log("Behaviour DB state (Anonymous vs Identified):", EDATDatabase.get(this.Behaviour.dbKey));

    // 3. Dynamic Pricing Demo
    const price = this.Pricing.calculateToll(2.50, 0.8, new Date());
    console.log("Dynamic Pricing Output for RM 2.50 Base at 80% Congestion:", price);

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
