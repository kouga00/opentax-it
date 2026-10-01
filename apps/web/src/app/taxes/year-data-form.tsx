'use client';

import { useActionState } from 'react';
import { saveTaxYearData } from '@/lib/actions';
import type { TaxSummary } from '@/lib/types';
import { formatMoney, formatPct } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { Help } from '@/components/help';

/**
 * `inpsRates` are the full and reduced INPS rates of the tax year's rule set. `contributionsComputed`: false when the
 * profile's scheme is not computed; the Gestione Separata fields are then kept as they are, without showing them.
 */
export function YearDataForm({ year, input, inpsRates, contributionsComputed, selfEmployed }: { year: number; input: TaxSummary['input']; inpsRates?: { full: number; reduced: number }; contributionsComputed: boolean; /** INPS Artigiani/Commercianti: the INPS codes of the year are asked, the Gestione Separata rate is not. */ selfEmployed?: boolean }) {
  const [state, action, pending] = useActionState(saveTaxYearData, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="year" value={year} />
      <Field label={`Contributi previdenziali versati nel ${year} fuori dal tool`} htmlFor="contributionsPaid" hint={`Da F24 pagati qui: ${formatMoney(input.fromF24.contributionsPaid)} · totale ${formatMoney(input.contributionsPaid)}`} help={<Help topic="contributionsPaid" />}>
        <Input id="contributionsPaid" name="contributionsPaid" type="number" step="0.01" defaultValue={input.manual.contributionsPaid} />
      </Field>
      <Field label={`Acconti imposta sostitutiva ${year} versati fuori dal tool`} htmlFor="taxAdvancesPaid" hint={`Da F24 pagati qui: ${formatMoney(input.fromF24.taxAdvancesPaid)} · totale ${formatMoney(input.taxAdvancesPaid)}`} help={<Help topic="taxAdvancesPaid" params={{ year }} />}>
        <Input id="taxAdvancesPaid" name="taxAdvancesPaid" type="number" step="0.01" defaultValue={input.manual.taxAdvancesPaid} />
      </Field>
      {contributionsComputed ? <>
      <Field label={`Acconti INPS ${year} versati fuori dal tool`} htmlFor="inpsAdvancesPaid" hint={`Da F24 pagati qui: ${formatMoney(input.fromF24.inpsAdvancesPaid)} · totale ${formatMoney(input.inpsAdvancesPaid)}`} help={<Help topic="inpsAdvancesPaid" params={{ year }} />}>
        <Input id="inpsAdvancesPaid" name="inpsAdvancesPaid" type="number" step="0.01" defaultValue={input.manual.inpsAdvancesPaid} />
      </Field>
      </> : <input type="hidden" name="inpsAdvancesPaid" value={input.manual.inpsAdvancesPaid} />}
      <Field label="Crediti d'imposta e ritenute da scomputare" htmlFor="taxCredits" help={<Help topic="taxCredits" />}>
        <Input id="taxCredits" name="taxCredits" type="number" step="0.01" defaultValue={input.taxCredits} />
      </Field>
      {selfEmployed && (
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Codici INPS del {year} (17 cifre): li trovi nel cassetto previdenziale INPS per artigiani e commercianti, sezione &quot;Dati del mod. F24&quot;, o sui modelli che ti manda l&apos;INPS. Servono per le righe INPS degli F24.
          </p>
          {[0, 1, 2, 3].map((i) => (
            <Field key={i} label={`Rata fissa ${i + 1} di 4`} htmlFor={`inpsFixedCode${i}`}>
              <Input id={`inpsFixedCode${i}`} name="inpsFixedCodes" inputMode="numeric" pattern="\d{17}" defaultValue={input.inpsFixedCodes?.[i] ?? ''} />
            </Field>
          ))}
          <Field label="Contributi oltre il minimale (saldo e acconti)" htmlFor="inpsExcessCode">
            <Input id="inpsExcessCode" name="inpsExcessCode" inputMode="numeric" pattern="\d{17}" defaultValue={input.inpsExcessCode ?? ''} />
          </Field>
        </div>
      )}
      {contributionsComputed && !selfEmployed ? (
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox name="inpsReducedRate" defaultChecked={inpsRates ? input.inpsRatePct === inpsRates.reduced : false} /> Pensionato o assicurato presso altra forma obbligatoria{inpsRates && ` (aliquota INPS ${formatPct(inpsRates.reduced)} invece di ${formatPct(inpsRates.full)})`}</label>
      ) : inpsRates && input.inpsRatePct === inpsRates.reduced && <input type="hidden" name="inpsReducedRate" value="on" />}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : 'Salva e ricalcola'}</Button></div>
    </form>
  );
}
