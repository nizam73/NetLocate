// ============================================================
//  js/firebase-config.js
//  👉 Replace the values below with your Firebase project config.
//  Get them from: Firebase Console → Project Settings → Your apps
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB4rVF1bA7JSbFKWpyX4GbDtyrdRs7HzOU",
  authDomain: "netlocate-88bdb.firebaseapp.com",
  projectId: "netlocate-88bdb",
  storageBucket: "netlocate-88bdb.firebasestorage.app",
  messagingSenderId: "400237525037",
  appId: "1:400237525037:web:cf1af22da6f7c3a01fe0a4"
};

// List of admin email addresses (case-insensitive check)
// These users will have access to the Admin Panel.
const ADMIN_EMAILS = [
  "ahmed.nizam73@gmail.com",
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
