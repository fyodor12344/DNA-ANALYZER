// config.js - API Configuration

// ---- BACKEND URL SETUP ----

// Deployed backend on Render
const RENDER_URL = "https://dna-analyzer-1-ipxr.onrender.com";

// If running locally (during development), use localhost.
// If deployed (Vercel), always use Render URL.
const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

export const API_BASE_URL = isLocalhost 
  ? "http://localhost:5000" 
  : RENDER_URL;

console.log("🔗 API Base URL:", API_BASE_URL); // For debugging


// ---- ENDPOINTS ----
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  info: `${API_BASE_URL}/info`,
  mutations: `${API_BASE_URL}/api/mutations`,
  align: `${API_BASE_URL}/api/align`,
  crispr: `${API_BASE_URL}/api/crispr`,
  primers: `${API_BASE_URL}/api/primers`,
  explain: `${API_BASE_URL}/api/explain`,
};


// ---- REQUEST CONFIG ----
export const API_CONFIG = {
  timeout: 60000, // Allow slow cold starts on Render
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};


// ---- DEFAULT EXPORT ----
export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
};
