'use client';

import { useActionState, useState } from 'react';
import { Send } from 'lucide-react';
import { sendToSdi, type ActionState } from '@/lib/actions';
import type { Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/error-alert';

/**
 * Confirmation before sending an invoice to SDI. There is no test environment for the PEC channel: every
 * transmission is real, hence the confirmation; a failure is shown in the dialog. Opened from the row menu of the
 * invoice list, which holds its state, or by SendButton on the invoice page.
 */
export function SendDialog({ invoice, recipient, open, onOpenChange }: { invoice: Pick<Invoice, 'id' | 'number'>; recipient: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invia allo SDI · {invoice.number}</DialogTitle>
          <DialogDescription>L&apos;invio è reale: se lo SDI accetta il file, la fattura è emessa a tutti gli effetti. L&apos;XML parte via PEC verso {recipient}; le ricevute arrivano nella tua casella e aggiornano lo stato.</DialogDescription>
        </DialogHeader>
        {open && <SendForm id={invoice.id} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/** "Invia allo SDI" button of the invoice page, with its dialog. */
export function SendButton({ invoice, recipient }: { invoice: Pick<Invoice, 'id' | 'number'>; recipient: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Send /> Invia allo SDI</Button>
      <SendDialog invoice={invoice} recipient={recipient} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Mounted only while the dialog is open, so every opening starts without the previous error. */
function SendForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await sendToSdi(prev, formData);
    if (!result?.error) onDone();
    return result;
  }, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <ErrorAlert message={state?.error} />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? 'Invio…' : 'Invia'}</Button>
      </DialogFooter>
    </form>
  );
}
