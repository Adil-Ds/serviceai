import { Platform } from "react-native";

// Use localhost for web browser, LAN IP for physical mobile device (Expo Go).
// Run `ipconfig` on Windows to find your LAN IP if it changes.
const LAN_IP = "10.179.181.217";  // ✅ matches your current network

// If router AP isolation blocks direct LAN connection:
//   1. Run: ngrok http 8001
//   2. Paste the https URL below (e.g. "https://abc123.ngrok-free.app")
//   3. Run: npx expo start --tunnel --clear
// Leave empty ("") to use LAN IP.

// Paste your deployed Railway production URL here (e.g. "https://serviceai-backend-production.up.railway.app")
const RAILWAY_URL = "";

const NGROK_URL = "";

export const BASE_URL = RAILWAY_URL
  ? RAILWAY_URL
  : NGROK_URL
    ? NGROK_URL
    : Platform.OS === "web"
      ? "http://localhost:8001"
      : `http://${LAN_IP}:8001`;

// Set to true during demos/judging to bypass the live backend and return mock data instantly.
export const DEMO_MODE = false;

// Abort the analyze call and show a retry prompt after this many milliseconds.
// Groq pipeline takes 8-20s depending on tool chain length — give it plenty of room.
export const ANALYZE_TIMEOUT_MS = 60000;
