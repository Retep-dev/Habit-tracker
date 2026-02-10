'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
    Play, Square, Clock, CheckCircle2, XCircle,
    AlertCircle, Plus, ChevronRight,
} from 'lucide-react';
import { db, seedDefaults } from '@/lib/db';
import { useActivities } from '@/hooks/useActivities';
import { useSessions } from '@/hooks/useSessions';
import { useCurrentTime, useElapsedTime } from '@/hooks/useCurrentTime';
import {
    formatDate, getWeekId, formatTimeDisplay, formatDuration,
    timeToMinutes, getDayOfWeek,
} from '@/lib/constants';
import BottomNav from '@/components/layout/BottomNav';
import ActivityForm from '@/components/plan/ActivityForm';
import type { Activity, Session } from '@/lib/models';

export default function TodayPage() {
    const { now } = useCurrentTime();
    const todayStr = formatDate(now);
    const weekId = getWeekId(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const { activities } = useActivities(weekId, todayStr);
    const { activeSession, sessions, clockIn, clockOut, getSessionForActivity } = useSessions(todayStr);

    const [showForm, setShowForm] = useState(false);
    const [seeded, setSeeded] = useState(false);

    useEffect(() => {
        seedDefaults().then(() => setSeeded(true));
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => { });
        }
    }, []);

    const categories = useLiveQuery(() => db.categories.toArray(), []);
    const catMap = useMemo(
        () => new Map((categories ?? []).map((c) => [c.id, c])),
        [categories]
    );

    // Categorize activities by looking up sessions
    const { upcoming, completed, missed, activeActivity } = useMemo(() => {
        const result = {
            upcoming: [] as Activity[],
            completed: [] as Activity[],
            missed: [] as Activity[],
            activeActivity: null as Activity | null,
        };
        for (const a of activities) {
            const endMin = timeToMinutes(a.endTime);
            const session = getSessionForActivity(a.id);

            if (activeSession && activeSession.activityId === a.id) {
                result.activeActivity = a;
            } else if (session?.status === 'completed' || session?.status === 'auto_completed') {
                result.completed.push(a);
            } else if (endMin < currentMinutes && !session) {
                result.missed.push(a);
            } else {
                result.upcoming.push(a);
            }
        }
        return result;
    }, [activities, activeSession, sessions, currentMinutes, getSessionForActivity]);

    // Progress
    const total = activities.length;
    const done = completed.length;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <>
            <div className="page">
                {/* Header */}
                <div className="page-header">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-title">{format(now, 'EEEE')}</h1>
                            <p className="text-caption mt-1">{format(now, 'MMMM d, yyyy')}</p>
                        </div>
                        <div className="text-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {format(now, 'HH:mm')}
                        </div>
                    </div>

                    {/* Progress */}
                    {total > 0 && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-caption">{done} of {total} completed</span>
                                <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>{progressPercent}%</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Active Session */}
                {activeActivity && activeSession && (
                    <ActiveSessionCard
                        activity={activeActivity}
                        session={activeSession}
                        onClockOut={() => clockOut(activeSession.id)}
                        categoryName={catMap.get(activeActivity.categoryId ?? '')?.name}
                    />
                )}

                {/* Upcoming */}
                {upcoming.length > 0 && (
                    <section>
                        <div className="section-label">Upcoming</div>
                        <div className="flex flex-col gap-2">
                            {upcoming.map((a) => (
                                <ActivityRow
                                    key={a.id}
                                    activity={a}
                                    categoryName={catMap.get(a.categoryId ?? '')?.name}
                                    onClockIn={() => clockIn(a)}
                                    canClockIn={!activeSession}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Completed */}
                {completed.length > 0 && (
                    <section>
                        <div className="section-label">Completed</div>
                        <div className="flex flex-col gap-2">
                            {completed.map((a) => (
                                <ActivityRow key={a.id} activity={a} categoryName={catMap.get(a.categoryId ?? '')?.name} done />
                            ))}
                        </div>
                    </section>
                )}

                {/* Missed */}
                {missed.length > 0 && (
                    <section>
                        <div className="section-label">Missed</div>
                        <div className="flex flex-col gap-2">
                            {missed.map((a) => (
                                <ActivityRow key={a.id} activity={a} categoryName={catMap.get(a.categoryId ?? '')?.name} missed />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {total === 0 && seeded && (
                    <div className="empty-state">
                        <Clock className="empty-state-icon" size={40} strokeWidth={1.25} />
                        <div className="empty-state-title">No activities planned</div>
                        <div className="empty-state-desc">Head to the Plan tab to schedule your day, or add one now.</div>
                    </div>
                )}

                {/* Add Button */}
                <div className="mt-8">
                    <button className="btn btn-secondary btn-full" onClick={() => setShowForm(true)}>
                        <Plus size={18} strokeWidth={2} />
                        Add Activity
                    </button>
                </div>
            </div>

            <BottomNav />

            {showForm && (
                <ActivityForm
                    date={todayStr}
                    weekId={weekId}
                    onClose={() => setShowForm(false)}
                />
            )}
        </>
    );
}

// ─── Active Session Card ───

function ActiveSessionCard({
    activity,
    session,
    onClockOut,
    categoryName,
}: {
    activity: Activity;
    session: Session;
    onClockOut: () => void;
    categoryName?: string;
}) {
    const { formatted } = useElapsedTime(session.clockInTime);

    return (
        <div className="card-highlight" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                        width: 40, height: 40,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-muted)',
                    }}
                >
                    <Play size={18} color="var(--accent)" fill="var(--accent)" />
                </div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="text-subheading truncate">{activity.title}</div>
                    <div className="text-caption">
                        {categoryName && <span>{categoryName} · </span>}
                        {formatTimeDisplay(activity.startTime)} – {formatTimeDisplay(activity.endTime)}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <div className="text-label">Elapsed</div>
                    <div className="text-number" style={{ fontSize: 'var(--text-2xl)', color: 'var(--accent)', fontWeight: 600 }}>
                        {formatted}
                    </div>
                </div>
                <button className="btn btn-primary" onClick={onClockOut} style={{ gap: 'var(--space-2)' }}>
                    <Square size={14} fill="currentColor" />
                    Clock Out
                </button>
            </div>
        </div>
    );
}

// ─── Activity Row ───

function ActivityRow({
    activity,
    categoryName,
    onClockIn,
    canClockIn,
    done,
    missed,
}: {
    activity: Activity;
    categoryName?: string;
    onClockIn?: () => void;
    canClockIn?: boolean;
    done?: boolean;
    missed?: boolean;
}) {
    return (
        <div className="card-interactive">
            <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="shrink-0" style={{ color: done ? 'var(--success)' : missed ? 'var(--danger)' : 'var(--text-quaternary)' }}>
                    {done ? <CheckCircle2 size={20} strokeWidth={1.75} /> :
                        missed ? <XCircle size={20} strokeWidth={1.75} /> :
                            <Clock size={20} strokeWidth={1.75} />}
                </div>

                {/* Content */}
                <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="text-subheading truncate" style={{ opacity: missed ? 0.5 : 1 }}>
                        {activity.title}
                    </div>
                    <div className="text-caption">
                        <span className="text-mono">{formatTimeDisplay(activity.startTime)} – {formatTimeDisplay(activity.endTime)}</span>
                        <span> · {formatDuration(activity.plannedDurationMin)}</span>
                        {categoryName && <span> · {categoryName}</span>}
                    </div>
                </div>

                {/* Action */}
                {onClockIn && canClockIn && !done && !missed && (
                    <button
                        className="btn btn-primary"
                        onClick={(e) => { e.stopPropagation(); onClockIn(); }}
                        style={{ padding: 'var(--space-2) var(--space-4)', minHeight: '36px', fontSize: 'var(--text-xs)' }}
                    >
                        <Play size={13} fill="currentColor" />
                        Start
                    </button>
                )}

                {done && (
                    <span className="badge badge-success">Done</span>
                )}

                {missed && (
                    <span className="badge badge-danger">Missed</span>
                )}
            </div>
        </div>
    );
}
