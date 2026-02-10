'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '@/lib/db';
import type { Session, SessionStatus, Activity } from '@/lib/models';
import { setLastActiveSession } from '@/lib/storage';
import { timeToMinutes, getCurrentTime24 } from '@/lib/constants';

export function useSessions(date: string) {
    const sessions = useLiveQuery(
        () => db.sessions.where('date').equals(date).toArray(),
        [date]
    );

    const activeSession = useLiveQuery(
        () => db.sessions.where('status').equals('active').first(),
        []
    );

    const clockIn = async (activity: Activity) => {
        const now = Date.now();
        const currentTime = getCurrentTime24();
        const plannedStartMin = timeToMinutes(activity.startTime);
        const actualStartMin = timeToMinutes(currentTime);
        const isLate = actualStartMin > plannedStartMin;
        const lateByMin = isLate ? actualStartMin - plannedStartMin : 0;

        // Auto clock-out any currently active session
        if (activeSession) {
            await clockOut(activeSession.id);
        }

        const session: Session = {
            id: uuid(),
            activityId: activity.id,
            date,
            status: 'active',
            clockInTime: now,
            clockOutTime: null,
            actualDurationMin: null,
            wasLate: isLate,
            lateByMin,
            wasAutoCompleted: false,
            notes: '',
            createdAt: now,
            updatedAt: now,
        };

        await db.sessions.add(session);
        setLastActiveSession({
            sessionId: session.id,
            activityId: activity.id,
            clockInTime: now,
        });

        return session.id;
    };

    const clockOut = async (sessionId: string, endTime?: number) => {
        const session = await db.sessions.get(sessionId);
        if (!session || !session.clockInTime) return;

        const now = endTime ?? Date.now();
        const durationMin = Math.round((now - session.clockInTime) / 60000);

        await db.sessions.update(sessionId, {
            status: 'completed' as SessionStatus,
            clockOutTime: now,
            actualDurationMin: durationMin,
            updatedAt: Date.now(),
        });

        setLastActiveSession(null);
    };

    const autoComplete = async (sessionId: string, plannedEndTime: string) => {
        const session = await db.sessions.get(sessionId);
        if (!session || !session.clockInTime) return;

        // Use planned end time for duration calculation
        const dateStr = session.date;
        const endDate = new Date(`${dateStr}T${plannedEndTime}:00`);
        const endTimestamp = endDate.getTime();
        const durationMin = Math.round((endTimestamp - session.clockInTime) / 60000);

        await db.sessions.update(sessionId, {
            status: 'auto_completed' as SessionStatus,
            clockOutTime: endTimestamp,
            actualDurationMin: Math.max(0, durationMin),
            wasAutoCompleted: true,
            updatedAt: Date.now(),
        });

        setLastActiveSession(null);
    };

    const markMissed = async (activityId: string) => {
        // Check if session already exists
        const existing = await db.sessions
            .where('[activityId+date]')
            .equals([activityId, date])
            .first();

        if (existing) {
            await db.sessions.update(existing.id, {
                status: 'missed' as SessionStatus,
                updatedAt: Date.now(),
            });
        } else {
            const session: Session = {
                id: uuid(),
                activityId,
                date,
                status: 'missed',
                clockInTime: null,
                clockOutTime: null,
                actualDurationMin: 0,
                wasLate: false,
                lateByMin: 0,
                wasAutoCompleted: false,
                notes: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await db.sessions.add(session);
        }
    };

    const dismiss = async (activityId: string) => {
        const existing = await db.sessions
            .where('[activityId+date]')
            .equals([activityId, date])
            .first();

        if (existing) {
            await db.sessions.update(existing.id, {
                status: 'dismissed' as SessionStatus,
                updatedAt: Date.now(),
            });
        } else {
            const session: Session = {
                id: uuid(),
                activityId,
                date,
                status: 'dismissed',
                clockInTime: null,
                clockOutTime: null,
                actualDurationMin: 0,
                wasLate: false,
                lateByMin: 0,
                wasAutoCompleted: false,
                notes: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await db.sessions.add(session);
        }
    };

    const getSessionForActivity = (activityId: string): Session | undefined => {
        return sessions?.find((s) => s.activityId === activityId);
    };

    return {
        sessions: sessions ?? [],
        activeSession: activeSession ?? null,
        clockIn,
        clockOut,
        autoComplete,
        markMissed,
        dismiss,
        getSessionForActivity,
    };
}
