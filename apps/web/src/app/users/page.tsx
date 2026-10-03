import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { ErrorAlert } from '@/components/error-alert';
import { Help } from '@/components/help';
import { DeleteRowAction, RowAction, RowActions } from '@/components/row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { deleteUser } from '@/lib/actions';
import { api, currentUser, fetchOrNull } from '@/lib/api';
import { AdminOnly } from './admin-only';
import { ACCESS_LABEL, ACCOUNT_ROLE_LABEL } from './labels';

export default async function UsersPage({ searchParams }: PageProps<'/users'>) {
  const { error } = await searchParams;
  const me = await currentUser();
  if (me?.role !== 'PLATFORM_ADMIN') return <AdminOnly />;
  const users = (await fetchOrNull(() => api.users())) ?? [];
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <ErrorAlert message={typeof error === 'string' ? error : undefined} />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">Utenti <Help topic="usersPage" /></h1>
        <p className="text-sm text-muted-foreground">Chi può accedere a OpenTax IT e a quali partite IVA, in sola lettura o in lettura e scrittura.</p>
      </div>
      <div className="flex justify-end gap-2"><Button render={<Link href="/users/new" />}>Nuovo utente</Button></div>
      <Card>
        <CardHeader><CardTitle>{users.length} utenti</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Nome</TableHead><TableHead>Ruolo</TableHead><TableHead>Partite IVA</TableHead><TableHead className="text-right">Azioni</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}{u.id === me.id && <Badge variant="secondary" className="ml-2">tu</Badge>}</TableCell>
                  <TableCell>{u.name ?? '—'}</TableCell>
                  <TableCell>{ACCOUNT_ROLE_LABEL[u.role] ?? u.role}</TableCell>
                  <TableCell className="text-sm">
                    {u.role === 'PLATFORM_ADMIN'
                      ? <span className="text-muted-foreground">tutte</span>
                      : u.memberships.length === 0
                        ? <span className="text-muted-foreground">nessuna</span>
                        : u.memberships.map((m) => <span key={m.tenantId} className="block">{m.tenantName} <span className="text-xs text-muted-foreground">({ACCESS_LABEL[m.role] ?? m.role})</span></span>)}
                  </TableCell>
                  <TableCell>
                    <RowActions>
                      <RowAction label="Modifica" render={<Link href={`/users/${u.id}`} />}><Pencil /></RowAction>
                      {u.id !== me.id && <DeleteRowAction action={deleteUser} fields={{ id: u.id }} confirm={`Eliminare l'utente ${u.email}? Viene disconnesso subito.`} />}
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
