'use client';

import { useActionState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { deleteInvoice, issueInvoice } from '@/lib/actions';
import { formatDate, formatMoney } from '@/lib/format';
import type { ThresholdOutlook } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Help } from '@/components/help';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';

export function IssueForm({ id, defaultDueDate, installments = [], currency = 'EUR', defaultIban, showIban, thresholds }: { id: string; defaultDueDate?: string; installments?: Array<{ dueDate?: string; amount: number }>; currency?: string; defaultIban?: string; showIban: boolean; thresholds?: ThresholdOutlook | null }) {
  const needsConfirm = Boolean(thresholds && (thresholds.projectedOverExit || thresholds.projectedOverPersonalLimit));
  const [state, action, pending] = useActionState(issueInvoice, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        {installments.length > 1 ? (
          // Several installments: their dates follow the payment terms (TP01, one DettaglioPagamento each).
          <div className="space-y-1 text-sm">
            <p className="font-medium">Scadenze ({installments.length} rate, dal profilo)</p>
            <ul className="space-y-0.5 font-mono tabular-nums">
              {installments.map((i, n) => <li key={n}>{i.dueDate ? formatDate(i.dueDate) : '—'} · {formatMoney(i.amount, currency)}</li>)}
            </ul>
          </div>
        ) : (
          <Field label="Scadenza pagamento" htmlFor="dueDate" hint="Precompilata dalle condizioni del profilo"><Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueDate ?? ''} /></Field>
        )}
        {showIban && <Field label="IBAN" htmlFor="iban"><Input id="iban" name="iban" defaultValue={defaultIban ?? ''} /></Field>}
      </div>
      {thresholds && needsConfirm && (
        <Alert variant={thresholds.projectedOverExit ? 'destructive' : 'warning'}>
          <TriangleAlert />
          <AlertTitle>{thresholds.projectedOverExit ? 'Soglia dei 100.000 € a rischio' : 'Limite personale superato'}</AlertTitle>
          <AlertDescription>
            <p>
              Incassato {formatMoney(thresholds.collectedRevenue)} + da incassare {formatMoney(thresholds.outstanding)} + questa fattura {formatMoney(thresholds.invoiceTotal)} = <strong>{formatMoney(thresholds.projected)}</strong> <Help topic="revenueProjection" />
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
