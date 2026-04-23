/**
 * EDAT Multi-Agent Core Logic (Server-Side)
 * Migrated from edat-core.js for secure Google Cloud execution.
 */

class AnalystAgent {
  constructor(dataHub) {
    this.dataHub = dataHub;
  }

  analyze(currentState) {
    const { occupancy, rainfall, api, temperature, currentRoadId } = currentState;
    
    let volumeMult = 1.0, volumeReason = "Normal Highway Load";
    if (occupancy > 0.85) { volumeMult = 1.5; volumeReason = "Peak Volume (>85% Load)"; }
    else if (occupancy >= 0.60) { volumeMult = 1.2; volumeReason = "Rising Demand (>60% Load)"; }

    let weatherMult = 1.0, weatherReason = "Clear/Dry";
    if (rainfall > 10.0) { weatherMult = 1.08; weatherReason = "Heavy Rain Safety Surcharge"; }
    else if (rainfall > 2.5) { weatherMult = 1.05; weatherReason = "Moderate Rain Safety Surcharge"; }
    else if (rainfall > 0.5) { weatherMult = 1.02; weatherReason = "Light Rain Safety Surcharge"; }

    let tempMult = 1.0, tempReason = "Optimal Temperature";
    if (temperature > 35) { tempMult = 1.05; tempReason = "Extreme Heat Stress Surcharge"; }
    else if (temperature > 32) { tempMult = 1.02; tempReason = "High Temperature Warning"; }

    const roadCarbonMult = this.dataHub.roadIntensityMap[currentRoadId] || 1.0;
    let roadReason = roadCarbonMult > 1.0 
      ? `Road Environmental Load: High Localized Emissions (${currentRoadId})`
      : "Road Environmental Health: Good";

    let aqiMult = 1.0, aqiReason = "Good Global Air Quality";
    if (api > 150) { aqiMult = 1.25; aqiReason = "Hazardous Air Quality Penalty"; }
    else if (api > 100) { aqiMult = 1.15; aqiReason = "Unhealthy Air Quality Penalty"; }
    else if (api > 50) { aqiMult = 1.05; aqiReason = "Moderate Air Quality Penalty"; }

    return {
      factors: { volumeMult, weatherMult, aqiMult, roadCarbonMult, tempMult },
      reasons: { volumeReason, weatherReason, aqiReason, roadReason, tempReason }
    };
  }
}

class LegalAgent {
  evaluatePolicy(vehicleType, analystData) {
    let carbonMult = 1.0, carbonReason = "Standard Emission Vehicle";
    let exemptFromAQI = false;

    // Economic Subsidy Logic
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

    if (exemptFromAQI) {
      effectiveAqiMult = 1.0; effectiveAqiReason = "AQI Surcharge Waived (Green Vehicle)";
      effectiveRoadMult = 1.0; effectiveRoadReason = "Road Env. Load Waived (Green Vehicle)";
      effectiveTempMult = 1.0; effectiveTempReason = "Heat Surcharge Waived (Green Vehicle)";
    }

    return {
      factors: { carbonMult, effectiveAqiMult, effectiveRoadMult, effectiveTempMult },
      reasons: { carbonReason, effectiveAqiReason, effectiveRoadReason, effectiveTempReason }
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

module.exports = { AnalystAgent, LegalAgent };
