/* ── tech.js ── */

document.addEventListener('DOMContentLoaded', () => {
  initTOC();
  initCopyButtons();
  initGetApiKey();
  initApiKeyModal();
});

/* TOC scroll spy */
function initTOC() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.toc-item');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.toc-item[href="#${e.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { root: null, rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(s => obs.observe(s));

  // Smooth scroll
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* Copy Code */
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeId  = btn.dataset.copy;
      const codeEl  = document.getElementById(`code-${codeId}`);
      if (!codeEl) return;
      const text = codeEl.innerText || codeEl.textContent;
      navigator.clipboard?.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.color = 'var(--green)';
        setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 2000);
      });
    });
  });
}

/* API Key */
function initGetApiKey() {
  document.getElementById('btn-get-key')?.addEventListener('click', () => {
    const modal = document.getElementById('api-key-modal');
    if (modal) modal.style.display = 'flex';
  });
}

function initApiKeyModal() {
  // Create modal dynamically
  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.style.cssText = `
    display:none; position:fixed; inset:0; z-index:2000;
    background:rgba(0,0,0,0.7); backdrop-filter:blur(8px);
    align-items:center; justify-content:center; padding:20px;
  `;
  modal.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border-glow);border-radius:20px;padding:36px;max-width:480px;width:100%;position:relative;">
      <button id="close-modal" style="position:absolute;top:16px;right:16px;background:transparent;color:var(--text-muted);font-size:1.2rem;cursor:pointer;">✕</button>
      <h3 style="margin-bottom:8px;">Request API Key</h3>
      <p style="font-size:0.9rem;margin-bottom:24px;">API keys are issued to verified government and smart city integration partners.</p>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label>Organisation Name</label>
          <input type="text" class="input" placeholder="e.g. PLUS Expressways Berhad" id="api-org"/>
        </div>
        <div>
          <label>Email Address</label>
          <input type="email" class="input" placeholder="dev@organisation.gov.my" id="api-email"/>
        </div>
        <div>
          <label>Intended Use</label>
          <select class="input" id="api-use" style="cursor:pointer;">
            <option value="">Select use case...</option>
            <option>Traffic Management System</option>
            <option>Mobile / Navigation App</option>
            <option>Government ESG Reporting</option>
            <option>Academic Research</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary w-full" id="submit-api" style="margin-top:20px;justify-content:center;width:100%;">
        Submit Request
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-modal')?.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  document.getElementById('submit-api')?.addEventListener('click', () => {
    const org   = document.getElementById('api-org')?.value?.trim();
    const email = document.getElementById('api-email')?.value?.trim();
    if (!org || !email) return;

    const btn = document.getElementById('submit-api');
    btn.textContent = '✓ Request Submitted!';
    btn.disabled = true;
    btn.style.background = 'var(--green)';
    btn.style.color = '#080c12';
    setTimeout(() => { modal.style.display = 'none'; }, 2500);
  });
}
