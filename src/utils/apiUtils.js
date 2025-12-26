// apiUtils.js - Improved API helper functions with better error handling
import { API_ENDPOINTS } from './config';

/**
 * Generic API call wrapper with enhanced error handling
 */
async function apiCall(url, options = {}) {
  try {
    console.log('🚀 API Call:', url); // Debug log
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    // Try to parse JSON response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, get text
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server returned non-JSON response. Backend may not be running correctly.');
    }

    if (!response.ok) {
      console.error('API Error:', response.status, data);
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ API Success:', data); // Debug log
    return { success: true, data };

  } catch (error) {
    console.error('❌ API Error:', error);

    // Handle different error types
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Request timeout. The server took too long to respond. Please try again.' 
      };
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return { 
        success: false, 
        error: 'Cannot connect to server. Please check:\n1. Backend is running on Render\n2. Internet connection is stable\n3. No CORS issues' 
      };
    }

    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      return { 
        success: false, 
        error: 'Connection refused. Backend server may be down or starting up (Render free tier takes 50+ seconds on cold start).' 
      };
    }

    return { 
      success: false, 
      error: error.message || 'Network error. Please check your connection and try again.' 
    };
  }
}

/**
 * Find mutations between two DNA sequences
 */
export async function findMutations(sequence1, sequence2) {
  return apiCall(API_ENDPOINTS.mutations, {
    method: 'POST',
    body: JSON.stringify({ sequence1, sequence2 }),
  });
}

/**
 * Perform sequence alignment
 */
export async function performAlignment(sequence1, sequence2, algorithm = 'global') {
  return apiCall(API_ENDPOINTS.align, {
    method: 'POST',
    body: JSON.stringify({ sequence1, sequence2, algorithm }),
  });
}

/**
 * Find CRISPR PAM sites in a sequence
 */
export async function findCRISPRSites(sequence) {
  return apiCall(API_ENDPOINTS.crispr, {
    method: 'POST',
    body: JSON.stringify({ sequence }),
  });
}

/**
 * Design PCR primers for a sequence
 */
export async function designPrimers(
  sequence, 
  target_tm = 60, 
  primer_length = 20, 
  product_size_range = [200, 500]
) {
  return apiCall(API_ENDPOINTS.primers, {
    method: 'POST',
    body: JSON.stringify({ 
      sequence, 
      target_tm, 
      primer_length, 
      product_size_range 
    }),
  });
}

/**
 * Get AI explanation for analysis results
 */
export async function getAIExplanation(tool, data) {
  return apiCall(API_ENDPOINTS.explain, {
    method: 'POST',
    body: JSON.stringify({ tool, data }),
  });
}

/**
 * Check API health status
 */
export async function checkHealth() {
  return apiCall(API_ENDPOINTS.health, {
    method: 'GET',
  });
}

/**
 * Get API information
 */
export async function getAPIInfo() {
  return apiCall(API_ENDPOINTS.info, {
    method: 'GET',
  });
}

/**
 * Validate DNA sequence format
 */
export function validateSequence(sequence) {
  if (!sequence || typeof sequence !== 'string') {
    return { valid: false, error: 'Sequence must be a non-empty string', cleaned: '' };
  }

  const cleaned = sequence.toUpperCase().replace(/[^ATGC]/g, '');
  
  if (cleaned.length === 0) {
    return { valid: false, error: 'No valid DNA nucleotides (A, T, G, C) found', cleaned: '' };
  }

  if (cleaned.length < 3) {
    return { valid: false, error: 'Sequence too short (minimum 3 nucleotides)', cleaned };
  }

  return { valid: true, error: null, cleaned };
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error) {
  if (typeof error === 'string') return error;
  
  const message = error.message || 'An unexpected error occurred';
  
  // Make common errors more user-friendly
  if (message.includes('fetch')) {
    return 'Unable to connect to server. Please check:\n1. Backend is running\n2. Internet connection\n3. CORS configuration';
  }
  if (message.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  if (message.includes('500')) {
    return 'Server error. Please try again later or contact support.';
  }
  if (message.includes('404')) {
    return 'Service endpoint not found. Please check API configuration.';
  }
  
  return message;
}

// Export everything as default object too
export default {
  findMutations,
  performAlignment,
  findCRISPRSites,
  designPrimers,
  getAIExplanation,
  checkHealth,
  getAPIInfo,
  validateSequence,
  formatErrorMessage,
};