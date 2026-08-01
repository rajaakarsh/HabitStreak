/**
 * app.ts — SPA router, toast system, route protection, avatar dropdown,
 *          and app initialization.
 */

import type { ToastType } from './types/api.types';
import type { PageName } from './types/models.types';

// ── Types ─────────────────────────────────────────────────────

export interface AppRouter {
  navigate: (page: PageName, data?: string | null) => void;
  showToast: (message: string, type?: ToastType) => void;
  refreshIcons: () => void;
}

type PageMap = Record<PageName, HTMLElement>;

// ── Constants ─────────────────────────────────────────────────

const PROTECTED_PAGES = new Set<PageName>(['dashboard', 'detail']);

// ── Mount app ─────────────────────────────────────────────────

export function mountApp(): AppRouter {
  const pages: PageMap = {
    home:      document.getElementById('page-home')      as HTMLElement,
    auth:      document.getElementById('page-auth')      as HTMLElement,
    dashboard: document.getElementById('page-dashboard') as HTMLElement,
    detail:    document.getElementById('page-detail')    as HTMLElement,
  };

  const authLoadingOverlay = document.getElementById('auth-loading');

  // ── Auth loading overlay ───────────────────────────────────
  function showAuthLoading(): void {
    authLoadingOverlay?.classList.add('auth-loading--visible');
  }

  function hideAuthLoading(): void {
    authLoadingOverlay?.classList.remove('auth-loading--visible');
  }

  // ── Navigation ─────────────────────────────────────────────
  function navigate(page: PageName, data: string | null = null): void {
    const { accessToken } = window.API.getTokens();

    // Route guard
    if (PROTECTED_PAGES.has(page) && !accessToken) {
      navigate('auth');
      return;
    }

    // Hide all pages
    Object.values(pages).forEach((p) => {
      p.classList.remove('page--active');
    });

    // Show target page
    if (pages[page]) {
      pages[page].classList.add('page--active');
    }

    window.scrollTo(0, 0);

    // Page-specific initialization
    if (page === 'dashboard') {
      void window.Dashboard.loadHabits();
    } else if (page === 'detail' && data) {
      void window.HabitDetail.loadDetail(data);
    }
  }

  // ── Toast ───────────────────────────────────────────────────
  function showToast(message: string, type: ToastType = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) { return; }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast--fade-out');
      setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
  }

  // ── Home page CTAs ──────────────────────────────────────────
  function initHomePage(): void {
    const ids = ['hero-cta', 'bottom-cta', 'nav-login', 'nav-signup'] as const;
    ids.forEach((id) => {
      document.getElementById(id)?.addEventListener('click', () => { navigate('auth'); });
    });
  }

  // ── FAQ accordion ───────────────────────────────────────────
  function initFAQ(): void {
    document.querySelectorAll<HTMLButtonElement>('.faq-item__question').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item   = btn.parentElement;
        if (!item) { return; }
        const isOpen = item.classList.contains('faq-item--open');
        document.querySelectorAll('.faq-item').forEach((i) => { i.classList.remove('faq-item--open'); });
        if (!isOpen) { item.classList.add('faq-item--open'); }
      });
    });
  }

  // ── Avatar dropdown ─────────────────────────────────────────
  function initAvatarDropdown(): void {
    const avatarBtn          = document.getElementById('avatar-btn');
    const dropdown           = document.getElementById('avatar-dropdown');
    const btnDropdownLogout  = document.getElementById('btn-dropdown-logout');

    if (!avatarBtn || !dropdown) { return; }

    avatarBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      dropdown.classList.toggle('avatar-dropdown--open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('avatar-dropdown--open');
    });

    btnDropdownLogout?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      dropdown.classList.remove('avatar-dropdown--open');
      window.Auth?.logout();
    });
  }

  // ── Lucide icons ────────────────────────────────────────────
  function refreshIcons(): void {
    window.lucide?.createIcons();
  }

  // ── Initialization ──────────────────────────────────────────
  function init(): void {
    showAuthLoading();
    initHomePage();
    initFAQ();
    initAvatarDropdown();

    const { accessToken } = window.API.getTokens();

    // Brief delay prevents flash of wrong content on fast connections
    setTimeout(() => {
      hideAuthLoading();
      navigate(accessToken ? 'dashboard' : 'home');
      refreshIcons();
    }, 400);
  }

  const router: AppRouter = { navigate, showToast, refreshIcons };
  window.App = router;

  document.addEventListener('DOMContentLoaded', init);

  return router;
}
