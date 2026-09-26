'use client';

import Link from 'next/link';
import { Eye, FileCode, FileDown, FileText, Pencil } from 'lucide-react';
import { deleteInvoice } from '@/lib/actions';
import type { Invoice } from '@/lib/types';
import { DeleteRowAction, RowAction, RowActions } from '@/components/row-actions';
import { CollectDialog } from './collect-dialog';

/**
 * Row actions of the invoice list: open the detail on every row; edit and delete for drafts; for issued documents
 * record a collection (or the refund of a credit note), preview (PDF in a new tab), download PDF and XML.
 */
export function InvoiceRowActions({ invoice }: { invoice: Invoice }) {
  const { id, status } = invoice;
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
    <RowActions>
      <RowAction label="Apri" render={<Link href={`/invoices/${id}`} />}><FileText /></RowAction>
      {status !== 'CANCELLED' && <CollectDialog invoice={invoice} />}
      <RowAction label="Anteprima (PDF)" render={<a href={`/invoices/${id}/pdf?inline=1`} target="_blank" rel="noreferrer" />}><Eye /></RowAction>
      <RowAction label="Scarica PDF" render={<a href={`/invoices/${id}/pdf`} />}><FileDown /></RowAction>
      {invoice.xmlFileName && <RowAction label="Scarica XML" render={<a href={`/invoices/${id}/xml`} />}><FileCode /></RowAction>}
    </RowActions>
  );
}
