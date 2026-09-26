'use client';

import { useActionState } from 'react';
import { savePaymentTerms } from '@/lib/actions';
import type { PaymentTerms } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { NativeSelect } from '@/components/native-select';
import { ErrorAlert } from '@/components/error-alert';
import { PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';

export function TermsForm({ terms, first }: { terms?: PaymentTerms; first?: boolean }) {
  const [state, action, pending] = useActionState(savePaymentTerms, undefined);
  const t = terms;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <ErrorAlert message={state?.error} />
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Nome" htmlFor="name"><Input id="name" name="name" required placeholder="Bonifico 10 gg d.f." defaultValue={t?.name ?? ''} /></Field>
      <Field label="Giorni dalla data fattura" htmlFor="days"><Input id="days" name="days" type="number" min={0} max={365} required defaultValue={t?.days ?? 10} /></Field>
      <Field label="Modalità (ModalitaPagamento)" htmlFor="method">
        <NativeSelect id="method" name="method" defaultValue={t?.method ?? 'MP05'}>
          {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.code} · {o.label}</option>)}
        </NativeSelect>
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><Checkbox name="isDefault" defaultChecked={t ? t.isDefault : first} /> Profilo predefinito (usato quando la fattura non ne indica uno)</label>
      <div className="sm:col-span-3"><Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : t ? 'Salva modifiche' : 'Aggiungi profilo'}</Button></div>
    </form>
  );
}
