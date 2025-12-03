// config.js - API Configuration

// BACKEND URL - ALWAYS use Render for deployed app
const RENDER_URL = "https://dna-analyzer-1-ipxr.onrender.com";

// For local development, you can change this manually
export const API_BASE_URL = RENDER_URL;

console.log("🔗 API Base URL:", API_BASE_URL);

// ENDPOINTS - All must have /api/ prefix
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/api/health`,
  info: `${API_BASE_URL}/api/info`,
  mutations: `${API_BASE_URL}/api/mutations`,
  align: `${API_BASE_URL}/api/align`,
  crispr: `${API_BASE_URL}/api/crispr`,
  primers: `${API_BASE_URL}/api/primers`,
  explain: `${API_BASE_URL}/api/explain`,
};

// REQUEST CONFIG
export const API_CONFIG = {
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
};