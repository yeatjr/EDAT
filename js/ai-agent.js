/* ── ai-agent.js — EDAT AI Assistant Widget ── */
/* Auto-injected on all pages via main.js          */

(function () {
  'use strict';

  // ── Knowledge Base ──────────────────────────────────────────────────
  const KB = [
    // Pricing
    { tags:['price','charged','cost','how much','why','toll','expensive','rm','rate'],
      reply: (ctx) => {
        const j = ctx.lastJourney;
        if (j) return `Your last toll at <strong>${j.corridor}</strong> was <strong>RM ${j.toll.toFixed(2)}</strong>. This was calculated as:<br/><br/>RM 2.00 × (1 + ${j.emission.toFixed(3)} × carbon multiplier) × speed factor = <strong>RM ${j.toll.toFixed(2)}</strong><br/><br/>Your vehicle class (${j.vehicle}) determines the carbon multiplier. Lower emission = lower toll! 🌿`;
        return `Toll prices follow the EDAT formula:<br/><br/>📌 <strong>Toll = BaseRate × (1 + EmissionIndex × CarbonMultiplier) × SpeedFactor</strong><br/><br/>Your vehicle type determines the carbon multiplier:<br/>• EV: ×0.2 (lowest)<br/>• Petrol: ×0.8<br/>• Diesel: ×1.8+<br/><br/>Ask me about your specific charge!`;
      }
    },
    // Emissions
    { tags:['emission','co2','carbon','green','environment','pollution','footprint'],
      reply: (ctx) => {
        const j = ctx.lastJourney;
        if (j) return `Your last recorded emission index was <strong>${j.emission.toFixed(3)}</strong>.<br/><br/>This puts you in the ${j.emission < 0.3 ? '🟢 Tier 1 Green' : j.emission < 0.8 ? '🟡 Tier 2 Standard' : '🔴 Tier 3 High Impact'} band.<br/><br/>To reduce your emission index, consider switching to a hybrid or EV — this alone can reduce your index by up to 75%!`;
        return `EDAT measures emission index from <strong>0.0 (zero emission) to 2.5+ (heavy diesel)</strong>.<br/><br/>🟢 &lt;0.3 — Tier 1 Green (EV, Hybrid)<br/>🟡 0.3–0.8 — Tier 2 Standard (Petrol)<br/>🔴 &gt;0.8 — Tier 3 High Impact (Diesel, Truck)<br/><br/>Your emission index directly multiplies your toll cost!`;
      }
    },
    // Hash / privacy
    { tags:['hash','privacy','plate','sha','anonymous','data','identity','stored','pii','pdpa'],
      reply: () =>
        `🔒 <strong>EDAT never stores your licence plate!</strong><br/><br/>Here's how it works:<br/>1. Your camera reads "WXY 1234"<br/>2. SHA-256 hash is computed <em>on the camera device</em><br/>3. Only the 64-char hash "a3f9c2..." reaches our servers<br/>4. SHA-256 is <strong>mathematically irreversible</strong> — even we can't recover your plate<br/><br/>This ensures full PDPA 2010 compliance. ✅`
    },
    // AI confidence
    { tags:['confidence','accuracy','ai','detection','fallback','low','uncertain','model'],
      reply: () =>
        `🎯 <strong>AI Confidence Thresholds:</strong><br/><br/>• ≥95% — Standard dynamic pricing<br/>• 85–95% — Standard pricing (logged)<br/>• 70–85% — ⚠️ Fallback: base rate only<br/>• &lt;70% — 🚨 Manual review queue<br/><br/>When confidence falls below 85%, EDAT applies a <strong>conservative fallback price</strong> to protect you from overcharging due to uncertain classification. You'll see this flagged on your receipt.`
    },
    // Exemptions / fairness
    { tags:['exempt','free','emergency','ambulance','motorcycle','b40','hardship','discount'],
      reply: () =>
        `🛡️ <strong>EDAT Fairness Exemptions:</strong><br/><br/>• 🚑 <strong>Emergency vehicles</strong> (ambulance, fire, police) — <strong>RM 0.00 always</strong><br/>• 🏍️ <strong>B40 registered motorcycles</strong> — 50% off base rate<br/>• ⚡ <strong>Electric Vehicles</strong> — ×0.2 carbon multiplier (lowest tier)<br/>• 👨‍👧 Hardship override available via appeal<br/><br/>These are automatically applied by the AI — no manual claim needed!`
    },
    // Account / history
    { tags:['account','history','journey','trip','record','login','register','sign'],
      reply: (ctx) => {
        if (ctx.user) return `Hi ${ctx.user.name.split(' ')[0]}! 👋 Your account has <strong>${ctx.journeyCount} recorded journeys</strong>.<br/><br/>Head to <a href="account.html" style="color:var(--red);font-weight:700;">My Account</a> to see:<br/>• Full journey history<br/>• AI-detected commute patterns<br/>• Personalised savings suggestions<br/>• CO₂ footprint tracking`;
        return `You can create a free EDAT account to track your:<br/><br/>📋 <strong>Journey history</strong> — every toll, anonymised<br/>🗺️ <strong>Route patterns</strong> — AI detects your commute<br/>💡 <strong>Savings tips</strong> — personalised by AI<br/>🌿 <strong>Carbon footprint</strong> — track your ESG impact<br/><br/><a href="login.html" style="color:var(--red);font-weight:700;">Sign up free →</a>`;
      }
    },
    // Suggestions / savings
    { tags:['save','saving','reduce','cheaper','tip','suggestion','advice','how to','lower','improve'],
      reply: (ctx) => {
        const v = ctx.user?.vehicle || 'Petrol Car';
        const isEV = v === 'EV' || v === 'Hybrid';
        return `💡 <strong>Top EDAT Saving Tips:</strong><br/><br/>${!isEV ? '⚡ <strong>Switch to EV</strong> — reduce your multiplier from ×0.8 to ×0.2 (save ~60%)<br/>' : '✅ Great — you\'re already on the green multiplier!<br/>'}⏰ <strong>Travel off-peak</strong> — 07:10 instead of 07:30 lowers your speed factor<br/>🛣️ <strong>Combine trips</strong> — fewer journeys = lower total carbon<br/>🌳 <strong>Carbon offset</strong> — offset remaining CO₂ via MyCarbon Credits<br/><br/>Check your <a href="account.html" style="color:var(--red);font-weight:700;">AI Suggestions</a> for personalised tips!`;
      }
    },
    // Dashboard
    { tags:['dashboard','live','traffic','camera','feed','monitor','operator'],
      reply: () =>
        `📊 The <strong>EDAT Executive Dashboard</strong> gives operators real-time visibility into:<br/><br/>• Live camera feeds with AI bounding boxes<br/>• Revenue and emission KPIs<br/>• Transaction feed with confidence scores<br/>• Pricing control sliders<br/>• Corridor heatmaps<br/><br/><a href="dashboard.html" style="color:var(--red);font-weight:700;">Open Dashboard →</a>`
    },
    // API
    { tags:['api','developer','integrate','rest','webhook','websocket','sdk','code','endpoint'],
      reply: () =>
        `🔧 <strong>EDAT REST API v2:</strong><br/><br/>Base URL: <code style="background:var(--sky);padding:2px 6px;border-radius:3px;font-size:0.82rem;">https://api.edat.gov.my/v2</code><br/><br/>Key endpoints:<br/>• <code>GET /transactions</code> — Live data<br/>• <code>POST /hash/lookup</code> — Check a hash<br/>• <code>GET /esg/report?format=pdf</code> — ESG export<br/>• <code>wss://stream.edat.gov.my/v2/live</code> — WebSocket<br/><br/><a href="tech.html" style="color:var(--red);font-weight:700;">Full API Docs →</a>`
    },
    // Transparency
    { tags:['transparent','check','verify','look up','lookup','receipt','audit','dispute'],
      reply: () =>
        `🔍 <strong>Check any toll transaction on the Transparency Portal:</strong><br/><br/>1. Enter your licence plate number<br/>2. We hash it locally (SHA-256) in your browser<br/>3. Look up the hash — see exactly what EDAT saw, what it charged, and why<br/><br/>You can also raise a <strong>dispute</strong> directly from the result page if you believe the charge was incorrect.<br/><br/><a href="transparency.html" style="color:var(--red);font-weight:700;">Check My Toll →</a>`
    },
    // General / hello
    { tags:['hello','hi','hey','help','what','who','can you','edat','about','explain'],
      reply: () =>
        `👋 Hi! I'm <strong>ARIA</strong> — the EDAT AI Assistant.<br/><br/>I can help you with:<br/>🔍 Explaining your toll charges<br/>💰 Finding ways to save on tolls<br/>🌿 Understanding your emission index<br/>🔒 How SHA-256 privacy works<br/>📊 Navigating the EDAT platform<br/>🤖 AI confidence scoring<br/><br/>What would you like to know? Just ask in plain language!`
    },
  ];

  const FALLBACK = `I'm not sure about that specific question yet! 🤔<br/><br/>Try asking me about:<br/>• Your toll charges and pricing<br/>• Reducing your emissions<br/>• Privacy and SHA-256 hashing<br/>• Your journey history<br/>• API documentation<br/><br/>Or head to <a href="tech.html" style="color:var(--red);">Tech & API</a> for full documentation.`;

  // ── Context ──────────────────────────────────────────────────────────
  function getContext() {
    try {
      const user       = JSON.parse(localStorage.getItem('edat_user') || 'null');
      const journeys   = JSON.parse(localStorage.getItem('edat_journeys') || '[]');
      const lastJourney= journeys.length ? journeys[0] : null;
      return { user, journeys, journeyCount: journeys.length, lastJourney };
    } catch { return {}; }
  }

  // ── Matching ─────────────────────────────────────────────────────────
  function getReply(input) {
    const q   = input.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
    const ctx = getContext();

    for (const item of KB) {
      if (item.tags.some(t => q.includes(t))) {
        const r = item.reply;
        return typeof r === 'function' ? r(ctx) : r;
      }
    }
    return FALLBACK;
  }

  // ── Suggested questions ───────────────────────────────────────────────
  const QUICK_QUESTIONS = [
    'Why was I charged RM 4.80?',
    'How can I reduce my toll?',
    'How does SHA-256 privacy work?',
    'What is my emission index?',
    'Am I eligible for exemptions?',
    'Show me the API docs',
  ];

  // ── UI ────────────────────────────────────────────────────────────────
  const css = `
    #aria-fab {
      position:fixed; bottom:28px; right:28px; z-index:9999;
      width:60px; height:60px; border-radius:50%;
      background:var(--navy); color:white;
      display:flex;align-items:center;justify-content:center;
      font-size:1.5rem; cursor:pointer;
      box-shadow:0 6px 28px rgba(27,42,74,0.4);
      border:3px solid white;
      transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
      animation:aria-bounce 2s infinite 3s;
    }
    #aria-fab:hover { transform:scale(1.1);box-shadow:0 10px 36px rgba(27,42,74,0.5); }
    #aria-fab.open  { background:var(--red); animation:none; transform:rotate(45deg); }
    #aria-fab .aria-notif {
      position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;
      background:var(--red);color:white;font-size:0.6rem;font-weight:800;
      display:flex;align-items:center;justify-content:center;
      animation:aria-pulse 2s infinite;
    }
    #aria-fab.open .aria-notif { display:none; }
    @keyframes aria-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes aria-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(214,48,49,0.5)} 70%{box-shadow:0 0 0 8px rgba(214,48,49,0)} }

    #aria-panel {
      position:fixed; bottom:104px; right:28px; z-index:9998;
      width:380px; max-height:560px;
      background:white; border:1px solid #E5E7EB;
      border-radius:20px; overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.18);
      display:none; flex-direction:column;
      animation:aria-slide-in 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    #aria-panel.open { display:flex; }
    @keyframes aria-slide-in {
      from{opacity:0;transform:translateY(20px) scale(0.95)}
      to  {opacity:1;transform:translateY(0) scale(1)}
    }

    .aria-header {
      background:var(--navy);padding:16px 18px;
      display:flex;align-items:center;gap:12px;flex-shrink:0;
    }
    .aria-avatar {
      width:36px;height:36px;border-radius:50%;
      background:linear-gradient(135deg,var(--red),#FF6B6B);
      display:flex;align-items:center;justify-content:center;
      font-size:1.1rem;flex-shrink:0;
      box-shadow:0 2px 8px rgba(214,48,49,0.4);
    }
    .aria-name    {color:white;font-weight:800;font-size:0.9rem;line-height:1.2;}
    .aria-status  {color:rgba(255,255,255,0.6);font-size:0.72rem;display:flex;align-items:center;gap:5px;}
    .aria-dot     {width:6px;height:6px;border-radius:50%;background:#00E676;animation:aria-pulse 1.8s infinite;}
    .aria-close   {margin-left:auto;color:rgba(255,255,255,0.6);font-size:1.2rem;cursor:pointer;line-height:1;
      background:rgba(255,255,255,0.1);border:none;width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
    .aria-close:hover{color:white;background:rgba(255,255,255,0.2);}

    .aria-messages {
      flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;
    }
    .aria-messages::-webkit-scrollbar{width:4px;}
    .aria-messages::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:2px;}

    .aria-msg {display:flex;gap:8px;align-items:flex-start;}
    .aria-msg.user{flex-direction:row-reverse;}
    .aria-msg-avatar{
      width:28px;height:28px;border-radius:50%;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:800;
    }
    .aria-msg.bot  .aria-msg-avatar{background:var(--navy);color:white;}
    .aria-msg.user .aria-msg-avatar{background:linear-gradient(135deg,var(--red),#FF6B6B);color:white;}
    .aria-bubble {
      max-width:80%;padding:10px 14px;border-radius:14px;font-size:0.84rem;line-height:1.6;
    }
    .aria-msg.bot  .aria-bubble{background:#F3F4F6;border-bottom-left-radius:4px;color:#111827;}
    .aria-msg.user .aria-bubble{background:var(--red);border-bottom-right-radius:4px;color:white;text-align:right;}
    .aria-time {font-size:0.65rem;color:#9CA3AF;margin-top:3px;text-align:right;}
    .aria-msg.bot .aria-time{text-align:left;}

    .aria-typing {display:flex;gap:4px;align-items:center;padding:12px 14px;}
    .aria-typing span {
      width:7px;height:7px;border-radius:50%;background:#9CA3AF;
      animation:aria-typing 1.2s infinite;
    }
    .aria-typing span:nth-child(2){animation-delay:0.2s;}
    .aria-typing span:nth-child(3){animation-delay:0.4s;}
    @keyframes aria-typing{0%,80%,100%{transform:scale(1)}40%{transform:scale(1.4)}}

    .aria-quick-btns {
      padding:10px 14px 0;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;
    }
    .aria-quick {
      background:#F3F4F6;border:1px solid #E5E7EB;border-radius:100px;
      padding:5px 12px;font-size:0.75rem;font-weight:600;color:#374151;
      cursor:pointer;transition:all 0.2s;white-space:nowrap;
      font-family:inherit;
    }
    .aria-quick:hover{background:var(--red-light,#FEF2F2);border-color:rgba(214,48,49,0.3);color:var(--red,#D63031);}

    .aria-input-row {
      padding:12px 14px;border-top:1px solid #F3F4F6;
      display:flex;gap:8px;align-items:center;flex-shrink:0;background:white;
    }
    .aria-input {
      flex:1;padding:10px 14px;background:#F9FAFB;border:1.5px solid #E5E7EB;
      border-radius:100px;font-family:inherit;font-size:0.84rem;color:#111827;outline:none;
      transition:border-color 0.2s;
    }
    .aria-input:focus{border-color:var(--red,#D63031);}
    .aria-input::placeholder{color:#9CA3AF;}
    .aria-send {
      width:38px;height:38px;border-radius:50%;background:var(--red,#D63031);border:none;
      color:white;font-size:1rem;cursor:pointer;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.2s;box-shadow:0 2px 8px rgba(214,48,49,0.3);
    }
    .aria-send:hover{background:#B72C2C;transform:scale(1.05);}
  `;

  // ── Inject CSS ────────────────────────────────────────────────────────
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Inject HTML ───────────────────────────────────────────────────────
  function injectHTML() {
    const ctx = getContext();
    const greeting = ctx.user
      ? `Hi ${ctx.user.name.split(' ')[0]}! How can I help?`
      : 'Hi! I\'m ARIA, the EDAT AI Assistant. How can I help you today?';

    const html = `
      <button id="aria-fab" title="Ask ARIA">
        🤖
        <div class="aria-notif">1</div>
      </button>

      <div id="aria-panel">
        <div class="aria-header">
          <div class="aria-avatar">🤖</div>
          <div>
            <div class="aria-name">ARIA — EDAT AI Assistant</div>
            <div class="aria-status"><span class="aria-dot"></span> Online · Instant replies</div>
          </div>
          <button class="aria-close" id="aria-close">✕</button>
        </div>

        <div class="aria-messages" id="aria-messages">
          <!-- Welcome message -->
          <div class="aria-msg bot">
            <div class="aria-msg-avatar">🤖</div>
            <div>
              <div class="aria-bubble">${greeting}</div>
              <div class="aria-time">${getTime()}</div>
            </div>
          </div>
        </div>

        <!-- Quick question buttons -->
        <div class="aria-quick-btns" id="aria-quick-btns">
          ${QUICK_QUESTIONS.map(q =>
            `<button class="aria-quick" data-q="${q}">${q}</button>`
          ).join('')}
        </div>

        <div class="aria-input-row">
          <input class="aria-input" id="aria-input" placeholder="Ask me anything about EDAT..." autocomplete="off" maxlength="200"/>
          <button class="aria-send" id="aria-send">➤</button>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
  }

  // ── Event Wiring ──────────────────────────────────────────────────────
  function initEvents() {
    const fab    = document.getElementById('aria-fab');
    const panel  = document.getElementById('aria-panel');
    const close  = document.getElementById('aria-close');
    const input  = document.getElementById('aria-input');
    const send   = document.getElementById('aria-send');

    fab?.addEventListener('click', () => togglePanel());
    close?.addEventListener('click', () => closePanel());

    send?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

    document.querySelectorAll('.aria-quick').forEach(btn => {
      btn.addEventListener('click', () => { sendMessage(btn.dataset.q); });
    });
  }

  function togglePanel() {
    const fab   = document.getElementById('aria-fab');
    const panel = document.getElementById('aria-panel');
    const isOpen = panel.classList.contains('open');

    if (isOpen) { closePanel(); }
    else         { openPanel(); }
  }

  function openPanel() {
    document.getElementById('aria-fab')?.classList.add('open');
    const panel = document.getElementById('aria-panel');
    panel?.classList.add('open');
    document.getElementById('aria-input')?.focus();
    // Auto-scroll
    scrollMessages();
  }

  function closePanel() {
    document.getElementById('aria-fab')?.classList.remove('open');
    document.getElementById('aria-panel')?.classList.remove('open');
  }

  function handleSend() {
    const input = document.getElementById('aria-input');
    const text  = input?.value?.trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
  }

  function sendMessage(text) {
    // Add user bubble
    appendMessage('user', text);

    // Hide quick buttons after first message
    const qtns = document.getElementById('aria-quick-btns');
    if (qtns) qtns.style.display = 'none';

    // Typing indicator
    const typingId = appendTyping();

    setTimeout(() => {
      removeTyping(typingId);
      const reply = getReply(text);
      appendMessage('bot', reply);
    }, 600 + Math.random() * 800);
  }

  function appendMessage(role, html) {
    const msgs    = document.getElementById('aria-messages');
    if (!msgs) return;

    const isBot = role === 'bot';
    const initials = isBot ? '🤖' : (getContext().user?.name?.[0] || '👤');

    const div = document.createElement('div');
    div.className = `aria-msg ${role}`;
    div.innerHTML = `
      <div class="aria-msg-avatar">${initials}</div>
      <div>
        <div class="aria-bubble">${html}</div>
        <div class="aria-time">${getTime()}</div>
      </div>
    `;
    msgs.appendChild(div);
    scrollMessages();
  }

  function appendTyping() {
    const msgs = document.getElementById('aria-messages');
    if (!msgs) return null;
    const id  = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'aria-msg bot';
    div.id = id;
    div.innerHTML = `
      <div class="aria-msg-avatar">🤖</div>
      <div>
        <div class="aria-bubble" style="padding:8px 14px;">
          <div class="aria-typing"><span></span><span></span><span></span></div>
        </div>
      </div>
    `;
    msgs.appendChild(div);
    scrollMessages();
    return id;
  }

  function removeTyping(id) {
    document.getElementById(id)?.remove();
  }

  function scrollMessages() {
    setTimeout(() => {
      const msgs = document.getElementById('aria-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  }

  function getTime() {
    return new Date().toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit' });
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  function init() {
    injectCSS();
    injectHTML();
    initEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
