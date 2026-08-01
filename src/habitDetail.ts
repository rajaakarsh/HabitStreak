/**
 * habitDetail.ts — Renders the detail view with contribution grid and stats.
 */

import type { HabitDetail } from './types/models.types';
import type { ApiErrorResponse } from './types/api.types';

// ── Types ─────────────────────────────────────────────────────

export interface HabitDetailAPI {
  loadDetail: (habitId: string) => Promise<void>;
}

interface MonthLabel {
  col: number;
  label: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// ── Helpers ───────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** Lighten a hex colour by a percentage (0–100). */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R   = Math.min(255, (num >> 16) + amt);
  const G   = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B   = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

// ── Mount habitDetail ─────────────────────────────────────────

export function mountHabitDetail(): HabitDetailAPI {
  const detailIcon           = document.getElementById('detail-icon')            as HTMLDivElement;
  const detailName           = document.getElementById('detail-name')            as HTMLHeadingElement;
  const detailCurrentStreak  = document.getElementById('detail-current-streak')  as HTMLSpanElement;
  const detailLongestStreak  = document.getElementById('detail-longest-streak')  as HTMLSpanElement;
  const detailTotalCheckins  = document.getElementById('detail-total-checkins')  as HTMLSpanElement;
  const contributionGrid     = document.getElementById('contribution-grid')      as HTMLDivElement;
  const contributionMonths   = document.getElementById('contribution-months')    as HTMLDivElement;
  const btnBack              = document.getElementById('btn-back')               as HTMLButtonElement;

  btnBack.addEventListener('click', () => { window.App.navigate('dashboard'); });

  // ── Render contribution grid ───────────────────────────────
  function renderContributionGrid(dates: string[], color: string): void {
    contributionGrid.innerHTML   = '';
    contributionMonths.innerHTML = '';

    const dateSet   = new Set<string>(dates);
    const today     = new Date();
    today.setHours(0, 0, 0, 0);

    // Start: Sunday ~52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setDate(startDate.getDate() - 52 * 7);

    const monthLabels: MonthLabel[] = [];
    let lastMonth = -1;

    for (let i = 0; i < 53 * 7; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);

      const cell = document.createElement('div');
      cell.className = 'contribution-cell';

      if (cellDate > today) {
        cell.style.opacity       = '0';
        cell.style.pointerEvents = 'none';
        contributionGrid.appendChild(cell);
        continue;
      }

      const dateStr = toDateStr(cellDate);

      if (dateSet.has(dateStr)) {
        cell.classList.add('contribution-cell--filled');
        cell.style.background = color;
      } else {
        cell.style.background = color;
        cell.style.opacity    = '0.08';
      }

      cell.title = `${dateStr}${dateSet.has(dateStr) ? ' ✓' : ''}`;
      contributionGrid.appendChild(cell);

      // Month labels (column header, row 0 only)
      const col   = Math.floor(i / 7);
      const row   = i % 7;
      if (row === 0) {
        const month = cellDate.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ col, label: MONTH_NAMES[month] });
          lastMonth = month;
        }
      }
    }

    // Render month label spans
    for (let i = 0; i < 53; i++) {
      const span  = document.createElement('span');
      const match = monthLabels.find((m) => m.col === i);
      span.textContent = match?.label ?? '';
      contributionMonths.appendChild(span);
    }
  }

  // ── Load and render habit detail ───────────────────────────
  async function loadDetail(habitId: string): Promise<void> {
    const { ok, data } = await window.API.apiCall<HabitDetail>('GET', `/habits/${habitId}`);

    if (!ok) {
      window.App.showToast((data as unknown as ApiErrorResponse).error ?? 'Failed to load habit details.', 'error');
      window.App.navigate('dashboard');
      return;
    }

    // Apply accent colour to stat numbers
    document.querySelectorAll<HTMLSpanElement>('.stat-card__number').forEach((el) => {
      el.style.background            = `linear-gradient(135deg, ${data.color}, ${lightenColor(data.color, 40)})`;
      el.style.webkitBackgroundClip  = 'text';
      el.style.webkitTextFillColor   = 'transparent';
      el.style.backgroundClip        = 'text';
    });

    // Legend colours
    document.querySelectorAll<HTMLSpanElement>('.contribution-legend__box').forEach((el) => {
      el.style.background = data.color;
    });

    detailIcon.innerHTML          = '<i data-lucide="target"></i>';
    detailName.textContent        = data.name;
    detailCurrentStreak.textContent  = String(data.currentStreak);
    detailLongestStreak.textContent  = String(data.longestStreak);
    detailTotalCheckins.textContent  = String(data.checkInDates?.length ?? 0);

    renderContributionGrid(data.checkInDates ?? [], data.color);

    window.App.refreshIcons();
  }

  const api: HabitDetailAPI = { loadDetail };
  window.HabitDetail = api;
  return api;
}
