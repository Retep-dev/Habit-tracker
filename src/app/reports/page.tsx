'use client';

import { useState, useEffect } from 'react';
import { format, subDays, addDays, subWeeks, addWeeks } from 'date-fns';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    ResponsiveContainer, CartesianGrid, Tooltip, ComposedChart, Line,
} from 'recharts';
import {
    ChevronLeft, ChevronRight, Trophy, TrendingDown, Repeat,
    AlertTriangle, CheckCircle2, XCircle, Clock, Inbox,
    BarChart3, List,
} from 'lucide-react';
import { formatDate, getWeekId, getWeekDates, formatDuration } from '@/lib/constants';
import { generateDailyReport, generateWeeklyReport } from '@/services/reportGenerator';
import type { DailyReport, WeeklyReport } from '@/lib/models';
import BottomNav from '@/components/layout/BottomNav';

const CHART_COLORS = ['#7C6AFF', '#34C759', '#FF9F0A', '#FF3B30', '#06B6D4', '#EC4899'];

export default function ReportsPage() {
    const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
    const [dateRef, setDateRef] = useState(new Date());
    const [viewMode, setViewMode] = useState<'graph' | 'details'>('graph');

    const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
    const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
    const [loading, setLoading] = useState(true);

    const dateStr = formatDate(dateRef);
    const weekId = getWeekId(dateRef);

    useEffect(() => {
        setLoading(true);
        if (tab === 'daily') {
            generateDailyReport(dateStr).then((r) => { setDailyReport(r); setLoading(false); });
        } else {
            generateWeeklyReport(weekId).then((r) => { setWeeklyReport(r); setLoading(false); });
        }
    }, [tab, dateStr, weekId]);

    const navDate = (dir: 'prev' | 'next') => {
        if (tab === 'daily') {
            setDateRef((d) => dir === 'next' ? addDays(d, 1) : subDays(d, 1));
        } else {
            setDateRef((d) => dir === 'next' ? addWeeks(d, 1) : subWeeks(d, 1));
        }
    };

    return (
        <>
            <div className="page">
                <div className="page-header">
                    <h1 className="text-title">Reports</h1>
                </div>

                {/* Tab Switcher */}
                <div className="tab-group mb-4">
                    <button className={`tab-item ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
                        Daily
                    </button>
                    <button className={`tab-item ${tab === 'weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>
                        Weekly
                    </button>
                </div>

                {/* Date Nav */}
                <div className="flex items-center justify-between mb-4">
                    <button className="btn-icon" onClick={() => navDate('prev')}>
                        <ChevronLeft size={20} />
                    </button>
                    <p className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {tab === 'daily'
                            ? format(dateRef, 'EEEE, MMM d')
                            : `Week of ${format(getWeekDates(weekId).start, 'MMM d')}`
                        }
                    </p>
                    <button className="btn-icon" onClick={() => navDate('next')}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <Clock className="empty-state-icon animate-pulse-subtle" size={36} strokeWidth={1.25} />
                        <div className="empty-state-title">Generating report</div>
                    </div>
                ) : tab === 'daily' && dailyReport ? (
                    <DailyView report={dailyReport} viewMode={viewMode} onViewModeChange={setViewMode} />
                ) : tab === 'weekly' && weeklyReport ? (
                    <WeeklyView report={weeklyReport} />
                ) : (
                    <div className="empty-state">
                        <Inbox className="empty-state-icon" size={40} strokeWidth={1.25} />
                        <div className="empty-state-title">No data for this period</div>
                        <div className="empty-state-desc">Plan and track activities to see your report.</div>
                    </div>
                )}
            </div>
            <BottomNav />
        </>
    );
}

// ─── Daily View ───

function DailyView({
    report, viewMode, onViewModeChange,
}: {
    report: DailyReport;
    viewMode: 'graph' | 'details';
    onViewModeChange: (v: 'graph' | 'details') => void;
}) {
    const pieData = [
        { name: 'Completed', value: report.completionPercent },
        { name: 'Remaining', value: 100 - report.completionPercent },
    ];

    const catData = report.categoryBreakdown.map((c) => ({
        name: c.categoryName,
        planned: c.plannedMin,
        actual: c.actualMin,
    }));

    return (
        <div className="flex flex-col gap-4 animate-fade-in">
            {/* View Toggle */}
            <div className="tab-group" style={{ maxWidth: '200px' }}>
                <button className={`tab-item ${viewMode === 'graph' ? 'active' : ''}`} onClick={() => onViewModeChange('graph')}>
                    <BarChart3 size={14} style={{ marginRight: '4px' }} />
                    Graph
                </button>
                <button className={`tab-item ${viewMode === 'details' ? 'active' : ''}`} onClick={() => onViewModeChange('details')}>
                    <List size={14} style={{ marginRight: '4px' }} />
                    Details
                </button>
            </div>

            {viewMode === 'graph' ? (
                <>
                    {/* Completion Ring */}
                    <div className="card text-center">
                        <div style={{ width: 160, height: 160, margin: '0 auto' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={55}
                                        outerRadius={75}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                        strokeWidth={0}
                                    >
                                        <Cell fill="var(--accent)" />
                                        <Cell fill="var(--bg-elevated)" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ marginTop: -100, position: 'relative' }}>
                            <div className="text-number" style={{ fontSize: 'var(--text-3xl)', color: 'var(--accent)', fontWeight: 600 }}>
                                {report.completionPercent}%
                            </div>
                            <div className="text-caption">completed</div>
                        </div>

                        <div className="flex" style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                            <div className="text-center flex-1">
                                <div className="text-number" style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                                    {formatDuration(report.totalPlannedMin)}
                                </div>
                                <div className="text-caption">Planned</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="text-number" style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                                    {formatDuration(report.totalActualMin)}
                                </div>
                                <div className="text-caption">Actual</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="text-number" style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                                    {report.activitiesMissed}
                                </div>
                                <div className="text-caption">Missed</div>
                            </div>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    {catData.length > 0 && (
                        <div className="card">
                            <div className="text-subheading mb-4">Category Breakdown</div>
                            <ResponsiveContainer width="100%" height={catData.length * 48 + 16}>
                                <BarChart data={catData} layout="vertical" margin={{ left: 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                                    <XAxis type="number" stroke="var(--text-quaternary)" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="var(--text-tertiary)" fontSize={11} width={76} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '12px',
                                            boxShadow: 'var(--shadow-md)',
                                        }}
                                        formatter={(value: unknown) => formatDuration(value as number)}
                                    />
                                    <Bar dataKey="planned" fill="var(--bg-hover)" radius={[0, 3, 3, 0]} name="Planned" />
                                    <Bar dataKey="actual" fill="var(--accent)" radius={[0, 3, 3, 0]} name="Actual" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col gap-2">
                    {report.activitySummaries.map((a) => {
                        const StatusIcon = a.status === 'completed' || a.status === 'auto_completed'
                            ? CheckCircle2 : a.status === 'missed' || a.status === 'dismissed'
                                ? XCircle : Clock;
                        const statusColor = a.status === 'completed' || a.status === 'auto_completed'
                            ? 'var(--success)' : a.status === 'missed' || a.status === 'dismissed'
                                ? 'var(--danger)' : 'var(--text-quaternary)';
                        const badgeClass = a.status === 'completed' || a.status === 'auto_completed'
                            ? 'badge-success' : a.status === 'missed' || a.status === 'dismissed'
                                ? 'badge-danger' : 'badge-neutral';

                        return (
                            <div key={a.activityId} className="card-flat">
                                <div className="flex items-center gap-3">
                                    <StatusIcon size={18} strokeWidth={1.75} style={{ color: statusColor, flexShrink: 0 }} />
                                    <div className="flex-1" style={{ minWidth: 0 }}>
                                        <div className="text-subheading truncate">{a.title}</div>
                                        <div className="text-caption mt-1">
                                            <span className="text-mono">{a.plannedStartTime} – {a.plannedEndTime}</span>
                                            <span> · {formatDuration(a.plannedDurationMin)}</span>
                                        </div>
                                        {a.actualDurationMin > 0 && (
                                            <div className="text-caption">
                                                Actual: {formatDuration(a.actualDurationMin)} ({a.completionPercent}%)
                                            </div>
                                        )}
                                    </div>
                                    <span className={`badge ${badgeClass}`}>{a.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                        );
                    })}
                    {report.activitySummaries.length === 0 && (
                        <div className="empty-state">
                            <Inbox className="empty-state-icon" size={36} strokeWidth={1.25} />
                            <div className="empty-state-title">No activities recorded</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Weekly View ───

function WeeklyView({ report }: { report: WeeklyReport }) {
    const trendData = report.dailyScores.map((d) => ({
        day: format(new Date(d.date), 'EEE'),
        completion: d.completionPercent,
    }));

    const catPieData = report.categoryTrends.map((c, i) => ({
        name: c.categoryName,
        value: c.actualMin,
        color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return (
        <div className="flex flex-col gap-4 animate-fade-in">
            {/* Overview */}
            <div className="card">
                <div className="text-subheading mb-4">Overview</div>
                <div className="flex">
                    <div className="text-center flex-1">
                        <div className="text-number" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                            {formatDuration(report.totalPlannedMin)}
                        </div>
                        <div className="text-caption">Planned</div>
                    </div>
                    <div className="text-center flex-1">
                        <div className="text-number" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                            {formatDuration(report.totalActualMin)}
                        </div>
                        <div className="text-caption">Actual</div>
                    </div>
                    <div className="text-center flex-1">
                        <div className="text-number" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--accent)' }}>
                            {report.avgCompletionPercent}%
                        </div>
                        <div className="text-caption">Average</div>
                    </div>
                </div>
            </div>

            {/* Daily Trend */}
            {trendData.length > 0 && (
                <div className="card">
                    <div className="text-subheading mb-4">Daily Trend</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <ComposedChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                            <XAxis dataKey="day" stroke="var(--text-quaternary)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-quaternary)" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '12px',
                                    boxShadow: 'var(--shadow-md)',
                                }}
                            />
                            <Bar dataKey="completion" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Completion %" opacity={0.5} />
                            <Line
                                type="monotone" dataKey="completion"
                                stroke="var(--accent)" strokeWidth={2}
                                dot={{ fill: 'var(--bg-card)', stroke: 'var(--accent)', strokeWidth: 2, r: 4 }}
                                name="Trend"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Insights */}
            <div className="card">
                <div className="text-subheading mb-4">Insights</div>
                <div className="flex flex-col gap-4">
                    {report.bestDay && (
                        <InsightRow
                            icon={<Trophy size={18} strokeWidth={1.75} />}
                            iconColor="var(--success)"
                            label="Best Day"
                            value={`${format(new Date(report.bestDay.date), 'EEEE')} — ${report.bestDay.percent}%`}
                        />
                    )}
                    {report.worstDay && (
                        <InsightRow
                            icon={<TrendingDown size={18} strokeWidth={1.75} />}
                            iconColor="var(--warning)"
                            label="Needs Improvement"
                            value={`${format(new Date(report.worstDay.date), 'EEEE')} — ${report.worstDay.percent}%`}
                        />
                    )}
                    {report.mostConsistentActivity && (
                        <InsightRow
                            icon={<Repeat size={18} strokeWidth={1.75} />}
                            iconColor="var(--accent)"
                            label="Most Consistent"
                            value={`${report.mostConsistentActivity.title} — ${report.mostConsistentActivity.completionRate}%`}
                        />
                    )}
                    {report.mostMissedActivity && (
                        <InsightRow
                            icon={<AlertTriangle size={18} strokeWidth={1.75} />}
                            iconColor="var(--danger)"
                            label="Most Missed"
                            value={`${report.mostMissedActivity.title} — ${report.mostMissedActivity.missRate}% miss rate`}
                        />
                    )}
                </div>
            </div>

            {/* Summary */}
            {report.writtenSummary && (
                <div className="card" style={{ borderLeft: '2px solid var(--accent)' }}>
                    <p className="text-body" style={{ lineHeight: 'var(--leading-relaxed)' }}>
                        {report.writtenSummary}
                    </p>
                </div>
            )}

            {/* Category Pie */}
            {catPieData.length > 0 && (
                <div className="card">
                    <div className="text-subheading mb-4">Time by Category</div>
                    <div style={{ width: 160, height: 160, margin: '0 auto' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={catPieData} innerRadius={48} outerRadius={74} dataKey="value" strokeWidth={0}>
                                    {catPieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '12px',
                                        boxShadow: 'var(--shadow-md)',
                                    }}
                                    formatter={(value: unknown) => formatDuration(value as number)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                        {catPieData.map((c, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div
                                    className="shrink-0"
                                    style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: c.color }}
                                />
                                <span className="text-body flex-1" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                                    {c.name}
                                </span>
                                <span className="text-mono">{formatDuration(c.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function InsightRow({
    icon, iconColor, label, value,
}: {
    icon: React.ReactNode;
    iconColor: string;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div
                className="flex items-center justify-center shrink-0"
                style={{
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
                    color: iconColor,
                }}
            >
                {icon}
            </div>
            <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="text-caption" style={{ marginBottom: 1 }}>{label}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{value}</div>
            </div>
        </div>
    );
}
