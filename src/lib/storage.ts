import { DEFAULT_PREFERENCES, type LastActiveSession, type UserPreferences } from './models';

const PREFS_KEY = 'tempo_preferences';
const LAST_SESSION_KEY = 'tempo_last_active_session';

// ─── Preferences ───

export function getPreferences(): UserPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return DEFAULT_PREFERENCES;
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

export function setPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    const current = getPreferences();
    const next = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    return next;
}

// ─── Last Active Session (redundant backup for crash recovery) ───

export function getLastActiveSession(): LastActiveSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(LAST_SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setLastActiveSession(session: LastActiveSession | null): void {
    if (session) {
        localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
    } else {
        localStorage.removeItem(LAST_SESSION_KEY);
    }
}
