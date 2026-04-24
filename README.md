# 🌿🚗 Eco-Dynamic AI Tolling (EDAT)  
**Track 4: Green Horizon (Smart Cities & Mobility) | 🌏 Project 2030: MyAI Future Hackathon**

> 💡 *Redefining urban mobility through AI-driven transparency, behavioral nudging, and Net Zero accountability.*

---

## 📖 Why This Project Exists

**EDAT was born from a specific frustration: Malaysia's highway tolls are frozen in time.**

Every car — EV or diesel, rush hour or 3 AM, clear skies or monsoon — pays the same flat rate. There is no discount for choosing an electric vehicle, and no surcharge that reflects the real cost of congestion or polluted air. Transport ministries and environment agencies operate in data silos. The result is a system that is simultaneously unfair to eco-conscious commuters and completely blind to its own carbon footprint.

**The Johor-Singapore Innovation Corridor made this problem impossible to ignore.**  
One of Southeast Asia's busiest cross-border corridors, it handles enormous daily traffic volumes under extreme tropical weather, yet its tolling infrastructure has no awareness of the conditions around it.

✨ **EDAT was built to fix the missing layer:** a **live, intelligent pricing engine** that turns every toll transaction into a real-time nudge toward Net Zero 🌱♻️.

---

## 🧠⚙️ The Solution

EDAT replaces the static toll booth with an AI-native pricing engine that responds to the real world in real time.

At its core, EDAT is a multi-agent system built on Google's AI stack. When a driver approaches a toll point, the engine:

- 🌦 Pulls live weather data from MET Malaysia  
- 🚗 Pulls current road occupancy from sensor feeds  
- 🪪 Retrieves vehicle emission class from registration database  
- 📊 Reads air quality index from DOE’s APIMS network  

Two AI agents process this data:

| 🤖 Agent | 🧩 Responsibility |
|---------|------------------|
| **AnalystAgent** | Calculates environmental multipliers (congestion, weather, heat, air quality) |
| **LegalAgent** | Applies policy rules, EV incentives, diesel penalties, and enforces the 3.5× cap |

---

## 🧮 Pricing Engine Logic

### AnalystAgent

Inputs:
- 📊 Occupancy percentage  
- 🌧 Rainfall (mm)  
- 🌫 Air Quality Index  
- 🌡 Temperature  
- 🛣 Road segment  

Outputs environmental multipliers:

| Factor | Logic |
|--------|------|
| Volume | 1.7× peak, 1.4× heavy congestion, 1.15× moderate |
| Weather | 1.08× heavy rain, 1.05× moderate, 1.02× light |
| Temperature | 1.05× >35°C, 1.02× >32°C |
| Road carbon | Based on segment intensity |
| Air quality | Up to 1.25× for hazardous |

---

### LegalAgent

| Vehicle | Multiplier | Surcharge |
|--------|-----------|----------|
| ⚡ EV | 0.6× | waived |
| 🔋 Hybrid | 0.8× | waived |
| ⛽ Petrol | 1.0× | normal |
| 🚛 Diesel | 1.5× | applied |

🔒 **Constraint:** Maximum toll = 3.5× base rate

---

### 🧮 Final Pricing Formula

```text
proposed = baseToll × volumeMult × weatherMult × tempMult × aqiMult × roadMult × carbonMult
final    = min(proposed, baseToll × 3.5)
```
---

### 💡 Smart Output Layer

- ✨ **Eco-Tip (Gemini):** personalised advice (<15 words)  
- 📜 **Legal Note (Vertex AI):** grounded in Malaysian regulations  
- 🚦 **Time & Mode Suggestions:** off-peak + public transport  

---

### 🔒 Privacy

- Plate numbers hashed on-device (SHA-256)  
- No raw identity stored  
- Firestore logs immutable ESG records  

---

## 🚀 Additional Features

- 🤖 ARIA Assistant (real-time suggestions)  
- 📉 Predictive Time-Shift Analytics  
- 📊 ESG Carbon Tracking  

---

## 🛠 Tech Stack

### Core AI Pillars

1. **Gemini 1.5 Flash** → reasoning & recommendations  
2. **Firebase Genkit** → agent orchestration  
3. **Cloud Run** → scalable deployment  
4. **Vertex AI Search** → regulation grounding  

---

### Supporting Tech

- 🗺 Leaflet + OpenStreetMap  
- 📊 Chart.js  
- 🔐 Firebase Authentication  
- 🗄 Firestore  

---

## 🌍 Impact

### 🌱 Environmental
- Reduces congestion emissions  
- Rewards EV usage  
- Weather-aware traffic control  

### 👥 Social
- Off-peak savings for flexible users  
- Public transport alternatives  
- Safer travel during extreme weather  

### 🏛 Governance
- Real-time carbon monitoring  
- Automated ESG reporting  
- Regulatory audit trail  

---

## 🌍 Sustainable Development Goals (SDG Alignment)

EDAT directly contributes to the United Nations Sustainable Development Goals (SDGs), focusing on intelligent, low-carbon mobility.

### 🏙 SDG 11 — Sustainable Cities and Communities
- 🚗 Reduces congestion  
- 🚦 Improves traffic flow  
- 💡 Encourages efficient travel  

**Target 11.2:** Sustainable transport through AI optimisation

---

### 🌱 SDG 13 — Climate Action
- 📉 Lower emissions  
- ⚡ EV incentives  
- 🌧 Weather-based control  

---

### 🏗 SDG 9 — Industry, Innovation and Infrastructure
- 🤖 AI-powered infrastructure  
- 🔄 Upgrades existing systems  
- 📊 Enables policy decisions  

---

## 💼 Business Model

EDAT is a **SaaS platform for highway operators**.

### 💰 Revenue Streams

| Stream | Description |
|-------|------------|
| 💻 Platform Licence Fee | API + infrastructure |
| 📈 Revenue Share | 2–5% uplift |
| 🏢 B2B ESG Subscription | Corporate reporting |

---

## 📄 Get Started
Using this link to access our product: https://edat-backend-480049975034.asia-southeast1.run.app
For login, click the demo account to demonstrate the user. 


## 📄 License

Built with ❤️ for Project 2030: MyAI Future Hackathon  
