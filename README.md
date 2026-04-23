# Eco-Dynamic AI Tolling (EDAT) 🌿🚗
**Track 4: Green Horizon (Smart Cities & Mobility) | Project 2030: MyAI Future Hackathon**

> "Redefining urban mobility through AI-driven transparency, behavioral nudging, and Net Zero accountability."

---

## 📖 Overview
**EDAT (Eco-Dynamic AI Tolling)** is a next-generation smart infrastructure system designed to solve Malaysia's chronic urban congestion and carbon footprint challenges. Unlike traditional "fixed-rate" tolling, EDAT uses a multi-agent AI system to calculate dynamic, fair, and eco-conscious toll rates in real-time.

By factoring in vehicle emissions, real-time traffic density, weather conditions, and highway occupancy, EDAT incentivizes sustainable travel behavior while maintaining full compliance with national tolling policies.

---

## 🚀 The "Build With AI" Implementation
EDAT transitions from traditional static logic to a full **Agentic AI Workflow**, entirely powered by the **Google AI Ecosystem Stack**.

### 1. The Intelligence (Brain): Gemini 1.5 Flash
Powers our core pricing logic and generates dynamic, contextual "Eco-Tips" to nudge drivers toward off-peak travel. Its low-latency processing ensures real-time pricing at highway speeds.

### 2. The Orchestrator: Firebase Genkit
We use **Firebase Genkit** (`@genkit-ai/googleai`) to construct the `pricingFlow`. Genkit orchestrates the execution between specialized agents:
*   **Analyst Agent:** Evaluates MET Malaysia weather data and highway sensor occupancy.
*   **Legal Agent:** Enforces regulatory policy caps to ensure pricing remains fair and within legal bounds.

### 3. The Context: Vertex AI Search (RAG)
Serves as the **RAG (Retrieval-Augmented Generation)** layer. It queries official Malaysian Tolling Policies and Environmental Regulations (PDFs) to ground the AI's justifications, providing a "Legal Auditor Note" for every price calculation.

### 4. The Infrastructure: Google Cloud Run & Firestore
The Node.js backend is containerized and deployed on **Google Cloud Run** for serverless scaling. **Firestore** serves as the immutable ledger for ESG trip logging and carbon footprint tracking.

---

## 🔒 Privacy & Security: The "Behaviour Layer"
EDAT implements a **Privacy-First Architecture** inspired by PDPA 2010 compliance:
*   **SHA-256 Anonymization:** Vehicle license plates are hashed locally on-device. No PII (Personally Identifiable Information) ever reaches the analytics engine.
*   **Layered Separation:** User identities (Identity Layer) are strictly separated from travel patterns (Behaviour Layer). Mapping only occurs for verified dashboard display, ensuring travel history remains anonymous and secure.

---

## 🛠 Tech Stack
*   **Frontend:** HTML5, Vanilla JS (ES6+), CSS3 (Glassmorphism), Leaflet.js (Map Rendering), Google Routes API.
*   **Backend:** Node.js, Express, Firebase Admin SDK.
*   **AI/ML:** Firebase Genkit, Gemini 1.5 Flash, Vertex AI Search.
*   **Cloud:** Google Cloud Platform (Cloud Run, Artifact Registry, Firestore).
*   **Data:** MET Malaysia (Weather), data.gov.my (GTFS Transit Data).

---

## 💻 Setup & Installation

### 1. Prerequisites
*   Google Cloud Project ID
*   Gemini API Key (via Google AI Studio)
*   Vertex AI Search Data Store (populated with tolling policy PDFs)

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env file
cp .env.example .env
npm run dev
```

### 3. Frontend Setup
The frontend is a static web application. No build step is required.
```bash
# Serve the root directory
npx serve .
```

---

## 🌟 Key Features
*   **Live AI Map:** Real-time visualization of highway heatmaps and dynamic toll detection.
*   **ARIA AI Assistant:** An integrated chatbot that helps users calculate tolls, understand their carbon footprint, and learn about privacy protocols.
*   **Multi-Modal Comparison:** Automatically compares car travel vs. public transit (LRT/MRT/Bus) to encourage green commuting.
*   **Carbon Footprint Analytics:** Detailed breakdowns of CO₂ generated per journey, categorized by vehicle efficiency.
*   **Transparency Auditor:** Every toll price includes an "AI Justification" string explaining exactly why the price was set (e.g., +15% due to peak congestion, -5% for EV vehicle).

---

## 📄 License
Built with ❤️ for **Project 2030: MyAI Future Hackathon**. Distributed under the MIT License.
