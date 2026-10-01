import { api, currentTenantId, fetchOrReason, formatDate, formatMoney, yearRange, type StampDutyQuarter } from '@/lib/api';
import { todayInItaly } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorAlert } from '@/components/error-alert';
import { Help } from '@/components/help';
import { NoTenant } from '@/components/no-tenant';
import { YearSelect } from '@/components/year-select';
import { QuarterActions } from './quarter-actions';

/** Where the quarter stands, from its payment (portal or F24) and the deadline. */
function status(q: StampDutyQuarter, today: string): { label: string; className: string } {
  if (q.paidOnPortal) return { label: `Pagato dal portale il ${formatDate(q.paidOnPortal)}`, className: 'border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' };
  if (q.f24?.status === 'PAID') return { label: `Pagato con F24${q.f24.paidOn ? ` il ${formatDate(q.f24.paidOn)}` : ''}`, className: 'border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' };
  if (q.f24) return { label: `F24 con addebito il ${formatDate(q.f24.paymentDate)}`, className: 'border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-300' };
  // First and last day of the quarter, YYYY-MM-DD.
  const start = `${q.year}-${String(q.quarter * 3 - 2).padStart(2, '0')}-01`;
  const end = `${q.year}-${String(q.quarter * 3).padStart(2, '0')}-${q.quarter === 1 || q.quarter === 4 ? '31' : '30'}`;
  if (today < start) return { label: 'Non ancora iniziato', className: 'border-border text-muted-foreground' };
  if (today <= end) return { label: 'In corso', className: 'border-border text-muted-foreground' };
  if ((q.dueAmount ?? q.estimatedAmount) === 0) return { label: 'Nessun bollo', className: 'border-border text-muted-foreground' };
  if (today > q.paymentDeadline) return { label: 'Scaduto', className: 'border-transparent bg-destructive/10 text-destructive' };
  return { label: 'Da pagare', className: 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300' };
}

export default async function StampDutyPage({ searchParams }: PageProps<'/stamp-duty'>) {
  if (!(await currentTenantId())) return <NoTenant />;
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(params.year) || currentYear;
  const today = todayInItaly();
  const error = typeof params.error === 'string' ? params.error : undefined;
  const { value: quarters, reason } = await fetchOrReason(() => api.stampDuty(year));
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">Bollo sulle fatture elettroniche {year} <Help topic="stampDutyPage" /></h1>
        <p className="text-sm text-muted-foreground">
          Trimestre per trimestre: controlla l&apos;elenco B nel portale Fatture e corrispettivi, prendi l&apos;importo che mostra l&apos;Agenzia delle Entrate e pagalo dal portale o con un F24.
        </p>
      </div>
      <ErrorAlert message={error} />
      <div className="flex justify-end">
        <YearSelect path="/stamp-duty" value={year} years={yearRange(currentYear - 4, currentYear, year)} />
      </div>
      {!quarters ? (
        <Card><CardHeader><CardTitle>Bollo non disponibile</CardTitle><CardDescription>{reason}</CardDescription></CardHeader></Card>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trimestre</TableHead>
                  <TableHead className="text-right">Stima</TableHead>
                  <TableHead><span className="inline-flex items-center gap-1">Elenco B entro <Help topic="stampDutyListB" /></span></TableHead>
                  <TableHead><span className="inline-flex items-center gap-1">Importo AdE <Help topic="stampDutyAmount" /></span></TableHead>
                  <TableHead>Scadenza</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarters.map((q) => {
                  const s = status(q, today);
                  return (
                    <TableRow key={q.quarter}>
                      <TableCell>{q.quarter}° <span className="font-mono text-xs text-muted-foreground">{q.taxCode}</span></TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatMoney(q.estimatedAmount)}
                        {q.estimated && <Badge variant="outline" className="ml-2">Stima <Help topic="stampDutyEstimate" className="ml-1" /></Badge>}
                      </TableCell>
                      <TableCell>{q.listBChangesBy ? formatDate(q.listBChangesBy) : '—'}</TableCell>
                      <TableCell className="whitespace-normal">
                        {q.dueAmount !== null
                          ? <span className="font-mono tabular-nums">{formatMoney(q.dueAmount)}</span>
                          : q.amountAvailableOn ? <span className="text-muted-foreground">nel portale entro il {formatDate(q.amountAvailableOn)}</span> : '—'}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {formatDate(q.paymentDeadline)}
                        {q.deferredFrom && <span className="block text-xs text-muted-foreground">differita dal {formatDate(q.deferredFrom)} <Help topic="stampDutyDeferral" /></span>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={s.className}>{s.label}</Badge></TableCell>
                      <TableCell><QuarterActions quarter={q} today={today} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
