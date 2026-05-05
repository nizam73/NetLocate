// ============================================================
//  js/map.js
//  Leaflet map initialisation, DP loading, coverage logic
// ============================================================

const MapModule = (() => {

  // ── Bangladesh bounds ─────────────────────────────────────
  const BD_BOUNDS  = L.latLngBounds([20.5, 87.9], [26.8, 92.8]);
  const BD_CENTER  = [23.685, 90.356];
  const DEFAULT_ZOOM = 7;

  let map         = null;
  let userMarker  = null;
  let miniMap     = null;
  let dpCluster   = null;   // MarkerClusterGroup
  let dpMarkers   = [];     // { marker, circle, data }
  let selectedLatLng = null;
  let selectedMarker = null;

  // Cache for geocoding results  { "lat,lng": addressObject }
  const geocodeCache = {};

  // ── Haversine distance (metres) ──────────────────────────
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ── Check coverage & return nearest DP info ───────────────
  function checkCoverage(lat, lng) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const dp of dpMarkers) {
      const dist = haversine(lat, lng, dp.data.lat, dp.data.lng);
      const radius = dp.data.radius || 100;

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { ...dp.data, dist: Math.round(dist) };
      }

      if (dist <= radius) {
        return { available: true, dp, nearest: { ...dp.data, dist: Math.round(dist) } };
      }
    }

    return { available: false, nearest, nearestDist: Math.round(nearestDist) };
  }

  // ── Reverse geocode via Nominatim ─────────────────────────
  async function reverseGeocode(lat, lng) {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (geocodeCache[key]) return geocodeCache[key];

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();

      const addr = data.address || {};
      const result = {
        display: data.display_name || 'Unknown location',
        street:   addr.road || addr.pedestrian || addr.footway || '',
        area:     addr.suburb || addr.neighbourhood || addr.village || addr.town || '',
        district: addr.city || addr.county || addr.district || '',
        division: addr.state || '',
        country:  addr.country || ''
      };

      geocodeCache[key] = result;
      return result;
    } catch (e) {
      return { display: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, street: '', area: '', district: '', division: '' };
    }
  }

  // ── Forward geocode via Nominatim ─────────────────────────
  async function forwardGeocode(query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Bangladesh')}&format=json&limit=1&countrycodes=bd`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data.length === 0) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    } catch (e) {
      return null;
    }
  }

  // ── Initialise Leaflet map ────────────────────────────────
  function init() {
    map = L.map('map', {
      center: BD_CENTER,
      zoom:   DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: BD_BOUNDS.pad(0.1),
      zoomControl: true
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      maxZoom: 19
    }).addTo(map);

    // Bangladesh border highlight (polygon)
    fetch('https://nominatim.openstreetmap.org/search.php?country=Bangladesh&polygon_geojson=1&format=json')
      .then(r => r.json())
      .then(data => {
        if (data?.[0]?.geojson) {
          L.geoJSON(data[0].geojson, {
            style: { color: '#00d4aa', weight: 1.5, opacity: 0.35, fill: false }
          }).addTo(map);
        }
      })
      .catch(() => {}); // Non-critical

    // DP cluster group
    dpCluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      iconCreateFunction: cluster => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="cluster-icon">${count}</div>`,
          className: '',
          iconSize: [32, 32]
        });
      }
    });
    map.addLayer(dpCluster);

    // Add cluster icon style dynamically
    addStyle(`.cluster-icon{width:32px;height:32px;background:rgba(0,153,255,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,0.4);box-shadow:0 2px 8px rgba(0,0,0,0.5);}`);

    // Click anywhere on map → select location
    map.on('click', async (e) => {
      if (!BD_BOUNDS.contains(e.latlng)) {
        showToast('Please select a location within Bangladesh', 'error');
        return;
      }
      await selectLocation(e.latlng.lat, e.latlng.lng);
    });

    loadDPs();
    return map;
  }

  // ── Load Distribution Points from Firestore ───────────────
  function loadDPs() {
    db.collection(COL_DPS).onSnapshot(snapshot => {
      // Clear existing
      dpCluster.clearLayers();
      dpMarkers.forEach(({ circle }) => map.removeLayer(circle));
      dpMarkers = [];

      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (!data.lat || !data.lng) return;

        const radius = data.radius || 100;

        // Coverage circle
        const circle = L.circle([data.lat, data.lng], {
          radius,
          color:     '#0099ff',
          fillColor: '#0099ff',
          fillOpacity: 0.08,
          weight: 1.5,
          opacity: 0.5
        }).addTo(map);

        // DP marker
        const marker = L.marker([data.lat, data.lng], {
          icon: L.divIcon({
            html: `<div class="dp-marker-icon" title="${data.name || 'DP'}"></div>`,
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5]
          })
        });

        marker.bindPopup(`
          <div>
            <strong style="font-family:Syne,sans-serif">${data.name || 'Distribution Point'}</strong><br/>
            <small style="color:#8b949e">Radius: ${radius}m</small><br/>
            <small style="color:#8b949e">${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}</small>
          </div>
        `);

        dpCluster.addLayer(marker);
        dpMarkers.push({ marker, circle, data });
      });
    }, err => {
      console.error('Error loading DPs:', err);
    });
  }

  // ── Select a location (show bottom sheet) ─────────────────
  async function selectLocation(lat, lng) {
    selectedLatLng = { lat, lng };

    // Remove previous selected marker
    if (selectedMarker) map.removeLayer(selectedMarker);

    selectedMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `<div style="width:14px;height:14px;background:#e3b341;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px rgba(227,179,65,0.4),0 2px 8px rgba(0,0,0,0.5)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
    }).addTo(map);

    // Show sheet in "checking" state
    showBottomSheet();
    setSheetStatus('checking', '⏳ Checking coverage…');
    setSheetCoords(lat, lng);
    setSheetAddress('Fetching address…');
    setNearestDP(null);

    // Parallel: geocode + coverage check
    const [geoResult, coverage] = await Promise.all([
      reverseGeocode(lat, lng),
      Promise.resolve(checkCoverage(lat, lng))
    ]);

    setSheetAddress(geoResult.display);

    if (coverage.available) {
      setSheetStatus('available', '✅ Service Available');
    } else {
      setSheetStatus('unavailable', '❌ Not Available Yet');
      if (coverage.nearest) {
        setNearestDP(`📡 Nearest DP: ${coverage.nearestDist}m away`);
      }
    }

    // Store for apply flow
    MapModule._lastGeo = geoResult;
    MapModule._lastCoverage = coverage;
  }

  // ── Show user's GPS location ──────────────────────────────
  async function locateUser() {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported by your browser', 'error');
      return;
    }

    showToast('Getting your location…');

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;

        if (!BD_BOUNDS.contains([lat, lng])) {
          showToast('Your location is outside Bangladesh', 'error');
          return;
        }

        // Remove previous user marker
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div class="user-marker-icon"></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          }),
          zIndexOffset: 1000
        }).addTo(map);

        map.flyTo([lat, lng], 15, { duration: 1.2 });
        await selectLocation(lat, lng);
      },
      err => {
        const msgs = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Check your GPS/network.',
          3: 'Location request timed out.'
        };
        showToast(msgs[err.code] || 'Location error', 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // ── Search by address ─────────────────────────────────────
  async function searchAddress(query) {
    if (!query.trim()) return;
    showToast('Searching…');
    const result = await forwardGeocode(query);
    if (!result) {
      showToast('Address not found. Try a more specific search.', 'error');
      return;
    }
    map.flyTo([result.lat, result.lng], 15, { duration: 1.2 });
    await selectLocation(result.lat, result.lng);
  }

  // ── Init mini-map inside confirm modal ────────────────────
  function initMiniMap(lat, lng) {
    if (miniMap) { miniMap.remove(); miniMap = null; }
    miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(miniMap);
    miniMap.setView([lat, lng], 16);
    L.marker([lat, lng]).addTo(miniMap);

    // Fix Leaflet tile rendering inside hidden modal
    setTimeout(() => miniMap.invalidateSize(), 50);
  }

  // ── Bottom sheet helpers ──────────────────────────────────
  function showBottomSheet() {
    const sheet = document.getElementById('bottomSheet');
    sheet.classList.remove('hidden');
    requestAnimationFrame(() => sheet.classList.add('open'));
  }

  function hideBottomSheet() {
    const sheet = document.getElementById('bottomSheet');
    sheet.classList.remove('open');
    setTimeout(() => sheet.classList.add('hidden'), 320);
  }

  function setSheetStatus(type, text) {
    const el = document.getElementById('coverageStatus');
    el.className = `coverage-badge ${type}`;
    el.textContent = text;
  }

  function setSheetAddress(text) {
    document.getElementById('sheetAddress').textContent = text;
  }

  function setSheetCoords(lat, lng) {
    document.getElementById('sheetLat').textContent = `${lat.toFixed(6)}°N`;
    document.getElementById('sheetLng').textContent = `${lng.toFixed(6)}°E`;
  }

  function setNearestDP(text) {
    const el = document.getElementById('nearestDP');
    if (text) {
      el.textContent = text;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  // ── Utility: inject CSS string ────────────────────────────
  function addStyle(css) {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    locateUser,
    searchAddress,
    checkCoverage,
    reverseGeocode,
    hideBottomSheet,
    initMiniMap,
    getSelectedLatLng: () => selectedLatLng,
    getDPMarkers: () => dpMarkers,
    getMap: () => map,
    _lastGeo: null,
    _lastCoverage: null
  };
})();
