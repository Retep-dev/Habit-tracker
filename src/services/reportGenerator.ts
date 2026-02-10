import { db } from '@/lib/db';
import type { DailyReport, WeeklyReport, ActivityDaySummary, CategoryTime, Session } from '@/lib/models';
import { v4 as uuid } from 'uuid';
import { getWeekDates, formatDate, formatDuration } from '@/lib/constants';
import { format } from 'date-fns';

// ─── Daily Report ───

export async function generateDailyReport(date: string): Promise<DailyReport> {
    // Check if report already exists
    const existing = await db.dailyReports.where('date').equals(date).first();
    if (existing && Date.now() - existing.generatedAt < 60000) {
        return existing; // Return cached if < 1 min old
    }

    const activities = await db.activities.where('date').equals(date).sortBy('startTime');
    const sessions = await db.sessions.where('date').equals(date).toArray();
    const categories = await db.categories.toArray();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const activitySummaries: ActivityDaySummary[] = activities.map((a) => {
        const session = sessions.find((s) => s.activityId === a.id);
        const status = session?.status ?? 'missed';
        const actualDurationMin = session?.actualDurationMin ?? 0;
        const completionPercent = a.plannedDurationMin > 0
            ? Math.min(100, Math.round((actualDurationMin / a.plannedDurationMin) * 100))
            : 0;

        return {
            activityId: a.id,
            title: a.title,
            plannedStartTime: a.startTime,
            plannedEndTime: a.endTime,
            plannedDurationMin: a.plannedDurationMin,
            actualStartTime: session?.clockInTime ?? null,
            actualEndTime: session?.clockOutTime ?? null,
            actualDurationMin,
            status,
            completionPercent,
            categoryId: a.categoryId,
        };
    });

    const totalPlannedMin = activitySummaries.reduce((s, a) => s + a.plannedDurationMin, 0);
    const totalActualMin = activitySummaries.reduce((s, a) => s + a.actualDurationMin, 0);
    const completionPercent = totalPlannedMin > 0
        ? Math.min(100, Math.round((totalActualMin / totalPlannedMin) * 100))
        : 0;

    const completed = activitySummaries.filter((a) => a.status === 'completed' || a.status === 'auto_completed').length;
    const missed = activitySummaries.filter((a) => a.status === 'missed' || a.status === 'dismissed').length;
    const partial = activitySummaries.filter((a) =>
        (a.status === 'completed') && a.actualDurationMin < a.plannedDurationMin * 0.9
    ).length;

    // Category breakdown
    const catBreakdown = new Map<string, CategoryTime>();
    for (const a of activitySummaries) {
        const catId = a.categoryId ?? 'uncategorized';
        const catName = a.categoryId ? (catMap.get(a.categoryId)?.name ?? 'Unknown') : 'Uncategorized';
        const existing = catBreakdown.get(catId) ?? { categoryId: a.categoryId, categoryName: catName, plannedMin: 0, actualMin: 0 };
        existing.plannedMin += a.plannedDurationMin;
        existing.actualMin += a.actualDurationMin;
        catBreakdown.set(catId, existing);
    }

    const weekIdMatch = activities[0]?.weekId ?? '';

    const report: DailyReport = {
        id: existing?.id ?? uuid(),
        date,
        weekId: weekIdMatch,
        totalPlannedMin,
        totalActualMin,
        completionPercent,
        activitiesPlanned: activitySummaries.length,
        activitiesCompleted: completed,
        activitiesMissed: missed,
        activitiesPartial: partial,
        categoryBreakdown: Array.from(catBreakdown.values()),
        activitySummaries,
        generatedAt: Date.now(),
    };

    // Upsert — use put() to replace entire record (avoids Dexie UpdateSpec issues with arrays)
    await db.dailyReports.put(report);

    return report;
}

// ─── Weekly Report ───

export async function generateWeeklyReport(weekId: string): Promise<WeeklyReport> {
    const existing = await db.weeklyReports.where('weekId').equals(weekId).first();
    if (existing && Date.now() - existing.generatedAt < 60000) {
        return existing;
    }

    const { days, start, end } = getWeekDates(weekId);

    // Generate daily reports for each day
    const dailyReports: DailyReport[] = [];
    for (const day of days) {
        const dateStr = formatDate(day);
        if (new Date(dateStr) <= new Date()) {
            const report = await generateDailyReport(dateStr);
            dailyReports.push(report);
        }
    }

    const totalPlannedMin = dailyReports.reduce((s, r) => s + r.totalPlannedMin, 0);
    const totalActualMin = dailyReports.reduce((s, r) => s + r.totalActualMin, 0);

    const dailyScores = dailyReports.map((r) => ({
        date: r.date,
        completionPercent: r.completionPercent,
        plannedMin: r.totalPlannedMin,
        actualMin: r.totalActualMin,
    }));

    const avgCompletionPercent = dailyScores.length > 0
        ? Math.round(dailyScores.reduce((s, d) => s + d.completionPercent, 0) / dailyScores.length)
        : 0;

    // Best / Worst day
    let bestDay: { date: string; percent: number } | null = null;
    let worstDay: { date: string; percent: number } | null = null;
    if (dailyScores.length > 0) {
        const sorted = [...dailyScores].sort((a, b) => b.completionPercent - a.completionPercent);
        bestDay = { date: sorted[0].date, percent: sorted[0].completionPercent };
        worstDay = { date: sorted[sorted.length - 1].date, percent: sorted[sorted.length - 1].completionPercent };
    }

    // Activity consistency
    const activityMap = new Map<string, { planned: number; completed: number }>();
    for (const report of dailyReports) {
        for (const summary of report.activitySummaries) {
            const entry = activityMap.get(summary.title) ?? { planned: 0, completed: 0 };
            entry.planned++;
            if (summary.status === 'completed' || summary.status === 'auto_completed') {
                entry.completed++;
            }
            activityMap.set(summary.title, entry);
        }
    }

    let mostConsistent: { title: string; completionRate: number } | null = null;
    let mostMissed: { title: string; missRate: number } | null = null;

    for (const [title, { planned, completed }] of activityMap) {
        if (planned < 2) continue;
        const rate = Math.round((completed / planned) * 100);
        if (!mostConsistent || rate > mostConsistent.completionRate) {
            mostConsistent = { title, completionRate: rate };
        }
        const missRate = 100 - rate;
        if (!mostMissed || missRate > mostMissed.missRate) {
            mostMissed = { title, missRate };
        }
    }

    // Category trends
    const catTrends = new Map<string, CategoryTime>();
    for (const report of dailyReports) {
        for (const cat of report.categoryBreakdown) {
            const key = cat.categoryId ?? 'uncategorized';
            const e = catTrends.get(key) ?? { ...cat, plannedMin: 0, actualMin: 0 };
            e.plannedMin += cat.plannedMin;
            e.actualMin += cat.actualMin;
            catTrends.set(key, e);
        }
    }

    // Written summary
    const writtenSummary = generateWrittenSummary({
        avgCompletionPercent,
        totalPlannedMin,
        totalActualMin,
        bestDay,
        worstDay,
        mostConsistent,
        mostMissed,
    });

    const report: WeeklyReport = {
        id: existing?.id ?? uuid(),
        weekId,
        startDate: formatDate(start),
        endDate: formatDate(end),
        totalPlannedMin,
        totalActualMin,
        avgCompletionPercent,
        dailyScores,
        bestDay,
        worstDay,
        mostConsistentActivity: mostConsistent,
        mostMissedActivity: mostMissed,
        categoryTrends: Array.from(catTrends.values()),
        writtenSummary,
        generatedAt: Date.now(),
    };

    // Upsert — use put() to replace entire record
    await db.weeklyReports.put(report);

    return report;
}

// ─── Insight Generator ───

function generateWrittenSummary(data: {
    avgCompletionPercent: number;
    totalPlannedMin: number;
    totalActualMin: number;
    bestDay: { date: string; percent: number } | null;
    worstDay: { date: string; percent: number } | null;
    mostConsistent: { title: string; completionRate: number } | null;
    mostMissed: { title: string; missRate: number } | null;
}): string {
    const parts: string[] = [];

    const actualH = formatDuration(data.totalActualMin);
    const plannedH = formatDuration(data.totalPlannedMin);
    parts.push(
        `This week you completed ${data.avgCompletionPercent}% of your planned activities, totaling ${actualH} out of ${plannedH} planned.`
    );

    if (data.bestDay) {
        const dayName = format(new Date(data.bestDay.date), 'EEEE');
        parts.push(`Your strongest day was ${dayName} at ${data.bestDay.percent}% completion.`);
    }

    if (data.worstDay && data.worstDay.percent < 80) {
        const dayName = format(new Date(data.worstDay.date), 'EEEE');
        parts.push(`${dayName} was more challenging with ${data.worstDay.percent}% completion.`);
    }

    if (data.mostConsistent) {
        parts.push(`"${data.mostConsistent.title}" was your most consistent activity at ${data.mostConsistent.completionRate}% follow-through.`);
    }

    if (data.mostMissed && data.mostMissed.missRate > 40) {
        parts.push(`Consider rescheduling "${data.mostMissed.title}" — it had a ${data.mostMissed.missRate}% miss rate.`);
    }

    if (data.avgCompletionPercent >= 90) {
        parts.push('Outstanding consistency — keep up the great work!');
    } else if (data.avgCompletionPercent >= 70) {
        parts.push('Solid week overall. Small improvements in consistency will compound over time.');
    } else if (data.avgCompletionPercent >= 50) {
        parts.push('Consider reducing planned hours by 15-20% to build sustainable habits.');
    } else {
        parts.push('This week was tough. Try focusing on just 2-3 key activities next week and build from there.');
    }

    return parts.join(' ');
}
