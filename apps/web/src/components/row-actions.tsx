'use client';

import type { ReactElement, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Right-aligned container for the icon actions of a table row (the standard of every table). */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-1">{children}</div>;
}

/** Icon button with a tooltip: a link when `render` is given, a plain button with `onClick`, otherwise a native submit button. */
export function RowAction({ label, render, onClick, destructive, children }: { label: string; render?: ReactElement; onClick?: () => void; destructive?: boolean; children: ReactElement }) {
  const variant = destructive ? 'destructive' : 'ghost';
  const button = render
    ? <Button variant={variant} size="icon-sm" aria-label={label} render={render} />
    : <Button variant={variant} size="icon-sm" aria-label={label} type={onClick ? 'button' : 'submit'} onClick={onClick} />;
  return (
    <Tooltip>
      <TooltipTrigger render={button}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type FormAction = (formData: FormData) => void | Promise<void>;

/** Icon button that submits `action` with the given hidden fields, after a confirmation. */
export function ConfirmRowAction({ action, fields, label, confirm, destructive, children }: { action: FormAction; fields: Record<string, string>; label: string; confirm: string; destructive?: boolean; children: ReactElement }) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }}>
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <RowAction label={label} destructive={destructive}>{children}</RowAction>
    </form>
  );
}

/** Red trash icon that deletes after a confirmation. */
export function DeleteRowAction({ label = 'Elimina', ...props }: { action: FormAction; fields: Record<string, string>; label?: string; confirm: string }) {
  return <ConfirmRowAction {...props} label={label} destructive><Trash2 /></ConfirmRowAction>;
}
