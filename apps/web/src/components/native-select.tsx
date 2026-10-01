import { cn } from 'cn';
import type { SelectHTMLAttributes } from 'react';

/** Native <select> styled like the shadcn Input, so it works inside plain forms and server actions. */
export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
