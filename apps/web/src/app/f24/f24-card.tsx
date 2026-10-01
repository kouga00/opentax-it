import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { deleteF24, setF24Status } from '@/lib/actions';
import { MarkPaidDialog } from './mark-paid-dialog';
import { Help } from '@/components/help';
import { formatDate, formatMoney, type F24, type F24Draft, type F24Line, type F24Section } from '@/lib/api';
import { ChevronRight } from 'lucide-react';

/** Badge of the saved forms that are not simply to be paid (a form to pay has no badge). */
const STATUS: Record<string, { label: string; className: string }> = {
  PAID: { label: 'Pagato', className: 'border-transparent bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300' },
  CANCELLED: { label: 'Annullato', className: 'border-transparent bg-muted text-muted-foreground line-through' },
};

export function f24Title(f: F24Draft): string {
  if (f.kind === 'COMPENSATION') return 'Compensazione (saldo zero)';
  if (f.kind === 'SECOND_ADVANCE') return 'Secondo acconto (unica soluzione)';
  if (f.kind === 'INSTALLMENT') return `Rata ${f.installmentNumber} di ${f.installmentsTotal}`;
  if (f.kind === 'BALANCE') return 'Saldo e primo acconto (unica soluzione)';
  if (f.kind === 'OTHER') return 'Contributi';
  // The API writes the quarter in the description of the stamp duty row.
  if (f.kind === 'STAMP_DUTY') return f.lines[0]?.description ?? 'Imposta di bollo sulle fatture elettroniche';
  return f.kind;
}

/**
 * Italian label of a line from its code and reference year (the API description of plan rows is in English; the rows
 * of contributions entered by hand carry an Italian description).
 */
function lineLabel(l: F24Line, taxYear: number): string {
  const y = l.referenceYear;
  const balance = y === taxYear;
  if (l.role === 'CONTRIBUTION') return l.description ?? '';
  switch (l.code) {
    case '1792': return `Saldo imposta sostitutiva ${y}`;
    case '1790': return `Primo acconto imposta sostitutiva ${y}`;
    case '1791': return `Secondo acconto o unica soluzione ${y}`;
    case '1668': return `Interessi di rateazione ${y}`;
    case 'DPPI': return `Interessi di rateazione INPS ${y}`;
    case 'PXX': case 'P10': return balance ? `Saldo contributi GS ${y}` : `Acconto contributi GS ${y}`;
    case 'PXXR': case 'P10R': return balance ? `Saldo contributi GS ${y} (rata)` : `Acconto contributi GS ${y} (rata)`;
    case 'AP': case 'CP': return balance ? `Saldo contributi oltre il minimale ${y}` : `Acconto contributi oltre il minimale ${y}`;
    case 'APR': case 'CPR': return balance ? `Saldo contributi oltre il minimale ${y} (rata)` : `Acconto contributi oltre il minimale ${y} (rata)`;
    case 'API': case 'CPI': return `Interessi di rateazione INPS ${y}`;
    case '4001': return `Credito IRPEF ${y}`;
    case '3844': return `Credito addizionale comunale ${y}`;
    case '3801': return `Credito addizionale regionale ${y}`;
    default: return l.description ?? '';
  }
}

const SECTION_TITLE: Record<F24Section, string> = { TREASURY: 'Sezione Erario', INPS: 'Sezione INPS', REGIONAL: 'Sezione Regioni', LOCAL: 'Sezione IMU e altri tributi locali', OTHER_ENTITY: 'Sezione altri enti previdenziali e assicurativi' };

function LinesTable({ lines, section, taxYear }: { lines: F24Line[]; section: F24Section; taxYear: number }) {
  const rows = lines.filter((l) => l.section === section);
  if (rows.length === 0) return null;
  const inps = section === 'INPS' || section === 'OTHER_ENTITY';
  const entity = section === 'OTHER_ENTITY';
  // "matricola INPS/codice INPS" (Artigiani, Commercianti) or "codice posizione" (some funds), when any row has one.
  const position = rows.some((l) => l.positionCode);
  const local = section === 'REGIONAL' || section === 'LOCAL';
  const hasCredit = lines.some((l) => Number(l.creditAmount ?? 0) > 0);
  const debit = rows.reduce((s, l) => s + Number(l.debitAmount), 0);
  const credit = rows.reduce((s, l) => s + Number(l.creditAmount ?? 0), 0);
  const cols = (inps ? 4 + (entity ? 1 : 0) + (position ? 1 : 0) : local ? 4 : 3) + (hasCredit ? 2 : 1);
  const head = 'h-8 border-b border-f24-line/50 text-f24-ink';
  const cell = 'border-b border-f24-line/30 text-f24-ink';
  return (
    <div className="overflow-x-auto rounded-md border border-f24-line/60 bg-f24-fill">
      {/* Band and colours of the official F24 model; dark text on the band for contrast (the model uses white). */}
      <p className="bg-f24-band px-3 py-1 text-xs font-bold uppercase tracking-wide text-f24-ink">{SECTION_TITLE[section]}</p>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {inps ? (
              <>
                {entity && <TableHead className={head}>Codice ente</TableHead>}
                <TableHead className={head}>Codice sede</TableHead>
                <TableHead className={head}>Causale</TableHead>
                {position && <TableHead className={head}>{entity ? 'Codice posizione' : 'Codice INPS'}</TableHead>}
                <TableHead className={head}>Periodo da</TableHead>
                <TableHead className={head}>a</TableHead>
              </>
            ) : (
              <>
                {local && <TableHead className={head}>{section === 'REGIONAL' ? 'Codice regione' : 'Codice ente/comune'}</TableHead>}
                <TableHead className={head}>Codice tributo</TableHead>
                <TableHead className={head}>Rateazione</TableHead>
                <TableHead className={head}>Anno di riferimento</TableHead>
              </>
            )}
            <TableHead className={`${head} text-right`}>Importo a debito</TableHead>
            {hasCredit && <TableHead className={`${head} text-right`}>Importo a credito</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((l, i) => (
            <TableRow key={l.id ?? `${l.code}-${l.referenceYear}-${i}`} className="hover:bg-f24-band/25">
              {inps ? (
                <>
                  {entity && <TableCell className={`${cell} font-mono`}>{l.entityCode}</TableCell>}
                  <TableCell className={`${cell} font-mono`}>{l.officeCode}</TableCell>
                  <TableCell className={`${cell} font-mono`}>{l.code}<span className="ml-2 font-sans text-xs opacity-70">{lineLabel(l, taxYear)}</span></TableCell>
                  {position && <TableCell className={`${cell} font-mono`}>{l.positionCode ?? ''}</TableCell>}
                  <TableCell className={`${cell} font-mono`}>{l.periodFrom}</TableCell>
                  <TableCell className={`${cell} font-mono`}>{l.periodTo}</TableCell>
                </>
              ) : (
                <>
                  {local && <TableCell className={`${cell} font-mono`}>{l.localCode ?? ''}</TableCell>}
                  <TableCell className={`${cell} font-mono`}>{l.code}<span className="ml-2 font-sans text-xs opacity-70">{lineLabel(l, taxYear)}</span></TableCell>
                  <TableCell className={`${cell} font-mono`}>{l.installmentCode ?? ''}</TableCell>
                  <TableCell className={`${cell} font-mono`}>{l.referenceYear}</TableCell>
                </>
              )}
              <TableCell className={`${cell} text-right font-mono tabular-nums`}>{Number(l.debitAmount) > 0 ? formatMoney(l.debitAmount) : ''}</TableCell>
              {hasCredit && <TableCell className={`${cell} text-right font-mono tabular-nums`}>{Number(l.creditAmount ?? 0) > 0 ? formatMoney(l.creditAmount ?? 0) : ''}</TableCell>}
            </TableRow>
          ))}
          <TableRow className="bg-f24-band/40 font-semibold hover:bg-f24-band/40">
            <TableCell colSpan={cols - (hasCredit ? 2 : 1)} className="text-right text-xs uppercase tracking-wide text-f24-ink">Totale sezione</TableCell>
            <TableCell className="text-right font-mono tabular-nums text-f24-ink">{formatMoney(debit)}</TableCell>
            {hasCredit && <TableCell className="text-right font-mono tabular-nums text-f24-ink">{formatMoney(credit)}</TableCell>}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

/** With `collapsible` the header toggles the lines and actions (native details, no client JS); `open` sets the initial state. */
export function F24Card({ f, taxYear, highlight, collapsible, open }: { f: F24Draft | F24; taxYear: number; highlight?: boolean; collapsible?: boolean; open?: boolean }) {
  const saved = 'id' in f ? (f as F24) : null;
  const status = saved ? STATUS[saved.status] : null;
  const header = (
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            {collapsible && <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open/f24:rotate-90" />}
            {f24Title(f)}
            {status && <Badge variant="outline" className={status.className}>{status.label}</Badge>}
            {highlight && <Badge>Prossimo</Badge>}
          </CardTitle>
          <CardDescription>
            Scadenza {formatDate(f.paymentDate)}
            {f.nominalPaymentDate && f.nominalPaymentDate !== f.paymentDate && ` (nominale ${formatDate(f.nominalPaymentDate)}, spostata al primo giorno feriale)`}
            {saved?.paidOn && ` · pagato il ${formatDate(saved.paidOn)}`}
          </CardDescription>
          {saved?.notes && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{saved.notes}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Saldo finale</p>
          <p className="font-mono text-lg tabular-nums">{formatMoney(Number(f.totalDebit) - Number(f.totalCredit ?? 0))}</p>
          {Number(f.totalCredit ?? 0) > 0 && <p className="text-xs text-muted-foreground">debiti {formatMoney(f.totalDebit)} − crediti {formatMoney(f.totalCredit ?? 0)}</p>}
        </div>
      </div>
    </CardHeader>
  );
  const content = (
    <CardContent className={collapsible ? 'mt-(--card-spacing) space-y-4' : 'space-y-4'}>
      <LinesTable lines={f.lines} section="TREASURY" taxYear={taxYear} />
      <LinesTable lines={f.lines} section="INPS" taxYear={taxYear} />
      <LinesTable lines={f.lines} section="REGIONAL" taxYear={taxYear} />
      <LinesTable lines={f.lines} section="LOCAL" taxYear={taxYear} />
      <LinesTable lines={f.lines} section="OTHER_ENTITY" taxYear={taxYear} />
      {saved && saved.status !== 'CANCELLED' && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button size="sm" variant="outline" render={<a href={`/f24/${saved.id}/pdf?inline=1`} target="_blank" rel="noreferrer" />}>Apri F24</Button>
          <Button size="sm" variant="outline" render={<a href={`/f24/${saved.id}/pdf`} />}>Scarica PDF (Mod. F24)</Button>
          {saved.status === 'PLANNED' && (
            <span className="inline-flex items-center gap-1">
              <Button size="sm" variant="outline" render={<a href={`/f24/telematic-file?date=${f.paymentDate.slice(0, 10)}&year=${taxYear}`} />}>File per File Internet</Button>
              <Help topic="telematicFile" />
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {saved.status === 'PLANNED' && (
              <MarkPaidDialog id={saved.id} title={f24Title(f)} paymentDate={f.paymentDate.slice(0, 10)} balance={Number(f.totalDebit) - Number(f.totalCredit ?? 0)} />
            )}
            {(saved.kind === 'OTHER' || saved.kind === 'STAMP_DUTY') && saved.status === 'PLANNED' && (
              <form action={deleteF24}>
                <input type="hidden" name="id" value={saved.id} />
                <input type="hidden" name="taxYear" value={taxYear} />
                <Button type="submit" size="sm" variant="ghost">Elimina</Button>
              </form>
            )}
            {saved.status !== 'PLANNED' && (
              <form action={setF24Status}>
                <input type="hidden" name="id" value={saved.id} />
                <input type="hidden" name="taxYear" value={taxYear} />
                <input type="hidden" name="status" value="PLANNED" />
                <Button type="submit" size="sm" variant="ghost">Annulla pagamento</Button>
              </form>
            )}
          </div>
        </div>
      )}
    </CardContent>
  );
  return (
    <Card className={highlight ? 'border-primary' : undefined}>
      {collapsible ? (
        <details open={open} className="group/f24">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{header}</summary>
          {content}
        </details>
      ) : (
        <>
          {header}
          {content}
        </>
      )}
    </Card>
  );
}
