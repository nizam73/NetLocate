// ============================================================
//  js/firebase-config.js
//  👉 Replace the values below with your Firebase project config.
//  Get them from: Firebase Console → Project Settings → Your apps
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// List of admin email addresses (case-insensitive check)
// These users will have access to the Admin Panel.
const ADMIN_EMAILS = [
  "admin@example.com",
  // add more admin emails here
];

// Initialize Firebase (compat SDK)
firebase.initializeApp(FIREBASE_CONFIG);

// Expose global references used across modules
const db   = firebase.firestore();
const auth = firebase.auth();

// ─── Firestore collection names ───────────────────────────
const COL_DPS          = "distribution_points"; // DP records
const COL_APPLICATIONS = "applications";         // user applications
const COL_SETTINGS     = "settings";             // global settings (radius etc.)
