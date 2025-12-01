// config.js - API Configuration

// IMPORTANT: Clear your browser cache after updating this file!
// In browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

// Production backend URL (Render)
const PRODUCTION_URL = 'https://dna-analyzer-1-ipxr.onrender.com';

// Get API URL - prioritize environment variable, then production, then localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || PRODUCTION_URL;

console.log('🔗 API Base URL:', API_BASE_URL); // Debug log

// API Endpoints
export const API_ENDPOINTS = {
  // Health check
  health: `${API_BASE_URL}/health`,
  info: `${API_BASE_URL}/info`,
  
  // Analysis endpoints
  mutations: `${API_BASE_URL}/api/mutations`,
  align: `${API_BASE_URL}/api/align`,
  crispr: `${API_BASE_URL}/api/crispr`,
  primers: `${API_BASE_URL}/api/primers`,
  
  // AI explanation endpoint
  explain: `${API_BASE_URL}/api/explain`,
};

// API Configuration
export const API_CONFIG = {
  timeout: 60000, // 60 seconds (Render free tier can be slow on cold start)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Export the base URL for components that need it
export { API_BASE_URL };

export default {
  API_ENDPOINTS,
  API_CONFIG,
  API_BASE_URL,
};