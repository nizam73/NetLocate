// seed-data.js
// ─────────────────────────────────────────────────────────────────
//  Run this ONCE from a Node.js environment to pre-populate your
//  Firestore with sample Distribution Points across Bangladesh.
//
//  Usage:
//    npm install firebase-admin
//    node seed-data.js
//
//  Prerequisites:
//    1. Go to Firebase Console → Project Settings → Service Accounts
//    2. Click "Generate new private key" → save as serviceAccountKey.json
//    3. Place serviceAccountKey.json in the same folder as this file
// ─────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const SAMPLE_DPS = [
  // Dhaka Division
  { name: 'Mirpur-10 DP', lat: 23.8069, lng: 90.3666, radius: 150 },
  { name: 'Gulshan-2 DP', lat: 23.7927, lng: 90.4143, radius: 120 },
  { name: 'Dhanmondi-27 DP', lat: 23.7461, lng: 90.3742, radius: 100 },
  { name: 'Uttara Sector-7 DP', lat: 23.8715, lng: 90.3854, radius: 200 },
  { name: 'Motijheel DP', lat: 23.7289, lng: 90.4176, radius: 100 },
  { name: 'Banani DP', lat: 23.7937, lng: 90.4031, radius: 130 },

  // Chittagong Division
  { name: 'Agrabad DP', lat: 22.3311, lng: 91.8187, radius: 120 },
  { name: 'GEC Circle DP', lat: 22.3590, lng: 91.8333, radius: 100 },
  { name: 'Nasirabad DP', lat: 22.3620, lng: 91.8050, radius: 150 },

  // Sylhet Division
  { name: 'Zindabazar DP', lat: 24.8949, lng: 91.8687, radius: 100 },
  { name: 'Amberkhana DP', lat: 24.9008, lng: 91.8560, radius: 120 },

  // Rajshahi Division
  { name: 'Rajshahi Boalia DP', lat: 24.3745, lng: 88.6042, radius: 100 },
  { name: 'Rajpara DP', lat: 24.3637, lng: 88.6147, radius: 150 },

  // Khulna Division
  { name: 'Khulna Boyra DP', lat: 22.8456, lng: 89.5403, radius: 100 },
  { name: 'Sonadanga DP', lat: 22.8359, lng: 89.5323, radius: 120 },

  // Barisal Division
  { name: 'Barisal Sadar DP', lat: 22.7010, lng: 90.3535, radius: 100 },

  // Rangpur Division
  { name: 'Rangpur Shapla DP', lat: 25.7439, lng: 89.2752, radius: 150 },

  // Mymensingh Division
  { name: 'Mymensingh Town DP', lat: 24.7471, lng: 90.4203, radius: 100 },
];

// Admin records (email used as document ID)
const ADMIN_RECORDS = [
  { email: 'admin@example.com', role: 'super_admin' },
  // add more admins here
];

async function seed() {
  console.log('🌱 Seeding Firestore...\n');

  // Seed DPs
  const dpBatch = db.batch();
  for (const dp of SAMPLE_DPS) {
    const ref = db.collection('distribution_points').doc();
    dpBatch.set(ref, {
      ...dp,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ DP: ${dp.name}`);
  }
  await dpBatch.commit();
  console.log(`\n📡 ${SAMPLE_DPS.length} DPs seeded.\n`);

  // Seed admins
  for (const a of ADMIN_RECORDS) {
    await db.collection('admins').doc(a.email).set({ role: a.role });
    console.log(`  🔐 Admin: ${a.email}`);
  }

  // Seed global settings
  await db.collection('settings').doc('global').set({ defaultRadius: 100 });
  console.log('\n⚙️  Global settings seeded (defaultRadius: 100m).');
  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
