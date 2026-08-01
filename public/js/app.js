/**
 * app.js — Router, toast system, and initialization.
 */

(function () {
  const pages = {
    home: document.getElementById('page-home'),
    auth: document.getElementById('page-auth'),
    dashboard: document.getElementById('page-dashboard'),
    detail: document.getElementById('page-detail'),
  };

  let currentPage = 'home';

  // ── Navigation ───────────────────────────────────────────
  function navigate(page, data = null) {
    // Hide all pages
    Object.values(pages).forEach((p) => p.classList.remove('page--active'));

    // Show target page
    if (pages[page]) {
      pages[page].classList.add('page--active');
      currentPage = page;
    }

    // Scroll to top on page change
    window.scrollTo(0, 0);

    // Trigger page-specific loading
    if (page === 'dashboard') {
      window.Dashboard.loadHabits();
    } else if (page === 'detail' && data) {
      window.HabitDetail.loadDetail(data);
    }
  }

  // ── Toast Notifications ──────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // ── Home Page CTA Buttons ────────────────────────────────
  function initHomePage() {
    const heroCta = document.getElementById('hero-cta');
    const bottomCta = document.getElementById('bottom-cta');
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');

    if (heroCta) heroCta.addEventListener('click', () => navigate('auth'));
    if (bottomCta) bottomCta.addEventListener('click', () => navigate('auth'));
    if (navLogin) navLogin.addEventListener('click', () => navigate('auth'));
    if (navSignup) navSignup.addEventListener('click', () => navigate('auth'));
  }

  // ── FAQ Accordion ────────────────────────────────────────
  function initFAQ() {
    const questions = document.querySelectorAll('.faq-item__question');
    questions.forEach((q) => {
      q.addEventListener('click', () => {
        const item = q.parentElement;
        const isOpen = item.classList.contains('faq-item--open');
        // Close all
        document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('faq-item--open'));
        // Toggle current
        if (!isOpen) {
          item.classList.add('faq-item--open');
        }
      });
    });
  }

  // ── Icons ────────────────────────────────────────────────
  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // ── Session Restoration ──────────────────────────────────
  function init() {
    initHomePage();
    initFAQ();

    const { accessToken } = window.API.getTokens();

    if (accessToken) {
      // Has token — skip home, go to dashboard
      navigate('dashboard');
    } else {
      navigate('home');
    }
    
    // Initial icon render
    refreshIcons();
  }

  // Expose globally
  window.App = { navigate, showToast, refreshIcons };

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
