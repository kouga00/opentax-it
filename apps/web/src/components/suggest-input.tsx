'use client';

import { Autocomplete } from '@base-ui/react/autocomplete';
import { ChevronDownIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

export interface Suggestion {
  value: string;
  /** What the value is, shown under it. */
  label: string;
}

/**
 * A text field with a dropdown of suggestions (Base UI Autocomplete): picking one fills the field, typing anything else
 * is kept as is. For values that no public list holds, such as the personal INPS codes, but that the user has already
 * saved elsewhere. The popup looks like the searchable select (components/ui/combobox.tsx).
 */
export function SuggestInput({ id, value, onValueChange, suggestions, placeholder, inputMode }: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <Autocomplete.Root items={suggestions} value={value} onValueChange={(v) => onValueChange(v)} itemToStringValue={(s: Suggestion) => s.value} openOnInputClick>
      <InputGroup className="w-full">
        <Autocomplete.Input id={id} placeholder={placeholder} inputMode={inputMode} render={<InputGroupInput />} />
        {suggestions.length > 0 && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" variant="ghost" aria-label="Mostra i suggerimenti" render={<Autocomplete.Trigger />} nativeButton>
              <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner className="isolate z-50" sideOffset={6} align="start">
          <Autocomplete.Popup className="max-h-(--available-height) w-(--anchor-width) min-w-64 max-w-(--available-width) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Autocomplete.List className="max-h-[min(18rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0">
              {(s: Suggestion) => (
                <Autocomplete.Item key={`${s.value}-${s.label}`} value={s} className="flex cursor-default flex-col rounded-md px-2 py-1.5 outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">
                  <span className="font-mono text-sm">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
