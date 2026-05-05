// ============================================================
//  admin/admin.js
//  Admin panel logic: Auth gate, DP CRUD, Applications, Settings
// ============================================================

// ── showToast (local copy for admin page) ─────────────────
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

// ── State ─────────────────────────────────────────────────
let currentUser   = null;
let editingDPId   = null;   // null = adding new; string = editing existing
let pickerMap     = null;
let pickerMarker  = null;
let pendingDeleteId = null;

// ── Auth gate ─────────────────────────────────────────────
const provider = new firebase.auth.GoogleAuthProvider();

auth.onAuthStateChanged(user => {
  currentUser = user;

  if (user && isAdmin(user)) {
    // Show dashboard
    document.getElementById('adminGate').style.display = 'none';
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.getElementById('adminUserInfo').innerHTML = `
      <img src="${user.photoURL || ''}" style="width:24px;height:24px;border-radius:50%;border:1px solid var(--border)" />
      <span>${user.displayName || user.email}</span>
    `;
    initDashboard();
  } else if (user && !isAdmin(user)) {
    // Logged in but not admin
    document.getElementById('adminGate').innerHTML = `
      <div class="gate-card">
        <div class="gate-icon">🚫</div>
        <h2>Access Denied</h2>
        <p>Your account (${user.email}) is not authorised as an admin.</p>
        <button onclick="auth.signOut()" class="btn-ghost btn-full" style="margin-top:8px">Sign Out</button>
      </div>`;
  } else {
    // Not logged in
    document.getElementById('adminGate').style.display = '';
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminUserInfo').innerHTML = '';
  }
});

function isAdmin(user) {
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
}

document.getElementById('adminLoginBtn').addEventListener('click', () => {
  auth.signInWithPopup(provider).catch(err => showToast(err.message, 'error'));
});

document.getElementById('adminSignOut').addEventListener('click', () => {
  auth.signOut();
});

// ── Tab navigation ────────────────────────────────────────
function initDashboard() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });

      btn.classList.add('active');
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      panel.classList.remove('hidden');
      panel.classList.add('active');

      // Lazy init
      if (btn.dataset.tab === 'dps')          loadDPs();
      if (btn.dataset.tab === 'applications') loadApplications();
      if (btn.dataset.tab === 'settings')     loadSettings();
    });
  });

  // Load first tab
  loadDPs();
  initPickerMap();
  wireSettingsHandlers();
  wireDeleteModal();
}

// ── Picker Map (inside DP form) ───────────────────────────
function initPickerMap() {
  if (pickerMap) return;

  pickerMap = L.map('dpPickerMap', {
    center: [23.685, 90.356],
    zoom: 7,
    zoomControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '', maxZoom: 19
  }).addTo(pickerMap);

  pickerMap.on('click', e => {
    const { lat, lng } = e.latlng;
    document.getElementById('dpLat').value = lat.toFixed(6);
    document.getElementById('dpLng').value = lng.toFixed(6);
    placePickerMarker(lat, lng);
  });
}

function placePickerMarker(lat, lng) {
  if (pickerMarker) pickerMap.removeLayer(pickerMarker);
  pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
  pickerMap.setView([lat, lng], Math.max(pickerMap.getZoom(), 14));
}

// ── Add DP button ─────────────────────────────────────────
document.getElementById('addDPBtn').addEventListener('click', () => {
  openDPForm(null);
});

document.getElementById('cancelDPBtn').addEventListener('click', closeDPForm);

function openDPForm(dpData) {
  editingDPId = dpData ? dpData.id : null;

  document.getElementById('dpFormTitle').textContent = dpData ? 'Edit Distribution Point' : 'Add Distribution Point';
  document.getElementById('dpName').value   = dpData?.name   || '';
  document.getElementById('dpLat').value    = dpData?.lat    || '';
  document.getElementById('dpLng').value    = dpData?.lng    || '';
  document.getElementById('dpRadius').value = dpData?.radius || 100;

  document.getElementById('dpFormWrap').classList.remove('hidden');

  // Initialise picker map after reveal (needs size)
  setTimeout(() => {
    if (!pickerMap) initPickerMap();
    pickerMap.invalidateSize();
    if (dpData?.lat && dpData?.lng) placePickerMarker(dpData.lat, dpData.lng);
  }, 80);
}

function closeDPForm() {
  document.getElementById('dpFormWrap').classList.add('hidden');
  editingDPId = null;
}

// ── Save DP ───────────────────────────────────────────────
document.getElementById('saveDPBtn').addEventListener('click', async () => {
  const name   = document.getElementById('dpName').value.trim();
  const lat    = parseFloat(document.getElementById('dpLat').value);
  const lng    = parseFloat(document.getElementById('dpLng').value);
  const radius = parseInt(document.getElementById('dpRadius').value, 10);

  if (!name || isNaN(lat) || isNaN(lng) || isNaN(radius)) {
    showToast('Please fill all fields correctly', 'error');
    return;
  }
  if (lat < 20.5 || lat > 26.8 || lng < 87.9 || lng > 92.8) {
    showToast('Coordinates must be within Bangladesh', 'error');
    return;
  }
  if (radius < 10 || radius > 5000) {
    showToast('Radius must be between 10 and 5000 metres', 'error');
    return;
  }

  const btn = document.getElementById('saveDPBtn');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    const payload = {
      name,
      lat,
      lng,
      radius,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (editingDPId) {
      await db.collection(COL_DPS).doc(editingDPId).update(payload);
      showToast('✅ DP updated successfully', 'success');
    } else {
      payload.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(COL_DPS).add(payload);
      showToast('✅ DP added successfully', 'success');
    }

    closeDPForm();
    loadDPs();
  } catch (err) {
    console.error(err);
    showToast('Error saving DP: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Save DP';
    btn.disabled = false;
  }
});

// ── Load DP list ──────────────────────────────────────────
async function loadDPs() {
  const container = document.getElementById('dpList');
  container.innerHTML = '<div class="loading-spin"></div>';

  try {
    const snap = await db.collection(COL_DPS).orderBy('created_at', 'desc').get();

    if (snap.empty) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">📡<span>No distribution points yet. Add one above.</span></div>`;
      return;
    }

    container.innerHTML = '';
    snap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      const card = document.createElement('div');
      card.className = 'dp-card';
      card.innerHTML = `
        <div class="dp-card-name">${d.name || 'Unnamed DP'}</div>
        <div class="dp-card-coords">${d.lat?.toFixed(5)}, ${d.lng?.toFixed(5)}</div>
        <div class="dp-card-radius">📡 ${d.radius || 100}m radius</div>
        <div class="dp-card-actions">
          <button class="edit-btn" data-id="${d.id}">✏️ Edit</button>
          <button class="del-btn" data-id="${d.id}" data-name="${d.name || 'this DP'}">🗑 Delete</button>
        </div>
      `;

      card.querySelector('.edit-btn').addEventListener('click', () => openDPForm(d));
      card.querySelector('.del-btn').addEventListener('click', () => confirmDelete(d.id, d.name || 'this DP'));

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">⚠️<span>Failed to load DPs: ${err.message}</span></div>`;
  }
}

// ── Delete confirm modal ──────────────────────────────────
function wireDeleteModal() {
  document.getElementById('closeDelete').addEventListener('click',  () => document.getElementById('deleteConfirm').classList.add('hidden'));
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => document.getElementById('deleteConfirm').classList.add('hidden'));
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
      await db.collection(COL_DPS).doc(pendingDeleteId).delete();
      showToast('DP deleted', 'success');
      loadDPs();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
    document.getElementById('deleteConfirm').classList.add('hidden');
    pendingDeleteId = null;
  });
}

function confirmDelete(id, name) {
  pendingDeleteId = id;
  document.getElementById('deleteDPName').textContent = name;
  document.getElementById('deleteConfirm').classList.remove('hidden');
}

// ── Load applications ─────────────────────────────────────
async function loadApplications() {
  const container = document.getElementById('adminAppsList');
  container.innerHTML = '<div class="loading-spin"></div>';

  const statusFilter = document.getElementById('statusFilter').value;

  try {
    let query = db.collection(COL_APPLICATIONS).orderBy('timestamp', 'desc').limit(50);
    if (statusFilter) query = query.where('status', '==', statusFilter);

    const snap = await query.get();

    if (snap.empty) {
      container.innerHTML = `<div class="empty-state">📭<span>No applications found.</span></div>`;
      return;
    }

    container.innerHTML = '';
    snap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      const date = d.timestamp?.toDate?.()?.toLocaleString('en-BD') || '–';

      const card = document.createElement('div');
      card.className = 'admin-app-card';
      card.innerHTML = `
        <div class="aac-left">
          <div class="aac-user">👤 ${d.user_name || 'Unknown'} &nbsp;·&nbsp; <span style="font-size:11px;color:var(--text-muted)">${d.user_email || ''}</span></div>
          <div class="aac-address">📍 ${d.address || `${d.lat?.toFixed(5)}, ${d.lng?.toFixed(5)}`}</div>
          <div class="aac-date">🕐 ${date}</div>
        </div>
        <div class="aac-right">
          <span class="status-pill ${d.status || 'pending'}">${d.status || 'pending'}</span>
          <select class="status-select" data-id="${d.id}">
            <option value="pending"  ${d.status === 'pending'  ? 'selected' : ''}>Pending</option>
            <option value="approved" ${d.status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="rejected" ${d.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      `;

      // Update status on change
      card.querySelector('.status-select').addEventListener('change', async e => {
        const newStatus = e.target.value;
        try {
          await db.collection(COL_APPLICATIONS).doc(d.id).update({ status: newStatus });
          card.querySelector('.status-pill').className = `status-pill ${newStatus}`;
          card.querySelector('.status-pill').textContent = newStatus;
          showToast('Status updated', 'success');
        } catch (err) {
          showToast('Update failed: ' + err.message, 'error');
        }
      });

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state">⚠️<span>Failed to load: ${err.message}</span></div>`;
  }
}

// Status filter
document.getElementById('statusFilter').addEventListener('change', loadApplications);

// ── Settings ──────────────────────────────────────────────
async function loadSettings() {
  try {
    const doc = await db.collection(COL_SETTINGS).doc('global').get();
    if (doc.exists) {
      const data = doc.data();
      if (data.defaultRadius) document.getElementById('globalRadius').value = data.defaultRadius;
    }
  } catch (e) { /* ignore */ }

  // Show admin emails
  const emailList = document.getElementById('adminEmailList');
  emailList.innerHTML = ADMIN_EMAILS.map(e =>
    `<div class="email-pill">${e}</div>`
  ).join('');
}

function wireSettingsHandlers() {
  document.getElementById('saveRadiusBtn').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('globalRadius').value, 10);
    if (isNaN(val) || val < 10 || val > 5000) {
      showToast('Enter a value between 10 and 5000', 'error'); return;
    }
    try {
      await db.collection(COL_SETTINGS).doc('global').set({ defaultRadius: val }, { merge: true });
      showToast('✅ Default radius saved', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });

  document.getElementById('resetRadiusBtn').addEventListener('click', async () => {
    document.getElementById('globalRadius').value = 100;
    try {
      await db.collection(COL_SETTINGS).doc('global').set({ defaultRadius: 100 }, { merge: true });
      showToast('Radius reset to 100m', 'success');
    } catch (err) {
      showToast('Reset failed: ' + err.message, 'error');
    }
  });
}
