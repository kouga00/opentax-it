'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createContributionF24 } from '@/lib/actions';
import type { ContributionCodes, ContributionReason, KnownInpsCode, OtherEntity } from '@/lib/types';
import { todayInItaly } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorAlert } from '@/components/error-alert';
import { Field } from '@/components/field';
import { Help } from '@/components/help';
import { NativeSelect } from '@/components/native-select';
import { SearchableSelect } from '@/components/searchable-select';
import { SuggestInput } from '@/components/suggest-input';
import { MoneyInput } from '@/components/money-input';

interface Row {
  entityCode: string;
  reason: string;
  positionCode: string;
  periodFrom: string;
  periodTo: string;
  amount: string;
  deductibleAmount: string;
}

/** Rows the official model has: four in the INPS section, two in the "Altri enti" second box (one entity per form). */
const MAX_ROWS = { INPS: 4, OTHER_ENTITY: 2 } as const;

/**
 * An F24 of contributions as the entity communicates them: the INPS section for Artigiani and Commercianti (payment
 * notices, previous years...), the "Altri enti previdenziali" section for the professional funds with an F24 code.
 * The API checks every row against the entity's rules (packages/fiscal-rules, contribution-rows.ts).
 */
export function ContributionF24Form({ codes, section, officeCode, fundType, knownInpsCodes = [], inpsKind }: { codes: ContributionCodes; section: 'INPS' | 'OTHER_ENTITY'; officeCode?: string; fundType?: string | null; /** INPS section: only the reasons of the profile's scheme (artisans' reasons start with A, traders' with C). */ inpsKind?: 'ARTISANS' | 'TRADERS'; /** INPS codes saved in the year data, suggested in the code field (the codes are personal: no public list exists). */ knownInpsCodes?: KnownInpsCode[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const defaultEntity = codes.otherEntities.find((e) => e.fundType === fundType) ?? codes.otherEntities[0];
  const [entityCode, setEntityCode] = useState(defaultEntity?.code ?? '');
  const entity: OtherEntity | undefined = codes.otherEntities.find((e) => e.code === entityCode);
  const reasons: ContributionReason[] = useMemo(() => (section === 'INPS' ? codes.selfEmployedReasons.filter((x) => !inpsKind || x.code.startsWith(inpsKind === 'ARTISANS' ? 'A' : 'C')) : (entity?.reasons ?? [])), [section, codes, entity, inpsKind]);
  const reasonOptions = useMemo(() => reasons.map((x) => ({ value: x.code, label: `${x.code} · ${x.description}` })), [reasons]);
  const year = new Date().getFullYear();
  const empty = (): Row => ({ entityCode, reason: '', positionCode: '', periodFrom: entity?.period === 'YEAR' ? String(year) : `01/${year}`, periodTo: entity?.period === 'YEAR' ? '' : `12/${year}`, amount: '', deductibleAmount: '' });
  const [paymentDate, setPaymentDate] = useState(todayInItaly());
  const [rows, setRows] = useState<Row[]>([empty()]);
  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const yearOnly = section === 'OTHER_ENTITY' && entity?.period === 'YEAR';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const res = await createContributionF24({
        paymentDate,
        lines: rows.map((r) => ({
          section,
          entityCode: section === 'OTHER_ENTITY' ? entityCode : undefined,
          officeCode: section === 'INPS' ? officeCode : undefined,
          reason: r.reason,
          positionCode: r.positionCode || undefined,
          periodFrom: r.periodFrom || undefined,
          periodTo: yearOnly ? undefined : r.periodTo || undefined,
          amount: Number(r.amount.replace(',', '.')),
          deductibleAmount: r.deductibleAmount ? Number(r.deductibleAmount.replace(',', '.')) : undefined,
        })),
      });
      if (res.error) return setError(res.error);
      setRows([empty()]);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorAlert message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Data di pagamento" htmlFor="contributionDate"><Input id="contributionDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required /></Field>
        {section === 'OTHER_ENTITY' && (
          <Field
            label="Cassa (codice ente)"
            htmlFor="entityCode"
            help={<Help topic="otherEntityCode" params={{ periodRule: entity?.periodRule }} />}
          >
            <NativeSelect id="entityCode" value={entityCode} onChange={(e) => { setEntityCode(e.target.value); setRows([{ ...empty(), entityCode: e.target.value, reason: '' }]); }}>
              {codes.otherEntities.map((e) => <option key={e.code} value={e.code}>{e.code} · {e.name}</option>)}
            </NativeSelect>
          </Field>
        )}
        {section === 'INPS' && <Field label="Codice sede INPS" htmlFor="office" hint="Dal profilo"><Input id="office" value={officeCode ?? ''} disabled /></Field>}
      </div>
      {rows.map((r, i) => {
        const reason = reasons.find((x) => x.code === r.reason);
        return (
          <div key={i} className="grid gap-3 rounded-md border p-3 sm:grid-cols-6">
            <Field label="Causale" htmlFor={`reason-${i}`} className="sm:col-span-2">
              <SearchableSelect id={`reason-${i}`} value={r.reason} onValueChange={(reason) => set(i, { reason })} options={reasonOptions} placeholder="Cerca per codice o descrizione" />
            </Field>
            {(section === 'INPS' || entity?.positionCode === 'REQUIRED') && (
              <Field label={section === 'INPS' ? 'Codice INPS (17 cifre)' : 'Codice posizione'} htmlFor={`position-${i}`}>
                <SuggestInput id={`position-${i}`} inputMode="numeric" value={r.positionCode} onValueChange={(v) => set(i, { positionCode: v.trim() })} suggestions={section === 'INPS' ? knownInpsCodes.map((c) => ({ value: c.code, label: c.label })) : []} />
              </Field>
            )}
            <Field label={yearOnly ? 'Anno' : 'Periodo da (MM/AAAA)'} htmlFor={`from-${i}`}><Input id={`from-${i}`} inputMode="numeric" pattern={yearOnly ? '\\d{4}' : '(0[1-9]|1[0-2])/\\d{4}'} placeholder={yearOnly ? 'AAAA' : 'MM/AAAA'} value={r.periodFrom} onChange={(e) => set(i, { periodFrom: e.target.value.trim() })} /></Field>
            {!yearOnly && <Field label="a (MM/AAAA)" htmlFor={`to-${i}`}><Input id={`to-${i}`} inputMode="numeric" pattern="(0[1-9]|1[0-2])/\d{4}" placeholder="MM/AAAA" value={r.periodTo} onChange={(e) => set(i, { periodTo: e.target.value.trim() })} /></Field>}
            <Field label="Importo" htmlFor={`amount-${i}`}><MoneyInput id={`amount-${i}`} value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} required /></Field>
            {reason?.deduction === 'MIXED' && (
              <Field label="di cui deducibile" htmlFor={`deductible-${i}`} help={<Help topic="deductibleContribution" />}>
                <MoneyInput id={`deductible-${i}`} min="0" value={r.deductibleAmount} onChange={(e) => set(i, { deductibleAmount: e.target.value })} />
              </Field>
            )}
            {reason && reason.deduction !== 'YES' && reason.deduction !== 'MIXED' && (
              <p className="text-xs text-muted-foreground sm:col-span-6">
                {reason.deduction === 'NO' ? 'Non deducibile dal reddito (contributo integrativo, Ris. AdE 69/E/2006).' : 'Non viene dedotta in automatico: se è un contributo deducibile, indicala in "Contributi previdenziali versati" nella pagina Imposte.'}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        {rows.length < MAX_ROWS[section] && <Button type="button" variant="outline" onClick={() => setRows((all) => [...all, empty()])}>Aggiungi riga</Button>}
        {rows.length > 1 && <Button type="button" variant="ghost" onClick={() => setRows((all) => all.slice(0, -1))}>Togli l&apos;ultima riga</Button>}
        <Button type="submit" disabled={pending}>{pending ? 'Creazione…' : 'Crea il modello F24'}</Button>
      </div>
    </form>
  );
}
