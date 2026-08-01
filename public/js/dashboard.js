/**
 * dashboard.js — Fetches habits, renders cards, handles check-ins and CRUD.
 */

(function () {
  const habitGrid = document.getElementById('habit-grid');
  const emptyState = document.getElementById('empty-state');
  const addHabitForm = document.getElementById('add-habit-form');
  const btnAddHabit = document.getElementById('btn-add-habit');
  const btnSaveHabit = document.getElementById('btn-save-habit');
  const btnCancelHabit = document.getElementById('btn-cancel-habit');
  const newHabitName = document.getElementById('new-habit-name');
  const colorPicker = document.getElementById('color-picker');
  const userEmail = document.getElementById('user-email');
  const dashboardDate = document.getElementById('dashboard-date');

  // Edit modal
  const modalEdit = document.getElementById('modal-edit');
  const editHabitId = document.getElementById('edit-habit-id');
  const editHabitName = document.getElementById('edit-habit-name');
  const editColorPicker = document.getElementById('edit-color-picker');
  const btnSaveEdit = document.getElementById('btn-save-edit');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  let selectedColor = '#10b981';
  let editSelectedColor = '#10b981';
  let openDropdown = null;

  // ── Format today's date ──────────────────────────────────
  function formatDate() {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // ── Color picker logic ───────────────────────────────────
  function initColorPicker(container, onSelect) {
    container.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      container.querySelectorAll('.color-dot').forEach((d) => d.classList.remove('color-dot--active'));
      dot.classList.add('color-dot--active');
      onSelect(dot.dataset.color);
    });
  }

  initColorPicker(colorPicker, (c) => (selectedColor = c));
  initColorPicker(editColorPicker, (c) => (editSelectedColor = c));

  // ── Add Habit ────────────────────────────────────────────
  btnAddHabit.addEventListener('click', () => {
    addHabitForm.style.display = addHabitForm.style.display === 'none' ? 'block' : 'none';
    if (addHabitForm.style.display === 'block') {
      newHabitName.focus();
    }
  });

  btnCancelHabit.addEventListener('click', () => {
    addHabitForm.style.display = 'none';
    newHabitName.value = '';
  });

  btnSaveHabit.addEventListener('click', async () => {
    const name = newHabitName.value.trim();
    if (!name) {
      window.App.showToast('Enter a habit name.', 'error');
      return;
    }

    const { ok, data } = await window.API.apiCall('POST', '/habits', {
      name,
      color: selectedColor,
    });

    if (ok) {
      window.App.showToast('Habit created!', 'success');
      addHabitForm.style.display = 'none';
      newHabitName.value = '';
      loadHabits();
    } else {
      window.App.showToast(data.error || 'Failed to create habit.', 'error');
    }
  });

  // Allow Enter key to save
  newHabitName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnSaveHabit.click();
  });

  // ── Close dropdowns on outside click ─────────────────────
  document.addEventListener('click', (e) => {
    if (openDropdown && !e.target.closest('.habit-card__menu')) {
      openDropdown.classList.remove('habit-card__dropdown--open');
      openDropdown = null;
    }
  });

  // ── Render Habit Cards ───────────────────────────────────
  function renderHabits(habits) {
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
      card.dataset.habitId = habit._id;

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
                  data-checked="${habit.checkedInToday}"
                  title="${habit.checkedInToday ? 'Undo check-in' : 'Check in today'}">
            ${habit.checkedInToday ? '<i data-lucide="check"></i>' : ''}
          </button>
        </div>
      `;

      // ── Check-in button ──────────────────────────────────
      const checkinBtn = card.querySelector('.checkin-btn');
      checkinBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isChecked = checkinBtn.dataset.checked === 'true';

        if (isChecked) {
          // Undo
          const { ok } = await window.API.apiCall('DELETE', `/habits/${habit._id}/checkin`);
          if (ok) {
            loadHabits();
          }
        } else {
          // Check in
          const { ok } = await window.API.apiCall('POST', `/habits/${habit._id}/checkin`);
          if (ok) {
            checkinBtn.classList.add('checkin-btn--pulse');
            setTimeout(() => checkinBtn.classList.remove('checkin-btn--pulse'), 500);
            loadHabits();
          }
        }
      });

      // ── Menu button ──────────────────────────────────────
      const menuBtn = card.querySelector('.habit-card__menu-btn');
      const dropdown = card.querySelector('.habit-card__dropdown');

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openDropdown && openDropdown !== dropdown) {
          openDropdown.classList.remove('habit-card__dropdown--open');
        }
        dropdown.classList.toggle('habit-card__dropdown--open');
        openDropdown = dropdown.classList.contains('habit-card__dropdown--open') ? dropdown : null;
      });

      // ── Dropdown actions ─────────────────────────────────
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('[data-action]')?.dataset.action;
        dropdown.classList.remove('habit-card__dropdown--open');
        openDropdown = null;

        if (action === 'edit') openEditModal(habit);
        if (action === 'view') window.App.navigate('detail', habit._id);
        if (action === 'delete') deleteHabit(habit._id, habit.name);
      });

      // ── Card click → detail view ────────────────────────
      card.addEventListener('click', (e) => {
        if (e.target.closest('.checkin-btn') || e.target.closest('.habit-card__menu')) return;
        window.App.navigate('detail', habit._id);
      });

      habitGrid.appendChild(card);
    });

    if (window.App.refreshIcons) window.App.refreshIcons();
  }

  // ── Load Habits ──────────────────────────────────────────
  async function loadHabits() {
    const email = localStorage.getItem('hs_user_email');
    if (email) userEmail.textContent = email;
    dashboardDate.textContent = formatDate();

    const { ok, data } = await window.API.apiCall('GET', '/habits');

    if (ok) {
      renderHabits(data);
    } else {
      window.App.showToast('Failed to load habits.', 'error');
    }
  }

  // ── Delete Habit ─────────────────────────────────────────
  async function deleteHabit(id, name) {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    const { ok } = await window.API.apiCall('DELETE', `/habits/${id}`);
    if (ok) {
      window.App.showToast('Habit deleted.', 'info');
      loadHabits();
    } else {
      window.App.showToast('Failed to delete habit.', 'error');
    }
  }

  // ── Edit Modal ───────────────────────────────────────────
  function openEditModal(habit) {
    editHabitId.value = habit._id;
    editHabitName.value = habit.name;
    editSelectedColor = habit.color;

    // Highlight the active color
    editColorPicker.querySelectorAll('.color-dot').forEach((dot) => {
      dot.classList.toggle('color-dot--active', dot.dataset.color === habit.color);
    });

    modalEdit.style.display = 'flex';
    editHabitName.focus();
  }

  btnCancelEdit.addEventListener('click', () => {
    modalEdit.style.display = 'none';
  });

  modalEdit.addEventListener('click', (e) => {
    if (e.target === modalEdit) modalEdit.style.display = 'none';
  });

  btnSaveEdit.addEventListener('click', async () => {
    const id = editHabitId.value;
    const name = editHabitName.value.trim();

    if (!name) {
      window.App.showToast('Habit name is required.', 'error');
      return;
    }

    const { ok } = await window.API.apiCall('PUT', `/habits/${id}`, {
      name,
      color: editSelectedColor,
    });

    if (ok) {
      modalEdit.style.display = 'none';
      window.App.showToast('Habit updated.', 'success');
      loadHabits();
    } else {
      window.App.showToast('Failed to update habit.', 'error');
    }
  });

  // ── Escape HTML ──────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Expose loadHabits globally
  window.Dashboard = { loadHabits };
})();
