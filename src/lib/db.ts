import Dexie, { type EntityTable } from 'dexie';
import type { Activity, Session, DailyReport, WeeklyReport, Category, WeekTemplate } from './models';

export class TempoDB extends Dexie {
    activities!: EntityTable<Activity, 'id'>;
    sessions!: EntityTable<Session, 'id'>;
    dailyReports!: EntityTable<DailyReport, 'id'>;
    weeklyReports!: EntityTable<WeeklyReport, 'id'>;
    categories!: EntityTable<Category, 'id'>;
    templates!: EntityTable<WeekTemplate, 'id'>;

    constructor() {
        super('TempoDB');

        this.version(1).stores({
            activities: 'id, weekId, dayOfWeek, date, categoryId, [weekId+dayOfWeek], [weekId+date]',
            sessions: 'id, activityId, date, status, [activityId+date]',
            dailyReports: 'id, &date, weekId',
            weeklyReports: 'id, &weekId',
            categories: 'id, &name',
            templates: 'id, name',
        });
    }
}

export const db = new TempoDB();

// ─── Seed default categories on first launch ───
export async function seedDefaults() {
    const count = await db.categories.count();
    if (count === 0) {
        await db.categories.bulkAdd([
            { id: 'cat-work', name: 'Work', color: '#6366F1', icon: '💼', isDefault: true, createdAt: Date.now() },
            { id: 'cat-health', name: 'Health', color: '#10B981', icon: '💪', isDefault: true, createdAt: Date.now() },
            { id: 'cat-learning', name: 'Learning', color: '#F59E0B', icon: '📚', isDefault: true, createdAt: Date.now() },
            { id: 'cat-personal', name: 'Personal', color: '#EC4899', icon: '🧘', isDefault: true, createdAt: Date.now() },
            { id: 'cat-creative', name: 'Creative', color: '#8B5CF6', icon: '🎨', isDefault: true, createdAt: Date.now() },
        ]);
    }
}
