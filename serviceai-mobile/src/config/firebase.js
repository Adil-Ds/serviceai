import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Guard against hot-reload re-initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Guard initializeAuth — only call it once (first init), reuse getAuth() after
let auth;
if (getApps().length === 1 && getApps()[0] === app) {
  try {
    auth = initializeAuth(app, {
      // Web: persist in localStorage so judges don't re-login on refresh
      // Mobile (Expo Go): in-memory — no AsyncStorage needed
      persistence:
        Platform.OS === "web" ? browserLocalPersistence : inMemoryPersistence,
    });
  } catch (e) {
    // Auth already initialized (e.g. hot reload) — just grab the existing instance
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
