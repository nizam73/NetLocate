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

    // Basic rate-limit: prevent double-submit
    submitting = true;
    const btn = document.getElementById('confirmApplyBtn');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    try {
      // Check if user already has a pending application at ~same location
      const recent = await db.collection(COL_APPLICATIONS)
        .where('user_id', '==', user.uid)
        .where('status', '==', 'pending')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!recent.empty) {
        const lastDoc  = recent.docs[0].data();
        const lastTime = lastDoc.timestamp?.toDate?.() || new Date(0);
        const minsSince = (Date.now() - lastTime.getTime()) / 60000;
        if (minsSince < 30) {
          showToast('You already have a pending application. Please wait 30 minutes.', 'error');
          submitting = false;
          btn.textContent = '✅ Confirm আবেদন';
          btn.disabled = false;
          return;
        }
      }

      await db.collection(COL_APPLICATIONS).add({
        user_id:   user.uid,
        user_name: user.displayName,
        user_email:user.email,
        lat:       latLng.lat,
        lng:       latLng.lng,
        address:   geo?.display || '',
        street:    geo?.street  || '',
        area:      geo?.area    || '',
        district:  geo?.district|| '',
        division:  geo?.division|| '',
        status:    'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
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
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      if (snap.empty) {
        list.innerHTML = `<div class="empty-state">📭<span>No applications yet</span></div>`;
        return;
      }

      list.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp?.toDate?.()?.toLocaleDateString('en-BD', { day:'numeric',month:'short',year:'numeric' }) || '–';
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
          <div class="app-card-address">${d.address || `${d.lat?.toFixed(5)}, ${d.lng?.toFixed(5)}`}</div>
          <div class="app-card-meta">
            <span class="app-card-date">📅 ${date}</span>
            <span class="status-pill ${d.status || 'pending'}">${d.status || 'pending'}</span>
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
