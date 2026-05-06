// ============================================================
//  js/app.js
//  Main application controller — wires UI, auth, map, Firestore
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Boot sequence ─────────────────────────────────────────
  MapModule.init();

  // Hide loading overlay after map tiles start
  setTimeout(() => {
    document.getElementById('loadingOverlay').classList.add('done');
  }, 1500);

  // ── Apply button (bottom sheet) ───────────────────────────
  document.getElementById('applyBtn').addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      // Trigger sign-in, then re-open confirm after login
      Auth._onAuthChange = user => {
        if (user) {
          Auth._onAuthChange = null;
          openConfirmModal();
        }
      };
      Auth.signIn();
    } else {
      openConfirmModal();
    }
  });

  // ── Confirm modal ─────────────────────────────────────────
  function openConfirmModal() {
    const latLng = MapModule.getSelectedLatLng();
    const geo    = MapModule._lastGeo;
    if (!latLng) return;

    // Clear phone field each time modal opens
    document.getElementById('phoneInput').value = '';

    // Populate modal
    document.getElementById('confirmAddress').textContent = geo?.display || `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
    document.getElementById('confirmCoords').textContent  = `${latLng.lat.toFixed(6)}°N, ${latLng.lng.toFixed(6)}°E`;

    const cov = MapModule._lastCoverage;
    const statusEl = document.getElementById('confirmStatus');
    if (cov?.available) {
      statusEl.className = 'coverage-badge sm available';
      statusEl.textContent = '✅ Service Available';
    } else {
      statusEl.className = 'coverage-badge sm unavailable';
      statusEl.textContent = '❌ Not Available Yet';
    }

    document.getElementById('confirmModal').classList.remove('hidden');

    // Init mini-map
    MapModule.initMiniMap(latLng.lat, latLng.lng);
  }

  document.getElementById('closeConfirm').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
  });

  // Close modal clicking backdrop
  document.getElementById('confirmModal').addEventListener('click', e => {
    if (e.target === document.getElementById('confirmModal'))
      document.getElementById('confirmModal').classList.add('hidden');
  });

  // ── Submit application ────────────────────────────────────
  let submitting = false;
  document.getElementById('confirmApplyBtn').addEventListener('click', async () => {
    if (submitting) return;
    const user   = Auth.getUser();
    const latLng = MapModule.getSelectedLatLng();
    const geo    = MapModule._lastGeo;

    if (!user || !latLng) return;

    // ── Phone validation ──────────────────────────────────
    const rawPhone = document.getElementById('phoneInput').value.trim();
    if (!rawPhone) {
      showToast('📞 Please enter your mobile number', 'error');
      document.getElementById('phoneInput').focus();
      return;
    }
    // BD mobile: 10 digits starting with 1, second digit 3-9
    const phoneRegex = /^1[3-9]\d{8}$/;
    if (!phoneRegex.test(rawPhone)) {
      showToast('Enter a valid Bangladesh number (e.g. 1712345678)', 'error');
      document.getElementById('phoneInput').focus();
      return;
    }
    const fullPhone = '+880' + rawPhone;

    // Basic rate-limit: prevent double-submit
    submitting = true;
    const btn = document.getElementById('confirmApplyBtn');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    try {
      // Rate-limit: single-field query only (no index required)
      const recent = await db.collection(COL_APPLICATIONS)
        .where('user_id', '==', user.uid)
        .limit(10)
        .get();

      if (!recent.empty) {
        // Find the most recent pending application by sorting client-side
        const pending = recent.docs
          .map(d => d.data())
          .filter(d => d.status === 'pending')
          .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];

        if (pending) {
          const lastTime = pending.timestamp?.toDate?.() || new Date(0);
          const minsSince = (Date.now() - lastTime.getTime()) / 60000;
          if (minsSince < 30) {
            showToast('You already have a pending application. Please wait 30 minutes.', 'error');
            submitting = false;
            btn.textContent = '✅ Confirm আবেদন';
            btn.disabled = false;
            return;
          }
        }
      }

      await db.collection(COL_APPLICATIONS).add({
        user_id:      user.uid,
        user_name:    user.displayName,
        user_email:   user.email,
        phone:        fullPhone,
        lat:          latLng.lat,
        lng:          latLng.lng,
        address:      geo?.display  || '',
        street:       geo?.street   || '',
        area:         geo?.area     || '',
        district:     geo?.district || '',
        division:     geo?.division || '',
        coverage:     MapModule._lastCoverage?.available ? 'available' : 'unavailable',
        status:       'pending',
        timestamp:    firebase.firestore.FieldValue.serverTimestamp()
      });

      document.getElementById('confirmModal').classList.add('hidden');
      MapModule.hideBottomSheet();
      showToast('✅ Application submitted successfully!', 'success');

    } catch (err) {
      console.error('Submit error:', err);
      showToast('Submission failed. Please try again.', 'error');
    } finally {
      submitting = false;
      btn.textContent = '✅ Confirm আবেদন';
      btn.disabled = false;
    }
  });

  // ── My Applications modal ─────────────────────────────────
  document.getElementById('menuMyApps').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('moreMenu').classList.add('hidden');

    if (!Auth.isLoggedIn()) {
      showToast('Please sign in to view your applications');
      Auth.signIn();
      return;
    }

    document.getElementById('myAppsModal').classList.remove('hidden');
    loadMyApplications();
  });

  document.getElementById('closeMyApps').addEventListener('click', () => {
    document.getElementById('myAppsModal').classList.add('hidden');
  });

  document.getElementById('myAppsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('myAppsModal'))
      document.getElementById('myAppsModal').classList.add('hidden');
  });

  async function loadMyApplications() {
    const user = Auth.getUser();
    const list = document.getElementById('appsList');
    list.innerHTML = '<div class="loading-spin"></div>';

    try {
      const snap = await db.collection(COL_APPLICATIONS)
        .where('user_id', '==', user.uid)
        .limit(20)
        .get();

      if (snap.empty) {
        list.innerHTML = `<div class="empty-state">📭<span>No applications yet</span></div>`;
        return;
      }

      // Sort client-side by timestamp descending
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      list.innerHTML = '';
      docs.forEach(d => {
        const date = d.timestamp?.toDate?.()?.toLocaleDateString('en-BD', { day:'numeric',month:'short',year:'numeric' }) || '–';
        const covBadge = d.coverage === 'available'
          ? `<span class="status-pill approved">✅ Available</span>`
          : `<span class="status-pill rejected">❌ Unavailable</span>`;
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
          <div class="app-card-address">${d.address || `${d.lat?.toFixed(5)}, ${d.lng?.toFixed(5)}`}</div>
          <div class="app-card-meta">
            <span class="app-card-date">📅 ${date}</span>
            <span class="status-pill ${d.status || 'pending'}">${d.status || 'pending'}</span>
            ${covBadge}
          </div>
        `;
        list.appendChild(card);
      });
    } catch (err) {
      list.innerHTML = `<div class="empty-state">⚠️<span>Failed to load applications</span></div>`;
    }
  }

  // ── Search ────────────────────────────────────────────────
  document.getElementById('searchBtn').addEventListener('click', () => {
    MapModule.searchAddress(document.getElementById('searchInput').value);
  });

  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') MapModule.searchAddress(e.target.value);
  });

  // ── My Location FAB ───────────────────────────────────────
  document.getElementById('locateBtn').addEventListener('click', MapModule.locateUser);

  // ── Close bottom sheet ────────────────────────────────────
  document.getElementById('closeSheet').addEventListener('click', MapModule.hideBottomSheet);

  // ── More menu toggle ──────────────────────────────────────
  document.getElementById('menuBtn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('moreMenu').classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    document.getElementById('moreMenu').classList.add('hidden');
  });

  document.getElementById('moreMenu').addEventListener('click', e => e.stopPropagation());
});

// ============================================================
//  showToast – global helper used across modules
// ============================================================
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}
