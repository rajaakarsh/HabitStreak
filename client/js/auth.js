/**
 * auth.js — Handles signup, login, logout, and session restoration.
 */

(function () {
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const btnLogout = document.getElementById('btn-logout');
  const btnLogoutDetail = document.getElementById('btn-logout-detail');
  const btnAuthBack = document.getElementById('btn-auth-back');

  // ── Back to Home ─────────────────────────────────────────
  if (btnAuthBack) {
    btnAuthBack.addEventListener('click', () => window.App.navigate('home'));
  }

  // ── Tab Switching ────────────────────────────────────────
  function switchTab(tab) {
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

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabSignup.addEventListener('click', () => switchTab('signup'));

  // ── Login ────────────────────────────────────────────────
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.classList.add('btn--loading');

    const { ok, data } = await window.API.apiCall('POST', '/auth/login', { email, password });

    btn.classList.remove('btn--loading');

    if (ok) {
      window.API.setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem('hs_user_email', data.user.email);
      window.App.showToast('Welcome back!', 'success');
      window.App.navigate('dashboard');
    } else {
      window.App.showToast(data.error || 'Login failed.', 'error');
    }
  });

  // ── Signup ───────────────────────────────────────────────
  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-signup');
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    btn.classList.add('btn--loading');

    const { ok, data } = await window.API.apiCall('POST', '/auth/signup', { email, password });

    btn.classList.remove('btn--loading');

    if (ok) {
      window.API.setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem('hs_user_email', data.user.email);
      window.App.showToast('Account created!', 'success');
      window.App.navigate('dashboard');
    } else {
      window.App.showToast(data.error || 'Signup failed.', 'error');
    }
  });

  // ── Logout ───────────────────────────────────────────────
  function logout() {
    window.API.clearTokens();
    window.App.showToast('Logged out.', 'info');
    window.App.navigate('auth');
    // Clear forms
    formLogin.reset();
    formSignup.reset();
  }

  btnLogout.addEventListener('click', logout);
  btnLogoutDetail.addEventListener('click', logout);

  // Listen for forced logout from API wrapper
  window.addEventListener('auth:logout', () => {
    window.App.navigate('auth');
  });
})();
