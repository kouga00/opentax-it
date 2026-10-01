import Link from 'next/link';
import { api, currentTenantId, fetchOrNull, formatMoney } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceTable } from '@/components/invoice-table';
import { NoTenant } from '@/components/no-tenant';
import { YearSelect } from '@/components/year-select';
import { InvoiceRowActions } from './row-actions';
import { pecReady } from '@/lib/pec';


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
  const sdiRecipient = pecReady(pec) ? pec!.recipient : null;
  const years = [...new Set([currentYear, year, ...invoiceYears])].sort((a, b) => b - a);
  // Net of credit notes, like the dashboard: document totals, the recharged stamp duty included (AdE ruling 428/2022).
  const sum = (list: typeof invoices) => list.reduce((s, i) => s + (i.type === 'TD04' ? -1 : 1) * Number(i.total), 0);
  // Issued for the tax rules (delivered or made available by SDI, or imported): the API decides (`issued`).
  const issued = invoices.filter((i) => i.issued);
  const awaiting = invoices.filter((i) => i.status === 'SENT');
  const toSend = invoices.filter((i) => i.status === 'ISSUED' && !i.imported);
  const rejected = invoices.filter((i) => i.status === 'REJECTED');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fatture {year}</h1>
        <p className="text-sm text-muted-foreground">
          Fatturato {formatMoney(sum(issued))} <span className="text-xs">(fatture consegnate o messe a disposizione dallo SDI e importate, al netto delle note di credito)</span>
          {awaiting.length > 0 && <> · in attesa di esito {formatMoney(sum(awaiting))}</>}
          {toSend.length > 0 && <> · da inviare {formatMoney(sum(toSend))}</>}
          {rejected.length > 0 && <> · {rejected.length === 1 ? '1 scartata' : `${rejected.length} scartate`} da correggere e reinviare</>}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <YearSelect path="/invoices" value={year} years={years} />
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/invoices/import" />}>Importa fatture e ricevute</Button>
          <Button render={<Link href="/invoices/new" />}>Nuova fattura</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{invoices.length} documenti</CardTitle></CardHeader>
        <CardContent>
          <InvoiceTable invoices={invoices} empty={`Nessun documento nel ${year}.`} actions={(i) => <InvoiceRowActions invoice={i} sdiRecipient={sdiRecipient} />} />
        </CardContent>
      </Card>
    </main>
  );
}
