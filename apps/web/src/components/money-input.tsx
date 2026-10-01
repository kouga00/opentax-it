import type { ComponentProps } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

/**
 * An amount in euros: a number field with two decimals and the € sign, positive by default. For the amounts of F24 rows
 * and payments; the value stays a string, as the form state holds it.
 */
export function MoneyInput({ min = '0.01', ...props }: Omit<ComponentProps<typeof InputGroupInput>, 'type'>) {
  return (
    <InputGroup>
      <InputGroupInput type="number" step="0.01" min={min} inputMode="decimal" placeholder="0,00" className="text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" {...props} />
      <InputGroupAddon align="inline-end"><InputGroupText>€</InputGroupText></InputGroupAddon>
    </InputGroup>
  );
}
