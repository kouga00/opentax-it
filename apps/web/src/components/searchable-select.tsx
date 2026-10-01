'use client';

import { useMemo } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';

export interface SearchableOption {
  value: string;
  label: string;
}

/**
 * A select whose options can be filtered by typing (Base UI Combobox, via the shadcn wrapper): for long lists such as
 * the F24 reasons. The selected value is the option's `value`; typing matches the label.
 */
export function SearchableSelect({ id, options, value, onValueChange, placeholder = 'Cerca…', empty = 'Nessun risultato' }: {
  id?: string;
  options: SearchableOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  empty?: string;
}) {
  // Values are the option codes; the labels are used for display, filtering and typeahead.
  const items = useMemo(() => ComboboxPrimitive.createItems(options, { getValue: (o) => o.value, getLabel: (o) => o.label }), [options]);
  return (
    <Combobox items={items} value={value || null} onValueChange={(v) => onValueChange((v as string | null) ?? '')}>
      {/* Selecting the text on focus lets typing replace the chosen label and filter the options. */}
      <ComboboxInput id={id} placeholder={placeholder} className="w-full" onFocus={(e) => e.currentTarget.select()} />
      <ComboboxContent>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {(o: SearchableOption) => (
            <ComboboxItem key={o.value} value={o.value}>
              {o.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
