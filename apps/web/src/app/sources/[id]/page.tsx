import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, FileText, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, fetchOrNull, formatDate, type SourceCitation } from '@/lib/api';
import { RULE_LABELS, ruleHref, ruleValueLabel, SOURCE_KIND_LABELS } from '@/lib/sources';

const FORMAT_LABELS = { pdf: 'PDF', html: 'testo della pagina', xls: 'foglio XLS' } as const;

function Citation({ c }: { c: SourceCitation }) {
  const value = ruleValueLabel(c.key, c.value);
  return (
    <div id={`${c.year}-${c.key}`} className="scroll-mt-4 space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={ruleHref(c.year, c.key)} className="font-medium hover:underline">{RULE_LABELS[c.key] ?? c.key}</Link>
        {value && <span className="font-mono text-sm tabular-nums">{value}</span>}
        {!c.main && <Badge variant="outline">fonte aggiuntiva</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-mono">{c.key}</span> · set {c.year} v{c.version} · {c.title} · verificato il {formatDate(c.verifiedOn)}
      </p>
      {c.excerpts.map((parts, i) => (
        <blockquote key={i} className="rounded-md border-l-4 border-primary/40 bg-muted/40 px-3 py-2 text-sm leading-relaxed">
          {parts.map((p, j) => (p.mark ? <mark key={j} className="rounded-sm bg-yellow-200/80 px-0.5 text-foreground dark:bg-yellow-500/30">{p.text}</mark> : <span key={j} className="text-muted-foreground">{p.text}</span>))}
        </blockquote>
      ))}
      {c.missing.length > 0 && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Citazione non trovata nel testo archiviato</AlertTitle>
          <AlertDescription>{c.missing.map((m) => `“${m}”`).join(' … ')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default async function SourcePage({ params }: PageProps<'/sources/[id]'>) {
  const { id } = await params;
  const detail = await fetchOrNull(() => api.source(id));
  if (!detail) notFound();
  const { source: s, citations } = detail;
  const years = [...new Set(citations.map((c) => c.year))].sort((a, b) => b - a);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground"><Link href="/sources" className="hover:underline">Fonti ufficiali</Link> · {s.authority}</p>
        <h1 className="text-2xl font-semibold">{s.title}</h1>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<a href={`/sources/${s.id}/file`} target="_blank" rel="noreferrer" />}><FileText />Copia archiviata ({FORMAT_LABELS[s.format]})</Button>
        {s.text && <Button variant="outline" render={<a href={`/sources/${s.id}/file?text=1`} target="_blank" rel="noreferrer" />}><FileText />Testo estratto</Button>}
        <Button variant="outline" render={<a href={s.url} target="_blank" rel="noreferrer" />}><ExternalLink />Pagina ufficiale</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Documento</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
            <dt className="text-muted-foreground">Ente</dt><dd>{s.authority}</dd>
            <dt className="text-muted-foreground">Tipo</dt><dd>{SOURCE_KIND_LABELS[s.kind]}</dd>
            <dt className="text-muted-foreground">Indirizzo ufficiale</dt><dd className="break-all"><a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.url}</a></dd>
            {s.fetchUrl && <><dt className="text-muted-foreground">Scaricato da</dt><dd className="break-all">{s.fetchUrl}</dd></>}
            <dt className="text-muted-foreground">Consultato il</dt><dd>{formatDate(s.retrievedOn)}</dd>
            <dt className="text-muted-foreground">Impronta SHA-256</dt><dd className="break-all font-mono text-xs">{s.sha256}</dd>
            <dt className="text-muted-foreground">Id nel registro</dt><dd className="font-mono text-xs">{s.id}</dd>
          </dl>
        </CardContent>
      </Card>

      {years.length === 0 ? (
        <Card><CardHeader><CardTitle>Nessuna regola la cita</CardTitle><CardDescription>Nessun set di regole attivo cita questa fonte: è nel registro come riferimento di progetto o documentazione.</CardDescription></CardHeader></Card>
      ) : (
        years.map((year) => {
          const items = citations.filter((c) => c.year === year);
          return (
            <Card key={year}>
              <CardHeader>
                <CardTitle>Regole {year} che la citano</CardTitle>
                <CardDescription>{items.length} {items.length === 1 ? 'voce' : 'voci'} del set attivo v{items[0].version}; il testo evidenziato è la citazione esatta nella copia archiviata.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((c) => <Citation key={`${c.key}-${c.main}`} c={c} />)}
              </CardContent>
            </Card>
          );
        })
      )}
    </main>
  );
}
