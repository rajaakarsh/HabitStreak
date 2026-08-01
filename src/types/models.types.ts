/**
 * models.types.ts
 * Frontend-facing model interfaces (shape of data returned by the API).
 * These mirror the server-side Mongoose documents but are plain objects.
 */

// ── Page routing ──────────────────────────────────────────────

export type PageName = 'home' | 'auth' | 'dashboard' | 'detail';

// ── Habit ─────────────────────────────────────────────────────

export interface HabitBase {
  _id: string;
  name: string;
  color: string;
  icon: string;
  active: boolean;
  createdAt: string;
}

/** Shape returned by GET /api/habits (list) */
export interface HabitWithStats extends HabitBase {
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
}

/** Shape returned by GET /api/habits/:id (detail) */
export interface HabitDetail extends HabitBase {
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  checkInDates: string[];
}

// ── CheckIn ───────────────────────────────────────────────────

export interface CheckInResponse {
  message: string;
  date: string;
}

export interface CheckInsListResponse {
  dates: string[];
}

// ── Color picker ──────────────────────────────────────────────

export type HexColor = `#${string}`;
