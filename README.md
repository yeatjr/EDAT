# 🌿🚗 Eco-Dynamic AI Tolling (EDAT)
** Track 4: Green Horizon (Smart Cities & Mobility) | 🌏 Project 2030: MyAI Future Hackathon**

> 💡"Redefining urban mobility through AI-driven transparency, behavioral nudging, and Net Zero accountability."

---

## 📖Why This Project Exists

**EDAT was born from a specific frustration: Malaysia's highway tolls are frozen in time.**

Every car — EV or diesel, rush hour or 3 AM, clear skies or monsoon — pays the same flat rate. There is no discount for choosing an electric vehicle, and no surcharge that reflects the real cost of congestion or polluted air. Transport ministries and environment agencies operate in data silos. The result is a system that is simultaneously unfair to eco-conscious commuters and completely blind to its own carbon footprint.

**The Johor-Singapore Innovation Corridor made this problem impossible to ignore.**
One of Southeast Asia's busiest cross-border corridors, it handles enormous daily traffic volumes under extreme tropical weather, yet its tolling infrastructure has no awareness of the conditions around it.

✨ **EDAT was built to fix the missing layer:** a **live, intelligent pricing engine** that turns every toll transaction into a real-time nudge toward Net Zero 🌱♻️.

---

## 🧠⚙️ The solution

EDAT replaces the static toll booth with an AI-native pricing engine that responds to the real world in real time.

At its core, EDAT is a multi-agent system built on Google's AI stack. When a driver approaches a toll point, the engine: <br><br>
i) 🌦 pulls live weather data from MET Malaysia <br>
ii) 🚗 pulls current road occupancy from sensor feeds <br>
iii) 🪪 takes the vehicle's emission class from the registration database <br>
iv) 📊 reads the air quality index from DOE's APIMS network <br> <br>

Then, two AI agents - the **AnalystAgent** and the **LegalAgent** — process this information in sequence 🔄, each with a distinct responsibility. <br>

| 🤖 Agent | 🧩 Responsibility |
|---------|------------------|
| **AnalystAgent**   | does the environmental physics. It calculates how much peak-hour congestion, rainfall intensity, heat stress, and air quality should each adjust the base toll. |
| **LegalAgent**     | applies Malaysian regulatory policy. It grants EV and hybrid drivers their earned discount, penalises high-emission diesel vehicles, and enforces the 3.5× regulatory price cap so no driver is ever blindsided by an extreme surcharge. |

<br>

## Pricing Engine Logic


### AnalystAgent

The **AnalystAgent** receives the current state of the road system:

- 📊 Occupancy percentage  
- 🌧 Rainfall (mm)  
- 🌫 Air Quality Index (AQI/API)  
- 🌡 Temperature (°C)  
- 🛣 Road segment ID  

It then produces a set of **raw environmental multipliers** that reflect real-world driving conditions.


#### 📈 Factor Logic


| Factor | Logic | 
|--------|-------|
| Volume multiplier | 1.7× during scheduled peak hours (7–9 AM, 5–8 PM); 1.4× if real-time occupancy exceeds 85%; 1.15× for moderate congestion (60–85%) |
| Weather multiplier | 1.08× for heavy rain (>10 mm); 1.05× for moderate rain (>2.5 mm); 1.02× for light rain |
| Temperature multiplier | 1.05× above 35°C (asphalt stress); 1.02× above 32°C |
| Road carbon multiplier | Per-segment intensity value from the roadIntensityMap (e.g. 1.15× on E1_DUTA) |
| Air quality multiplier | 1.25× hazardous (AQI >150); 1.15× unhealthy (>100); 1.05× moderate (>50) |



### LegalAgent

The **LegalAgent** receives the AnalystAgent’s output and applies **Malaysian regulatory policy rules** based on vehicle classification.



#### 🚗 Vehicle Policy Rules

| 🚙 Vehicle Type | ⚖️ Carbon Multiplier | 🌫 Surcharge Handling |
|----------------|----------------------|----------------------|
| ⚡ EV | **0.6×** | Fully waived |
| 🔋 Hybrid | **0.8×** | Fully waived |
| ⛽ Petrol (Standard) | **1.0×** | Applied as normal |
| 🚛 Diesel | **1.5×** | Applied as normal |

<br>
### 🔒 Regulatory Constraint

The LegalAgent enforces a strict **3.5× toll cap** ⚠️:

> ❗ The final toll can never exceed 3.5× the base rate, regardless of conditions.



### 🧮 Final Pricing Formula

```text
proposed = baseToll × volumeMult × weatherMult × tempMult × aqiMult × roadMult × carbonMult

final    = min(proposed, baseToll × 3.5)
```
<br>

**Also, the final price is not just a number. 🔢❌** <br><br>

**Gemini 1.5 Flash:** generates a **personalised Eco-Tip**  — a single sentence that tells the driver exactly why their toll is what it is and what they could do differently to pay less next time. <br><br>
**Vertex AI Search:** grounds a Legal Auditor Note in the actual text of the National Energy Transition Roadmap and Malaysia's Clean Air Quality Regulations 2014, so the justification is never a black box. <br><br>

🚦Alongside each toll, EDAT **highlights smarter travel choices** by showing how prices change across time and modes. <br><br>
🕐 Drivers can clearly see that **off-peak hours are cheaper**, encouraging them to **shift trips away from congestion**. <br><br> 
At the same time, the system presents **alternative options like buses 🚌 or LRT 🚆**, giving users a practical way to choose public transport and reduce their carbon footprint.<br><br>

🔒 Every trip is logged to Firestore as an immutable, **privacy-safe ESG record**: <br>
Vehicle plate numbers SHA-256 **hashed on the client device** before transmission which creates the audit trail that individual commuters, corporate fleet managers, and government agencies have never had.


### Additional Features
🤖 **ARIA**: Proactive AI Assistant: Details how Gemini 1.5 Flash generates personalized sentences (≤ 15 words) to advise drivers on savings and emissions. <br>
📉 **Predictive Time-Shift Analytics**: Highlights the system's ability to forecast toll changes over the next 3 hours, nudging users toward cheaper, off-peak windows. <br>
📊 **ESG Carbon Intelligence**: Explains the high-fidelity CO₂ tracking stored in Cloud Firestore for both personal and corporate carbon accounting. <br>


---
## 🛠 Tech Stack & "Build With AI" Pillars

EDAT is built on four core pillars of the Google Cloud AI ecosystem, accelerated by **Antigravity**, the Google DeepMind agentic coding assistant.

<br>

## 🧠 Pillar 1: The Intelligence (Brain) — Gemini 1.5 Flash

Toll pricing must complete in milliseconds  — a vehicle at a toll plaza cannot wait for a slow model. Flash is invoked at two points in every transaction:

- ✨ **Eco-Tip Generation:** Inside the Genkit `pricingFlow`, after the final toll is calculated, Gemini receives the vehicle type, base toll, final toll, volume reason, and weather condition. It returns a single personalised sentence (≤ 15 words) advising the driver how to save money or reduce emissions. This is pure generative reasoning at the edge of a financial transaction.

- 🚦 **Multi-Modal Recommendation:** Gemini ingests the full Google Routes driving data 🗺, Google Transit fare data, the GTFS JB transit lookup, and the dynamic surcharge breakdown, then returns a structured JSON object comparing total driving cost vs. public transit cost with a human-readable recommendation and surcharge explanation.

<br>

## 🔄 Pillar 2 — The Orchestrator: Firebase Genkit + Vertex AI Agent Builder

We use **Firebase Genkit** (`@genkit-ai/googleai`) to construct the `pricingFlow`. Genkit orchestrates the execution between specialized agents:

- 🧪 **Analyst Agent:** Evaluates MET Malaysia weather data and highway sensor occupancy (dynamic factors).  
- ⚖️ **Legal Agent:** Enforces regulatory policy caps and vehicle-specific incentives (EV/Hybrid) to ensure pricing remains within legal bounds.

<br>

## 💻 Pillar 3 — The Development Lifecycle: Google Cloud Workstations + Cloud Run

- ☁️ The development was accelerated using **Google Cloud Workstations**, providing a high-performance, managed environment for rapid prototyping.

- ☁️ The system is containerized and deployed on **Google Cloud Run**, leveraging serverless architecture to handle traffic spikes with ultra-low latency.

<br>

## 📚 Pillar 4 — The Context: Vertex AI Search (RAG on National Datasets)

- 📄 Serves as the **RAG (Retrieval-Augmented Generation)** layer .

- It queries official Malaysian Tolling Policies 🇲🇾 and Environmental Regulations (PDFs) stored in a Vertex AI Data Store to ground the AI's justifications, ensuring every surcharge is mathematically and legally defensible.

<br>

## 🤖 AI Coding Assistant: Antigravity

The entire EDAT platform — from the UI to the multi-agent backend was co-developed with **Antigravity**, a powerful agentic AI coding assistant designed by Google DeepMind.

Antigravity enabled:
- ⚡ Rapid architectural decisions  
- 🔌 Complex SDK integrations  
- 🚀 Automated performance optimizations  

throughout the build process.

<br>

## 🌐 Additional Technologies

- 🗺 **Mapping & Routing:** Leaflet.js + OpenStreetMap (OSRM) 
- 📊 **Data Visualization:** Chart.js 
- 🔐 **Authentication:** Firebase Authentication (v8.10.1)   
- 🗄 **Database:** Google Cloud Firestore 

<br>

## 🌍 External APIs

- 📍 Google Routes API 
- 🌦 MET Malaysia API 
- 🚆 data.gov.my (GTFS) 

---

## 🌍📊 Impact

### 🌱🌿 Environmental

**The core mechanism:** <br><br>
📈💸 Our system makes peak-hour high-emission trips more expensive and off-peak, low-emission trips cheaper directly reduces the incentive to drive during the hours and in the vehicles that cause the most damage. <br> <br>
⚡💰 EV toll discounts of up to 40% create a tangible, repeated financial reward for green vehicle ownership that compounds over every single journey. <br> <br>
🌧⚠️ Weather-responsive surcharges during monsoon events naturally deter non-essential heavy traffic, reducing both accident rates and the road surface damage caused by heavy vehicles on heat-softened asphalt. <br> <br>

Over time, the Firestore ESG ledger  accumulates a high-resolution, corridor-level dataset of transport emissions that has never existed in Malaysia before 🇲🇾 — one that can directly inform the government's Net Zero pathway modelling.

<br>

### 👥💬 Social

⚠️ A common concern: dynamic pricing done wrong is regressive, it just makes travel more expensive for people who cannot change their schedule. <br> <br>

**EDAT is designed to avoid this. ✅**<br> 
💰The off-peak discount means that anyone with even modest schedule flexibility benefits financially. <br> <br>
🚦The multi-modal comparison card actively surfaces cheaper alternatives at the moment of payment, not after the fact. <br> <br>

**Weather surcharges 🌧 serve a safety function:** <br>
🚧 During the **worst monsoon storms 🌧, higher prices** discourage casual trips that contribute to accident-prone conditions . <br> <br>

<br>

### 🏛📜 Governance

EDAT produces three things that Malaysian transport governance currently lacks entirely ❗ <br><br>

- 📡 A real-time view of corridor-level carbon intensity <br>
- 📊 An automated Scope 3 emissions ledger for corporate fleet operators <br>
- 📜 A regulatory-grounded audit trail for every pricing decision <br>

🛣 Highway concessionaires can demonstrate to SPAD and the Ministry of Finance that their dynamic pricing is capped at 3.5× base and justified by published regulations — not arbitrary AI decisions. <br>
🚛 For companies operating logistics fleets on the North-South Expressway, the Firestore ESG records provide the input data for annual sustainability reports with zero manual calculation.

---

🌍 Sustainable Development Goals (SDG Alignment)

EDAT directly contributes to the United Nations Sustainable Development Goals (SDGs), with a primary focus on transforming urban mobility systems into intelligent, low-carbon infrastructure.

🏙 Primary SDG: SDG 11 — Sustainable Cities and Communities

EDAT addresses one of the core challenges of SDG 11: urban transport inefficiency and congestion.

🚗 Reduces peak-hour congestion through dynamic pricing
🚦 Improves traffic flow across high-density corridors
💡 Encourages smarter travel behaviour via real-time incentives

Target 11.2 Contribution:

Providing access to safe, efficient, and sustainable transport systems through AI-driven optimisation.

🌱 Secondary SDG: SDG 13 — Climate Action

EDAT actively reduces transport-related emissions by influencing when and how people travel.

📉 Lower emissions through reduced congestion
⚡ Incentivises EV and hybrid vehicle usage
🌧 Weather-aware pricing reduces high-risk, high-emission trips
🏗 Supporting SDG: SDG 9 — Industry, Innovation and Infrastructure

EDAT modernises legacy toll infrastructure into an intelligent, data-driven system.

🤖 AI-powered decision-making integrated into national infrastructure
🔄 Enhances existing systems without requiring new hardware
📊 Enables data-driven policy and infrastructure planning

## 💼💰 Business Model

**EDAT is sold to highway concession companies 🛣 — PLUS Expressways, Litrak, SPRINT, EDL, and the operators of the Johor causeway links — as a Software-as-a-Service (SaaS) platform licensed on top of their existing toll infrastructure.**

**The primary customer is the highway operator, not the driver.**<br>
The operator integrates EDAT's pricing engine via API into their existing Electronic Toll Collection (ETC) system. <br>
EDAT handles all the **AI 🤖, weather data 🌦, agent orchestration 🔄, legal compliance checks ⚖️, and Firestore logging 📊.** <br>
The operator's ETC hardware simply calls the EDAT /api/pricing/calculate endpoint at the point of vehicle detection and receives the final price in milliseconds.

<br>

### 💰📊 Revenue Streams

| 💡 Stream | 📄 Description |
|----------|---------------|
| **Platform Licence Fee** 💻 | Fixed SaaS fee based on transaction volume, covering API, cloud infra, and regulatory updates |
| **Revenue Share** 📈 | 2–5% of additional revenue generated from dynamic pricing uplift |
| **B2B ESG Subscription** 🏢 | Monthly fee for corporate dashboards 📊 and automated Scope 3 reporting |

The first and largest is a platform licence fee paid by the **highway concessionaire**. <br>
This is a fixed monthly or annual SaaS fee covering API access, cloud infrastructure, regulatory document maintenance, and uptime SLAs.

The second stream is a **revenue-share on dynamic yield uplift** , aligning EDAT's commercial incentive directly with the operator.

The third stream is a **B2B ESG data subscription**  for logistics companies and enterprises needing automated emissions reporting.

<br>

## 📄 License
Built with ❤️ for **Project 2030: MyAI Future Hackathon**. Distributed under the MIT License.
