import { format, startOfWeek, endOfWeek, addDays, getISOWeek, getISOWeekYear, parse, differenceInMinutes } from 'date-fns';

// ─── Week Utilities ───

export function getWeekId(date: Date): string {
    const year = getISOWeekYear(date);
    const week = getISOWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getWeekDates(weekId: string): { start: Date; end: Date; days: Date[] } {
    const [yearStr, weekStr] = weekId.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);

    // Build the date for ISO week: Jan 4 of the year is always in week 1
    const jan4 = new Date(year, 0, 4);
    const startOfW1 = startOfWeek(jan4, { weekStartsOn: 1 });
    const start = addDays(startOfW1, (week - 1) * 7);
    const end = addDays(start, 6);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        days.push(addDays(start, i));
    }

    return { start, end, days };
}

export function getDayOfWeek(date: Date): number {
    // 0=Mon ... 6=Sun (ISO format)
    const jsDay = date.getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1;
}

export function formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
    return format(date, 'EEEE, MMM d');
}

export function formatShortDay(date: Date): string {
    return format(date, 'EEE');
}

export function formatDayNum(date: Date): string {
    return format(date, 'd');
}

// ─── Time Utilities ───

export function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateDurationMin(startTime: string, endTime: string): number {
    return timeToMinutes(endTime) - timeToMinutes(startTime);
}

export function formatDuration(minutes: number): string {
    if (minutes < 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export function formatTimeDisplay(time: string, use12h: boolean = true): string {
    if (!use12h) return time;
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function getCurrentTime24(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function isTimeInRange(time: string, start: string, end: string): boolean {
    const t = timeToMinutes(time);
    return t >= timeToMinutes(start) && t < timeToMinutes(end);
}

// ─── Constants ───

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const CATEGORY_COLORS: Record<string, string> = {
    'cat-work': '#6366F1',
    'cat-health': '#10B981',
    'cat-learning': '#F59E0B',
    'cat-personal': '#EC4899',
    'cat-creative': '#8B5CF6',
};

export const GRACE_PERIOD_MIN = 10; // Minutes after planned start before marking missed
export const AUTO_CLOCKOUT_BUFFER_MIN = 30; // Minutes after planned end to auto-close
