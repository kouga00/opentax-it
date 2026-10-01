import Link from 'next/link';
import { ErrorAlert } from '@/components/error-alert';
import { api, currentTenantId, customerLabel, fetchOrNull } from '@/lib/api';
import { deleteCustomer } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NoTenant } from '@/components/no-tenant';
import { Pencil } from 'lucide-react';
import { DeleteRowAction, RowAction, RowActions } from '@/components/row-actions';

const KIND_LABELS: Record<string, string> = { IT_B2B: 'Italia B2B', IT_B2C: 'Italia privato', IT_PA: 'PA', EU: 'UE B2B', EU_B2C: 'UE privato', NON_EU: 'Extra UE B2B', NON_EU_B2C: 'Extra UE privato' };

export default async function CustomersPage({ searchParams }: PageProps<'/customers'>) {
  const { error } = await searchParams;
  if (!(await currentTenantId())) return <NoTenant />;
  const customers = (await fetchOrNull(() => api.customers())) ?? [];
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <ErrorAlert message={typeof error === 'string' ? error : undefined} />
      <h1 className="text-2xl font-semibold">Clienti</h1>
      <div className="flex justify-end gap-2"><Button render={<Link href="/customers/new" />}>Nuovo cliente</Button></div>
      <Card>
        <CardHeader><CardTitle>{customers.length} clienti</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>P. IVA / CF</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Cod. destinatario</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{customerLabel(c)}</TableCell>
                  <TableCell><Badge variant="secondary">{KIND_LABELS[c.kind] ?? c.kind}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{c.vatNumber ? `${c.countryCode}${c.vatNumber}` : c.fiscalCode}</TableCell>
                  <TableCell className="text-sm">{c.city}{c.province ? ` (${c.province})` : ''}, {c.country}</TableCell>
                  <TableCell className="font-mono text-sm">{c.recipientCode}{c.recipientPec ? ` · ${c.recipientPec}` : ''}</TableCell>
                  <TableCell>
                    <RowActions>
                      <RowAction label="Modifica" render={<Link href={`/customers/${c.id}`} />}><Pencil /></RowAction>
                      <DeleteRowAction action={deleteCustomer} fields={{ id: c.id }} confirm={`Eliminare il cliente ${customerLabel(c)}?`} />
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nessun cliente. Creane uno per emettere la prima fattura.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
