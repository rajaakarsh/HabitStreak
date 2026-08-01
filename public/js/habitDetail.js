/**
 * habitDetail.js — Renders the detail view with contribution grid and stats.
 */

(function () {
  const detailIcon = document.getElementById('detail-icon');
  const detailName = document.getElementById('detail-name');
  const detailCurrentStreak = document.getElementById('detail-current-streak');
  const detailLongestStreak = document.getElementById('detail-longest-streak');
  const detailTotalCheckins = document.getElementById('detail-total-checkins');
  const contributionGrid = document.getElementById('contribution-grid');
  const contributionMonths = document.getElementById('contribution-months');
  const btnBack = document.getElementById('btn-back');

  btnBack.addEventListener('click', () => {
    window.App.navigate('dashboard');
  });

  /**
   * Load and render the detail view for a specific habit.
   */
  async function loadDetail(habitId) {
    const { ok, data } = await window.API.apiCall('GET', `/habits/${habitId}`);

    if (!ok) {
      window.App.showToast('Failed to load habit details.', 'error');
      window.App.navigate('dashboard');
      return;
    }

    // Set the accent color for this habit's stats
    const statCards = document.querySelectorAll('.stat-card__number');
    statCards.forEach((el) => {
      el.style.background = `linear-gradient(135deg, ${data.color}, ${lightenColor(data.color, 40)})`;
      el.style.webkitBackgroundClip = 'text';
      el.style.webkitTextFillColor = 'transparent';
      el.style.backgroundClip = 'text';
    });

    // Update legend colors
    document.querySelectorAll('.contribution-legend__box').forEach((el) => {
      el.style.background = data.color;
    });

    detailIcon.innerHTML = '<i data-lucide="target"></i>';
    detailName.textContent = data.name;
    detailCurrentStreak.textContent = data.currentStreak;
    detailLongestStreak.textContent = data.longestStreak;
    detailTotalCheckins.textContent = data.checkInDates ? data.checkInDates.length : 0;

    renderContributionGrid(data.checkInDates || [], data.color);

    if (window.App.refreshIcons) window.App.refreshIcons();
  }

  /**
   * Render a GitHub-style contribution grid for the past 52 weeks + current partial week.
   */
  function renderContributionGrid(dates, color) {
    contributionGrid.innerHTML = '';
    contributionMonths.innerHTML = '';

    const dateSet = new Set(dates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start: go back to the Sunday ~52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Go to this week's Sunday
    startDate.setDate(startDate.getDate() - (52 * 7)); // Go back 52 weeks

    // Build cells: 53 columns × 7 rows (Sun–Sat)
    const totalDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const cells = [];
    const monthLabels = [];
    let lastMonth = -1;

    for (let i = 0; i < 53 * 7; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);

      // Don't render future dates
      if (cellDate > today) {
        const cell = document.createElement('div');
        cell.className = 'contribution-cell';
        cell.style.opacity = '0';
        cell.style.pointerEvents = 'none';
        contributionGrid.appendChild(cell);
        continue;
      }

      const dateStr =
        cellDate.getFullYear() +
        '-' +
        String(cellDate.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(cellDate.getDate()).padStart(2, '0');

      const cell = document.createElement('div');
      cell.className = 'contribution-cell';

      if (dateSet.has(dateStr)) {
        cell.classList.add('contribution-cell--filled');
        cell.style.background = color;
      } else {
        cell.style.background = color;
        cell.style.opacity = '0.08';
      }

      cell.title = `${dateStr}${dateSet.has(dateStr) ? ' ✓' : ''}`;

      contributionGrid.appendChild(cell);

      // Track month labels (first day of each month in the grid row 0)
      const col = Math.floor(i / 7);
      const row = i % 7;
      if (row === 0) {
        const month = cellDate.getMonth();
        if (month !== lastMonth) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthLabels.push({ col, label: monthNames[month] });
          lastMonth = month;
        }
      }
    }

    // Render month labels
    for (let i = 0; i < 53; i++) {
      const span = document.createElement('span');
      const match = monthLabels.find((m) => m.col === i);
      span.textContent = match ? match.label : '';
      contributionMonths.appendChild(span);
    }
  }

  /**
   * Lighten a hex color by a percentage.
   */
  function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  // Expose
  window.HabitDetail = { loadDetail };
})();
