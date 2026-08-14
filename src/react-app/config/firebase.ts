import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

/**
 * ====================================================================
 * FIREBASE CONFIGURATION
 * ====================================================================
 * Place your Firebase project details directly in the object below.
 * No environment variables (.env) are required.
 *
 * To obtain these values:
 * 1. Go to https://console.firebase.google.com/
 * 2. Select your project (or create one)
 * 3. Go to Project Settings -> General -> Your apps -> Web app
 * 4. Copy the firebaseConfig object properties and paste them below.
 * 5. Ensure "Authentication" is enabled in Firebase Console (e.g. Email/Password, Google).
 */
export const firebaseConfig = {
    apiKey: "AIzaSyBGERCP_4UH7uCuCCiRiOzsLngafWiqcS4",
    authDomain: "tps-files.firebaseapp.com",
    projectId: "tps-files",
    storageBucket: "tps-files.appspot.com",
    messagingSenderId: "133341432267",
    appId: "1:133341432267:web:d0d7f2e40ff8e7787c0e4e",
    measurementId: "G-K94ER1N7S9"
  };

/**
 * Checks whether the user has replaced placeholder credentials with valid ones.
 */
export const isFirebaseConfigured = (): boolean => {
  return (
    typeof firebaseConfig.apiKey === "string" &&
    firebaseConfig.apiKey.trim().length > 0 &&
    !firebaseConfig.apiKey.includes("YOUR_") &&
    typeof firebaseConfig.projectId === "string" &&
    firebaseConfig.projectId.trim().length > 0 &&
    !firebaseConfig.projectId.includes("YOUR_")
  );
};

// Safe initialization to prevent crashes if config is placeholder or during hot-reload
let appInstance: FirebaseApp;
let authInstance: Auth;

try {
  if (getApps().length === 0) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = getApp();
  }
  authInstance = getAuth(appInstance);
} catch (error) {
  console.warn("Firebase initialization error (check firebaseConfig in src/react-app/config/firebase.ts):", error);
  // Fallback initialize
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, "fallback-app");
  authInstance = getAuth(appInstance);
}

export const app = appInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
// Set custom parameters if needed
googleProvider.setCustomParameters({
  prompt: "select_account"
});
