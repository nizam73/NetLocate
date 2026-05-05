# NetLocate – Setup Guide

**ISP Coverage Finder Web App for Bangladesh**

---

## 📋 What You're Getting

A fully working, deployable web app with:
- Interactive map of Bangladesh showing ISP coverage zones
- GPS-based and manual location selection
- Coverage availability check using Haversine formula
- Connection application flow with Firebase Auth
- Admin panel for managing Distribution Points and applications
- Mobile-first responsive UI

---

## 🗂 File Structure

```
netlocate/
├── index.html              ← Main app
├── netlify.toml            ← Netlify config
├── firestore.rules         ← Firestore security rules
├── seed-data.js            ← Optional: pre-populate test DPs
├── css/
│   └── style.css           ← All app styles
├── js/
│   ├── firebase-config.js  ← 👉 YOUR FIREBASE CONFIG GOES HERE
│   ├── auth.js             ← Google authentication
│   ├── map.js              ← Leaflet map + coverage logic
│   └── app.js              ← Main controller
└── admin/
    ├── admin.html          ← Admin panel
    ├── admin.css           ← Admin styles
    └── admin.js            ← Admin logic
```

---

## 🚀 Step-by-Step Setup

### Step 1 – Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → give it a name (e.g. `netlocate-bd`)
3. Disable Google Analytics if you don't need it → **Create Project**

---

### Step 2 – Enable Firebase Services

#### Authentication
1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Sign-in method** tab → Enable **Google**
3. Set your project's public-facing name and support email → **Save**

#### Firestore Database
1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → pick a region close to Bangladesh (e.g. `asia-south1`) → **Enable**

---

### Step 3 – Get Your Firebase Config

1. In Firebase Console → **Project Settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → click **Web** icon (`</>`)
3. Register the app (name it `netlocate-web`) → **Register app**
4. Copy the `firebaseConfig` object shown

---

### Step 4 – Add Config to the App

Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",        // ← paste your values
  authDomain:        "your-app.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123"
};

// Add your admin email(s) here:
const ADMIN_EMAILS = [
  "your-email@gmail.com"
];
```

---

### Step 5 – Deploy Firestore Security Rules

Option A – Firebase CLI (recommended):
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
# copy contents of firestore.rules into the prompted file
firebase deploy --only firestore:rules
```

Option B – Firebase Console:
1. Firestore → **Rules** tab
2. Paste the contents of `firestore.rules` → **Publish**

---

### Step 6 – Add Admin Records to Firestore

1. In Firebase Console → Firestore → **Start collection**
2. Collection ID: `admins`
3. Document ID: your admin email (e.g. `yourname@gmail.com`)
4. Add field: `role` (string) = `super_admin`

> ⚠️ The email in Firestore `admins` collection AND in `ADMIN_EMAILS` array **must match** for admin access to work.

---

### Step 7 – (Optional) Seed Sample Distribution Points

If you want test data pre-loaded:

```bash
# Install firebase-admin
npm install firebase-admin

# Download service account key:
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Save as serviceAccountKey.json in the project root

# Edit seed-data.js and add your real admin email(s)
node seed-data.js
```

---

### Step 8 – Deploy to Netlify

#### Option A: Drag & Drop (quickest)
1. Go to [https://netlify.com](https://netlify.com) → Log in
2. Drag the entire `netlocate/` folder onto the deploy zone
3. Done! You'll get a live URL instantly.

#### Option B: GitHub (recommended for ongoing use)
1. Push the project to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial NetLocate commit"
   git remote add origin https://github.com/YOUR_USERNAME/netlocate.git
   git push -u origin main
   ```
2. In Netlify → **Add new site** → **Import from Git** → Select your repo
3. Build settings: leave blank (static site) → **Deploy site**
4. Every push to `main` auto-deploys

---

### Step 9 – Add Netlify Domain to Firebase Auth

1. Firebase Console → Authentication → **Settings** → **Authorised domains**
2. Add your Netlify domain (e.g. `netlocate.netlify.app`)
3. Also add `localhost` for local development

---

## 🧪 Testing Locally

Open `index.html` directly in a browser (no server needed).

> **Note:** Geolocation requires HTTPS in production. For local testing, `localhost` is also allowed.

For a local dev server (optional):
```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## ⚙️ Customisation

### Change default map view
In `js/map.js`, edit:
```javascript
const BD_CENTER  = [23.685, 90.356];  // lat, lng
const DEFAULT_ZOOM = 7;
```

### Change default DP radius
In `js/firebase-config.js` or Firestore `settings/global.defaultRadius`

### Change map tile style
Replace the tile URL in `js/map.js`:
```javascript
// Dark (current):
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

// Light alternative:
'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

// OpenStreetMap standard:
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
```

---

## 🔐 Firestore Data Structure

### `distribution_points` collection
```
{
  name:       "Mirpur-10 DP",
  lat:        23.8069,
  lng:        90.3666,
  radius:     150,         // metres
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### `applications` collection
```
{
  user_id:    "firebase_uid",
  user_name:  "John Doe",
  user_email: "user@gmail.com",
  lat:        23.7461,
  lng:        90.3742,
  address:    "Full reverse-geocoded address string",
  street:     "Road name",
  area:       "Neighbourhood",
  district:   "City",
  division:   "State/Division",
  status:     "pending" | "approved" | "rejected",
  timestamp:  Timestamp
}
```

### `admins` collection
```
Document ID = admin email address
{
  role: "super_admin"
}
```

### `settings` collection
```
Document ID = "global"
{
  defaultRadius: 100
}
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| Map doesn't load | Check your internet connection; Leaflet loads from CDN |
| Firebase errors in console | Double-check `firebase-config.js` values |
| Google sign-in popup blocked | Allow popups for your domain in browser settings |
| "Access Denied" in admin | Ensure your email is in both `ADMIN_EMAILS` array AND Firestore `admins` collection |
| DPs not showing | Check Firestore rules allow reads; verify collection name is `distribution_points` |
| Geolocation not working | Must use HTTPS in production; enable location in browser settings |

---

## 📞 Support

For Firebase-specific questions: [https://firebase.google.com/support](https://firebase.google.com/support)
For Leaflet map questions: [https://leafletjs.com/reference.html](https://leafletjs.com/reference.html)
For Netlify deployment: [https://docs.netlify.com](https://docs.netlify.com)
