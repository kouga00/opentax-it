'use client';

import { useActionState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { deleteInvoice, issueInvoice } from '@/lib/actions';
import { formatMoney } from '@/lib/format';
import type { ThresholdOutlook } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpTip } from '@/components/help-tip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';

export function IssueForm({ id, defaultDueDate, defaultIban, showIban, thresholds }: { id: string; defaultDueDate?: string; defaultIban?: string; showIban: boolean; thresholds?: ThresholdOutlook | null }) {
  const needsConfirm = Boolean(thresholds && (thresholds.projectedOverExit || thresholds.projectedOverPersonalLimit));
  const [state, action, pending] = useActionState(issueInvoice, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scadenza pagamento" htmlFor="dueDate" hint="Precompilata dalle condizioni del profilo"><Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueDate ?? ''} /></Field>
        {showIban && <Field label="IBAN" htmlFor="iban"><Input id="iban" name="iban" defaultValue={defaultIban ?? ''} /></Field>}
      </div>
      {thresholds && needsConfirm && (
        <Alert variant={thresholds.projectedOverExit ? 'destructive' : 'warning'}>
          <TriangleAlert />
          <AlertTitle>{thresholds.projectedOverExit ? 'Soglia dei 100.000 € a rischio' : 'Limite personale superato'}</AlertTitle>
          <AlertDescription>
            <p>
              Incassato {formatMoney(thresholds.collectedRevenue)} + da incassare {formatMoney(thresholds.outstanding)} + questa fattura {formatMoney(thresholds.invoiceTotal)} = <strong>{formatMoney(thresholds.projected)}</strong> <HelpTip label="Come si calcola la proiezione"><p>Proiezione = incassato nell&apos;anno + fatture emesse non ancora incassate + questa fattura. Serve solo per l&apos;avviso: le soglie di legge valgono sugli incassi (principio di cassa, L. 190/2014 c. 54 e 71), quindi una fattura conta nell&apos;anno in cui viene pagata.</p><p>Le note di credito non ancora rimborsate non vengono sottratte: la stima è per eccesso, cioè prudente.</p></HelpTip>
              {thresholds.projectedOverExit ? `, oltre ${formatMoney(thresholds.exitThreshold)}: se incassati nell'anno il regime cessa subito e l'IVA è dovuta dalla fattura che fa superare la soglia (L. 190/2014 c. 71).` : `, oltre il tuo limite di ${formatMoney(thresholds.personalLimit ?? 0)}.`}
            </p>
            <label className="mt-2 flex items-center gap-2 font-medium"><Checkbox name="confirmThresholds" required /> Ho capito, emetti comunque</label>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'In corso…' : 'Numera e genera XML'}</Button>
        {/* Same form (nested forms are invalid): formAction sends the draft id to the delete action instead. */}
        <Button type="submit" variant="destructive" formAction={deleteInvoice} formNoValidate disabled={pending} onClick={(e) => { if (!window.confirm('Eliminare la bozza?')) e.preventDefault(); }}>
          Elimina bozza
        </Button>
      </div>
    </form>
  );
}
