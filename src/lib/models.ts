// ─── Type Definitions for Tempo ───

export type SessionStatus =
    | 'pending'
    | 'notified'
    | 'active'
    | 'completed'
    | 'auto_completed'
    | 'missed'
    | 'dismissed';

export interface RepeatRule {
    type: 'daily' | 'weekdays' | 'custom';
    days?: number[]; // 0=Mon ... 6=Sun (ISO)
}

export interface Activity {
    id: string;
    weekId: string;            // "2026-W07"
    dayOfWeek: number;         // 0=Mon ... 6=Sun
    date: string;              // "2026-02-10"
    title: string;
    startTime: string;         // "09:00" (24h)
    endTime: string;           // "12:00"
    plannedDurationMin: number;
    categoryId: string | null;
    notifyBefore: number;      // minutes
    repeatRule: RepeatRule | null;
    createdAt: number;
    updatedAt: number;
}

export interface Session {
    id: string;
    activityId: string;
    date: string;
    status: SessionStatus;
    clockInTime: number | null;
    clockOutTime: number | null;
    actualDurationMin: number | null;
    wasLate: boolean;
    lateByMin: number;
    wasAutoCompleted: boolean;
    notes: string;
    createdAt: number;
    updatedAt: number;
}

export interface CategoryTime {
    categoryId: string | null;
    categoryName: string;
    plannedMin: number;
    actualMin: number;
}

export interface ActivityDaySummary {
    activityId: string;
    title: string;
    plannedStartTime: string;
    plannedEndTime: string;
    plannedDurationMin: number;
    actualStartTime: number | null;
    actualEndTime: number | null;
    actualDurationMin: number;
    status: SessionStatus;
    completionPercent: number;
    categoryId: string | null;
}

export interface DailyReport {
    id: string;
    date: string;
    weekId: string;
    totalPlannedMin: number;
    totalActualMin: number;
    completionPercent: number;
    activitiesPlanned: number;
    activitiesCompleted: number;
    activitiesMissed: number;
    activitiesPartial: number;
    categoryBreakdown: CategoryTime[];
    activitySummaries: ActivityDaySummary[];
    generatedAt: number;
}

export interface WeeklyReport {
    id: string;
    weekId: string;
    startDate: string;
    endDate: string;
    totalPlannedMin: number;
    totalActualMin: number;
    avgCompletionPercent: number;
    dailyScores: {
        date: string;
        completionPercent: number;
        plannedMin: number;
        actualMin: number;
    }[];
    bestDay: { date: string; percent: number } | null;
    worstDay: { date: string; percent: number } | null;
    mostConsistentActivity: { title: string; completionRate: number } | null;
    mostMissedActivity: { title: string; missRate: number } | null;
    categoryTrends: CategoryTime[];
    writtenSummary: string;
    generatedAt: number;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    isDefault: boolean;
    createdAt: number;
}

export interface WeekTemplate {
    id: string;
    name: string;
    activities: Omit<Activity, 'id' | 'weekId' | 'date' | 'createdAt' | 'updatedAt'>[];
    createdAt: number;
}

// ─── Utility types ───

export interface LastActiveSession {
    sessionId: string;
    activityId: string;
    clockInTime: number;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    weekStartDay: 0 | 1; // 0=Mon, 1=Sun
    timeFormat: '12h' | '24h';
    notificationsEnabled: boolean;
    reminderLeadMin: number;
    missedClockInAlert: boolean;
    dailyReportReminder: boolean;
    onboardingComplete: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'dark',
    weekStartDay: 0,
    timeFormat: '12h',
    notificationsEnabled: true,
    reminderLeadMin: 5,
    missedClockInAlert: true,
    dailyReportReminder: true,
    onboardingComplete: false,
};
