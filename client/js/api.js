/**
 * api.js — Fetch wrapper for backend API calls.
 * Handles JWT access/refresh token lifecycle automatically.
 */

const API_BASE = '/api';

/**
 * Get stored tokens from localStorage.
 */
function getTokens() {
  return {
    accessToken: localStorage.getItem('hs_access_token'),
    refreshToken: localStorage.getItem('hs_refresh_token'),
  };
}

/**
 * Store tokens in localStorage.
 */
function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem('hs_access_token', accessToken);
  if (refreshToken) localStorage.setItem('hs_refresh_token', refreshToken);
}

/**
 * Clear all tokens (logout).
 */
function clearTokens() {
  localStorage.removeItem('hs_access_token');
  localStorage.removeItem('hs_refresh_token');
  localStorage.removeItem('hs_user_email');
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token or null on failure.
 */
async function refreshAccessToken() {
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    setTokens(data.accessToken, null);
    return data.accessToken;
  } catch {
    return null;
  }
}

/**
 * Generic API call wrapper with automatic token refresh on 401.
 *
 * @param {string} method — HTTP method
 * @param {string} path — API path (e.g. '/habits')
 * @param {object} [body] — Request body (for POST/PUT)
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
async function apiCall(method, path, body = null) {
  const { accessToken } = getTokens();

  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  let res = await fetch(`${API_BASE}${path}`, options);

  // If 401 with TOKEN_EXPIRED, try refreshing
  if (res.status === 401) {
    const errorData = await res.json().catch(() => ({}));
    if (errorData.code === 'TOKEN_EXPIRED') {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        options.headers = headers;
        res = await fetch(`${API_BASE}${path}`, options);
      } else {
        // Refresh failed — force logout
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        return { ok: false, status: 401, data: { error: 'Session expired. Please log in again.' } };
      }
    } else {
      clearTokens();
      window.dispatchEvent(new Event('auth:logout'));
      return { ok: false, status: 401, data: errorData };
    }
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Make available globally
window.API = { apiCall, getTokens, setTokens, clearTokens };
