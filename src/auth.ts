/**
 * auth.ts — Handles email/password signup & login, Google OAuth, logout,
 *           and session restoration. Works with GIS (Google Identity Services).
 */

import type { AuthSuccessResponse, ApiErrorResponse } from './types/api.types';
import type { GisCredentialResponse } from './types/globals.d';

// ── Types ─────────────────────────────────────────────────────

export interface AuthAPI {
  logout: () => void;
}

type TabName = 'login' | 'signup';

// ── DOM helpers ───────────────────────────────────────────────

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) { throw new Error(`Element #${id} not found`); }
  return el as T;
}

// ── Mount auth module ─────────────────────────────────────────

export function mountAuth(): AuthAPI {
  const formLogin       = getEl<HTMLFormElement>('form-login');
  const formSignup      = getEl<HTMLFormElement>('form-signup');
  const tabLogin        = getEl<HTMLButtonElement>('tab-login');
  const tabSignup       = getEl<HTMLButtonElement>('tab-signup');
  const btnAuthBack     = document.getElementById('btn-auth-back') as HTMLButtonElement | null;
  const btnGoogle       = document.getElementById('btn-google') as HTMLButtonElement | null;
  const btnLogout       = document.getElementById('btn-logout') as HTMLButtonElement | null;
  const btnLogoutDetail = document.getElementById('btn-logout-detail') as HTMLButtonElement | null;

  // ── Back to Home ────────────────────────────────────────────
  btnAuthBack?.addEventListener('click', () => { window.App.navigate('home'); });

  // ── Tab Switching ───────────────────────────────────────────
  function switchTab(tab: TabName): void {
    if (tab === 'login') {
      tabLogin.classList.add('auth-tab--active');
      tabSignup.classList.remove('auth-tab--active');
      formLogin.classList.remove('auth-form--hidden');
      formSignup.classList.add('auth-form--hidden');
    } else {
      tabSignup.classList.add('auth-tab--active');
      tabLogin.classList.remove('auth-tab--active');
      formSignup.classList.remove('auth-form--hidden');
      formLogin.classList.add('auth-form--hidden');
    }
  }

  tabLogin.addEventListener('click',  () => { switchTab('login');  });
  tabSignup.addEventListener('click', () => { switchTab('signup'); });

  // ── Handle successful auth response ────────────────────────
  function handleAuthSuccess(data: AuthSuccessResponse, message: string): void {
    window.API.setTokens(data.accessToken, data.refreshToken);
    window.API.setUser(data.user);
    window.App.showToast(message, 'success');
    window.App.navigate('dashboard');
  }

  // ── Login (email / password) ────────────────────────────────
  formLogin.addEventListener('submit', (e: SubmitEvent) => {
    e.preventDefault();
    void (async () => {
      const btn      = getEl<HTMLButtonElement>('btn-login');
      const email    = getEl<HTMLInputElement>('login-email').value.trim();
      const password = getEl<HTMLInputElement>('login-password').value;

      btn.classList.add('btn--loading');
      btn.disabled = true;

      const { ok, data } = await window.API.apiCall<AuthSuccessResponse>('POST', '/auth/login', { email, password });

      btn.classList.remove('btn--loading');
      btn.disabled = false;

      if (ok) {
        handleAuthSuccess(data, 'Welcome back!');
      } else {
        window.App.showToast((data as unknown as ApiErrorResponse).error ?? 'Login failed.', 'error');
      }
    })();
  });

  // ── Signup (email / password) ───────────────────────────────
  formSignup.addEventListener('submit', (e: SubmitEvent) => {
    e.preventDefault();
    void (async () => {
      const btn      = getEl<HTMLButtonElement>('btn-signup');
      const email    = getEl<HTMLInputElement>('signup-email').value.trim();
      const password = getEl<HTMLInputElement>('signup-password').value;

      btn.classList.add('btn--loading');
      btn.disabled = true;

      const { ok, data } = await window.API.apiCall<AuthSuccessResponse>('POST', '/auth/signup', { email, password });

      btn.classList.remove('btn--loading');
      btn.disabled = false;

      if (ok) {
        handleAuthSuccess(data, 'Account created! Welcome 🎉');
      } else {
        window.App.showToast((data as unknown as ApiErrorResponse).error ?? 'Signup failed.', 'error');
      }
    })();
  });

  // ── Google Sign-In ──────────────────────────────────────────

  function setGoogleBtnLoading(loading: boolean): void {
    if (!btnGoogle) { return; }
    if (loading) {
      btnGoogle.classList.add('btn--loading');
      btnGoogle.disabled = true;
    } else {
      btnGoogle.classList.remove('btn--loading');
      btnGoogle.disabled = false;
    }
  }

  async function handleGoogleCredential(response: GisCredentialResponse): Promise<void> {
    if (!btnGoogle) { return; }
    setGoogleBtnLoading(true);

    const { ok, data } = await window.API.apiCall<AuthSuccessResponse>('POST', '/auth/google', {
      idToken: response.credential,
    });

    setGoogleBtnLoading(false);

    if (ok) {
      const isNew = data.message.includes('Authenticated');
      handleAuthSuccess(data, isNew ? 'Welcome to HabitStreak! 🎉' : 'Welcome back!');
    } else {
      window.App.showToast((data as unknown as ApiErrorResponse).error ?? 'Google sign-in failed. Try again.', 'error');
    }
  }

  function triggerGoogleSignIn(): void {
    if (!window.google?.accounts) {
      window.App.showToast('Google Sign-In is loading. Please try again.', 'error');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const container = document.getElementById('g-signin-container');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'filled_black',
            size: 'large',
            width: 336,
          });
        }
      }
    });
  }

  function initGoogleAuth(): void {
    const clientId = window.__GOOGLE_CLIENT_ID__;
    const divider  = document.getElementById('auth-divider');

    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      if (btnGoogle) { btnGoogle.style.display = 'none'; }
      if (divider)   { divider.style.display   = 'none'; }
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GisCredentialResponse) => { void handleGoogleCredential(response); },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    btnGoogle?.addEventListener('click', triggerGoogleSignIn);
  }

  // Poll for GIS readiness (max 5 s)
  let gisAttempts = 0;
  const gisPoller = window.setInterval(() => {
    gisAttempts++;
    if (window.google?.accounts) {
      clearInterval(gisPoller);
      initGoogleAuth();
    } else if (gisAttempts > 50) {
      clearInterval(gisPoller);
      if (btnGoogle) { btnGoogle.style.display = 'none'; }
      const divider = document.getElementById('auth-divider');
      if (divider)   { divider.style.display   = 'none'; }
    }
  }, 100);

  // ── Logout ──────────────────────────────────────────────────
  function logout(): void {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    window.API.clearTokens();
    window.App.showToast('Logged out.', 'info');
    window.App.navigate('home');
    formLogin.reset();
    formSignup.reset();
  }

  btnLogout?.addEventListener('click',       logout);
  btnLogoutDetail?.addEventListener('click', logout);

  // Force-logout from API wrapper (expired refresh token)
  window.addEventListener('auth:logout', () => {
    window.App.showToast('Session expired. Please log in again.', 'error');
    window.App.navigate('auth');
  });

  // Expose logout for the avatar dropdown in app.ts
  const api: AuthAPI = { logout };
  window.Auth = api;
  return api;
}
