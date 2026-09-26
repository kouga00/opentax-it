'use client';

import { Children, createContext, useContext, useTransition, type ReactElement, type ReactNode } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Most actions a row shows: beyond it the first ones stay as icons and the rest go in a "⋯" menu. */
const MAX_VISIBLE = 3;

/** Whether an action is drawn as an icon button in the row or as an item of the "⋯" menu. */
const PlacementContext = createContext<'inline' | 'menu'>('inline');

/**
 * Actions of a table row (the standard of every table), right-aligned. Up to three actions are icon buttons with a
 * tooltip; with more, the first two stay as icons and the others go in a "⋯" menu, so the column never takes more
 * than three places. Actions that open a dialog keep the dialog outside this component (a menu closes on click),
 * with its open state held by the row, as the invoice list does.
 */
export function RowActions({ children }: { children: ReactNode }) {
  const actions = Children.toArray(children);
  const inline = actions.length > MAX_VISIBLE ? actions.slice(0, MAX_VISIBLE - 1) : actions;
  const overflow = actions.length > MAX_VISIBLE ? actions.slice(MAX_VISIBLE - 1) : [];
  return (
    <div className="flex justify-end gap-1">
      <PlacementContext.Provider value="inline">{inline}</PlacementContext.Provider>
      {overflow.length > 0 && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Altre azioni" />} />}><MoreHorizontal /></TooltipTrigger>
            <TooltipContent>Altre azioni</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-auto">
            <PlacementContext.Provider value="menu">{overflow}</PlacementContext.Provider>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** An action: a link when `render` is given (a Next.js Link or an <a>), otherwise it runs `onClick`. */
export function RowAction({ label, render, onClick, destructive, disabled, children }: { label: string; render?: ReactElement; onClick?: () => void; destructive?: boolean; disabled?: boolean; children: ReactElement }) {
  const placement = useContext(PlacementContext);
  if (placement === 'menu') {
    return (
      <DropdownMenuItem render={render} onClick={onClick} variant={destructive ? 'destructive' : 'default'} disabled={disabled}>
        {children}
        {label}
      </DropdownMenuItem>
    );
  }
  const variant = destructive ? 'destructive' : 'ghost';
  const button = render
    ? <Button variant={variant} size="icon-sm" aria-label={label} render={render} />
    : <Button variant={variant} size="icon-sm" aria-label={label} type="button" onClick={onClick} disabled={disabled} />;
  return (
    <Tooltip>
      <TooltipTrigger render={button}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type FormAction = (formData: FormData) => void | Promise<void>;

/**
 * Action that runs the server action `action` with the given fields, after a confirmation. The action is called
 * directly rather than through a form, so that it works both as an icon and as a menu item (which unmounts as soon
 * as it is clicked).
 */
export function ConfirmRowAction({ action, fields, label, confirm, destructive, children }: { action: FormAction; fields: Record<string, string>; label: string; confirm: string; destructive?: boolean; children: ReactElement }) {
  const [pending, startTransition] = useTransition();
  const run = () => {
    if (!window.confirm(confirm)) return;
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    startTransition(() => action(data));
  };
  return <RowAction label={label} onClick={run} destructive={destructive} disabled={pending}>{children}</RowAction>;
}

/** Red trash action that deletes after a confirmation. */
export function DeleteRowAction({ label = 'Elimina', ...props }: { action: FormAction; fields: Record<string, string>; label?: string; confirm: string }) {
  return <ConfirmRowAction {...props} label={label} destructive><Trash2 /></ConfirmRowAction>;
}
