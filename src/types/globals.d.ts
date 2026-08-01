/**
 * globals.d.ts
 * Ambient declarations for all window-level globals used in this SPA.
 */

// ── Google Identity Services (GIS) types ─────────────────────

export interface GisCredentialResponse {
  credential: string;
  select_by: string;
  clientId: string;
}

interface GisPromptNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getMomentType(): string;
  getDismissedReason(): string;
  getNotDisplayedReason(): string;
  getSkippedReason(): string;
}

interface GisIdConfig {
  client_id: string;
  callback: (response: GisCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GisButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
  text?: string;
}

interface GisIdClient {
  initialize(config: GisIdConfig): void;
  prompt(callback?: (notification: GisPromptNotification) => void): void;
  renderButton(element: HTMLElement, config: GisButtonConfig): void;
  disableAutoSelect(): void;
  revoke(hint: string, callback: () => void): void;
}

interface GoogleAccounts {
  id: GisIdClient;
}

interface Google {
  accounts: GoogleAccounts;
}

// ── Lucide Icons ──────────────────────────────────────────────

interface LucideLib {
  createIcons(): void;
}

// ── Module API interfaces (forward-declared to avoid circular imports) ────────

interface AppAPIInterface {
  apiCall<T>(method: string, path: string, body?: Record<string, unknown> | null): Promise<{ ok: boolean; status: number; data: T }>;
  getTokens(): { accessToken: string | null; refreshToken: string | null };
  setTokens(accessToken: string | null, refreshToken: string | null): void;
  setUser(user: { email?: string; name?: string; photoURL?: string } | null): void;
  getUser(): { email: string; name: string; photoURL: string };
  clearTokens(): void;
}

interface AppRouterInterface {
  navigate(page: string, data?: string | null): void;
  showToast(message: string, type?: string): void;
  refreshIcons(): void;
}

interface AuthAPIInterface {
  logout(): void;
}

interface DashboardAPIInterface {
  loadHabits(): Promise<void>;
}

interface HabitDetailAPIInterface {
  loadDetail(habitId: string): Promise<void>;
}

// ── Window augmentation ───────────────────────────────────────

declare global {
  interface Window {
    API: AppAPIInterface;
    App: AppRouterInterface;
    Auth: AuthAPIInterface;
    Dashboard: DashboardAPIInterface;
    HabitDetail: HabitDetailAPIInterface;
    google: Google;
    lucide: LucideLib;
    /** Injected via inline <script> in index.html */
    __GOOGLE_CLIENT_ID__: string;
  }
}
