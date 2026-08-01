/**
 * main.ts — Vite entry point.
 * Mounts all modules in dependency order (replaces the 5 <script> tags).
 * api → auth → dashboard → habitDetail → app (app last, it calls DOMContentLoaded)
 */

import { mountAPI } from './api';
import { mountAuth } from './auth';
import { mountDashboard } from './dashboard';
import { mountHabitDetail } from './habitDetail';
import { mountApp } from './app';

// Mount API first — all other modules depend on window.API
mountAPI();

// Mount page modules (they register their window.* globals)
mountDashboard();
mountHabitDetail();

// Mount auth (depends on window.App.navigate being available after mountApp)
// We mount auth before app so window.Auth is ready when app.ts's DOMContentLoaded fires
mountAuth();

// Mount app last — it calls document.addEventListener('DOMContentLoaded', init)
// which triggers navigation and refreshes icons
mountApp();
