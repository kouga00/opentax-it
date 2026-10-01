'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Check, FilePlus2, Receipt, Undo2 } from 'lucide-react';
import { createStampDutyF24, markStampDutyPaid, unmarkStampDutyPaid, type ActionState } from '@/lib/actions';
import { formatDate, formatMoney } from '@/lib/format';
import type { StampDutyQuarter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ConfirmRowAction, RowAction, RowActions } from '@/components/row-actions';
import { ErrorAlert } from '@/components/error-alert';
import { Field } from '@/components/field';
import { Help } from '@/components/help';

type Open = 'f24' | 'portal' | null;

/**
 * Actions of a stamp duty quarter: the F24 with the AdE amount, the payment from the portal, and the way back. The
 * dialogs stay outside RowActions, with their open state here (components/row-actions.tsx).
 */
export function QuarterActions({ quarter: q, today }: { quarter: StampDutyQuarter; today: string }) {
  const [open, setOpen] = useState<Open>(null);
  const paid = Boolean(q.paidOnPortal || q.f24);
  // The F24 page lists the forms by tax year: the one before the payment year.
  const f24Page = q.f24 ? `/f24?year=${Number(q.f24.paymentDate.slice(0, 4)) - 1}` : null;
  return (
    <>
      <RowActions>
        {!paid && <RowAction label="Crea F24" onClick={() => setOpen('f24')} disabled={today > q.paymentDeadline}><FilePlus2 /></RowAction>}
        {!paid && <RowAction label="Pagato dal portale" onClick={() => setOpen('portal')}><Check /></RowAction>}
        {f24Page && <RowAction label="Vai all'F24" render={<Link href={f24Page} />}><Receipt /></RowAction>}
        {q.paidOnPortal && (
          <ConfirmRowAction action={unmarkStampDutyPaid} fields={{ year: String(q.year), quarter: String(q.quarter) }} label="Annulla il pagamento" confirm={`Annullare il pagamento dal portale del ${q.quarter}° trimestre?`}>
            <Undo2 />
          </ConfirmRowAction>
        )}
      </RowActions>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {open === 'f24' && <F24Form q={q} onDone={() => setOpen(null)} />}
          {open === 'portal' && <PortalForm q={q} today={today} onDone={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The amount proposed: the AdE's if already saved, otherwise the estimate, to be checked on the portal. */
const proposedAmount = (q: StampDutyQuarter) => String(q.dueAmount ?? q.estimatedAmount);

function useDialogAction(run: (prev: ActionState, formData: FormData) => Promise<ActionState>, onDone: () => void) {
  return useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await run(prev, formData);
    if (!result?.error) onDone();
    return result;
  }, undefined);
}

function F24Form({ q, onDone }: { q: StampDutyQuarter; onDone: () => void }) {
  const [state, action, pending] = useDialogAction(createStampDutyF24, onDone);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">F24 del bollo · {q.quarter}° trimestre {q.year} <Help topic="stampDutyF24" /></DialogTitle>
        <DialogDescription>
          Codice tributo {q.taxCode}, anno {q.year}, sezione Erario. Indica l&apos;importo che l&apos;Agenzia mostra nel portale Fatture e corrispettivi{q.amountAvailableOn ? ` (entro il ${formatDate(q.amountAvailableOn)})` : ''}; la stima di OpenTax IT è {formatMoney(q.estimatedAmount)}.
        </DialogDescription>
      </DialogHeader>
      <form action={action} className="grid gap-3">
        <ErrorAlert message={state?.error} />
        <input type="hidden" name="year" value={q.year} />
        <input type="hidden" name="quarter" value={q.quarter} />
        <Field label="Importo dell'Agenzia (€)" htmlFor="stamp-amount">
          <Input id="stamp-amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={proposedAmount(q)} />
        </Field>
        <Field label="Data di addebito" htmlFor="stamp-date" hint={`Entro la scadenza del ${formatDate(q.paymentDeadline)}`}>
          <Input id="stamp-date" name="paymentDate" type="date" required max={q.paymentDeadline} defaultValue={q.paymentDeadline} />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
          <Button type="submit" disabled={pending}>{pending ? 'Creazione…' : 'Crea F24'}</Button>
        </DialogFooter>
      </form>
    </>
  );
}

function PortalForm({ q, today, onDone }: { q: StampDutyQuarter; today: string; onDone: () => void }) {
  const [state, action, pending] = useDialogAction(markStampDutyPaid, onDone);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">Pagato dal portale · {q.quarter}° trimestre {q.year} <Help topic="stampDutyPortal" /></DialogTitle>
        <DialogDescription>L&apos;importo addebitato dal portale Fatture e corrispettivi e il giorno del pagamento.</DialogDescription>
      </DialogHeader>
      <form action={action} className="grid gap-3">
        <ErrorAlert message={state?.error} />
        <input type="hidden" name="year" value={q.year} />
        <input type="hidden" name="quarter" value={q.quarter} />
        <Field label="Importo pagato (€)" htmlFor="portal-amount">
          <Input id="portal-amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={proposedAmount(q)} />
        </Field>
        <Field label="Data del pagamento" htmlFor="portal-date">
          <Input id="portal-date" name="paidOn" type="date" required max={today} defaultValue={q.paymentDeadline < today ? q.paymentDeadline : today} />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
          <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : 'Segna pagato'}</Button>
        </DialogFooter>
      </form>
    </>
  );
}
