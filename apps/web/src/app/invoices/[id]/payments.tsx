'use client';

import { deletePayment } from '@/lib/actions';
import { formatDate, formatMoney } from '@/lib/format';
import type { InvoiceCollection } from '@/lib/types';
import { paymentMethodLabel } from '@/lib/payment-methods';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteRowAction, RowActions } from '@/components/row-actions';

/** Collections of an issued document; on a credit note they are the refunds, recorded as negative amounts. */
export function Payments({ collection }: { collection: InvoiceCollection }) {
  const { invoiceId, currency, refund, collected, remaining, payments } = collection;
  return (
    <div className="space-y-4">
      <dl className="grid max-w-sm grid-cols-2 gap-1 text-sm">
        <dt className="text-muted-foreground">{refund ? 'Rimborsato' : 'Incassato'}</dt><dd className="text-right font-mono">{formatMoney(collected, currency)}</dd>
        <dt className="text-muted-foreground">Residuo</dt><dd className="text-right font-mono">{formatMoney(remaining, currency)}</dd>
      </dl>
      {payments.length > 0 && (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Importo</TableHead><TableHead>Metodo</TableHead><TableHead className="text-right">Azioni</TableHead></TableRow></TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{formatDate(p.date)}</TableCell>
                <TableCell className="text-right font-mono">{formatMoney(p.amount, currency)}</TableCell>
                <TableCell>{paymentMethodLabel(p.method)}</TableCell>
                <TableCell>
                  <RowActions>
                    <DeleteRowAction action={deletePayment} fields={{ id: p.id, invoiceId }} label="Elimina incasso" confirm={`Eliminare l'incasso del ${formatDate(p.date)}?`} />
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
