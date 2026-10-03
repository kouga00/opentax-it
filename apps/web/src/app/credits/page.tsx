import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Help } from '@/components/help';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorAlert } from '@/components/error-alert';
import { NoTenant } from '@/components/no-tenant';
import { deleteTaxCredit } from '@/lib/actions';
import { api, currentTenantId, fetchOrNull, formatDate, formatMoney } from '@/lib/api';
import { FileText, Pencil } from 'lucide-react';
import { DeleteRowAction, RowAction, RowActions } from '@/components/row-actions';

const SECTION: Record<string, string> = { TREASURY: 'Erario', INPS: 'INPS', REGIONAL: 'Regioni', LOCAL: 'IMU e tributi locali' };

export default async function CreditsPage({ searchParams }: PageProps<'/credits'>) {
  if (!(await currentTenantId())) return <NoTenant />;
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : undefined;
  const credits = (await fetchOrNull(() => api.taxCredits())) ?? [];
  const remaining = credits.reduce((s, c) => s + c.remaining, 0);
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
          <h1 className="text-2xl font-semibold">Crediti da usare in F24</h1>
          <p className="text-sm text-muted-foreground">
            Crediti risultanti dalla dichiarazione (imposta sostitutiva LM47, INPS RR8, IRPEF, addizionali) compensabili con i debiti in F24 (art. 17 D.Lgs. 241/97; Istr. Redditi PF 2026 Fasc. 1 §8). Vengono proposti quando generi un piano in <Link href="/f24" className="underline">F24 e rate</Link>: il modello a saldo zero va trasmesso solo con i servizi telematici AdE.
          </p>
      </div>
      <ErrorAlert message={error} />
      <div className="flex justify-end gap-2"><Button render={<Link href="/credits/new" />}>Nuovo credito</Button></div>

      <Card>
        <CardHeader>
          <CardTitle>Crediti registrati</CardTitle>
          <CardDescription>Disponibile complessivo: {formatMoney(remaining)}. Un credito usato in un piano si libera eliminando quel piano.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sezione</TableHead>
                <TableHead>Codice</TableHead>
                <TableHead>Ente/comune</TableHead>
                <TableHead>Anno</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="text-right"><span className="inline-flex items-center gap-1">Usato <Help topic="creditUsed" /></span></TableHead>
                <TableHead className="text-right">Residuo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{SECTION[c.section]}</TableCell>
                  <TableCell className="font-mono"><span className="font-medium">{c.code}</span>{c.installmentCode && <span className="ml-2 text-xs text-muted-foreground">{c.installmentCode}</span>}</TableCell>
                  <TableCell className="font-mono">{c.localCode ?? '—'}</TableCell>
                  <TableCell className="font-mono">{c.referenceYear}</TableCell>
                  <TableCell className="text-sm">{c.description ?? '—'}{c.usableFrom && <span className="block text-xs text-muted-foreground">dal {formatDate(c.usableFrom)}</span>}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatMoney(c.amount)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatMoney(c.used)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.absorbedInReturnYear ? <Help topic="creditAbsorbed" params={{ returnYear: c.absorbedInReturnYear }} trigger={<Badge variant="secondary">in dichiarazione {c.absorbedInReturnYear}</Badge>} /> : c.remaining > 0 ? formatMoney(c.remaining) : <Help topic="creditExhausted" trigger={<Badge variant="secondary">esaurito</Badge>} />}</TableCell>
                  <TableCell>
                    <RowActions>
                      {c.used === 0 && !c.absorbedInReturnYear ? (
                        <>
                          <RowAction label="Modifica" render={<Link href={`/credits/${c.id}`} />}><Pencil /></RowAction>
                          <DeleteRowAction action={deleteTaxCredit} fields={{ id: c.id }} confirm={`Eliminare il credito ${c.code} ${c.referenceYear}?`} />
                        </>
                      ) : (
                        <RowAction label={c.absorbedInReturnYear ? `Apri (nella dichiarazione ${c.absorbedInReturnYear}, non modificabile)` : 'Apri (usato in F24, non modificabile)'} render={<Link href={`/credits/${c.id}`} />}><FileText /></RowAction>
                      )}
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
              {credits.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nessun credito registrato.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </main>
  );
}
