import type { ReactNode } from 'react';
import Link from 'next/link';
import { api, currentTenantId, customerLabel, fetchOrNull, formatDate, formatMoney, type Deadline, type Invoice, type ThresholdLevel } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NoTenant } from '@/components/no-tenant';
import { HelpTip } from '@/components/help-tip';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { f24Title } from '../f24/f24-card';

function describeDeadline(d: Deadline): string {
  const { taxYear, percentage, quarter } = d.details;
  const map: Record<string, string> = {
    TAX_BALANCE: `Saldo imposta sostitutiva ${taxYear}`,
    TAX_FIRST_ADVANCE: `1° acconto imposta ${taxYear} (${percentage}%)`,
    TAX_SECOND_ADVANCE: `2° acconto imposta ${taxYear} (${percentage}%)`,
    INPS_BALANCE: `Saldo INPS ${taxYear}`,
    INPS_FIRST_ADVANCE: `1° acconto INPS ${taxYear}`,
    INPS_SECOND_ADVANCE: `2° acconto INPS ${taxYear}`,
    STAMP_DUTY: `Bollo fatture — ${quarter}° trim. ${taxYear}${d.details.deferredFrom ? ' (differito)' : ''}`,
    TAX_RETURN: `Dichiarazione Redditi PF ${taxYear + 1}`,
    INTRASTAT: `Intrastat — ${quarter}° trim. ${taxYear}`,
  };
  return map[d.kind] ?? d.description;
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const LEVEL_BADGE: Record<ThresholdLevel, { label: string; className: string }> = {
  OK: { label: 'ok', className: 'bg-secondary text-secondary-foreground' },
  NEAR: { label: 'vicina', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100' },
  OVER: { label: 'superata', className: 'bg-destructive/10 text-destructive' },
};

/**
 * Collected revenue against one threshold: solid bar for what is collected, lighter bar up to
 * the projection with the issued invoices not yet collected, and the distance from the threshold.
 */
function ThresholdMeter({ label, value, projected, limit, level, note }: { label: string; value: number; projected: number; limit: number; level: ThresholdLevel; note: string }) {
  const pct = (n: number) => Math.min(100, Math.max(0, (n / limit) * 100));
  const gap = limit - value;
  const color = level === 'OVER' ? 'bg-destructive' : level === 'NEAR' ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>Soglia <span className="font-medium tabular-nums">{label}</span></span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${LEVEL_BADGE[level].className}`}>{LEVEL_BADGE[level].label} · {Math.round((value / limit) * 100)}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={value} aria-label={`Incassato rispetto alla soglia di ${label}`}>
        <div className={`absolute inset-y-0 left-0 rounded-full opacity-30 ${color}`} style={{ width: `${pct(projected)}%` }} />
        <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${pct(value)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {gap >= 0 ? <>Mancano <span className="font-medium text-foreground">{formatMoney(gap)}</span></> : <>Superata di <span className="font-medium text-destructive">{formatMoney(-gap)}</span></>}
        {level !== 'OK' && <> · {note}</>}
      </p>
    </div>
  );
}

/** Large amount with its label, for the figures that matter at a glance. */
function Figure({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  if (!(await currentTenantId())) return <NoTenant />;
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const [invoices, deadlines, ruleSet, ruleStatus, taxes, thresholds, f24s] = await Promise.all([
    fetchOrNull(() => api.invoices(year)),
    fetchOrNull(() => api.deadlines(year)),
    fetchOrNull(() => api.ruleSets(year)),
    fetchOrNull(() => api.ruleSetStatus(year)),
    fetchOrNull(() => api.taxSummary(year)),
    fetchOrNull(() => api.thresholds()),
    fetchOrNull(() => api.f24s(year)),
  ]);
  const all: Invoice[] = invoices ?? [];
  // Numbered documents that may still be issued; rejected ones were never issued and must be sent again.
  const numbered = all.filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED' && i.status !== 'REJECTED');
  // Issued for the tax rules (delivered or made available by SDI, or imported): the API decides (`issued`).
  const issued = all.filter((i) => i.issued);
  // Document totals: the recharged stamp duty is part of the fee (AdE ruling 428/2022).
  const revenue = issued.reduce((s, i) => s + (i.type === 'TD04' ? -1 : 1) * Number(i.total), 0);
  const drafts = all.filter((i) => i.status === 'DRAFT').length;
  const toSend = numbered.filter((i) => i.status === 'ISSUED' && !i.imported).length;
  const awaiting = numbered.filter((i) => i.status === 'SENT').length;
  const stamps = numbered.filter((i) => i.virtualStamp).length;
  const collected = taxes?.collectedRevenue ?? 0;
  const upcoming = (deadlines ?? []).filter((d) => d.date >= today).slice(0, 6);
  const active = ruleSet?.find((r) => r.status === 'ACTIVE');
  // Next thing to pay: the next F24 of the saved plan (it has the amount) or the next calendar deadline, whichever comes first.
  const nextF24 = (f24s ?? []).find((f) => f.status !== 'PAID' && f.status !== 'CANCELLED' && f.paymentDate.slice(0, 10) >= today);
  const nextDeadline = upcoming[0];
  const useF24 = nextF24 && (!nextDeadline || nextF24.paymentDate.slice(0, 10) <= nextDeadline.date);
  const nextDate = useF24 ? nextF24.paymentDate.slice(0, 10) : nextDeadline?.date;
  const sameDay = nextDate ? (deadlines ?? []).filter((d) => d.date === nextDate).length - (useF24 ? 0 : 1) : 0;
  const next = useF24
    ? { value: formatMoney(Number(nextF24.totalDebit) - Number(nextF24.totalCredit ?? 0)), hint: `${formatDate(nextDate!)} · F24 ${f24Title(nextF24).toLowerCase()}` }
    : nextDeadline
      ? nextDeadline.details.amount != null
        ? { value: formatMoney(nextDeadline.details.amount), hint: `${formatDate(nextDeadline.date)} · ${describeDeadline(nextDeadline)}` }
        : { value: formatDate(nextDeadline.date), hint: `${describeDeadline(nextDeadline)} · importo da calcolare in F24 e rate` }
      : { value: '—', hint: 'Nessuna scadenza nel calendario dell\'anno' };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard {year}</h1>
        <p className="text-sm text-muted-foreground">Regole fiscali {active ? `v${active.version} attive` : 'non attive — attivale dalle impostazioni'}.</p>
        {ruleStatus && !ruleStatus.ok && <p className="text-sm font-medium text-destructive">{ruleStatus.reason}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2"><Button render={<Link href="/invoices/new" />}>Nuova fattura</Button></div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Prossima scadenza" value={next.value} hint={sameDay > 0 ? `${next.hint} · altre ${sameDay} lo stesso giorno` : next.hint} />
        <StatTile label="Documenti emessi" value={String(issued.length)} hint={`${awaiting} in attesa di esito · ${drafts} bozze`} />
        <StatTile label="Da inviare allo SDI" value={String(toSend)} hint="Numerate ma non ancora trasmesse" />
        <StatTile label="Bolli virtuali" value={formatMoney(stamps * 2)} hint={`${stamps} fatture con bollo da 2 €`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Soglie forfettario</CardTitle>
            <CardDescription>
              <Link href="/taxes" className="underline">Dettaglio imposte</Link>
              <span className="mt-1 block">Contano gli incassi dell&apos;anno (principio di cassa, L. 190/2014 c. 54 e 71).<HelpTip label="Come si leggono le soglie" className="ml-1 -translate-y-px">
              <p>Per le soglie di 85.000 € e 100.000 € contano i pagamenti ricevuti nell&apos;anno, non le fatture emesse: una fattura conta nell&apos;anno in cui ti pagano (principio di cassa, L. 190/2014 c. 54 e 71).</p>
              <p>Nelle barre la parte piena è quanto hai già incassato. La parte chiara aggiunge le fatture emesse e non ancora pagate: è dove arriveresti se le incassassi tutte quest&apos;anno.</p>
              <p>Le note di credito non ancora rimborsate non vengono sottratte, quindi la parte chiara può risultare un po&apos; più lunga del reale: meglio un avviso in anticipo che in ritardo.</p>
            </HelpTip></span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Figure label="Incassato" value={formatMoney(collected)} />
              <Figure
                label="Fatturato"
                value={formatMoney(revenue)}
                hint={thresholds && thresholds.outstanding > 0 ? <>da incassare {formatMoney(thresholds.outstanding)}</> : undefined}
              />
            </div>
            {thresholds ? (
              <>
                <ThresholdMeter label={formatMoney(thresholds.accessThreshold)} value={thresholds.collectedRevenue} projected={thresholds.projected} limit={thresholds.accessThreshold} level={thresholds.accessLevel} note="il regime cessa dall'anno successivo (c. 71)." />
                <ThresholdMeter label={formatMoney(thresholds.exitThreshold)} value={thresholds.collectedRevenue} projected={thresholds.projected} limit={thresholds.exitThreshold} level={thresholds.exitLevel} note="il regime cessa subito e l'IVA è dovuta dalla fattura che la supera (c. 71)." />
                {thresholds.personalLimit !== null && (
                  <ThresholdMeter label={formatMoney(thresholds.personalLimit)} value={thresholds.collectedRevenue} projected={thresholds.projected} limit={thresholds.personalLimit} level={thresholds.collectedRevenue > thresholds.personalLimit ? 'OVER' : thresholds.collectedRevenue >= thresholds.personalLimit * 0.8 ? 'NEAR' : 'OK'} note="limite personale: oltre, l'emissione chiede conferma." />
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-3 rounded-full bg-primary" /> incassato
                  <span className="ml-2 inline-block h-2 w-3 rounded-full bg-primary opacity-30" /> da incassare
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Soglie non disponibili: serve un set di regole attivo per il {year}.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prossime scadenze</CardTitle>
            <CardDescription><Link href="/deadlines" className="underline">Scadenzario completo</Link></CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Adempimento</TableHead><TableHead>Codice</TableHead></TableRow></TableHeader>
              <TableBody>
                {upcoming.map((d) => (
                  <TableRow key={`${d.kind}-${d.details.quarter ?? ''}-${d.nominalDate}`}>
                    <TableCell className="font-mono whitespace-nowrap">{formatDate(d.date)}</TableCell>
                    <TableCell>{describeDeadline(d)}</TableCell>
                    <TableCell className="font-mono">{d.code ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {upcoming.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nessuna scadenza disponibile (set di regole non attivo?)</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimi documenti</CardTitle>
          <CardDescription><Link href="/invoices" className="underline">Tutte le fatture</Link></CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Numero</TableHead><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Totale</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
            <TableBody>
              {all.slice(0, 5).map((i) => (
                <TableRow key={i.id}>
                  <TableCell><Link href={`/invoices/${i.id}`} className="font-mono hover:underline">{i.number || <span className="text-muted-foreground" aria-label="Bozza, senza numero">—</span>}</Link></TableCell>
                  <TableCell>{formatDate(i.date)}</TableCell>
                  <TableCell>{customerLabel(i.customer)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(i.total, i.currency)}</TableCell>
                  <TableCell><InvoiceStatusBadge status={i.status} imported={i.imported} /></TableCell>
                </TableRow>
              ))}
              {all.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nessun documento nel {year}.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
