'use client';

import { useState, useCallback } from 'react';
import {
    Clock, Bell, BellOff, Download, Upload, Trash2, Info, AlertTriangle,
} from 'lucide-react';
import { getPreferences, setPreferences } from '@/lib/storage';
import { db } from '@/lib/db';
import type { UserPreferences } from '@/lib/models';
import BottomNav from '@/components/layout/BottomNav';

export default function SettingsPage() {
    const [prefs, setPrefsState] = useState<UserPreferences>(getPreferences());
    const [exportStatus, setExportStatus] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
        const updated = setPreferences({ [key]: value });
        setPrefsState(updated);
    };

    // ─── Export ───
    const handleExport = useCallback(async () => {
        try {
            const data = {
                version: 1,
                exportedAt: new Date().toISOString(),
                activities: await db.activities.toArray(),
                sessions: await db.sessions.toArray(),
                dailyReports: await db.dailyReports.toArray(),
                weeklyReports: await db.weeklyReports.toArray(),
                categories: await db.categories.toArray(),
                templates: await db.templates.toArray(),
                preferences: prefs,
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tempo-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setExportStatus('Data exported successfully');
            setTimeout(() => setExportStatus(null), 3000);
        } catch {
            setExportStatus('Export failed');
            setTimeout(() => setExportStatus(null), 3000);
        }
    }, [prefs]);

    // ─── Import ───
    const handleImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (data.version !== 1) { alert('Unsupported backup version'); return; }

                await db.activities.clear();
                await db.sessions.clear();
                await db.dailyReports.clear();
                await db.weeklyReports.clear();
                await db.categories.clear();
                await db.templates.clear();

                if (data.activities) await db.activities.bulkAdd(data.activities);
                if (data.sessions) await db.sessions.bulkAdd(data.sessions);
                if (data.dailyReports) await db.dailyReports.bulkAdd(data.dailyReports);
                if (data.weeklyReports) await db.weeklyReports.bulkAdd(data.weeklyReports);
                if (data.categories) await db.categories.bulkAdd(data.categories);
                if (data.templates) await db.templates.bulkAdd(data.templates);
                if (data.preferences) {
                    const updated = setPreferences(data.preferences);
                    setPrefsState(updated);
                }
                setExportStatus('Data imported successfully');
                setTimeout(() => setExportStatus(null), 3000);
            } catch {
                alert('Failed to import. The file may be corrupted.');
            }
        };
        input.click();
    }, []);

    // ─── Clear ───
    const handleClear = useCallback(async () => {
        await db.activities.clear();
        await db.sessions.clear();
        await db.dailyReports.clear();
        await db.weeklyReports.clear();
        await db.categories.clear();
        await db.templates.clear();

        const defaults = setPreferences({ onboardingComplete: false, theme: 'dark' });
        setPrefsState(defaults);
        setShowClearConfirm(false);

        const { seedDefaults } = await import('@/lib/db');
        await seedDefaults();
    }, []);

    // ─── Notifications ───
    const requestNotifications = useCallback(async () => {
        if (!('Notification' in window)) {
            alert('Notifications are not supported in this browser.');
            return;
        }
        const permission = await Notification.requestPermission();
        updatePref('notificationsEnabled', permission === 'granted');
    }, []);

    return (
        <>
            <div className="page">
                <div className="page-header">
                    <h1 className="text-title">Settings</h1>
                </div>

                {/* Preferences */}
                <div className="section-label">Preferences</div>
                <div className="flex flex-col gap-2">
                    <SettingRow label="Time Format">
                        <div className="tab-group" style={{ width: 120 }}>
                            <button
                                className={`tab-item ${prefs.timeFormat === '12h' ? 'active' : ''}`}
                                onClick={() => updatePref('timeFormat', '12h')}
                            >
                                12h
                            </button>
                            <button
                                className={`tab-item ${prefs.timeFormat === '24h' ? 'active' : ''}`}
                                onClick={() => updatePref('timeFormat', '24h')}
                            >
                                24h
                            </button>
                        </div>
                    </SettingRow>

                    <SettingRow label="Week Starts On">
                        <div className="tab-group" style={{ width: 150 }}>
                            <button
                                className={`tab-item ${prefs.weekStartDay === 0 ? 'active' : ''}`}
                                onClick={() => updatePref('weekStartDay', 0)}
                            >
                                Mon
                            </button>
                            <button
                                className={`tab-item ${prefs.weekStartDay === 1 ? 'active' : ''}`}
                                onClick={() => updatePref('weekStartDay', 1)}
                            >
                                Sun
                            </button>
                        </div>
                    </SettingRow>
                </div>

                {/* Notifications */}
                <div className="section-label">Notifications</div>
                <div className="flex flex-col gap-2">
                    <SettingRow
                        label="Activity Reminders"
                        caption="Get notified before activities start"
                    >
                        <button
                            className={`btn ${prefs.notificationsEnabled ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={requestNotifications}
                            style={{ minHeight: 36, padding: '0 var(--space-4)', gap: 'var(--space-2)' }}
                        >
                            {prefs.notificationsEnabled
                                ? <><Bell size={14} /> On</>
                                : <><BellOff size={14} /> Off</>
                            }
                        </button>
                    </SettingRow>

                    {prefs.notificationsEnabled && (
                        <SettingRow label="Remind Before">
                            <select
                                className="input-field"
                                value={prefs.reminderLeadMin}
                                onChange={(e) => updatePref('reminderLeadMin', Number(e.target.value))}
                                style={{ width: 100, minHeight: 36 }}
                            >
                                <option value={2}>2 min</option>
                                <option value={5}>5 min</option>
                                <option value={10}>10 min</option>
                                <option value={15}>15 min</option>
                            </select>
                        </SettingRow>
                    )}
                </div>

                {/* Data */}
                <div className="section-label">Data</div>
                <div className="flex flex-col gap-2">
                    <button className="btn btn-secondary btn-full" onClick={handleExport} style={{ justifyContent: 'flex-start' }}>
                        <Download size={16} />
                        Export Data
                    </button>
                    <button className="btn btn-secondary btn-full" onClick={handleImport} style={{ justifyContent: 'flex-start' }}>
                        <Upload size={16} />
                        Import Data
                    </button>
                    <button
                        className="btn btn-secondary btn-full"
                        onClick={() => setShowClearConfirm(true)}
                        style={{ justifyContent: 'flex-start', color: 'var(--danger)' }}
                    >
                        <Trash2 size={16} />
                        Clear All Data
                    </button>
                </div>

                {/* About */}
                <div className="section-label">About</div>
                <div className="card-flat text-center" style={{ padding: 'var(--space-6)' }}>
                    <div className="text-heading">Tempo</div>
                    <div className="text-caption mt-1">Version 0.1.0</div>
                    <div className="text-caption mt-1">100% Offline — Your data stays on your device</div>
                </div>

                {exportStatus && <div className="toast">{exportStatus}</div>}
            </div>

            <BottomNav />

            {/* Clear Confirm */}
            {showClearConfirm && (
                <div className="dialog-backdrop" onClick={() => setShowClearConfirm(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="flex items-center justify-center shrink-0"
                                style={{
                                    width: 40, height: 40,
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--danger-muted)',
                                    color: 'var(--danger)',
                                }}
                            >
                                <AlertTriangle size={20} />
                            </div>
                            <div className="dialog-title">Clear All Data?</div>
                        </div>
                        <div className="dialog-body">
                            This will permanently delete all activities, sessions, and reports. This action cannot be undone.
                        </div>
                        <div className="dialog-actions">
                            <button className="btn btn-danger btn-full" onClick={handleClear}>
                                Clear Everything
                            </button>
                            <button className="btn btn-ghost btn-full" onClick={() => setShowClearConfirm(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Setting Row ───

function SettingRow({
    label,
    caption,
    children,
}: {
    label: string;
    caption?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="card-flat flex items-center justify-between" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{label}</div>
                {caption && <div className="text-caption mt-1">{caption}</div>}
            </div>
            {children}
        </div>
    );
}
