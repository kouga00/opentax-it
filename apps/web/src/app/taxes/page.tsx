import Link from 'next/link';
import { api, currentTenantId, fetchOrNull, fetchOrReason, formatDate, formatMoney, yearRange } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InpsScopeNote } from '@/components/inps-scope-note';
import { NoTenant } from '@/components/no-tenant';
import { YearSelect } from '@/components/year-select';
import { YearDataForm } from './year-data-form';
import { TriangleAlert } from 'lucide-react';

function Row({ label, value, code, strong }: { label: string; value: string; code?: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1 ${strong ? 'font-medium' : ''}`}>
      <span className="text-sm">{label}{code && <span className="ml-2 font-mono text-xs text-muted-foreground">{code}</span>}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

export default async function TaxesPage({ searchParams }: PageProps<'/taxes'>) {
  if (!(await currentTenantId())) return <NoTenant />;
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(params.year) || currentYear;
  const [{ value: s, reason }, rules] = await Promise.all([fetchOrReason(() => api.taxSummary(year)), fetchOrNull(() => api.activeRules(year))]);
  const inpsReason = s?.contributions.scheme === 'INPS_ARTISANS' ? 'AP' : s?.contributions.scheme === 'INPS_TRADERS' ? 'CP' : 'PXX';
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Imposte {year}</h1>
        <p className="text-sm text-muted-foreground">Periodo d&apos;imposta {year}: dichiarazione e versamenti nel {year + 1}. Stima, non consulenza fiscale.</p>
      </div>
      <InpsScopeNote scheme={s?.contributions.scheme} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<Link href={`/taxes/return?year=${year}`} />}>Guida alla dichiarazione</Button>
        <YearSelect path="/taxes" value={year} years={yearRange(currentYear - 4, currentYear, year)} label="Periodo d'imposta" />
      </div>

      {!s ? (
        <Card><CardHeader><CardTitle>Calcolo non disponibile</CardTitle><CardDescription>{reason ?? `Serve un set di regole attivo per il ${year} o il ${year + 1} e un profilo fiscale completo.`}</CardDescription></CardHeader></Card>
      ) : s.thresholds.exceedsExitThreshold ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Regime forfettario cessato nel {year}</AlertTitle>
          <AlertDescription>
            Incassato {formatMoney(s.collectedRevenue)}, oltre {formatMoney(s.thresholds.exitThreshold)}: il regime cessa dall&apos;anno stesso, l&apos;IVA è dovuta dalla fattura che ha fatto superare la soglia e il reddito dell&apos;intero anno va determinato in modo ordinario (L. 190/2014 c. 71; Istr. Redditi PF 2026 Fasc. 3). Il calcolo forfettario e il piano F24 non si applicano: rivolgiti a chi ti assiste.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {s.warnings.length > 0 && (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>Regole mancanti</AlertTitle>
              <AlertDescription><ul className="list-disc pl-4">{s.warnings.map((w) => <li key={w}>{w}</li>)}</ul></AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reddito e imposta sostitutiva</CardTitle>
                <CardDescription>Quadro LM sez. III — aliquote e coefficiente dalle regole {s.rulesYear}; importi in unità di euro come in dichiarazione.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Row label={`Incassato nel ${year} (principio di cassa)`} value={formatMoney(s.collectedRevenue)} code="LM22 c.3" />
                <Row label={`Coefficiente di redditività (ATECO ${s.input.atecoCode})`} value={`${s.result.coefficientPct}%`} code="LM22 c.2" />
                <Row label="Reddito lordo" value={formatMoney(s.result.grossIncome)} code="LM34" />
                <Row label="Contributi previdenziali dedotti" value={`− ${formatMoney(s.result.contributionsDeducted)}`} code="LM35 c.2" />
                <Row label="Reddito imponibile" value={formatMoney(s.result.netIncome)} code="LM36" strong />
                <Row label={`Imposta sostitutiva ${s.result.taxRatePct}%`} value={formatMoney(s.result.substituteTax)} code="LM39" />
                <Row label="Crediti e ritenute" value={`− ${formatMoney(s.input.taxCredits)}`} code="LM40-41" />
                <Row label="Acconti già versati" value={`− ${formatMoney(s.input.taxAdvancesPaid)}`} code="LM45" />
                <Row label={s.taxBalance >= 0 ? 'Saldo a debito' : 'Saldo a credito'} value={formatMoney(Math.abs(s.taxBalance))} code={s.taxBalance >= 0 ? '1792' : 'LM47'} strong />
              </CardContent>
            </Card>

            {s.contributions.computed && s.contributions.fixed && <Card>
              <CardHeader>
                <CardTitle>INPS {s.contributions.scheme === 'INPS_ARTISANS' ? 'Artigiani' : 'Commercianti'}</CardTitle>
                <CardDescription>
                  Quadro RR sez. I — contributo fisso sul minimale in quattro rate e contributo sul reddito oltre il minimale, con i valori della circolare INPS del {s.rulesYear}
                  {s.contributions.flatRateReduction && ', ridotti del 35% (regime agevolato, L. 190/2014 c. 77)'}.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Row label="Contributo IVS sul minimale" value={formatMoney(s.contributions.fixed.ivs)} code={s.contributions.scheme === 'INPS_ARTISANS' ? 'AF' : 'CF'} />
                <Row label="Contributo di maternità" value={formatMoney(s.contributions.fixed.maternity)} />
                {s.contributions.fixed.installments.map((i) => <Row key={i.number} label={`Rata ${i.number} di 4, ${formatDate(i.date)}`} value={formatMoney(i.amount)} />)}
                <Row label="Reddito oltre il minimale (entro il massimale)" value={formatMoney(s.result.inpsTaxableIncome)} code="RR2" />
                <Row label="Contributo oltre il minimale" value={formatMoney(s.result.inpsContribution)} code="RR2" />
                <Row label="Acconti già versati" value={`− ${formatMoney(s.input.inpsAdvancesPaid)}`} />
                <Row label={s.inpsBalance >= 0 ? 'Saldo a debito' : 'Saldo a credito'} value={formatMoney(Math.abs(s.inpsBalance))} code={s.inpsBalance >= 0 ? (s.contributions.scheme === 'INPS_ARTISANS' ? 'AP' : 'CP') : ''} strong />
              </CardContent>
            </Card>}

            {s.contributions.computed && !s.contributions.fixed && <Card>
              <CardHeader>
                <CardTitle>INPS Gestione Separata</CardTitle>
                <CardDescription>Quadro RR sez. II — aliquota {s.input.inpsRatePct}%.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Row label="Imponibile previdenziale (reddito lordo, entro il massimale)" value={formatMoney(s.result.inpsTaxableIncome)} code="RR5 c.11" />
                <Row label="Contributo dovuto" value={formatMoney(s.result.inpsContribution)} code="RR5 c.15" />
                <Row label="Acconti già versati" value={`− ${formatMoney(s.input.inpsAdvancesPaid)}`} code="RR5 c.16" />
                <Row label={s.inpsBalance >= 0 ? 'Saldo a debito' : 'Saldo a credito'} value={formatMoney(Math.abs(s.inpsBalance))} code={s.inpsBalance >= 0 ? 'PXX' : 'RR8'} strong />
              </CardContent>
            </Card>}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Acconti per il {year + 1}</CardTitle>
              <CardDescription>Imposta: 100% dell&apos;imposta {year} al netto di crediti (Circ. 10/E/2016 §4), {s.input.isaSubject ? 'in due rate del 50% (soggetto ISA, DL 124/2019 art. 58)' : 'prima rata 40% e seconda 60% (DPR 435/2001 art. 17)'}.{s.contributions.computed && !s.contributions.fixed && <> INPS: 80% del contributo con l&apos;aliquota {s.input.nextYearInpsRatePct}% del {year + 1}, in due rate (L. 662/96 c. 212).</>}{s.contributions.fixed && <> INPS: il contributo oltre il minimale calcolato sul reddito {year} con minimale, massimali e aliquote del {year + 1}, in due acconti di pari importo (istruzioni Redditi, fascicolo 2).</>} Le deleghe si generano in <Link href={`/f24?year=${year}`} className="underline">F24 e rate</Link>.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="divide-y">
                <Row label="Imposta sostitutiva — totale" value={formatMoney(s.nextYearAdvances.tax.total)} strong />
                {s.nextYearAdvances.tax.mode === 'NOT_DUE' && <p className="py-1 text-sm text-muted-foreground">Non dovuto (imposta inferiore a 51,65 €).</p>}
                {s.nextYearAdvances.tax.mode === 'SINGLE' && <Row label="Unica soluzione (30 novembre): prima rata non superiore a 103 €" value={formatMoney(s.nextYearAdvances.tax.second)} code="1791" />}
                {s.nextYearAdvances.tax.mode === 'TWO_INSTALMENTS' && (
                  <>
                    <Row label={`Prima rata ${s.input.isaSubject ? 50 : 40}% (con il saldo)`} value={formatMoney(s.nextYearAdvances.tax.first)} code="1790" />
                    <Row label={`Seconda rata ${s.input.isaSubject ? 50 : 60}% (30 novembre)`} value={formatMoney(s.nextYearAdvances.tax.second)} code="1791" />
                  </>
                )}
              </div>
              {s.contributions.computed && <div className="divide-y">
                <Row label={s.contributions.fixed ? 'INPS — totale acconti oltre il minimale' : 'INPS — totale (80%)'} value={formatMoney(s.nextYearAdvances.inps.total)} strong />
                <Row label={s.contributions.fixed ? 'Primo acconto 50% (con il saldo)' : 'Prima rata 40% (con il saldo)'} value={formatMoney(s.nextYearAdvances.inps.first)} code={inpsReason} />
                <Row label={s.contributions.fixed ? 'Secondo acconto 50% (30 novembre)' : 'Seconda rata 40% (30 novembre)'} value={formatMoney(s.nextYearAdvances.inps.second)} code={inpsReason} />
              </div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Soglie del regime</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm">
              <span>Incassato {formatMoney(s.collectedRevenue)}</span>
              <Badge variant={s.thresholds.exceedsAccessThreshold ? 'destructive' : 'secondary'}>85.000 € {s.thresholds.exceedsAccessThreshold ? 'superata: uscita dal regime l’anno successivo (c. 71)' : 'ok'}</Badge>
              <Badge variant={s.thresholds.exceedsExitThreshold ? 'destructive' : 'secondary'}>100.000 € {s.thresholds.exceedsExitThreshold ? 'superata: uscita immediata e IVA (c. 71)' : 'ok'}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dati dell&apos;anno inseriti a mano</CardTitle>
              <CardDescription>Le deleghe segnate come pagate in &quot;F24 e rate&quot; vengono contate automaticamente; qui vanno solo i versamenti fatti fuori dal tool (es. tramite il commercialista prima di usarlo).</CardDescription>
            </CardHeader>
            <CardContent><YearDataForm key={`${year}-${JSON.stringify(s.input)}`} year={year} input={s.input} contributionsComputed={s.contributions.computed} selfEmployed={s.contributions.fixed !== null} inpsRates={rules ? { full: rules.inps.fullRatePct, reduced: rules.inps.reducedRatePct } : undefined} /></CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
