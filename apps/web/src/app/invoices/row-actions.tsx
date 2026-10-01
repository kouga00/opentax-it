'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banknote, CopyPlus, Eye, FileCode, FileDown, FileText, Pencil, RotateCcw, Send } from 'lucide-react';
import { deleteInvoice, reopenInvoiceForCorrection, replaceRejectedInvoice } from '@/lib/actions';
import { canCorrect, canSendToSdi, CORRECTION_RULE, REPLACEMENT_RULE } from '@/lib/invoices';
import type { InvoiceListItem } from '@/lib/types';
import { ConfirmRowAction, DeleteRowAction, RowAction, RowActions } from '@/components/row-actions';
import { CollectDialog, collectLabel } from './collect-dialog';
import { SendDialog } from './send-dialog';

/**
 * Row menu of the invoice list: open the detail on every row; edit and delete for drafts (a rejected invoice being
 * corrected keeps its number and is not deleted); for numbered documents send to SDI when not sent yet, correct and
 * send again or replace with a new number when rejected, record a collection (or the refund of a credit note), preview (PDF in a new tab),
 * download PDF and XML. The dialogs sit outside the menu, which closes on click. `sdiRecipient` is null when the PEC
 * mailbox is not configured.
 */
export function InvoiceRowActions({ invoice, sdiRecipient }: { invoice: InvoiceListItem; sdiRecipient: string | null }) {
  const [dialog, setDialog] = useState<'collect' | 'send' | null>(null);
  const { id, status } = invoice;
  const onOpenChange = (open: boolean) => { if (!open) setDialog(null); };
  // Nothing left to collect (or refund): the API would refuse a further collection (payments.service.ts).
  const settled = invoice.collected >= invoice.total;
  if (status === 'DRAFT') {
    return (
      <RowActions>
        <RowAction label="Apri" render={<Link href={`/invoices/${id}`} />}><FileText /></RowAction>
        <RowAction label="Modifica" render={<Link href={`/invoices/${id}/edit`} />}><Pencil /></RowAction>
        {!invoice.correction && <DeleteRowAction action={deleteInvoice} fields={{ id }} label="Elimina bozza" confirm="Eliminare la bozza?" />}
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
        {canCorrect(invoice) && <ConfirmRowAction action={reopenInvoiceForCorrection} fields={{ id }} label="Correggi e reinvia" confirm={`${CORRECTION_RULE}\n\nRiaprire la fattura per correggerla?`}><RotateCcw /></ConfirmRowAction>}
        {canCorrect(invoice) && <ConfirmRowAction action={replaceRejectedInvoice} fields={{ id }} label="Riemetti con un nuovo numero" confirm={`${REPLACEMENT_RULE}\n\nCreare la nuova fattura?`}><CopyPlus /></ConfirmRowAction>}
        {status !== 'CANCELLED' && (settled
          ? <RowAction label={invoice.type === 'TD04' ? 'Già rimborsata del tutto' : 'Già incassata del tutto'} disabled><Banknote /></RowAction>
          : <RowAction label={collectLabel(invoice)} onClick={() => setDialog('collect')}><Banknote /></RowAction>)}
        <RowAction label="Anteprima (PDF)" render={<a href={`/invoices/${id}/pdf?inline=1`} target="_blank" rel="noreferrer" />}><Eye /></RowAction>
        <RowAction label="Scarica PDF" render={<a href={`/invoices/${id}/pdf`} />}><FileDown /></RowAction>
        {invoice.xmlFileName && <RowAction label="Scarica XML" render={<a href={`/invoices/${id}/xml`} />}><FileCode /></RowAction>}
      </RowActions>
      {status !== 'CANCELLED' && <CollectDialog invoice={invoice} open={dialog === 'collect'} onOpenChange={onOpenChange} />}
      {sdiRecipient && canSendToSdi(invoice) && <SendDialog invoice={invoice} recipient={sdiRecipient} open={dialog === 'send'} onOpenChange={onOpenChange} />}
    </>
  );
}
