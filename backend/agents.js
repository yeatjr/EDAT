const { genkit } = require('genkit');
const { googleAI, gemini15Flash } = require('@genkit-ai/googleai');

// Initialize Genkit
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: gemini15Flash
});

class AnalystAgent {
  constructor(dataHub) {
    this.dataHub = dataHub;
  }

  analyze(currentState, hourOverride = null) {
    const { occupancy, rainfall, api, temperature, currentRoadId } = currentState;
    
    // Time-based Peak Logic (STATIC FACTOR)
    const hour = hourOverride !== null ? hourOverride : new Date().getHours();
    const isMorningPeak = (hour >= 7 && hour <= 9);
    const isEveningPeak = (hour >= 17 && hour <= 20);
    const isClockPeak = isMorningPeak || isEveningPeak;

    let staticMult = 1.0;
    if (isClockPeak) {
      staticMult = 1.7; // Static Peak is higher (1.7x)
    }

    // Sensor-based Logic (DYNAMIC FACTOR)
    let dynamicMult = 1.0;
    let actualOccupancy = hourOverride !== null ? (isClockPeak ? 0.85 : 0.35) : occupancy;
    if (actualOccupancy > 0.85) {
      dynamicMult = 1.4; // Dynamic Peak is slightly lower (1.4x)
    } else if (actualOccupancy >= 0.60) {
      dynamicMult = 1.15;
    }

    // Final Volume Multiplier
    const volumeMult = Math.max(staticMult, dynamicMult);
    let volumeReason = "Normal Highway Load";
    if (isClockPeak && actualOccupancy > 0.85) volumeReason = "Critical Peak (Time + High Load)";
    else if (isClockPeak) volumeReason = "Scheduled Peak Hour";
    else if (actualOccupancy > 0.85) volumeReason = "Dynamic Congestion Detected";
    else if (actualOccupancy >= 0.60) volumeReason = "Moderate Traffic Flow";

    let weatherMult = 1.0, weatherReason = "Clear/Dry";
    if (rainfall > 10.0) { weatherMult = 1.08; weatherReason = "Heavy Rain Safety Surcharge"; }
    else if (rainfall > 2.5) { weatherMult = 1.05; weatherReason = "Moderate Rain Safety Surcharge"; }
    else if (rainfall > 0.5) { weatherMult = 1.02; weatherReason = "Light Rain Safety Surcharge"; }

    let tempMult = 1.0, tempReason = "Optimal Temperature";
    if (temperature > 35) { tempMult = 1.05; tempReason = "Extreme Heat Stress Surcharge"; }
    else if (temperature > 32) { tempMult = 1.02; tempReason = "High Temperature Warning"; }

    const roadCarbonMult = this.dataHub ? (this.dataHub.roadIntensityMap[currentRoadId] || 1.0) : 1.0;
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

// Genkit Flow for Agentic Pricing Evaluation
const pricingFlow = ai.defineFlow({
  name: 'pricingFlow',
  inputSchema: undefined,
  outputSchema: undefined
}, async (input) => {
  const { baseToll, vehicleType, environment, hourOverride } = input;
  
  const analyst = new AnalystAgent({});
  const legal = new LegalAgent();

  const analystCtx = analyst.analyze(environment, hourOverride);
  const legalCtx = legal.evaluatePolicy(vehicleType, analystCtx);

  const vMult = analystCtx.factors.volumeMult;
  const wMult = analystCtx.factors.weatherMult;
  const tMult = legalCtx.factors.effectiveTempMult;
  const aMult = legalCtx.factors.effectiveAqiMult;
  const rMult = legalCtx.factors.effectiveRoadMult;
  const cMult = legalCtx.factors.carbonMult;

  const proposedTotal = baseToll * vMult * wMult * tMult * aMult * rMult * cMult;
  const enforcement = legal.enforceCaps(proposedTotal, baseToll);

  // Use Gemini to generate a personalized eco-tip based on the conditions
  let ecoTip = "Consider traveling off-peak for better rates.";
  try {
    const prompt = `You are the EDAT AI Advisor. Based on this travel data: 
    Vehicle: ${vehicleType}, Base Toll: ${baseToll}, Final Toll: ${enforcement.finalTotal}, 
    Volume Reason: ${analystCtx.reasons.volumeReason}, Weather: ${analystCtx.reasons.weatherReason}.
    Provide ONE short, punchy sentence (max 15 words) advising the driver on how to save money or drive greener.`;
    
    const response = await ai.generate(prompt);
    ecoTip = response.text;
  } catch (err) {
    console.error("Gemini Generation Error:", err);
  }

  return {
    baseToll: baseToll,
    finalTotal: parseFloat(enforcement.finalTotal.toFixed(2)),
    isCapped: enforcement.capped,
    breakdown: {
      analyst: [
        { factor: 'Volume/Traffic', mult: vMult, reason: analystCtx.reasons.volumeReason },
        { factor: 'Weather (Rain)', mult: wMult, reason: analystCtx.reasons.weatherReason },
        { factor: 'Heat Stress', mult: tMult, reason: legalCtx.reasons.effectiveTempReason },
        { factor: 'Road Carbon Load', mult: rMult, reason: legalCtx.reasons.effectiveRoadReason }
      ],
      legal: [
        { factor: 'Air Quality', mult: aMult, reason: legalCtx.reasons.effectiveAqiReason },
        { factor: 'Vehicle Policy', mult: cMult, reason: legalCtx.reasons.carbonReason }
      ],
      enforcement: enforcement.reason
    },
    ecoTip: ecoTip
  };
});

module.exports = { AnalystAgent, LegalAgent, pricingFlow };

