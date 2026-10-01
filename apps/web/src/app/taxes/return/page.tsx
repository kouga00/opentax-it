import { Fragment } from 'react';
import Link from 'next/link';
import { api, currentTenantId, fetchOrReason, formatDate, formatMoney, yearRange } from '@/lib/api';
import { HELP, type HelpTopic } from '@/lib/help';
import type { ReturnGuide, ReturnRow, RevenueDifference } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Help } from '@/components/help';
import { NoTenant } from '@/components/no-tenant';
import { YearSelect } from '@/components/year-select';
import { TriangleAlert } from 'lucide-react';
import { ErrorAlert } from '@/components/error-alert';
import { ReturnFiling } from './return-filing';

/** What to do with a row in the pre-filled return (packages/fiscal-rules, tax-return-lm.ts). */
const ACTIONS: Record<ReturnRow['action'], { label: string; className: string }> = {
  ENTER: { label: 'Da inserire', className: 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  CHECK: { label: 'Da controllare', className: 'border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  RESULT: { label: 'Risultato', className: 'border-border text-muted-foreground' },
  YOURS: { label: 'Dato tuo', className: 'border-dashed border-border text-muted-foreground' },
};

/** Texts of a row, in lib/help/tax-return.json. */
const topic = (id: string) => `return.${id}` as HelpTopic;

/** Amounts are whole euro in the return; codes and boxes are shown as they are. */
function value(r: ReturnRow): string {
  if (r.value === null) return '—';
  if (typeof r.value === 'string') return r.value;
  if (r.id === 'LM22.2') return `${r.value}%`;
  return formatMoney(r.value);
}

/** Title and notes of each form. */
const FORMS: Record<ReturnGuide['forms'][number]['id'], { title: string; description: string }> = {
  LM: { title: 'Quadro LM, sezioni III e IV (regime forfetario)', description: "Importi in euro interi, come nella dichiarazione. Non sono gestiti: perdite degli anni precedenti (LM37), più attività di gruppi diversi, aliquote diverse nello stesso anno, diritti d'autore." },
  RR: { title: 'Quadro RR (contributi previdenziali)', description: "La sezione della gestione scelta nel profilo. Per Artigiani e Commercianti solo il rigo del titolare, per l'anno intero; non sono gestiti familiari collaboratori, crediti dell'anno precedente e la riduzione del 50% per i nuovi iscritti." },
  RX: { title: 'Quadro RX, rigo RX31 (risultato dell\'imposta sostitutiva)', description: 'Il saldo o il credito di LM46 o LM47, e come usare il credito.' },
};

function Rows({ rows }: { rows: ReturnRow[] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Rigo</TableHead><TableHead>Cosa contiene</TableHead><TableHead className="text-right">Valore</TableHead><TableHead>Cosa fare</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => {
          const action = ACTIONS[r.action];
          const help = HELP[topic(r.id)];
          return (
            <TableRow key={r.id}>
              <TableCell className="font-mono">{r.row}{r.column ? ` col. ${r.column}` : ''}</TableCell>
              <TableCell className="whitespace-normal">{help?.label ?? r.id}{help && <Help topic={topic(r.id)} className="ml-1" />}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{value(r)}</TableCell>
              <TableCell><Badge variant="outline" className={action.className}>{action.label}</Badge></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Differences({ title, sign, items }: { title: string; sign: '+' | '−'; items: RevenueDifference[] }) {
  const total = items.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title} <span className="font-mono">{sign} {formatMoney(total)}</span></h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna.</p>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Fattura</TableHead><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Importo</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.invoiceId}>
                <TableCell><Link href={`/invoices/${d.invoiceId}`} className="underline">{d.number}</Link></TableCell>
                <TableCell>{formatDate(d.date)}</TableCell>
                <TableCell className="whitespace-normal">{d.customer}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMoney(d.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function Revenue({ guide }: { guide: ReturnGuide }) {
  const { year } = guide;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Ricavi: dalla precompilata agli incassati <Help topic="returnRevenue" /></CardTitle>
        <CardDescription>
          La precompilata propone circa <strong>{formatMoney(guide.revenue.issuedInYear)}</strong> (fatture emesse nel {year}); in LM22 colonna 3 vanno <strong>{formatMoney(guide.revenue.collectedInYear)}</strong> (incassati nel {year}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Differences title={`Fatture del ${year} non incassate nel ${year}: da togliere`} sign="−" items={guide.revenue.notCollectedInYear} />
        <Differences title={`Fatture di altri anni incassate nel ${year}: da aggiungere`} sign="+" items={guide.revenue.collectedFromOtherYears} />
      </CardContent>
    </Card>
  );
}

export default async function ReturnGuidePage({ searchParams }: PageProps<'/taxes/return'>) {
  if (!(await currentTenantId())) return <NoTenant />;
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  // The return filed this year is the one of the previous tax year.
  const year = Number(params.year) || currentYear - 1;
  const { value: guide, reason } = await fetchOrReason(() => api.returnGuide(year));
  const error = typeof params.error === 'string' ? params.error : undefined;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">Dichiarazione dei redditi {year} <Help topic="returnGuide" /></h1>
        <p className="text-sm text-muted-foreground">
          Guida ai quadri LM, RR e RX della precompilata <strong>Redditi PF</strong> {year + 1}, con i valori calcolati in <Link href={`/taxes?year=${year}`} className="underline">Imposte {year}</Link>. È un aiuto alla compilazione, non consulenza fiscale: la dichiarazione la presenti tu dall&apos;area riservata dell&apos;Agenzia delle Entrate.
        </p>
      </div>
      <ErrorAlert message={error} />
      <div className="flex justify-end">
        <YearSelect path="/taxes/return" value={year} years={yearRange(currentYear - 4, currentYear, year)} label="Periodo d'imposta" />
      </div>

      {!guide ? (
        <Card><CardHeader><CardTitle>Guida non disponibile</CardTitle><CardDescription>{reason}</CardDescription></CardHeader></Card>
      ) : (
        <>
          {guide.warnings.length > 0 && (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>Attenzione</AlertTitle>
              <AlertDescription><ul className="list-disc pl-4">{guide.warnings.map((w) => <li key={w}>{w}</li>)}</ul></AlertDescription>
            </Alert>
          )}
          {guide.forms.map((form) => (
            <Fragment key={form.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{FORMS[form.id].title}</CardTitle>
                  <CardDescription>{FORMS[form.id].description}</CardDescription>
                </CardHeader>
                <CardContent><Rows rows={form.rows} /></CardContent>
              </Card>
              {/* The revenue comparison explains LM22 col. 3: right after the LM form. */}
              {form.id === 'LM' && <Revenue guide={guide} />}
            </Fragment>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Dopo l&apos;invio</CardTitle>
              <CardDescription>Quando hai presentato la dichiarazione, segnala qui: il credito d&apos;imposta sostitutiva da compensare (RX31 colonna 5) e quello della Gestione Separata (RR8 colonna 2) entrano nel registro dei Crediti, pronti per gli F24. I crediti di Artigiani e Commercianti vanno ancora inseriti a mano.</CardDescription>
            </CardHeader>
            <CardContent><ReturnFiling year={year} filed={guide.filed} /></CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
