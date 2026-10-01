import type { ReactNode } from 'react';
import Link from 'next/link';
import { customerLabel, formatDate, formatMoney } from '@/lib/api';
import { TYPE_LABELS } from '@/lib/invoices';
import type { Invoice } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';

/**
 * The table of invoices, the same wherever invoices are listed (invoice list, dashboard): number linking to the
 * detail, date, type, customer, total and status. `actions` adds the column of row actions where the page has them.
 */
export function InvoiceTable<T extends Invoice>({ invoices, empty, actions }: { invoices: T[]; empty: string; actions?: (invoice: T) => ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numero</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Totale</TableHead>
          <TableHead>Stato</TableHead>
          {actions && <TableHead className="text-right">Azioni</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((i) => (
          <TableRow key={i.id}>
            <TableCell>
              <Link href={`/invoices/${i.id}`} className="font-mono font-medium hover:underline">
                {i.number || <span className="text-muted-foreground" aria-label="Bozza, senza numero">—</span>}
              </Link>
            </TableCell>
            <TableCell>{formatDate(i.date)}</TableCell>
            <TableCell>{TYPE_LABELS[i.type] ?? i.type}</TableCell>
            <TableCell>{customerLabel(i.customer)}</TableCell>
            <TableCell className="text-right font-mono">{formatMoney(i.total, i.currency)}</TableCell>
            <TableCell><InvoiceStatusBadge status={i.status} imported={i.imported} correction={i.correction} replaced={Boolean(i.replacedBy)} /></TableCell>
            {actions && <TableCell>{actions(i)}</TableCell>}
          </TableRow>
        ))}
        {invoices.length === 0 && <TableRow><TableCell colSpan={actions ? 7 : 6} className="text-center text-muted-foreground">{empty}</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}
