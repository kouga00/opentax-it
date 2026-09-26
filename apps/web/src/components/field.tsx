import { Label } from '@/components/ui/label';
import type { ReactNode } from 'react';

export function Field({ label, htmlFor, hint, help, children }: { label: string; htmlFor?: string; hint?: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="gap-1.5">{label}{help}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
