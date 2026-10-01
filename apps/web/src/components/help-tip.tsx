import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Small info icon with a tooltip; content can include links to official sources. With `trigger` (e.g. a status badge)
 * the tooltip opens on that element instead of the icon.
 */
export function HelpTip({ children, label = 'Informazioni', className, trigger }: { children: ReactNode; label?: string; className?: string; trigger?: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={trigger
          ? <button type="button" aria-label={label} className={cn('inline-flex cursor-help align-middle', className)} />
          : <button type="button" aria-label={label} className={cn('inline-flex align-middle text-muted-foreground hover:text-foreground', className)} />}
      >
        {trigger ?? <Info className="size-3.5" />}
      </TooltipTrigger>
      {/*
        Help texts are paragraphs, not labels: a light card like a popover, larger text and line height, links in the
        primary colour. Block layout, since the base tooltip is a flex row that would put paragraphs side by side; the
        arrow (the popup's last child) is hidden, as it keeps the dark colour of the base tooltip.
      */}
      <TooltipContent className="block max-w-[min(28rem,calc(100vw-2rem))] space-y-2 rounded-lg border bg-popover px-4 py-3 text-[13px] leading-relaxed text-popover-foreground shadow-lg [&>:last-child]:hidden [&_a]:font-medium [&_a]:text-primary [&_strong]:font-semibold">{children}</TooltipContent>
    </Tooltip>
  );
}
