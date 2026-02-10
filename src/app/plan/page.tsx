'use client';

import { useState, useMemo } from 'react';
import { addWeeks, subWeeks, format } from 'date-fns';
import {
    ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Copy, FileText,
} from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import {
    getWeekId, getWeekDates, formatDate, formatShortDay, formatDayNum,
    formatTimeDisplay, formatDuration, getDayOfWeek,
} from '@/lib/constants';
import BottomNav from '@/components/layout/BottomNav';
import ActivityForm from '@/components/plan/ActivityForm';
import type { Activity } from '@/lib/models';

export default function PlanPage() {
    const [referenceDate, setReferenceDate] = useState(new Date());
    const weekId = getWeekId(referenceDate);
    const weekData = useMemo(() => getWeekDates(weekId), [weekId]);
    const todayStr = formatDate(new Date());

    const [selectedDayIdx, setSelectedDayIdx] = useState(() => getDayOfWeek(new Date()));
    const selectedDate = formatDate(weekData.days[selectedDayIdx]);

    const { activities, deleteActivity, copyFromPreviousWeek } = useActivities(weekId, selectedDate);
    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [showCopied, setShowCopied] = useState(false);

    const navigateWeek = (direction: 'prev' | 'next') => {
        setReferenceDate((d) => direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1));
        setSelectedDayIdx(0);
    };

    const handleCopyPrevious = async () => {
        const prevWeekDate = subWeeks(referenceDate, 1);
        const prevWeekId = getWeekId(prevWeekDate);
        await copyFromPreviousWeek(weekId, prevWeekId);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2500);
    };

    const handleEdit = (activity: Activity) => {
        setEditingActivity(activity);
        setShowForm(true);
    };

    return (
        <>
            <div className="page">
                {/* Header */}
                <div className="page-header">
                    <h1 className="text-title">Weekly Plan</h1>
                    <div className="flex items-center justify-between mt-4">
                        <button className="btn-icon" onClick={() => navigateWeek('prev')}>
                            <ChevronLeft size={20} />
                        </button>
                        <p className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {format(weekData.start, 'MMM d')} – {format(weekData.end, 'MMM d, yyyy')}
                        </p>
                        <button className="btn-icon" onClick={() => navigateWeek('next')}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Day Selector */}
                <div className="day-selector mb-4">
                    {weekData.days.map((day, idx) => {
                        const dateStr = formatDate(day);
                        const isToday = dateStr === todayStr;
                        const isActive = idx === selectedDayIdx;

                        return (
                            <button
                                key={dateStr}
                                className={`day-pill ${isActive ? 'active' : ''} ${isToday && !isActive ? 'today' : ''}`}
                                onClick={() => setSelectedDayIdx(idx)}
                            >
                                <span className="day-pill-name">{formatShortDay(day)}</span>
                                <span className="day-pill-num">{formatDayNum(day)}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Day Title */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-subheading">{format(weekData.days[selectedDayIdx], 'EEEE, MMM d')}</span>
                    <span className="text-caption">{activities.length} {activities.length === 1 ? 'activity' : 'activities'}</span>
                </div>

                {/* Activities List */}
                {activities.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {activities.map((a) => (
                            <div key={a.id} className="card-interactive">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1" style={{ minWidth: 0 }}>
                                        <div className="text-subheading truncate">{a.title}</div>
                                        <div className="text-caption mt-1">
                                            <span className="text-mono">{formatTimeDisplay(a.startTime)} – {formatTimeDisplay(a.endTime)}</span>
                                            <span> · {formatDuration(a.plannedDurationMin)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEdit(a)}
                                            style={{ width: 36, height: 36 }}
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => deleteActivity(a.id)}
                                            style={{ width: 36, height: 36, color: 'var(--danger)' }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FileText className="empty-state-icon" size={40} strokeWidth={1.25} />
                        <div className="empty-state-title">No activities planned</div>
                        <div className="empty-state-desc">Add activities for this day or copy from last week.</div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-8">
                    <button
                        className="btn btn-primary btn-full"
                        onClick={() => { setEditingActivity(null); setShowForm(true); }}
                    >
                        <Plus size={18} strokeWidth={2} />
                        Add Activity
                    </button>
                    <button className="btn btn-ghost btn-full" onClick={handleCopyPrevious}>
                        <Copy size={16} />
                        Copy from Last Week
                    </button>
                </div>

                {/* Toast */}
                {showCopied && (
                    <div className="toast">Activities copied from last week</div>
                )}
            </div>

            <BottomNav />

            {showForm && (
                <ActivityForm
                    date={selectedDate}
                    weekId={weekId}
                    onClose={() => { setShowForm(false); setEditingActivity(null); }}
                    editActivity={editingActivity ? {
                        id: editingActivity.id,
                        title: editingActivity.title,
                        startTime: editingActivity.startTime,
                        endTime: editingActivity.endTime,
                        categoryId: editingActivity.categoryId,
                    } : undefined}
                />
            )}
        </>
    );
}
