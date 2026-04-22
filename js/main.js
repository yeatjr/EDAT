/* ============================================================
   EDAT Main JS — Shared across all pages
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  enforceAuthGuard();
  initNav();
  initAuthNav();
  initCounters();
  initParticles();
  initScrollReveal();
});

/* ── Auth-aware Navigation ── */
function initAuthNav() {
  const authArea = document.getElementById('nav-auth-area');
  if (!authArea) return;

  let user = null;
  try { user = JSON.parse(localStorage.getItem('edat_user')); } catch {}

  if (user) {
    // Logged in: show avatar pill linking to account
    const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    authArea.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <a href="account.html" class="nav-user-pill" title="My Account" style="
          display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;
          background:var(--gray-100);border:1px solid var(--gray-200);border-radius:100px;
          font-size:0.82rem;font-weight:700;color:var(--navy);text-decoration:none;
          transition:all 0.2s;
        " onmouseover="this.style.background='var(--sky)'" onmouseout="this.style.background='var(--gray-100)'">
          <span style="
            width:28px;height:28px;border-radius:50%;
            background:linear-gradient(135deg,var(--red),#FF6B6B);
            color:white;font-size:0.78rem;font-weight:800;
            display:flex;align-items:center;justify-content:center;
            font-family:var(--font-display);flex-shrink:0;
          ">${initials}</span>
          <span>${user.name.split(' ')[0]}</span>
        </a>
        <button onclick="localStorage.removeItem('edat_user'); localStorage.removeItem('edat_journeys'); window.location.href='index.html';" 
          style="background:none; border:none; color:var(--text-muted); font-size:0.8rem; cursor:pointer; text-decoration:underline;">
          Sign Out
        </button>
      </div>
    `;
  } else {
    // Not logged in: show Sign In button
    authArea.innerHTML = `<a href="login.html" class="btn btn-outline-red" style="padding:9px 18px;font-size:0.85rem;">Sign In</a>`;
  }
}

// ── Auth Guard ──
function enforceAuthGuard() {
  const protectedPages = ['analytics', 'account', 'vehicle-registration'];
  const currentPath = window.location.pathname;
  
  // Check if current path includes any of the protected page names
  const isProtected = protectedPages.some(page => currentPath.includes('/' + page));
  const isLoggedIn = localStorage.getItem('edat_user') !== null;

  if (isProtected && !isLoggedIn) {
    window.location.href = 'login.html';
  }
}

/* ── Navigation ── */
function initNav() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '68px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'var(--surface)';
      navLinks.style.padding = '16px';
      navLinks.style.borderBottom = '1px solid var(--border)';
    });
  }

  // Mark active link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === 'index.html' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ── Animated Counters ── */
function initCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target    = parseFloat(el.dataset.counter);
    const prefix    = el.dataset.prefix  || '';
    const suffix    = el.dataset.suffix  || '';
    const decimals  = parseInt(el.dataset.decimals) || 0;
    const duration  = parseInt(el.dataset.duration)  || 2000;

    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = target * ease;
      el.textContent = prefix + formatNumber(current, decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };

    // Use IntersectionObserver to start when visible
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
  });
}

function formatNumber(n, decimals) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

/* ── Live Ticker (revenue, etc.) ── */
window.startLiveTicker = function(el, baseValue, increment, interval = 1200) {
  let value = baseValue;
  el.textContent = formatNumber(value, 2);
  setInterval(() => {
    value += increment * (0.7 + Math.random() * 0.6);
    el.textContent = 'RM ' + formatNumber(value, 2);
  }, interval);
};

/* ── Particles ── */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.3 + 0.05,
    color: Math.random() > 0.5 ? '27,42,74' : '214,48,49',
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,180,255,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── Notifications ── */
const NOTIFICATIONS = [
  { type: 'info',  icon: '🟢', title: 'System Active',        msg: 'All 12 cameras operational — 99.7% uptime' },
  { type: 'warn',  icon: '⚠️', title: 'Low Confidence',       msg: 'Cam 4B: Confidence 79% — fallback pricing applied' },
  { type: 'info',  icon: '📊', title: 'Revenue Milestone',    msg: 'RM 2M collected this session' },
  { type: 'info',  icon: '🌿', title: 'Emission Alert',       msg: 'Hotspot detected — KL-Seremban corridor' },
  { type: 'warn',  icon: '🚗', title: 'High EV Traffic',      msg: '42% EVs detected — applying green discount' },
  { type: 'error', icon: '🔴', title: 'Camera Offline',       msg: 'Cam 7A — maintenance crew dispatched' },
  { type: 'info',  icon: '🔒', title: 'Privacy Compliance',   msg: 'SHA-256 hashing active — zero-PII mode on' },
];

function initNotifications() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;

  let idx = 0;
  const show = () => {
    const n = NOTIFICATIONS[idx % NOTIFICATIONS.length];
    idx++;

    const el    = document.createElement('div');
    el.className = `notif ${n.type === 'warn' ? 'warn' : n.type === 'error' ? 'error' : ''}`;
    el.innerHTML = `
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.msg}</div>
      </div>
    `;
    panel.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  };

  setTimeout(show, 1500);
  setInterval(show, 7000);
}

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('fade-up');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => {
    el.style.opacity = '0';
    obs.observe(el);
  });
}
