<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin – NetLocate</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css" />
  <link rel="stylesheet" href="admin.css" />
</head>
<body class="admin-body">

  <!-- ===== ADMIN HEADER ===== -->
  <header class="admin-header">
    <button id="sidebarToggle" class="btn-icon sidebar-toggle-btn" title="Menu">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <a href="../index.html" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>
    <div class="topbar-logo">
      <span class="logo-text">Net<b>Locate</b></span>
      <span class="admin-badge">Admin</span>
    </div>
    <div id="adminUserInfo" class="admin-user-info"></div>
  </header>

  <!-- ===== ADMIN GATE (shown when not authenticated) ===== -->
  <div id="adminGate" class="admin-gate">
    <div class="gate-card">
      <div class="gate-icon">🔐</div>
      <h2>Admin Access</h2>
      <p>Sign in with an authorised admin account to continue.</p>
      <button id="adminLoginBtn" class="btn-primary">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M16 9H6M11 5L15 9L11 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  </div>

  <!-- ===== ADMIN DASHBOARD (hidden until authenticated) ===== -->
  <div id="adminDashboard" class="admin-dashboard hidden">
    <div id="sidebarOverlay" class="sidebar-overlay"></div>
    <aside id="adminSidebar" class="admin-sidebar">
      <nav class="admin-nav">
        <button class="nav-item active" data-tab="dps">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" opacity=".5"/>
          </svg>
          Distribution Points
        </button>
        <button class="nav-item" data-tab="applications">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M2 8H14M2 12H9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Applications
        </button>
        <button class="nav-item" data-tab="bulk">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1V11M4 7L8 3L12 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 13H14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Bulk Upload
        </button>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.36 3.64L11.3 4.7M4.7 11.3L3.64 12.36M12.36 12.36L11.3 11.3M4.7 4.7L3.64 3.64" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Settings
        </button>
      </nav>
      <button id="adminSignOut" class="nav-item text-danger" style="margin-top:auto">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 2H2V14H6M11 5L14 8L11 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="6.5" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Sign Out
      </button>
    </aside>

    <!-- Main content -->
    <main class="admin-main">

      <!-- ── DPs TAB ───────────────────────────────────── -->
      <section class="tab-panel active" id="tab-dps">
        <div class="panel-header">
          <div>
            <h1>Distribution Points</h1>
            <p class="panel-subtitle">Manage DP locations and coverage radii</p>
          </div>
          <button id="addDPBtn" class="btn-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Add DP
          </button>
        </div>

        <!-- DP Form -->
        <div id="dpFormWrap" class="card hidden">
          <h3 id="dpFormTitle">Add Distribution Point</h3>
          <div id="dpPickerMap" class="picker-map"></div>
          <p class="picker-hint">📍 Click on the map to pick DP location, or enter coordinates manually.</p>
          <div class="form-grid">
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="dpName" placeholder="e.g. Mirpur DP-1" />
            </div>
            <div class="form-group">
              <label>Latitude</label>
              <input type="number" id="dpLat" step="0.000001" placeholder="23.8103" />
            </div>
            <div class="form-group">
              <label>Longitude</label>
              <input type="number" id="dpLng" step="0.000001" placeholder="90.4125" />
            </div>
            <div class="form-group">
              <label>Radius (metres)</label>
              <input type="number" id="dpRadius" value="100" min="10" max="5000" />
            </div>
          </div>
          <div class="form-actions">
            <button id="saveDPBtn" class="btn-primary">Save DP</button>
            <button id="cancelDPBtn" class="btn-ghost">Cancel</button>
          </div>
        </div>

        <!-- DP List -->
        <div id="dpList" class="dp-grid">
          <div class="loading-spin"></div>
        </div>
      </section>

      <!-- ── APPLICATIONS TAB ──────────────────────────── -->
      <section class="tab-panel hidden" id="tab-applications">
        <div class="panel-header">
          <div>
            <h1>User Applications</h1>
            <p class="panel-subtitle">Review and update connection requests</p>
          </div>
          <select id="statusFilter" class="select-input">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div id="adminAppsList" class="admin-apps-list">
          <div class="loading-spin"></div>
        </div>
      </section>

      <!-- ── BULK UPLOAD TAB ────────────────────────────── -->
      <section class="tab-panel hidden" id="tab-bulk">
        <div class="panel-header">
          <div>
            <h1>Bulk Upload DPs</h1>
            <p class="panel-subtitle">Upload GPS coordinates from Excel / CSV</p>
          </div>
        </div>
        <div class="card">
          <h3>Step 1 — Choose File</h3>
          <p class="setting-desc">Upload your Excel (.xlsx / .xls) or CSV file. Columns must include <code>GPS_Lat</code> and <code>GPS_Long</code>. Optional: <code>Name</code>, <code>Radius</code>.</p>
          <div id="dropZone" class="drop-zone">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style="opacity:.4"><path d="M16 4V22M8 14L16 6L24 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 26H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <p>Drag & drop file here, or <label for="bulkFileInput" class="file-label">browse</label></p>
            <p class="setting-desc" style="margin:0">Supports .xlsx, .xls, .csv</p>
            <input type="file" id="bulkFileInput" accept=".xlsx,.xls,.csv" style="display:none" />
          </div>
        </div>
        <div class="card hidden" id="bulkPreviewCard">
          <h3>Step 2 — Preview <span id="bulkCount" style="color:var(--accent)"></span></h3>
          <p class="setting-desc">Set a default name prefix and radius for rows missing them.</p>
          <div class="form-grid" style="margin-bottom:14px">
            <div class="form-group">
              <label>Default Name Prefix</label>
              <input type="text" id="bulkNamePrefix" value="DP" placeholder="e.g. Mirpur DP" />
            </div>
            <div class="form-group">
              <label>Default Radius (metres)</label>
              <input type="number" id="bulkRadius" value="100" min="10" max="5000" />
            </div>
          </div>
          <button id="bulkRefreshPreview" class="btn-ghost" style="margin-bottom:12px;padding:6px 16px;font-size:12px">↻ Refresh Preview</button>
          <div id="bulkPreviewTable" class="bulk-preview-table"></div>
        </div>
        <div class="card hidden" id="bulkUploadCard">
          <h3>Step 3 — Upload to Firestore</h3>
          <p class="setting-desc">Adds all valid rows as new Distribution Points. Existing DPs are not affected.</p>
          <div id="bulkProgress" class="bulk-progress hidden">
            <div class="bulk-progress-bar"><div id="bulkProgressFill" class="bulk-progress-fill"></div></div>
            <p id="bulkProgressText" class="setting-desc" style="margin:6px 0 0"></p>
          </div>
          <div class="form-actions">
            <button id="bulkUploadBtn" class="btn-primary">⬆ Upload All DPs</button>
            <button id="bulkResetBtn" class="btn-ghost">Start Over</button>
          </div>
        </div>
      </section>

      <!-- ── SETTINGS TAB ──────────────────────────────── -->
      <section class="tab-panel hidden" id="tab-settings">
        <div class="panel-header">
          <div>
            <h1>Global Settings</h1>
            <p class="panel-subtitle">Configure default parameters</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="card">
            <h3>Default Coverage Radius</h3>
            <p class="setting-desc">Applied to new DPs if no radius is specified.</p>
            <div class="setting-row">
              <input type="number" id="globalRadius" min="10" max="5000" value="100" class="setting-input" />
              <span class="setting-unit">metres</span>
            </div>
            <div class="form-actions">
              <button id="saveRadiusBtn" class="btn-primary">Save</button>
              <button id="resetRadiusBtn" class="btn-ghost">Reset to 100m</button>
            </div>
          </div>

          <div class="card">
            <h3>Admin Whitelist</h3>
            <p class="setting-desc">Emails defined in <code>js/firebase-config.js</code> under <code>ADMIN_EMAILS</code>.</p>
            <div id="adminEmailList" class="email-list"></div>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- ===== DP DELETE CONFIRM ===== -->
  <div id="deleteConfirm" class="modal-overlay hidden">
    <div class="modal" style="max-width:360px">
      <div class="modal-header">
        <h2>Delete DP</h2>
        <button id="closeDelete" class="btn-icon">✕</button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete <strong id="deleteDPName"></strong>? This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button id="confirmDeleteBtn" class="btn-primary" style="background:var(--danger);color:#fff">Delete</button>
        <button id="cancelDeleteBtn" class="btn-ghost">Cancel</button>
      </div>
    </div>
  </div>

  <!-- ===== TOAST ===== -->
  <div id="toast" class="toast hidden"></div>

  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

  <script src="../js/firebase-config.js"></script>
  <script src="admin.js"></script>
</body>
</html>
