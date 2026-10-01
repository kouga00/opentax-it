'use client';

import type { ReactNode } from 'react';
import { Tabs } from '@/components/ui/tabs';

/**
 * Tabs of the settings page that keep the chosen tab in the URL (?tab=), so that a reload or a shared link opens the
 * same tab. window.history.replaceState integrates with the Next.js router and adds no history entry per click.
 */
export function SetupTabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const onValueChange = (value: unknown) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', String(value));
    window.history.replaceState(null, '', url);
  };
  return <Tabs defaultValue={defaultValue} onValueChange={onValueChange}>{children}</Tabs>;
}
