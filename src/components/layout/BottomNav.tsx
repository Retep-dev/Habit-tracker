'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Play, BarChart3, Settings } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/plan', label: 'Plan', icon: CalendarDays },
    { href: '/', label: 'Today', icon: Play },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                    return (
                        <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                            <Icon className="nav-icon" />
                            <span className="nav-label">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
