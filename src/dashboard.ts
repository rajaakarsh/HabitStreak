/**
 * dashboard.ts — Fetches habits, renders cards, handles check-ins, CRUD,
 *               and displays user profile (avatar + welcome greeting).
 */

import type { HabitWithStats } from './types/models.types';
import type { ApiErrorResponse, CreateHabitRequest, UpdateHabitRequest } from './types/api.types';

// ── Types ─────────────────────────────────────────────────────

export interface DashboardAPI {
  loadHabits: () => Promise<void>;
}

type HexColor = string;

// ── Helpers ───────────────────────────────────────────────────

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) { throw new Error(`Element #${id} not found`); }
  return el as T;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

// ── Mount dashboard ───────────────────────────────────────────

export function mountDashboard(): DashboardAPI {
  // DOM refs
  const habitGrid      = getEl<HTMLDivElement>('habit-grid');
  const emptyState     = getEl<HTMLDivElement>('empty-state');
  const addHabitForm   = getEl<HTMLDivElement>('add-habit-form');
  const btnAddHabit    = getEl<HTMLButtonElement>('btn-add-habit');
  const btnSaveHabit   = getEl<HTMLButtonElement>('btn-save-habit');
  const btnCancelHabit = getEl<HTMLButtonElement>('btn-cancel-habit');
  const newHabitName   = getEl<HTMLInputElement>('new-habit-name');
  const colorPicker    = getEl<HTMLDivElement>('color-picker');
  const dashboardDate  = getEl<HTMLParagraphElement>('dashboard-date');

  // User profile elements (may be absent on detail page)
  const userAvatarImg      = document.getElementById('user-avatar-img') as HTMLImageElement | null;
  const userAvatarFallback = document.getElementById('user-avatar-fallback');
  const userDisplayName    = document.getElementById('user-display-name');
  const welcomeName        = document.getElementById('welcome-name');

  // Edit modal
  const modalEdit       = getEl<HTMLDivElement>('modal-edit');
  const editHabitId     = getEl<HTMLInputElement>('edit-habit-id');
  const editHabitName   = getEl<HTMLInputElement>('edit-habit-name');
  const editColorPicker = getEl<HTMLDivElement>('edit-color-picker');
  const btnSaveEdit     = getEl<HTMLButtonElement>('btn-save-edit');
  const btnCancelEdit   = getEl<HTMLButtonElement>('btn-cancel-edit');

  let selectedColor:     HexColor = '#10b981';
  let editSelectedColor: HexColor = '#10b981';
  let openDropdown: HTMLElement | null = null;

  // ── Color picker ───────────────────────────────────────────
  function initColorPicker(container: HTMLElement, onSelect: (color: HexColor) => void): void {
    container.addEventListener('click', (e: MouseEvent) => {
      const dot = (e.target as HTMLElement).closest<HTMLButtonElement>('.color-dot');
      if (!dot) { return; }
      container.querySelectorAll('.color-dot').forEach((d) => { d.classList.remove('color-dot--active'); });
      dot.classList.add('color-dot--active');
      onSelect(dot.dataset['color'] ?? '#10b981');
    });
  }

  initColorPicker(colorPicker,     (c) => { selectedColor     = c; });
  initColorPicker(editColorPicker, (c) => { editSelectedColor = c; });

  // ── Render user profile ────────────────────────────────────
  function renderUserProfile(): void {
    const { name, email, photoURL } = window.API.getUser();
    const displayName = name || (email ? email.split('@')[0] : 'there');
    const initial     = displayName.charAt(0).toUpperCase();

    if (userAvatarImg) {
      if (photoURL) {
        userAvatarImg.src    = photoURL;
        userAvatarImg.style.display          = 'block';
        if (userAvatarFallback) { userAvatarFallback.style.display = 'none'; }
      } else {
        userAvatarImg.style.display          = 'none';
        if (userAvatarFallback) {
          userAvatarFallback.textContent     = initial;
          userAvatarFallback.style.display   = 'flex';
        }
      }
    }

    if (userDisplayName) { userDisplayName.textContent = displayName; }
    if (welcomeName)     { welcomeName.textContent     = displayName; }
  }

  // ── Render habit cards ─────────────────────────────────────
  function renderHabits(habits: HabitWithStats[]): void {
    habitGrid.innerHTML = '';

    if (habits.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    habits.forEach((habit) => {
      const card = document.createElement('div');
      card.className = 'habit-card';
      card.style.setProperty('--habit-color', habit.color);
      card.dataset['habitId'] = habit._id;

      card.innerHTML = `
        <div class="habit-card__top">
          <div class="habit-card__info">
            <div class="habit-card__icon"><i data-lucide="target"></i></div>
            <span class="habit-card__name">${escapeHtml(habit.name)}</span>
          </div>
          <div class="habit-card__menu">
            <button class="habit-card__menu-btn" title="Options"><i data-lucide="more-horizontal"></i></button>
            <div class="habit-card__dropdown">
              <button class="habit-card__dropdown-item" data-action="edit"><i data-lucide="pencil" class="icon-inline"></i> Edit</button>
              <button class="habit-card__dropdown-item" data-action="view"><i data-lucide="bar-chart-2" class="icon-inline"></i> Details</button>
              <button class="habit-card__dropdown-item btn--danger" data-action="delete"><i data-lucide="trash-2" class="icon-inline"></i> Delete</button>
            </div>
          </div>
        </div>
        <div class="habit-card__bottom">
          <div class="habit-card__streak">
            <span class="habit-card__streak-number">${habit.currentStreak}</span>
            <span class="habit-card__streak-label">day streak</span>
            <span class="habit-card__longest">best: <span>${habit.longestStreak}</span></span>
          </div>
          <button class="checkin-btn ${habit.checkedInToday ? 'checkin-btn--done' : ''}"
                  data-habit-id="${habit._id}"
                  data-checked="${String(habit.checkedInToday)}"
                  title="${habit.checkedInToday ? 'Undo check-in' : 'Check in today'}">
            ${habit.checkedInToday ? '<i data-lucide="check"></i>' : ''}
          </button>
        </div>
      `;

      // Check-in button
      const checkinBtn = card.querySelector<HTMLButtonElement>('.checkin-btn');
      if (checkinBtn) {
        checkinBtn.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          void (async () => {
            const isChecked = checkinBtn.dataset['checked'] === 'true';
            if (isChecked) {
              const { ok } = await window.API.apiCall('DELETE', `/habits/${habit._id}/checkin`);
              if (ok) { await loadHabits(); }
            } else {
              const { ok } = await window.API.apiCall('POST', `/habits/${habit._id}/checkin`);
              if (ok) {
                checkinBtn.classList.add('checkin-btn--pulse');
                setTimeout(() => { checkinBtn.classList.remove('checkin-btn--pulse'); }, 500);
                await loadHabits();
              }
            }
          })();
        });
      }

      // Menu button
      const menuBtn  = card.querySelector<HTMLButtonElement>('.habit-card__menu-btn');
      const dropdown = card.querySelector<HTMLDivElement>('.habit-card__dropdown');

      if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          if (openDropdown && openDropdown !== dropdown) {
            openDropdown.classList.remove('habit-card__dropdown--open');
          }
          dropdown.classList.toggle('habit-card__dropdown--open');
          openDropdown = dropdown.classList.contains('habit-card__dropdown--open') ? dropdown : null;
        });

        // Dropdown actions
        dropdown.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
          const action = target?.dataset['action'];
          dropdown.classList.remove('habit-card__dropdown--open');
          openDropdown = null;

          if (action === 'edit')   { openEditModal(habit); }
          if (action === 'view')   { window.App.navigate('detail', habit._id); }
          if (action === 'delete') { void deleteHabit(habit._id, habit.name); }
        });
      }

      // Card click → detail
      card.addEventListener('click', (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        if (t.closest('.checkin-btn') || t.closest('.habit-card__menu')) { return; }
        window.App.navigate('detail', habit._id);
      });

      habitGrid.appendChild(card);
    });

    window.App.refreshIcons();
  }

  // ── Load habits ────────────────────────────────────────────
  async function loadHabits(): Promise<void> {
    renderUserProfile();
    dashboardDate.textContent = formatDate();

    const { ok, data } = await window.API.apiCall<HabitWithStats[]>('GET', '/habits');
    if (ok) {
      renderHabits(data);
    } else {
      window.App.showToast((data as unknown as ApiErrorResponse).error ?? 'Failed to load habits.', 'error');
    }
  }

  // ── Add habit ──────────────────────────────────────────────
  btnAddHabit.addEventListener('click', () => {
    addHabitForm.style.display = addHabitForm.style.display === 'none' ? 'block' : 'none';
    if (addHabitForm.style.display === 'block') { newHabitName.focus(); }
  });

  btnCancelHabit.addEventListener('click', () => {
    addHabitForm.style.display = 'none';
    newHabitName.value = '';
  });

  btnSaveHabit.addEventListener('click', () => {
    void (async () => {
      const name = newHabitName.value.trim();
      if (!name) {
        window.App.showToast('Enter a habit name.', 'error');
        return;
      }
      const body: CreateHabitRequest = { name, color: selectedColor };
      const { ok, data } = await window.API.apiCall<HabitWithStats>('POST', '/habits', body as unknown as Record<string, unknown>);
      if (ok) {
        window.App.showToast('Habit created!', 'success');
        addHabitForm.style.display = 'none';
        newHabitName.value = '';
        await loadHabits();
      } else {
        window.App.showToast((data as unknown as ApiErrorResponse).error ?? 'Failed to create habit.', 'error');
      }
    })();
  });

  newHabitName.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { btnSaveHabit.click(); }
  });

  // ── Delete habit ───────────────────────────────────────────
  async function deleteHabit(id: string, name: string): Promise<void> {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) { return; }
    const { ok } = await window.API.apiCall('DELETE', `/habits/${id}`);
    if (ok) {
      window.App.showToast('Habit deleted.', 'info');
      await loadHabits();
    } else {
      window.App.showToast('Failed to delete habit.', 'error');
    }
  }

  // ── Edit modal ─────────────────────────────────────────────
  function openEditModal(habit: HabitWithStats): void {
    editHabitId.value     = habit._id;
    editHabitName.value   = habit.name;
    editSelectedColor     = habit.color;
    editColorPicker.querySelectorAll<HTMLButtonElement>('.color-dot').forEach((dot) => {
      dot.classList.toggle('color-dot--active', dot.dataset['color'] === habit.color);
    });
    modalEdit.style.display = 'flex';
    editHabitName.focus();
  }

  btnCancelEdit.addEventListener('click', () => { modalEdit.style.display = 'none'; });
  modalEdit.addEventListener('click', (e: MouseEvent) => {
    if (e.target === modalEdit) { modalEdit.style.display = 'none'; }
  });

  btnSaveEdit.addEventListener('click', () => {
    void (async () => {
      const id   = editHabitId.value;
      const name = editHabitName.value.trim();
      if (!name) {
        window.App.showToast('Habit name is required.', 'error');
        return;
      }
      const body: UpdateHabitRequest = { name, color: editSelectedColor };
      const { ok } = await window.API.apiCall('PUT', `/habits/${id}`, body as unknown as Record<string, unknown>);
      if (ok) {
        modalEdit.style.display = 'none';
        window.App.showToast('Habit updated.', 'success');
        await loadHabits();
      } else {
        window.App.showToast('Failed to update habit.', 'error');
      }
    })();
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e: MouseEvent) => {
    if (openDropdown && !(e.target as HTMLElement).closest('.habit-card__menu')) {
      openDropdown.classList.remove('habit-card__dropdown--open');
      openDropdown = null;
    }
  });

  const api: DashboardAPI = { loadHabits };
  window.Dashboard = api;
  return api;
}
