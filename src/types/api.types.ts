/**
 * api.types.ts
 * Shared API request/response type contracts used across client and server.
 */

// ── User / Auth ───────────────────────────────────────────────

export type AuthProvider = 'local' | 'google';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  photoURL: string;
  provider: AuthProvider;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessResponse extends TokenPair {
  message: string;
  user: UserProfile;
}

export interface RefreshResponse {
  accessToken: string;
}

// ── Request Bodies ────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface CreateHabitRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateHabitRequest {
  name?: string;
  color?: string;
  icon?: string;
}

// ── API Response Wrapper ──────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
  code?: string;
}

// ── Toast ─────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// ── Storage Keys ──────────────────────────────────────────────

export interface StoredUser {
  email: string;
  name: string;
  photoURL: string;
}
