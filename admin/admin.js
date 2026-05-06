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
let bulkInited = false;

function initDashboard() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });

      btn.classList.add('active');
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      panel.classList.remove('hidden');
      panel.classList.add('active');

      // Close mobile sidebar after selecting a tab
      document.getElementById('adminSidebar').classList.remove('sidebar-open');
      document.getElementById('sidebarOverlay').classList.remove('overlay-visible');

      // Lazy init / reload
      if (btn.dataset.tab === 'dps')          loadDPs();
      if (btn.dataset.tab === 'applications') loadApplications();
      if (btn.dataset.tab === 'settings')     loadSettings();
      if (btn.dataset.tab === 'bulk' && !bulkInited) { initBulkUpload(); bulkInited = true; }
    });
  });

  // Load first tab
  loadDPs();
  initPickerMap();
  wireSettingsHandlers();
  wireDeleteModal();

  // Mobile sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('adminSidebar').classList.toggle('sidebar-open');
    document.getElementById('sidebarOverlay').classList.toggle('overlay-visible');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('adminSidebar').classList.remove('sidebar-open');
    document.getElementById('sidebarOverlay').classList.remove('overlay-visible');
  });
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

      const covBadge = d.coverage === 'available'
        ? `<span class="status-pill approved" style="font-size:10px">✅ Available</span>`
        : `<span class="status-pill rejected" style="font-size:10px">❌ No Coverage</span>`;

      const card = document.createElement('div');
      card.className = 'admin-app-card';
      card.innerHTML = `
        <div class="aac-left">
          <div class="aac-user">👤 ${d.user_name || 'Unknown'} &nbsp;·&nbsp; <span style="font-size:11px;color:var(--text-muted)">${d.user_email || ''}</span></div>
          <div class="aac-address">📍 ${d.address || `${d.lat?.toFixed(5)}, ${d.lng?.toFixed(5)}`}</div>
          <div class="aac-meta-row">
            <span class="aac-phone">📞 ${d.phone || '—'}</span>
            <span class="aac-date">🕐 ${date}</span>
          </div>
        </div>
        <div class="aac-right">
          ${covBadge}
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

// ── Bulk Upload ───────────────────────────────────────────
let bulkRows = []; // parsed valid rows

function initBulkUpload() {
  const dropZone    = document.getElementById('dropZone');
  const fileInput   = document.getElementById('bulkFileInput');

  // Click drop zone → trigger file input
  dropZone.addEventListener('click', () => fileInput.click());

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) parseFile(e.target.files[0]);
  });

  document.getElementById('bulkRefreshPreview').addEventListener('click', renderPreview);

  document.getElementById('bulkUploadBtn').addEventListener('click', uploadBulkDPs);

  document.getElementById('bulkResetBtn').addEventListener('click', () => {
    bulkRows = [];
    fileInput.value = '';
    document.getElementById('bulkPreviewCard').classList.add('hidden');
    document.getElementById('bulkUploadCard').classList.add('hidden');
    document.getElementById('bulkProgress').classList.add('hidden');
    document.getElementById('bulkProgressFill').style.width = '0%';
    document.getElementById('dropZone').style.borderColor = '';
  });
}

function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = e => {
    try {
      let rows = [];

      if (ext === 'csv') {
        // Parse CSV manually
        const text = e.target.result;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const obj = {};
          headers.forEach((h, idx) => obj[h] = vals[idx] || '');
          rows.push(obj);
        }
      } else {
        // Parse Excel with SheetJS
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      }

      // Normalise column names (case-insensitive)
      bulkRows = rows.map((row, idx) => {
        const keys = Object.keys(row);
        const find = name => {
          const k = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
          return k ? String(row[k]).trim() : '';
        };

        const lat  = parseFloat(find('GPS_Lat')  || find('Lat') || find('Latitude'));
        const lng  = parseFloat(find('GPS_Long') || find('GPS_Lng') || find('Long') || find('Longitude'));
        const name = find('Name') || find('DP_Name') || '';
        const radius = parseInt(find('Radius') || '0', 10) || 0;

        const valid = !isNaN(lat) && !isNaN(lng)
          && lat >= 20.5 && lat <= 26.8
          && lng >= 87.9 && lng <= 92.8;

        return { rowNum: idx + 2, lat, lng, name, radius, valid };
      });

      renderPreview();
      document.getElementById('bulkPreviewCard').classList.remove('hidden');
      document.getElementById('bulkUploadCard').classList.remove('hidden');
    } catch (err) {
      showToast('Failed to parse file: ' + err.message, 'error');
    }
  };

  if (ext === 'csv') {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

function renderPreview() {
  const prefix     = document.getElementById('bulkNamePrefix').value.trim() || 'DP';
  const defRadius  = parseInt(document.getElementById('bulkRadius').value, 10) || 100;
  const validRows  = bulkRows.filter(r => r.valid);
  const invalidRows= bulkRows.filter(r => !r.valid);

  document.getElementById('bulkCount').textContent =
    `${validRows.length} valid · ${invalidRows.length} skipped`;

  const tableDiv = document.getElementById('bulkPreviewTable');
  if (bulkRows.length === 0) { tableDiv.innerHTML = ''; return; }

  let html = `<table>
    <thead><tr>
      <th>Row</th><th>Name</th><th>GPS_Lat</th><th>GPS_Long</th><th>Radius</th><th>Status</th>
    </tr></thead><tbody>`;

  bulkRows.forEach((r, i) => {
    const name   = r.name || `${prefix}-${i + 1}`;
    const radius = r.radius || defRadius;
    const cls    = r.valid ? 'row-valid' : 'row-invalid';
    const status = r.valid ? '✅ OK' : '❌ Invalid coords';
    html += `<tr class="${cls}">
      <td>${r.rowNum}</td>
      <td>${r.valid ? name : '—'}</td>
      <td>${isNaN(r.lat) ? r.lat || '—' : r.lat}</td>
      <td>${isNaN(r.lng) ? r.lng || '—' : r.lng}</td>
      <td>${r.valid ? radius + 'm' : '—'}</td>
      <td>${status}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  tableDiv.innerHTML = html;
}

async function uploadBulkDPs() {
  const prefix    = document.getElementById('bulkNamePrefix').value.trim() || 'DP';
  const defRadius = parseInt(document.getElementById('bulkRadius').value, 10) || 100;
  const validRows = bulkRows.filter(r => r.valid);

  if (validRows.length === 0) {
    showToast('No valid rows to upload', 'error');
    return;
  }

  const btn = document.getElementById('bulkUploadBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  const progressWrap = document.getElementById('bulkProgress');
  const progressFill = document.getElementById('bulkProgressFill');
  const progressText = document.getElementById('bulkProgressText');
  progressWrap.classList.remove('hidden');

  let uploaded = 0;
  let failed   = 0;

  // Upload in batches of 20 (Firestore batch limit is 500, but throttle for UX)
  const BATCH_SIZE = 20;
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const chunk = validRows.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    chunk.forEach((r, j) => {
      const name   = r.name || `${prefix}-${i + j + 1}`;
      const radius = r.radius || defRadius;
      const ref    = db.collection(COL_DPS).doc();
      batch.set(ref, {
        name,
        lat:        r.lat,
        lng:        r.lng,
        radius,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    try {
      await batch.commit();
      uploaded += chunk.length;
    } catch (err) {
      failed += chunk.length;
      console.error('Batch error:', err);
    }

    const pct = Math.round((uploaded + failed) / validRows.length * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = `Uploaded ${uploaded} of ${validRows.length}…`;
  }

  btn.disabled = false;
  btn.textContent = '⬆ Upload All DPs';

  if (failed === 0) {
    progressText.textContent = `✅ All ${uploaded} DPs uploaded successfully!`;
    showToast(`✅ ${uploaded} DPs added to Firestore`, 'success');
  } else {
    progressText.textContent = `⚠️ ${uploaded} uploaded, ${failed} failed.`;
    showToast(`Partial upload: ${failed} rows failed`, 'error');
  }
}

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
  const saveBtn  = document.getElementById('saveRadiusBtn');
  const resetBtn = document.getElementById('resetRadiusBtn');

  if (!saveBtn || !resetBtn) {
    console.error('Settings buttons not found in DOM');
    return;
  }

  saveBtn.addEventListener('click', async () => {
    const input = document.getElementById('globalRadius');
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 10 || val > 5000) {
      showToast('Enter a value between 10 and 5000', 'error');
      return;
    }
    try {
      await db.collection(COL_SETTINGS).doc('global').set({ defaultRadius: val }, { merge: true });
      showToast('✅ Default radius saved', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });

  resetBtn.addEventListener('click', async () => {
    document.getElementById('globalRadius').value = 100;
    try {
      await db.collection(COL_SETTINGS).doc('global').set({ defaultRadius: 100 }, { merge: true });
      showToast('Radius reset to 100m', 'success');
    } catch (err) {
      showToast('Reset failed: ' + err.message, 'error');
    }
  });
}
