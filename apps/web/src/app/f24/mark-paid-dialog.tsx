'use client';

import { useActionState, useState } from 'react';
import { markF24Paid, type ActionState } from '@/lib/actions';
import { formatDate, formatMoney, todayInItaly } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';

/**
 * Dialog that marks an F24 as paid: the payment date (not in the future) and, for the history, how it was paid.
 * The paid forms feed the amounts already paid in the tax summary (advances, contributions).
 */
export function MarkPaidDialog({ id, title, paymentDate, balance }: { id: string; title: string; paymentDate: string; balance: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Segna pagato</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Segna pagato · {title}</DialogTitle>
          <DialogDescription>Saldo {formatMoney(balance)}, scadenza {formatDate(paymentDate)}. Gli F24 pagati contano negli importi già versati del riepilogo imposte.</DialogDescription>
        </DialogHeader>
        {open && <MarkPaidForm id={id} paymentDate={paymentDate} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so every opening starts from the due date (or today, if it is later). */
function MarkPaidForm({ id, paymentDate, onDone }: { id: string; paymentDate: string; onDone: () => void }) {
  const today = todayInItaly();
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await markF24Paid(prev, formData);
    if (!result?.error) onDone();
    return result;
  }, undefined);
  return (
    <form action={action} className="grid gap-3">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="id" value={id} />
      <Field label="Data pagamento" htmlFor="paid-on">
        <Input id="paid-on" name="paidOn" type="date" required max={today} defaultValue={paymentDate < today ? paymentDate : today} />
      </Field>
      <Field label="Note (facoltative)" htmlFor="paid-notes" hint="Come l'hai pagato, per ritrovarlo: es. F24 web, home banking, File Internet">
        <Textarea id="paid-notes" name="notes" maxLength={500} rows={3} />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : 'Segna pagato'}</Button>
      </DialogFooter>
    </form>
  );
}
