'use client';

import { useEffect, useState } from 'react';

/** e.g. "21 Settembre 2026 - ore 15.53" (Europe/Rome). */
function format(d: Date) {
  const date = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).format(d);
  const time = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(d).replace(':', '.');
  const capitalized = date.replace(/ (\p{L})/u, (m) => m.toUpperCase());
  return `${capitalized} - ore ${time}`;
}

/** Wall clock (date, hours and minutes, Europe/Rome), refreshed every 15 s. Rendered only on the client to avoid hydration mismatches. */
export function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(format(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="text-sm tabular-nums text-muted-foreground" aria-label="Data e ora correnti">
      {time ?? '—'}
    </time>
  );
}
