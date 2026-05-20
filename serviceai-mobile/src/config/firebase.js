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
  apiKey: "AIzaSyBfYfONuBzQ_lcDK__zfwXty7dlCjC2KBQ",
  authDomain: "hacakathon-service.firebaseapp.com",
  projectId: "hacakathon-service",
  storageBucket: "hacakathon-service.firebasestorage.app",
  messagingSenderId: "194501256562",
  appId: "1:194501256562:web:79f99300de4904c95929eb",
  measurementId: "G-KTR1S48XYY",
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
