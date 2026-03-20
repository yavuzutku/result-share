// lib/firebase-admin.js
// Initialises Firebase Admin SDK once and exports the app.
// Returns null (and logs a warning) if credentials are not configured.

const admin = require('firebase-admin');

let app = null;

function init() {
  if (app) return app;
  if (process.env.STORE_BACKEND === 'file') return null;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(json);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const json = require(require('path').resolve(
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ));
      credential = admin.credential.cert(json);
    } else {
      console.warn(
        '[firebase-admin] No credentials found – falling back to file store.'
      );
      return null;
    }

    app = admin.initializeApp({ credential });
    console.log('[firebase-admin] Initialized ✓');
    return app;
  } catch (err) {
    console.warn('[firebase-admin] Init failed, using file store:', err.message);
    return null;
  }
}

module.exports = { init, get admin() { return admin; } };