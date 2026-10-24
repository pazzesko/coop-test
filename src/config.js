// Firebase web configuration is public. Never put service-account keys here.
// Copy the web-app configuration from Firebase Console → Project settings.
export const firebaseConfig = {
  apiKey: '',
  authDomain: 'coop-test-3d2ba.firebaseapp.com',
  databaseURL: 'https://coop-test-3d2ba-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'coop-test-3d2ba',
  appId: '',
};

// STUN works on many networks, but not all. Add a credential endpoint for TURN
// before promising reliable public matchmaking. Never ship permanent TURN secrets.
export const iceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

// Local testing only. Backend ignores this unless served on localhost/127.0.0.1.
export const emulatorConfig = null;
