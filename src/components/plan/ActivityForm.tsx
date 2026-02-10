'use client';

import { useState, useEffect } from 'react';
import { X, Repeat, Calendar } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useActivities } from '@/hooks/useActivities';

interface ActivityFormProps {
    date: string;
    weekId: string;
    onClose: () => void;
    editActivity?: {
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        categoryId?: string | null;
    };
}

export default function ActivityForm({ date, weekId, onClose, editActivity }: ActivityFormProps) {
    const { addActivity, updateActivity } = useActivities(weekId, date);
    const categories = useLiveQuery(() => db.categories.toArray(), []);

    const [title, setTitle] = useState(editActivity?.title ?? '');
    const [startTime, setStartTime] = useState(editActivity?.startTime ?? '09:00');
    const [endTime, setEndTime] = useState(editActivity?.endTime ?? '10:00');
    const [categoryId, setCategoryId] = useState(editActivity?.categoryId ?? '');
    const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekdays'>('none');

    const handleSave = async () => {
        if (!title.trim()) return;

        if (editActivity) {
            await updateActivity(editActivity.id, {
                title: title.trim(),
                startTime,
                endTime,
                categoryId: categoryId || null,
            });
        } else {
            await addActivity({
                title: title.trim(),
                startTime,
                endTime,
                categoryId: categoryId || null,
                date,
                repeatRule: repeat !== 'none' ? { type: repeat } : null,
            });
        }
        onClose();
    };

    return (
        <>
            <div className="sheet-backdrop" onClick={onClose} />
            <div className="sheet">
                <div className="sheet-handle" />

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-heading">{editActivity ? 'Edit Activity' : 'New Activity'}</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex flex-col gap-5">
                    {/* Title */}
                    <div>
                        <label className="input-label">Title</label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="What are you planning?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Time */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="input-label">Start</label>
                            <input
                                className="input-field text-mono"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="input-label">End</label>
                            <input
                                className="input-field text-mono"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="input-label">Category</label>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            {(categories ?? []).map((cat) => (
                                <button
                                    key={cat.id}
                                    className={categoryId === cat.id ? 'badge badge-accent' : 'badge badge-neutral'}
                                    onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
                                    style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Repeat */}
                    {!editActivity && (
                        <div>
                            <label className="input-label">Repeat</label>
                            <div className="tab-group">
                                <button
                                    className={`tab-item ${repeat === 'none' ? 'active' : ''}`}
                                    onClick={() => setRepeat('none')}
                                >
                                    Once
                                </button>
                                <button
                                    className={`tab-item ${repeat === 'weekdays' ? 'active' : ''}`}
                                    onClick={() => setRepeat('weekdays')}
                                >
                                    Weekdays
                                </button>
                                <button
                                    className={`tab-item ${repeat === 'daily' ? 'active' : ''}`}
                                    onClick={() => setRepeat('daily')}
                                >
                                    Daily
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Save */}
                    <button className="btn btn-primary btn-full mt-2" onClick={handleSave}>
                        {editActivity ? 'Update' : 'Add Activity'}
                    </button>
                </div>
            </div>
        </>
    );
}
