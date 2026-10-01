'use client';

import { useActionState } from 'react';
import { saveBankAccount } from '@/lib/actions';
import type { BankAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';

export function BankForm({ account, first }: { account?: BankAccount; first?: boolean }) {
  const [state, action, pending] = useActionState(saveBankAccount, undefined);
  const b = account;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <ErrorAlert message={state?.error} />
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label="Nome" htmlFor="name"><Input id="name" name="name" required placeholder="Conto principale" defaultValue={b?.name ?? ''} /></Field>
      <Field label="Banca" htmlFor="bankName"><Input id="bankName" name="bankName" defaultValue={b?.bankName ?? ''} /></Field>
      <Field label="IBAN" htmlFor="iban"><Input id="iban" name="iban" required defaultValue={b?.iban ?? ''} /></Field>
      <Field label="BIC" htmlFor="bic"><Input id="bic" name="bic" defaultValue={b?.bic ?? ''} /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox name="isDefault" defaultChecked={b ? b.isDefault : first} /> Banca predefinita (proposta sulle nuove fatture)</label>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : b ? 'Salva modifiche' : 'Aggiungi banca'}</Button></div>
    </form>
  );
}
