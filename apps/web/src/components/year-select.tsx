'use client';

import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Year picker of a page: choosing a year opens `path?year=<year>`, dropping the other query
 * parameters (they belong to the year that was shown, e.g. a rule set or a plan preview).
 */
export function YearSelect({ years, value, path, label = 'Anno' }: { years: number[]; value: number; path: string; label?: string }) {
  const router = useRouter();
  const items = years.map((y) => ({ value: String(y), label: String(y) }));
  return (
    <Select items={items} value={String(value)} onValueChange={(v) => v && router.push(`${path}?year=${v}`)}>
      <SelectTrigger aria-label={label} className="min-w-28">
        <span className="text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      {/* Opens below the trigger, as wide as it, instead of over it (the Base UI default covers the label). */}
      <SelectContent alignItemWithTrigger={false} align="end" className="min-w-(--anchor-width)">
        {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
