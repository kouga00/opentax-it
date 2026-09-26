import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, CircleCheck, Eye, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmRowAction, RowAction, RowActions } from '@/components/row-actions';
import { RevealHashTarget } from '@/components/reveal-hash-target';
import { YearSelect } from '@/components/year-select';
import { activateRuleSet, seedRuleSets } from '@/lib/actions';
import { api, fetchOrNull, formatDate, yearRange, type RuleSetDetail, type RuleSourceRef, type SourceSummary } from '@/lib/api';
import { byRuleOrder, RULE_LABELS, RULE_SECTIONS, ruleHref, ruleSection, ruleValueLabel } from '@/lib/sources';
import { SectionSelect } from './section-select';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Bozza', PROPOSED: 'Proposto', ACTIVE: 'Attivo', SUPERSEDED: 'Superato' };

type Sources = Map<string, SourceSummary>;

const label = (key: string) => RULE_LABELS[key] ?? key;

/** Notes written by the API in English for the bundled sets. */
const NOTES: Record<string, string> = { 'Bundled with the application': 'Fornito con l\'applicazione' };

/** Which parts of a source entry differ between two versions. */
function changedParts(before?: RuleSourceRef, after?: RuleSourceRef): string[] {
  if (!before || !after) return [];
  const ids = (r: RuleSourceRef) => [r.sourceId, ...(r.additional ?? []).map((a) => a.sourceId)].join();
  const quotes = (r: RuleSourceRef) => [r.quote, ...(r.additional ?? []).map((a) => a.quote)].join();
  return [
    ...(ids(before) !== ids(after) || before.url !== after.url ? ['documento'] : []),
    ...(before.title !== after.title ? ['riferimento'] : []),
    ...(quotes(before) !== quotes(after) ? ['citazione'] : []),
  ];
}

/** A value as text, or a short note for values shown otherwise (the ATECO table). */
function Value({ path, value }: { path: string; value: unknown }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  if (path.endsWith('profitabilityByAteco') && value && typeof value === 'object') {
    const rows = Object.entries(value as Record<string, number>).sort(([a], [b]) => a.localeCompare(b, 'it', { numeric: true }));
    return (
      <details>
        <summary className="cursor-pointer text-sm">{rows.length} codici ATECO</summary>
        <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-0.5 font-mono text-xs sm:grid-cols-6">
          {rows.map(([code, pct]) => <span key={code}>{code}: {pct}%</span>)}
        </div>
      </details>
    );
  }
  const text = ruleValueLabel(path, value);
  return <span className="font-mono text-sm tabular-nums">{text ?? JSON.stringify(value)}</span>;
}

/** Source of a value: the reference, a link to the registry entry and the verbatim quote on demand. */
function Source({ refKey, sourceRef: ref, year, sources }: { refKey: string; sourceRef: RuleSourceRef; year: number; sources: Sources }) {
  const entries = [{ sourceId: ref.sourceId, quote: ref.quote }, ...(ref.additional ?? [])];
  return (
    <div className="space-y-1 text-sm">
      <p>{ref.title}</p>
      <p className="flex flex-wrap gap-x-3 text-xs">
        {entries.map((e, i) =>
          e.sourceId && sources.has(e.sourceId) ? (
            <Link key={i} href={`/sources/${e.sourceId}#${year}-${refKey}`} className="text-primary underline-offset-2 hover:underline">
              {sources.get(e.sourceId)!.title}
            </Link>
          ) : (
            <a key={i} href={ref.url} target="_blank" rel="noreferrer" className="underline">{ref.url}</a>
          ),
        )}
      </p>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Citazione · verificata il {formatDate(ref.verifiedOn)}</summary>
        {entries.map((e, i) => <blockquote key={i} className="mt-1 border-l-2 pl-2 italic">“{e.quote}”</blockquote>)}
      </details>
    </div>
  );
}

/** Card whose header opens and closes its content (native details, no client JS). */
function CollapsibleCard({ id, title, description, open, children }: { id: string; title: string; description?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-4">
      <details open={open} className="group/rules">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open/rules:rotate-90" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        </summary>
        <CardContent className="mt-(--card-spacing)">{children}</CardContent>
      </details>
    </Card>
  );
}

function Changes({ detail, sources }: { detail: RuleSetDetail; sources: Sources }) {
  const c = detail.comparison!;
  const empty = c.values.length === 0 && c.sources.length === 0;
  return (
    <CollapsibleCard
      id="differenze"
      open
      title={`Cosa cambia rispetto al set attivo v${c.against.version}`}
      description={empty ? 'Nessuna differenza: stessi valori e stesse fonti (cambiano al più le date di verifica).' : `${c.values.length} valori e ${c.sources.length} fonti diversi. Controllali prima di attivare v${detail.version}.`}
    >
      {empty ? null : (
        <div className="space-y-6">
          {c.values.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Valore</TableHead><TableHead>Attivo v{c.against.version}</TableHead><TableHead>v{detail.version}</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...c.values].sort((a, b) => byRuleOrder(a.path, b.path)).map((v) => (
                  <TableRow key={v.path}>
                    <TableCell className="whitespace-normal"><Link href={ruleHref(detail.year, v.path, detail.id)} scroll={false} className="hover:underline">{label(v.path)}</Link></TableCell>
                    <TableCell className="whitespace-normal"><Value path={v.path} value={v.before} /></TableCell>
                    <TableCell className="whitespace-normal"><Value path={v.path} value={v.after} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {c.sources.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Fonte di</TableHead><TableHead>Attivo v{c.against.version}</TableHead><TableHead>v{detail.version}</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...c.sources].sort((a, b) => byRuleOrder(a.key, b.key)).map((s) => (
                  <TableRow key={s.key} className="align-top">
                    <TableCell className="whitespace-normal">
                      <Link href={ruleHref(detail.year, s.key, detail.id)} scroll={false} className="hover:underline">{label(s.key)}</Link>
                      <span className="mt-1 flex flex-wrap gap-1">{changedParts(s.before, s.after).map((p) => <Badge key={p} variant="secondary">cambia {p}</Badge>)}</span>
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal">{s.before ? <Source refKey={s.key} sourceRef={s.before} year={detail.year} sources={sources} /> : <span className="text-muted-foreground">nessuna</span>}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal">{s.after ? <Source refKey={s.key} sourceRef={s.after} year={detail.year} sources={sources} /> : <span className="text-muted-foreground">rimossa</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}

/** Sections of the set that have rules, in the order of RULE_SECTIONS; unknown sections at the end. */
function sectionsOf(detail: RuleSetDetail) {
  const known = new Set(RULE_SECTIONS.map((s) => s.key));
  const keys = [...detail.fields.map((f) => f.path), ...detail.documents.map((d) => d.key)].map(ruleSection);
  const all = [...RULE_SECTIONS, ...[...new Set(keys)].filter((k) => !known.has(k)).map((key) => ({ key, label: key }))];
  return all
    .map((section) => ({
      ...section,
      fields: detail.fields.filter((f) => ruleSection(f.path) === section.key).sort((a, b) => byRuleOrder(a.path, b.path)),
      documents: detail.documents.filter((d) => ruleSection(d.key) === section.key).sort((a, b) => byRuleOrder(a.key, b.key)),
    }))
    .filter((section) => section.fields.length + section.documents.length > 0);
}

const rulesCount = (n: number) => `${n} ${n === 1 ? 'regola' : 'regole'}`;

/** Content of the set, one section at a time: the section is chosen in the select and kept in the URL. */
function Contents({ detail, sources, section: requested, baseHref }: { detail: RuleSetDetail; sources: Sources; section?: string; baseHref: string }) {
  const sections = sectionsOf(detail);
  const section = sections.find((s) => s.key === requested) ?? sections[0];
  if (!section) return null;
  const { fields, documents } = section;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          Contenuto di <span className="font-mono">v{detail.version}</span> <Badge variant={detail.status === 'ACTIVE' ? 'default' : 'outline'}>{STATUS_LABELS[detail.status] ?? detail.status}</Badge>
          {detail.status !== 'ACTIVE' && !detail.comparison && <span className="text-muted-foreground"> · nessun set attivo per il {detail.year} da confrontare</span>}
        </p>
        <SectionSelect
          items={sections.map((s) => ({ value: s.key, label: `${s.label} (${s.fields.length + s.documents.length})` }))}
          value={section.key}
          baseHref={baseHref}
        />
      </div>
      <Card id={section.key} className="scroll-mt-4">
        <CardHeader>
          <CardTitle>{section.label}</CardTitle>
          <CardDescription>{rulesCount(fields.length + documents.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
          <TableHeader><TableRow><TableHead className="w-1/3">Regola</TableHead><TableHead className="w-1/4">Valore</TableHead><TableHead>Fonte</TableHead></TableRow></TableHeader>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.path} id={f.path} className="scroll-mt-4 align-top">
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{label(f.path)}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{f.path}</span>
                </TableCell>
                <TableCell className="whitespace-normal"><Value path={f.path} value={f.value} /></TableCell>
                <TableCell className="whitespace-normal">
                  {f.ref && f.refKey ? (
                    <>
                      {f.refKey !== f.path && <p className="mb-1 text-xs text-muted-foreground">Fonte della sezione: {label(f.refKey)}</p>}
                      <Source refKey={f.refKey} sourceRef={f.ref} year={detail.year} sources={sources} />
                    </>
                  ) : (
                    <span className="text-sm text-destructive">Nessuna fonte</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {documents.map((d) => (
              <TableRow key={d.key} id={d.key} className="scroll-mt-4 align-top">
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{label(d.key)}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{d.key}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">riferimento</TableCell>
                <TableCell className="whitespace-normal"><Source refKey={d.key} sourceRef={d.ref} year={detail.year} sources={sources} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default async function RulesPage({ searchParams }: PageProps<'/rules'>) {
  const params = await searchParams;
  const current = new Date().getFullYear();
  const year = Number(params.year) || current;
  const [sets, status, registry] = await Promise.all([fetchOrNull(() => api.ruleSets(year)), fetchOrNull(() => api.ruleSetStatus(year)), fetchOrNull(() => api.sources())]);
  const list = sets ?? [];
  const requested = typeof params.set === 'string' ? list.find((s) => s.id === params.set) : undefined;
  const selected = requested ?? list.find((s) => s.status === 'ACTIVE') ?? list[0];
  const detail = selected ? await fetchOrNull(() => api.ruleSet(selected.id)) : null;
  const sources: Sources = new Map((registry ?? []).map((s) => [s.id, s]));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Regole fiscali {year}</h1>
        <p className="text-sm text-muted-foreground">
          Valori usati per calcoli, scadenze, F24 e fatture, uguali per tutte le partite IVA. Ogni valore cita una <Link href="/sources" className="underline">fonte ufficiale</Link> con il testo esatto. I set sono versionati, il software usa solo quello attivo e l&apos;attivazione è sempre manuale.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <YearSelect path="/rules" value={year} years={yearRange(current - 2, current + 1, year)} />
        <form action={seedRuleSets}>
          <Button variant="outline" type="submit">Carica set forniti con l&apos;applicazione</Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Versioni {year}</CardTitle>
          <CardDescription>
            {year === current - 1 && `Anno d'imposta ${year}: aliquote, coefficiente e massimale INPS per il calcolo delle imposte ${year} (dichiarazione e versamenti nel ${current}). `}
            {year === current && `Anno di versamento ${year}: scadenze, acconti, codici e regole per le fatture emesse nel ${year}. `}
            {year === current + 1 && `Serve per il calcolo dell'anno d'imposta ${current} appena la normativa ${year} sarà pubblicata e verificata. `}
            &quot;Carica set forniti&quot; crea una nuova bozza solo se il contenuto è cambiato e non attiva nulla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {status && !status.ok && list.length > 0 && (
            <Alert variant="warning"><TriangleAlert /><AlertTitle>Set attivo non utilizzabile</AlertTitle><AlertDescription>{status.reason}</AlertDescription></Alert>
          )}
          <Table>
            <TableHeader><TableRow><TableHead>Versione</TableHead><TableHead>Stato</TableHead><TableHead>Creato il</TableHead><TableHead>Attivato il</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Azioni</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id} className={r.id === selected?.id ? 'bg-muted/50' : undefined}>
                  <TableCell className="font-mono">v{r.version}</TableCell>
                  <TableCell><Badge variant={r.status === 'ACTIVE' ? 'default' : 'outline'}>{STATUS_LABELS[r.status] ?? r.status}</Badge></TableCell>
                  <TableCell>{r.createdAt ? formatDate(r.createdAt) : '—'}</TableCell>
                  <TableCell>{r.activatedAt ? formatDate(r.activatedAt) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes ? (NOTES[r.notes] ?? r.notes) : null}</TableCell>
                  <TableCell>
                    <RowActions>
                      <RowAction label={r.status === 'ACTIVE' ? 'Mostra' : 'Mostra e confronta con il set attivo'} render={<Link href={`/rules?year=${year}&set=${r.id}${r.status === 'ACTIVE' ? '' : '#differenze'}`} />}><Eye /></RowAction>
                      {r.status !== 'ACTIVE' && r.status !== 'SUPERSEDED' && (
                        <ConfirmRowAction action={activateRuleSet} fields={{ id: r.id }} label="Attiva" confirm={`Attivare il set ${year} v${r.version}? Il set attivo diventerà superato e non potrà tornare attivo.`}><CircleCheck /></ConfirmRowAction>
                      )}
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nessun set caricato per il {year}.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {detail && (
        <>
          <Contents detail={detail} sources={sources} section={typeof params.section === 'string' ? params.section : undefined} baseHref={`/rules?year=${year}&set=${detail.id}`} />
          {detail.comparison && <Changes detail={detail} sources={sources} />}
          <RevealHashTarget />
        </>
      )}
    </main>
  );
}
