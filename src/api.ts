/**
 * api.ts — Typed fetch wrapper for backend API calls.
 * Handles JWT access/refresh token lifecycle automatically.
 * Exported as ES module (consumed by main.ts and other modules).
 */

import type {
  ApiResponse,
  ApiErrorResponse,
  StoredUser,
} from './types/api.types';

// ── Constants ─────────────────────────────────────────────────

const API_BASE = '/api' as const;

const STORAGE_KEYS = {
  ACCESS:  'hs_access_token',
  REFRESH: 'hs_refresh_token',
  EMAIL:   'hs_user_email',
  NAME:    'hs_user_name',
  PHOTO:   'hs_user_photo',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ── Types ─────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface StoredTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

// ── Token helpers ─────────────────────────────────────────────

function getTokens(): StoredTokens {
  return {
    accessToken:  localStorage.getItem(STORAGE_KEYS.ACCESS),
    refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH),
  };
}

function setTokens(accessToken: string | null, refreshToken: string | null): void {
  if (accessToken)  { localStorage.setItem(STORAGE_KEYS.ACCESS,  accessToken);  }
  if (refreshToken) { localStorage.setItem(STORAGE_KEYS.REFRESH, refreshToken); }
}

function setUser(user: Partial<StoredUser> | null): void {
  if (!user) { return; }
  if (user.email)    { localStorage.setItem(STORAGE_KEYS.EMAIL, user.email);    }
  if (user.name)     { localStorage.setItem(STORAGE_KEYS.NAME,  user.name);     }
  if (user.photoURL) { localStorage.setItem(STORAGE_KEYS.PHOTO, user.photoURL); }
}

function getUser(): StoredUser {
  return {
    email:    localStorage.getItem(STORAGE_KEYS.EMAIL)   ?? '',
    name:     localStorage.getItem(STORAGE_KEYS.NAME)    ?? '',
    photoURL: localStorage.getItem(STORAGE_KEYS.PHOTO)   ?? '',
  };
}

function clearTokens(): void {
  (Object.values(STORAGE_KEYS) as StorageKey[]).forEach((k) => {
    localStorage.removeItem(k);
  });
}

// ── Token refresh ─────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getTokens();
  if (!refreshToken) { return null; }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) { return null; }

    const data = (await res.json()) as { accessToken: string };
    setTokens(data.accessToken, null);
    return data.accessToken;
  } catch {
    return null;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────

async function apiCall<T = unknown>(
  method: HttpMethod,
  path: string,
  body: Record<string, unknown> | null = null,
): Promise<ApiResponse<T>> {
  const { accessToken } = getTokens();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const options: RequestInit = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  let res = await fetch(`${API_BASE}${path}`, options);

  // 401 handling — try token refresh on TOKEN_EXPIRED
  if (res.status === 401) {
    const errorData = await res.json().catch((): ApiErrorResponse => ({ error: 'Unknown error' })) as ApiErrorResponse;

    if (errorData.code === 'TOKEN_EXPIRED') {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        options.headers = headers;
        res = await fetch(`${API_BASE}${path}`, options);
      } else {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        return {
          ok: false,
          status: 401,
          data: { error: 'Session expired. Please log in again.' } as T,
        };
      }
    } else {
      clearTokens();
      window.dispatchEvent(new Event('auth:logout'));
      return { ok: false, status: 401, data: errorData as T };
    }
  }

  const data = await res.json().catch((): Record<string, never> => ({})) as T;
  return { ok: res.ok, status: res.status, data };
}

// ── Public API ────────────────────────────────────────────────

export interface AppAPI {
  apiCall: typeof apiCall;
  getTokens: typeof getTokens;
  setTokens: typeof setTokens;
  setUser: typeof setUser;
  getUser: typeof getUser;
  clearTokens: typeof clearTokens;
}

export function mountAPI(): AppAPI {
  const api: AppAPI = { apiCall, getTokens, setTokens, setUser, getUser, clearTokens };
  window.API = api;
  return api;
}
