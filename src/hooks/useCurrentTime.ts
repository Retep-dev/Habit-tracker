'use client';

import { useState, useEffect, useCallback } from 'react';

export function useCurrentTime(intervalMs: number = 1000) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);

    const currentTime24 = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return { now, currentTime24 };
}

export function useElapsedTime(startTimestamp: number | null) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTimestamp) {
            setElapsed(0);
            return;
        }

        const update = () => setElapsed(Math.floor((Date.now() - startTimestamp) / 1000));
        update();

        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [startTimestamp]);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    const formatted = hours > 0
        ? `${hours}h ${String(minutes).padStart(2, '0')}m`
        : `${minutes}m ${String(seconds).padStart(2, '0')}s`;

    return { elapsed, hours, minutes, seconds, formatted };
}
