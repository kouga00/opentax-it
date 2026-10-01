'use client';

import { useActionState, useState } from 'react';
import { saveTaxCredit } from '@/lib/actions';
import type { TaxCredit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { Help } from '@/components/help';
import { NativeSelect } from '@/components/native-select';

export function CreditForm({ credit, defaultYear }: { credit?: TaxCredit; defaultYear: number }) {
  const [state, action, pending] = useActionState(saveTaxCredit, undefined);
  const c = credit;
  const [section, setSection] = useState<string>(c?.section ?? 'TREASURY');
  const local = section === 'REGIONAL' || section === 'LOCAL';
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <ErrorAlert message={state?.error} />
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Sezione F24" htmlFor="section">
        <NativeSelect id="section" name="section" value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="TREASURY">Erario</option>
          <option value="INPS">INPS</option>
          <option value="REGIONAL">Regioni</option>
          <option value="LOCAL">IMU e altri tributi locali</option>
        </NativeSelect>
      </Field>
      <Field label={section === 'INPS' ? 'Causale' : 'Codice tributo'} htmlFor="code" help={<Help topic="creditCode" />}>
        <Input id="code" name="code" required placeholder={section === 'INPS' ? 'PXX' : '4001'} defaultValue={c?.code ?? ''} />
      </Field>
      <Field label="Anno di riferimento" htmlFor="referenceYear"><Input id="referenceYear" name="referenceYear" type="number" required defaultValue={c?.referenceYear ?? defaultYear} /></Field>
      <Field label="Importo" htmlFor="amount"><Input id="amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={c ? Number(c.amount) : undefined} /></Field>
      {local && (
        <Field label={section === 'REGIONAL' ? 'Codice regione' : 'Codice ente / comune'} htmlFor="localCode" help={<Help topic="creditLocalCode" />}>
          <Input id="localCode" name="localCode" required maxLength={4} defaultValue={c?.localCode ?? ''} />
        </Field>
      )}
      {section !== 'INPS' && (
        <Field label="Rateazione (colonna F24)" htmlFor="installmentCode" hint="0101 nei modelli visti"><Input id="installmentCode" name="installmentCode" defaultValue={c ? (c.installmentCode ?? '') : '0101'} pattern="\d{4}" /></Field>
      )}
      <Field label="Utilizzabile dal" htmlFor="usableFrom" help={<Help topic="creditUsableFrom" />}>
        <Input id="usableFrom" name="usableFrom" type="date" defaultValue={c?.usableFrom?.slice(0, 10) ?? ''} />
      </Field>
      <Field label="Descrizione" htmlFor="description"><Input id="description" name="description" placeholder="Credito IRPEF da Redditi 2026" defaultValue={c?.description ?? ''} /></Field>
      <div className="sm:col-span-3"><Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : c ? 'Salva modifiche' : 'Aggiungi credito'}</Button></div>
    </form>
  );
}
