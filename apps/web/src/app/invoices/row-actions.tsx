'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banknote, Eye, FileCode, FileDown, FileText, Pencil, Send } from 'lucide-react';
import { deleteInvoice } from '@/lib/actions';
import type { Invoice } from '@/lib/types';
import { DeleteRowAction, RowAction, RowActions } from '@/components/row-actions';
import { CollectDialog, collectLabel } from './collect-dialog';
import { SendDialog } from './send-dialog';

/** Numbered, not sent yet, not imported; invoices to the public administration need a signature, not supported yet. */
export const canSendToSdi = (i: Pick<Invoice, 'status' | 'imported' | 'customer'>) => i.status === 'ISSUED' && !i.imported && i.customer.kind !== 'IT_PA';

/**
 * Row menu of the invoice list: open the detail on every row; edit and delete for drafts; for numbered documents
 * send to SDI when not sent yet, record a collection (or the refund of a credit note), preview (PDF in a new tab),
 * download PDF and XML. The dialogs sit outside the menu, which closes on click. `sdiRecipient` is null when the PEC
 * mailbox is not configured.
 */
export function InvoiceRowActions({ invoice, sdiRecipient }: { invoice: Invoice; sdiRecipient: string | null }) {
  const [dialog, setDialog] = useState<'collect' | 'send' | null>(null);
  const { id, status } = invoice;
  const onOpenChange = (open: boolean) => { if (!open) setDialog(null); };
  if (status === 'DRAFT') {
    return (
      <RowActions>
        <RowAction label="Apri" render={<Link href={`/invoices/${id}`} />}><FileText /></RowAction>
        <RowAction label="Modifica" render={<Link href={`/invoices/${id}/edit`} />}><Pencil /></RowAction>
        <DeleteRowAction action={deleteInvoice} fields={{ id }} label="Elimina bozza" confirm="Eliminare la bozza?" />
      </RowActions>
    );
  }
  return (
    <>
      <RowActions>
        <RowAction label="Apri" render={<Link href={`/invoices/${id}`} />}><FileText /></RowAction>
        {canSendToSdi(invoice) && (sdiRecipient
          ? <RowAction label="Invia allo SDI" onClick={() => setDialog('send')}><Send /></RowAction>
          : <RowAction label="Invia allo SDI: configura prima la PEC" render={<Link href="/setup?tab=pec" />}><Send /></RowAction>)}
        {status !== 'CANCELLED' && <RowAction label={collectLabel(invoice)} onClick={() => setDialog('collect')}><Banknote /></RowAction>}
        <RowAction label="Anteprima (PDF)" render={<a href={`/invoices/${id}/pdf?inline=1`} target="_blank" rel="noreferrer" />}><Eye /></RowAction>
        <RowAction label="Scarica PDF" render={<a href={`/invoices/${id}/pdf`} />}><FileDown /></RowAction>
        {invoice.xmlFileName && <RowAction label="Scarica XML" render={<a href={`/invoices/${id}/xml`} />}><FileCode /></RowAction>}
      </RowActions>
      {status !== 'CANCELLED' && <CollectDialog invoice={invoice} open={dialog === 'collect'} onOpenChange={onOpenChange} />}
      {sdiRecipient && canSendToSdi(invoice) && <SendDialog invoice={invoice} recipient={sdiRecipient} open={dialog === 'send'} onOpenChange={onOpenChange} />}
    </>
  );
}
