'use client';

import { fileReturn, unfileReturn } from '@/lib/actions';
import { formatDate, formatMoney, todayInItaly } from '@/lib/format';
import type { ReturnGuide } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';

/**
 * After filing: the date the return was filed and the credits it put in the credit registry, or the form that marks it
 * as filed. Going back asks for a confirmation, since it removes the credits.
 */
export function ReturnFiling({ year, filed }: { year: number; filed: ReturnGuide['filed'] }) {
  if (!filed) {
    return (
      <form action={fileReturn} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="year" value={year} />
        <Field label="Data di presentazione" htmlFor="filed-on">
          <Input id="filed-on" name="filedOn" type="date" required max={todayInItaly()} defaultValue={todayInItaly()} className="w-44" />
        </Field>
        <Button type="submit">Segna come presentata</Button>
      </form>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <p>Presentata il <strong>{formatDate(filed.filedOn)}</strong>.</p>
      {filed.credits.length > 0 ? (
        <ul className="list-disc pl-5">
          {filed.credits.map((c) => <li key={c.id}>Credito <span className="font-mono">{c.code}</span> {c.referenceYear}: {formatMoney(c.amount)}</li>)}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nessun credito da registrare.</p>
      )}
      {filed.credits.length > 0 && <p>I crediti sono nel registro dei <Link href="/credits" className="underline">Crediti</Link> e si usano nelle compensazioni degli F24.</p>}
      <form action={unfileReturn} onSubmit={(e) => { if (!window.confirm('Annullare la presentazione? I crediti registrati da questa dichiarazione vengono tolti.')) e.preventDefault(); }}>
        <input type="hidden" name="year" value={year} />
        <Button type="submit" variant="outline" size="sm">Annulla la presentazione</Button>
      </form>
    </div>
  );
}
