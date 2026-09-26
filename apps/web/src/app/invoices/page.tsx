import Link from 'next/link';
import { api, currentTenantId, customerLabel, fetchOrNull, formatDate, formatMoney } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { NoTenant } from '@/components/no-tenant';
import { YearSelect } from '@/components/year-select';
import { InvoiceRowActions } from './row-actions';

export { STATUS_LABELS } from '@/components/invoice-status-badge';

export const TYPE_LABELS: Record<string, string> = { TD01: 'Fattura', TD04: 'Nota di credito', TD05: 'Nota di debito', TD06: 'Parcella' };

export default async function InvoicesPage({ searchParams }: PageProps<'/invoices'>) {
  if (!(await currentTenantId())) return <NoTenant />;
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  // Invoices are never dated in a future year: a future year in the URL falls back to the current one.
  const year = Math.min(Number(params.year ?? currentYear) || currentYear, currentYear);
  const [invoices, invoiceYears, pec] = await Promise.all([
    fetchOrNull(() => api.invoices(year)).then((r) => r ?? []),
    fetchOrNull(() => api.invoiceYears()).then((r) => r ?? []),
    fetchOrNull(() => api.pecSettings()),
  ]);
  const sdiRecipient = pec?.address && pec.hasPassword ? pec.recipient : null;
  const years = [...new Set([currentYear, year, ...invoiceYears])].sort((a, b) => b - a);
  const collected = invoices.filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED' && i.type !== 'TD04');
  const total = collected.reduce((s, i) => s + Number(i.total), 0);
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fatture {year}</h1>
        <p className="text-sm text-muted-foreground">Fatturato (totali dei documenti numerati, escluse note di credito): {formatMoney(total)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <YearSelect path="/invoices" value={year} years={years} />
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/invoices/import" />}>Importa XML o ZIP</Button>
          <Button render={<Link href="/invoices/new" />}>Nuova fattura</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{invoices.length} documenti</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Totale</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono font-medium">{i.number || <span className="text-muted-foreground" aria-label="Bozza, senza numero">—</span>}</TableCell>
                  <TableCell>{formatDate(i.date)}</TableCell>
                  <TableCell>{TYPE_LABELS[i.type] ?? i.type}</TableCell>
                  <TableCell>{customerLabel(i.customer)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(i.total, i.currency)}</TableCell>
                  <TableCell><InvoiceStatusBadge status={i.status} imported={i.imported} /></TableCell>
                  <TableCell><InvoiceRowActions invoice={i} sdiRecipient={sdiRecipient} /></TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nessun documento nel {year}.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
