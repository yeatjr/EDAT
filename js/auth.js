/**
 * EDAT Authentication Logic
 */

// Helper to check if user is logged in
function initAuthListener() {
  auth.onAuthStateChanged(user => {
    const navAuth = document.getElementById('nav-auth-area');
    const localUserStr = localStorage.getItem('edat_user');
    const localUser = localUserStr ? JSON.parse(localUserStr) : null;
    
    // If Firebase Auth OR LocalStorage demo auth is present
    if (user || localUser) {
      const displayName = user ? user.displayName : localUser.name;
      const uid = user ? user.uid : (localUser.email || 'demo_uid');
      
      console.log("[AUTH] User logged in:", displayName);
      if (navAuth) {
        navAuth.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:0.85rem; font-weight:600; color:var(--navy);">👋 ${displayName || 'User'}</span>
            <button onclick="logoutUser()" class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;">Sign Out</button>
          </div>
        `;
      }
      // Load user specific history
      loadUserHistory(uid);
    } else {
      console.log("[AUTH] No user logged in.");

      if (navAuth) {
        navAuth.innerHTML = `
          <a href="login.html" class="btn btn-red" style="padding:6px 15px; font-size:0.85rem; text-decoration:none;">Sign In</a>
        `;
      }
    }
  });
}

async function registerUser(email, password, name) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: name });
    
    // Create Firestore profile
    await db.collection('users').doc(result.user.uid).set({
      email: email,
      displayName: name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert("Account created successfully!");
    hideAuthModal();
  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function loginUser(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    hideAuthModal();
  } catch (error) {
    alert("Login failed: " + error.message);
  }
}

function logoutUser() {
  localStorage.removeItem('edat_user'); // Clear Demo user if exists
  auth.signOut();
  window.location.reload(); // Refresh the page to reflect logged out state
}


async function loadUserHistory(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid).collection('history').orderBy('timestamp', 'desc').limit(5).get();
    if (listEl) {
      listEl.innerHTML = '';

      if (snapshot.empty) {
        listEl.innerHTML += '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No trips recorded yet.</div>';
      } else {
        snapshot.forEach(doc => {
          const trip = doc.data();
          const div = document.createElement('div');
          div.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--gray-100);';
          div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--navy);">${trip.entry} → ${trip.exit}</span>
              <span style="font-size: 0.7rem; color: ${trip.trafficFee === 0 ? '#10b981' : '#fbbf24'}; font-weight: 700;">RM ${trip.totalCharge.toFixed(2)}</span>
            </div>
            <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 2px;">
              ${trip.timestamp ? new Date(trip.timestamp.toDate()).toLocaleDateString() : 'Just now'} • ${trip.distance}
            </div>
          `;
          listEl.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error("Error loading history:", err);
  }
}

// Simple Modal UI Logic
function showAuthModal() {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
      align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 12px; width: 350px; box-shadow: 0 20px 50px rgba(0,0,0,0.2);">
        <h2 style="margin-bottom: 20px; color: var(--navy);">Join EDAT</h2>
        <div style="display:flex; flex-direction:column; gap:15px;">
          <input type="text" id="auth-name" placeholder="Full Name (for new accounts)" style="padding:10px; border:1px solid #ddd; border-radius:6px;">
          <input type="email" id="auth-email" placeholder="Email" style="padding:10px; border:1px solid #ddd; border-radius:6px;">
          <input type="password" id="auth-pass" placeholder="Password" style="padding:10px; border:1px solid #ddd; border-radius:6px;">
          <button onclick="handleAuthSubmit(true)" class="btn btn-red">Sign In</button>
          <button onclick="handleAuthSubmit(false)" class="btn btn-outline" style="border-color: #ddd;">Create Account</button>
          
          <hr style="border:none; border-top:1px solid #eee; margin: 10px 0;">
          <div style="font-size:0.65rem; color:#888; text-align:center; margin-bottom:5px;">DEVELOPER TOOLS</div>
          <button onclick="seedAhmadData()" class="btn btn-outline" style="font-size:0.7rem; border-color: #10b981; color: #10b981;">Seed Mock User (Ahmad)</button>
          
          <button onclick="hideAuthModal()" style="background:none; border:none; color:#888; font-size:0.8rem; cursor:pointer; margin-top:10px;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

// utility to seed Ahmad's info into Firestore
async function seedAhmadData() {
  const mockUid = "ahmad_mock_123";
  try {
    console.log("[FIREBASE] Seeding detailed Ahmad data...");
    
    // 1. Create Profile
    await db.collection('users').doc(mockUid).set({
      email: "ahmad@edat.ai",
      displayName: "Ahmad",
      greenTripCount: 15, // Already earned one voucher!
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Add 20 Randomized Journeys
    const historyRef = db.collection('users').doc(mockUid).collection('history');
    
    const entryPoints = ["Kajang", "Skudai", "Sg Besi", "Damansara", "Subang", "Cheras", "Shah Alam", "Klang", "Ipoh South", "Juru"];
    const exitPoints = ["Ayer Keroh", "Yong Peng", "Senai", "Rawang", "Seremban", "Nilai", "Bangi", "Putrajaya", "Cyberjaya", "Kulai"];

    // Clear existing history first
    const existing = await historyRef.get();
    const batch = db.batch();
    existing.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    for (let i = 0; i < 50; i++) {
      const entry = entryPoints[Math.floor(Math.random() * entryPoints.length)];
      const exit = exitPoints[Math.floor(Math.random() * exitPoints.length)];
      const charge = (Math.random() * 35 + 5).toFixed(2);
      
      // Traffic Fee logic: 30 trips < RM 1, 20 capped at RM 4
      let tFee;
      if (i < 30) {
        tFee = (Math.random() * 0.5).toFixed(2); // Very low/Zero fee
      } else {
        tFee = (Math.random() * 2.5 + 1.5).toFixed(2); // Capped at RM 4.00 max
      }

      // Random date in last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      await historyRef.add({
        entry: entry + " (EDAT)",
        exit: exit + " (EDAT)",
        totalCharge: parseFloat(charge) + parseFloat(tFee),
        trafficFee: parseFloat(tFee),
        distance: (Math.random() * 150 + 10).toFixed(0) + " km",
        timestamp: firebase.firestore.Timestamp.fromDate(date)
      });
    }

    // 3. Add a Voucher
    await db.collection('vouchers').add({
      userId: mockUid,
      code: "WELCOME-AHMAD",
      type: "Early Adopter Reward",
      value: "RM 5.00 Discount",
      status: "active",
      awardedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Ahmad's data has been seeded! You can now log in or check Firestore.");
    
    // Auto-login as mock user for demo if needed
    // In real app, we'd use proper Auth. For demo, we just trigger UI.
    loadUserHistory(mockUid);
    loadUserVouchers(mockUid);
    
  } catch (err) {
    alert("Seed failed: " + err.message + "\n(Did you add your API Keys yet?)");
  }
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

function handleAuthSubmit(isLogin) {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const name = document.getElementById('auth-name').value;
  
  if (isLogin) loginUser(email, pass);
  else registerUser(email, pass, name);
}

// Start listener
initAuthListener();

// --- AUTO-SEED TRIGGER ---
// This runs once automatically to ensure Ahmad is saved to your new Firebase database.
window.addEventListener('load', () => {
  if (!localStorage.getItem('edat_seeded_ahmad')) {
    console.log("[FIREBASE] Initial setup: Seeding Ahmad's data...");
    setTimeout(() => {
      seedAhmadData().then(() => {
        localStorage.setItem('edat_seeded_ahmad', 'true');
        console.log("[FIREBASE] Ahmad successfully saved to the cloud!");
      }).catch(err => {
        console.warn("[FIREBASE] Auto-seed waiting for keys or connection...");
      });
    }, 3000); // Wait for SDK to fully ready
  }
});
