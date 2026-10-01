'use client';

import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Section of the rule set shown in the rules page: choosing one opens `<baseHref>&section=<key>`. */
export function SectionSelect({ items, value, baseHref }: { items: Array<{ value: string; label: string }>; value: string; baseHref: string }) {
  const router = useRouter();
  return (
    <Select items={items} value={value} onValueChange={(v) => v && router.push(`${baseHref}&section=${v}`, { scroll: false })}>
      <SelectTrigger aria-label="Sezione" className="min-w-72">
        <span className="text-muted-foreground">Sezione</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start" className="min-w-(--anchor-width)">
        {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
