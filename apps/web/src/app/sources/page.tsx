import Link from 'next/link';
import { ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NativeSelect } from '@/components/native-select';
import { RowAction, RowActions } from '@/components/row-actions';
import { api, formatDate } from '@/lib/api';
import { SOURCE_KIND_LABELS } from '@/lib/sources';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default async function SourcesPage({ searchParams }: PageProps<'/sources'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const authority = typeof params.authority === 'string' ? params.authority : '';
  const sources = await api.sources();
  const authorities = [...new Set(sources.map((s) => s.authority))].sort((a, b) => a.localeCompare(b, 'it'));
  const shown = sources
    .filter((s) => !authority || s.authority === authority)
    .filter((s) => !q || fold(`${s.title} ${s.authority} ${s.id} ${SOURCE_KIND_LABELS[s.kind]}`).includes(fold(q)))
    .sort((a, b) => a.authority.localeCompare(b.authority, 'it') || a.title.localeCompare(b.title, 'it'));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fonti ufficiali</h1>
        <p className="text-sm text-muted-foreground">
          Documenti ufficiali letti per scrivere le regole fiscali, con la copia archiviata al momento della consultazione. Ogni valore dei set di regole attivi cita una di queste fonti con il testo esatto.
        </p>
      </div>
      <form method="get" className="flex flex-wrap items-end justify-end gap-2">
        <Input name="q" defaultValue={q} placeholder="Cerca per titolo, ente o argomento" className="h-8 w-72" aria-label="Cerca" />
        <NativeSelect name="authority" defaultValue={authority} className="w-64" aria-label="Ente">
          <option value="">Tutti gli enti</option>
          {authorities.map((a) => <option key={a} value={a}>{a}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">Filtra</Button>
        {(q || authority) && <Button variant="ghost" render={<Link href="/sources" />}>Azzera</Button>}
      </form>
      <Card>
        <CardHeader>
          <CardTitle>{shown.length === sources.length ? `${sources.length} fonti` : `${shown.length} di ${sources.length} fonti`}</CardTitle>
          <CardDescription>Citazioni contate sui set di regole attivi.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Ente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Consultato il</TableHead>
                <TableHead>Citato da</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-md whitespace-normal">
                    <Link href={`/sources/${s.id}`} className="font-medium hover:underline">{s.title}</Link>
                  </TableCell>
                  <TableCell className="text-sm">{s.authority}</TableCell>
                  <TableCell><Badge variant="secondary">{SOURCE_KIND_LABELS[s.kind]}</Badge></TableCell>
                  <TableCell className="text-sm">{formatDate(s.retrievedOn)}</TableCell>
                  <TableCell className="text-sm">
                    {s.citations > 0 ? `${s.citations} ${s.citations === 1 ? 'regola' : 'regole'} (${[...s.years].sort().join(', ')})` : <span className="text-muted-foreground">nessuna regola</span>}
                  </TableCell>
                  <TableCell>
                    <RowActions>
                      <RowAction label="Copia archiviata" render={<a href={`/sources/${s.id}/file`} target="_blank" rel="noreferrer" />}><FileText /></RowAction>
                      <RowAction label="Pagina ufficiale" render={<a href={s.url} target="_blank" rel="noreferrer" />}><ExternalLink /></RowAction>
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nessuna fonte corrisponde ai filtri.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
