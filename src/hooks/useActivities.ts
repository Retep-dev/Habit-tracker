'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '@/lib/db';
import type { Activity, RepeatRule } from '@/lib/models';
import { calculateDurationMin, getWeekId, formatDate, getDayOfWeek, getWeekDates } from '@/lib/constants';

export function useActivities(weekId: string, selectedDate?: string) {
    const activities = useLiveQuery(
        async () => {
            if (selectedDate) {
                return db.activities.where('date').equals(selectedDate).sortBy('startTime');
            }
            return db.activities.where('weekId').equals(weekId).sortBy('startTime');
        },
        [weekId, selectedDate]
    );

    const addActivity = async (data: {
        title: string;
        startTime: string;
        endTime: string;
        categoryId: string | null;
        date: string;
        notifyBefore?: number;
        repeatRule?: RepeatRule | null;
    }) => {
        const dateObj = new Date(data.date);
        const act: Activity = {
            id: uuid(),
            weekId: getWeekId(dateObj),
            dayOfWeek: getDayOfWeek(dateObj),
            date: data.date,
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            plannedDurationMin: calculateDurationMin(data.startTime, data.endTime),
            categoryId: data.categoryId,
            notifyBefore: data.notifyBefore ?? 5,
            repeatRule: data.repeatRule ?? null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Handle repeat rules
        if (data.repeatRule) {
            const weekDates = getWeekDates(act.weekId);
            const activitiesToAdd: Activity[] = [];

            if (data.repeatRule.type === 'daily') {
                for (const d of weekDates.days) {
                    activitiesToAdd.push({
                        ...act,
                        id: uuid(),
                        date: formatDate(d),
                        dayOfWeek: getDayOfWeek(d),
                    });
                }
            } else if (data.repeatRule.type === 'weekdays') {
                for (const d of weekDates.days) {
                    const dow = getDayOfWeek(d);
                    if (dow <= 4) { // Mon-Fri
                        activitiesToAdd.push({
                            ...act,
                            id: uuid(),
                            date: formatDate(d),
                            dayOfWeek: dow,
                        });
                    }
                }
            } else if (data.repeatRule.type === 'custom' && data.repeatRule.days) {
                for (const d of weekDates.days) {
                    const dow = getDayOfWeek(d);
                    if (data.repeatRule.days.includes(dow)) {
                        activitiesToAdd.push({
                            ...act,
                            id: uuid(),
                            date: formatDate(d),
                            dayOfWeek: dow,
                        });
                    }
                }
            }

            if (activitiesToAdd.length > 0) {
                await db.activities.bulkAdd(activitiesToAdd);
                return activitiesToAdd[0].id;
            }
        }

        await db.activities.add(act);
        return act.id;
    };

    const updateActivity = async (id: string, updates: Partial<Activity>) => {
        const updatedFields: Partial<Activity> = { ...updates, updatedAt: Date.now() };
        if (updates.startTime && updates.endTime) {
            updatedFields.plannedDurationMin = calculateDurationMin(updates.startTime, updates.endTime);
        }
        await db.activities.update(id, updatedFields);
    };

    const deleteActivity = async (id: string) => {
        await db.activities.delete(id);
        // Also delete associated sessions
        await db.sessions.where('activityId').equals(id).delete();
    };

    const copyFromPreviousWeek = async (targetWeekId: string, sourceWeekId: string) => {
        const sourceActivities = await db.activities.where('weekId').equals(sourceWeekId).toArray();
        const targetDates = getWeekDates(targetWeekId);

        const newActivities: Activity[] = sourceActivities.map((a) => {
            const targetDate = targetDates.days[a.dayOfWeek];
            return {
                ...a,
                id: uuid(),
                weekId: targetWeekId,
                date: formatDate(targetDate),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        });

        await db.activities.bulkAdd(newActivities);
    };

    return {
        activities: activities ?? [],
        addActivity,
        updateActivity,
        deleteActivity,
        copyFromPreviousWeek,
    };
}
