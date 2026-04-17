/* ── login.js ── */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLoginForm();
  initRegisterForm();
  initPasswordStrength();
  initPasswordToggles();
  initDemoLogin();
  checkAlreadyLoggedIn();
});

/* ── Check already logged in ── */
function checkAlreadyLoggedIn() {
  if (localStorage.getItem('edat_user')) {
    window.location.href = 'account.html';
  }
}

/* ── Tab switcher ── */
function initTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll('.link-btn[data-switch]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.switch));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('form-login').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
}

/* ── Login form ── */
function initLoginForm() {
  document.getElementById('btn-login')?.addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const pw    = document.getElementById('login-pw').value;
    const errEl = document.getElementById('login-error');

    errEl.style.display = 'none';
    if (!email || !pw) {
      showError(errEl, 'Please fill in all fields.');
      return;
    }
    if (!isValidEmail(email)) {
      showError(errEl, 'Please enter a valid email address.');
      return;
    }

    const btn = document.getElementById('btn-login');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    // Simulate API call
    setTimeout(() => {
      // Check saved user or accept any valid input
      const saved = getSavedUser(email);
      if (saved && saved.pw === pw) {
        loginSuccess(saved);
      } else if (!saved && pw.length >= 4) {
        // Create a session from what we know
        loginSuccess({
          email,
          name: email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),
          vehicle: 'Petrol Car',
          plate: ''
        });
      } else {
        showError(errEl, 'Incorrect email or password. Try the Demo Account.');
        btn.textContent = 'Sign In →';
        btn.disabled = false;
      }
    }, 1000);
  });
}

/* ── Register form ── */
function initRegisterForm() {
  document.getElementById('btn-register')?.addEventListener('click', () => {
    const firstname = document.getElementById('reg-firstname').value.trim();
    const lastname  = document.getElementById('reg-lastname').value.trim();
    const email     = document.getElementById('reg-email').value.trim();
    const plate     = document.getElementById('reg-plate').value.trim();
    const vehicle   = document.getElementById('reg-vehicle').value;
    const pw        = document.getElementById('reg-pw').value;
    const terms     = document.getElementById('terms-agree').checked;
    const errEl     = document.getElementById('reg-error');

    errEl.style.display = 'none';
    if (!firstname || !email || !pw || !vehicle) { showError(errEl, 'Please fill in all required fields.'); return; }
    if (!isValidEmail(email)) { showError(errEl, 'Please enter a valid email address.'); return; }
    if (pw.length < 8)         { showError(errEl, 'Password must be at least 8 characters.'); return; }
    if (!terms)                { showError(errEl, 'Please agree to the Terms of Service.'); return; }

    const btn = document.getElementById('btn-register');
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    setTimeout(() => {
      const user = { name: `${firstname} ${lastname}`.trim(), email, vehicle, plate, pw };
      saveUser(user);
      generateDemoJourneys(vehicle);
      loginSuccess(user);
    }, 1200);
  });
}

/* ── Demo login ── */
function initDemoLogin() {
  document.getElementById('demo-login')?.addEventListener('click', () => {
    const user = {
      name: 'Ahmad Faris',
      email: 'ahmad.faris@example.com',
      vehicle: 'Petrol Car',
      plate: 'WXY 1234',
      pw: 'demo1234'
    };
    saveUser(user);
    generateDemoJourneys('Petrol Car');
    loginSuccess(user);
  });

  document.getElementById('gov-login')?.addEventListener('click', () => {
    alert('MyDigital ID integration for real deployment.\nUsing demo account instead.');
    document.getElementById('demo-login')?.click();
  });
}

/* ── Helpers ── */
function loginSuccess(user) {
  localStorage.setItem('edat_user', JSON.stringify({ name:user.name, email:user.email, vehicle:user.vehicle, plate:user.plate }));
  window.location.href = 'account.html';
}

function showError(el, msg) {
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function getSavedUser(email) {
  try {
    const u = JSON.parse(localStorage.getItem('edat_user'));
    if (u && u.email === email) return u;
    return null;
  } catch { return null; }
}

function saveUser(user) {
  localStorage.setItem('edat_user', JSON.stringify(user));
}

/* ── Password strength ── */
function initPasswordStrength() {
  const input   = document.getElementById('reg-pw');
  const bar     = document.getElementById('pws-fill');
  const label   = document.getElementById('pws-label');
  const wrapper = document.getElementById('pw-strength');

  input?.addEventListener('input', () => {
    const v = input.value;
    if (!v) { wrapper.style.display = 'none'; return; }
    wrapper.style.display = 'flex';

    let score = 0;
    if (v.length >= 8)                    score++;
    if (/[A-Z]/.test(v))                  score++;
    if (/[0-9]/.test(v))                  score++;
    if (/[^A-Za-z0-9]/.test(v))           score++;
    if (v.length >= 12)                   score++;

    const levels = [
      { pct:'20%', color:'#EF4444', text:'Weak'   },
      { pct:'40%', color:'#F59E0B', text:'Fair'   },
      { pct:'60%', color:'#F59E0B', text:'Good'   },
      { pct:'80%', color:'#10B981', text:'Strong' },
      { pct:'100%',color:'#059669', text:'Excellent'},
    ];
    const l = levels[Math.min(score, levels.length - 1)];
    bar.style.width      = l.pct;
    bar.style.background = l.color;
    label.textContent    = l.text;
    label.style.color    = l.color;
  });
}

/* ── Show/hide password ── */
function initPasswordToggles() {
  [['pw-toggle-login','login-pw'],['pw-toggle-reg','reg-pw']].forEach(([btnId, inputId]) => {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}

/* ── Generate realistic demo journeys ── */
const CORRIDORS = ['E1 North KM42','E1 South KM42','KL-Seremban KM12','Sg Buloh Toll','Penang Bridge N','Duta Toll Plaza','Jalan Duta'];
const VEH_RATES = {
  'EV':           { min:0.60, max:1.80, emMin:0.04, emMax:0.18 },
  'Hybrid':       { min:1.20, max:2.80, emMin:0.14, emMax:0.38 },
  'Petrol Car':   { min:2.20, max:4.50, emMin:0.38, emMax:0.72 },
  'Diesel':       { min:4.80, max:9.20, emMin:0.72, emMax:1.30 },
  'Motorcycle':   { min:0.60, max:1.20, emMin:0.10, emMax:0.28 },
  'Truck':        { min:6.00, max:12.0, emMin:1.00, emMax:2.10 },
};

function generateDemoJourneys(vehicleType) {
  if (localStorage.getItem('edat_journeys')) return; // already exists

  const vr = VEH_RATES[vehicleType] || VEH_RATES['Petrol Car'];
  const journeys = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(i / 2));
    const isAM = i % 2 === 0;
    d.setHours(isAM ? 7 + Math.floor(Math.random()*2) : 17 + Math.floor(Math.random()*2),
               Math.floor(Math.random()*60), 0, 0);

    const corridor = isAM
      ? (i % 6 < 2 ? 'E1 North KM42' : 'KL-Seremban KM12')
      : (i % 6 < 2 ? 'E1 South KM42' : 'Sg Buloh Toll');

    const toll     = vr.min + Math.random() * (vr.max - vr.min);
    const emission = vr.emMin + Math.random() * (vr.emMax - vr.emMin);
    const conf     = 88 + Math.random() * 11;

    journeys.push({
      id:         `J${String(i+1).padStart(3,'0')}`,
      date:       d.toISOString().split('T')[0],
      time:       d.toTimeString().slice(0,5),
      corridor,
      direction:  isAM ? 'Northbound' : 'Southbound',
      hash:       'SHA#' + Math.random().toString(16).slice(2,6).toUpperCase(),
      vehicle:    vehicleType,
      toll:       parseFloat(toll.toFixed(2)),
      emission:   parseFloat(emission.toFixed(3)),
      confidence: parseFloat(conf.toFixed(1)),
      isRoutine:  i < 20,
    });
  }

  localStorage.setItem('edat_journeys', JSON.stringify(journeys));
}
