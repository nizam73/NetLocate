// ============================================================
//  js/auth.js
//  Handles Firebase Google Authentication
// ============================================================

const Auth = (() => {
  let currentUser = null;

  const provider = new firebase.auth.GoogleAuthProvider();

  // ── Listen for auth state changes ─────────────────────────
  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUIForUser(user);
    // Notify app.js if it registered a callback
    if (typeof Auth._onAuthChange === 'function') Auth._onAuthChange(user);
  });

  // ── Update topbar UI ──────────────────────────────────────
  function updateUIForUser(user) {
    const loginBtn    = document.getElementById('loginBtn');
    const userStatus  = document.getElementById('userStatus');
    const signOutItem = document.getElementById('menuSignOut');

    if (user) {
      // Replace sign-in button with avatar + name
      userStatus.innerHTML = `
        <img class="user-avatar" src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'U') + '&background=00d4aa&color=0d1117'}" alt="avatar" />
        <span class="user-name">${user.displayName?.split(' ')[0] || 'User'}</span>
      `;
      if (signOutItem) signOutItem.classList.remove('hidden');

      // Save/update user profile in Firestore
      saveUserProfile(user);
    } else {
      userStatus.innerHTML = `<button id="loginBtn" class="btn-outline btn-sm">Sign In</button>`;
      document.getElementById('loginBtn')?.addEventListener('click', signIn);
      if (signOutItem) signOutItem.classList.add('hidden');
    }
  }

  // ── Sign in with Google ───────────────────────────────────
  async function signIn() {
    try {
      await auth.signInWithPopup(provider);
    } catch (err) {
      console.error('Sign-in error:', err);
      showToast('Sign-in failed. Please try again.', 'error');
    }
  }

  // ── Sign out ──────────────────────────────────────────────
  async function signOut() {
    await auth.signOut();
    showToast('Signed out successfully');
  }

  // ── Save user profile to Firestore ───────────────────────
  async function saveUserProfile(user) {
    try {
      await db.collection('users').doc(user.uid).set({
        name:      user.displayName,
        email:     user.email,
        photoURL:  user.photoURL,
        lastSeen:  firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      // Non-critical; silently fail
    }
  }

  // ── Check if current user is admin ───────────────────────
  function isAdmin() {
    if (!currentUser) return false;
    return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase());
  }

  // ── Public API ────────────────────────────────────────────
  return {
    signIn,
    signOut,
    getUser:  () => currentUser,
    isAdmin,
    isLoggedIn: () => !!currentUser,
    _onAuthChange: null // set by app.js if needed
  };
})();

// ── Wire up sign-out menu item ──────────────────────────────
document.getElementById('menuSignOut')?.addEventListener('click', e => {
  e.preventDefault();
  Auth.signOut();
  document.getElementById('moreMenu')?.classList.add('hidden');
});

// ── Wire up login button (initial render) ──────────────────
document.getElementById('loginBtn')?.addEventListener('click', Auth.signIn);
