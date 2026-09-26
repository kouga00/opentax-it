'use client';

import { useActionState, useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import { addPayment, getInvoiceCollection, type ActionState } from '@/lib/actions';
import { formatMoney } from '@/lib/format';
import type { Invoice, InvoiceCollection } from '@/lib/types';
import { paymentMethodLabel } from '@/lib/payment-methods';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { useExchangeRate } from '@/components/exchange-rate';
import { RowAction } from '@/components/row-actions';

type CollectInvoice = Pick<Invoice, 'id' | 'type' | 'number'>;

/** Today in Italy, as YYYY-MM-DD: collections are dated in the taxpayer's calendar, not in UTC. */
const todayInItaly = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

/**
 * Row action of the invoice list that records a collection in a dialog, with today's date and the amount
 * still to collect. On a credit note it records the refund, as a negative amount.
 */
export function CollectDialog({ invoice }: { invoice: CollectInvoice }) {
  const [open, setOpen] = useState(false);
  const refund = invoice.type === 'TD04';
  const label = refund ? 'Registra rimborso' : 'Segna come incassata';
  return (
    <>
      <RowAction label={label} onClick={() => setOpen(true)}><Banknote /></RowAction>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{label} · {invoice.number}</DialogTitle>
            <DialogDescription>
              {refund
                ? "Il rimborso è registrato come incasso negativo nell'anno in cui avviene."
                : "Principio di cassa: l'incasso concorre al reddito dell'anno in cui avviene (L. 190/2014 art. 1 c. 64) e conta per le soglie di 85.000 e 100.000 € (c. 54 e 71)."}
            </DialogDescription>
          </DialogHeader>
          {open && <CollectForm invoice={invoice} refund={refund} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Mounted only while the dialog is open, so every opening loads the collections and starts from today. */
function CollectForm({ invoice, refund, onDone }: { invoice: CollectInvoice; refund: boolean; onDone: () => void }) {
  const [collection, setCollection] = useState<InvoiceCollection | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [date, setDate] = useState(todayInItaly);
  const [ecbRate, setEcbRate] = useState('');
  const currency = collection?.currency ?? 'EUR';
  const rate = useExchangeRate(currency, date, ecbRate, setEcbRate);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await addPayment(prev, formData);
    if (!result?.error) onDone();
    return result;
  }, undefined);

  useEffect(() => {
    let cancelled = false;
    getInvoiceCollection(invoice.id).then((r) => {
      if (cancelled) return;
      if ('error' in r) {
        setLoadError(r.error);
        return;
      }
      setCollection(r.collection);
    });
    return () => {
      cancelled = true;
    };
  }, [invoice.id]);

  if (loadError) return <ErrorAlert message={loadError} />;
  if (!collection) return <p className="text-muted-foreground">Caricamento degli incassi…</p>;

  // Refunds of a credit note are recorded as negative amounts.
  const sign = refund ? -1 : 1;
  const { total, collected, remaining, paymentMethod } = collection;
  return (
    <form action={action} className="grid gap-3">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <dl className="grid grid-cols-2 gap-1">
        <dt className="text-muted-foreground">Totale documento</dt><dd className="text-right font-mono">{formatMoney(total, currency)}</dd>
        <dt className="text-muted-foreground">{refund ? 'Già rimborsato' : 'Già incassato'}</dt><dd className="text-right font-mono">{formatMoney(collected, currency)}</dd>
        <dt className="font-medium">Residuo</dt><dd className="text-right font-mono font-medium">{formatMoney(remaining, currency)}</dd>
        <dt className="text-muted-foreground">Modalità in fattura</dt><dd className="text-right">{paymentMethodLabel(paymentMethod)}</dd>
      </dl>
      {remaining <= 0 && <p className="text-muted-foreground">{refund ? 'La nota di credito risulta già rimborsata del tutto.' : 'La fattura risulta già incassata del tutto.'} Puoi comunque registrare un altro importo.</p>}
      <Field label={refund ? 'Data rimborso' : 'Data incasso'} htmlFor="collect-date"><Input id="collect-date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={`Importo (${currency})`} htmlFor="collect-amount" hint={refund ? 'Negativo: è un rimborso al cliente' : 'Negativo per un rimborso'}>
        <Input id="collect-amount" name="amount" type="number" step="0.01" required defaultValue={remaining > 0 ? sign * remaining : ''} />
      </Field>
      {currency !== 'EUR' && (
        <Field label={`Cambio del giorno: 1 EUR = … ${currency}`} htmlFor="collect-rate" hint={rate.info ?? "Cambio del giorno dell'incasso (art. 9 c. 2 TUIR)"}>
          <Input id="collect-rate" name="ecbRate" type="number" step="0.000001" min="0.000001" required value={ecbRate} onChange={(e) => rate.onManualChange(e.target.value)} />
        </Field>
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : refund ? 'Registra rimborso' : 'Registra incasso'}</Button>
      </DialogFooter>
    </form>
  );
}
