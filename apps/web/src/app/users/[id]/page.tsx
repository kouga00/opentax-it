import { notFound } from 'next/navigation';
import { Help } from '@/components/help';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, currentUser, fetchOrNull } from '@/lib/api';
import { AdminOnly } from '../admin-only';
import { MembershipsForm } from '../memberships-form';
import { UserForm } from '../user-form';

export default async function EditUserPage({ params }: PageProps<'/users/[id]'>) {
  const { id } = await params;
  const me = await currentUser();
  if (me?.role !== 'PLATFORM_ADMIN') return <AdminOnly />;
  const [users, tenants] = await Promise.all([fetchOrNull(() => api.users()), fetchOrNull(() => api.tenants())]);
  const account = users?.find((u) => u.id === id);
  if (!account) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica utente</h1>
        <p className="text-sm text-muted-foreground">{account.email}</p>
      </div>
      <Card><CardContent><UserForm account={account} self={account.id === me.id} /></CardContent></Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Accesso alle partite IVA <Help topic="membershipAccess" /></CardTitle>
          {account.role === 'PLATFORM_ADMIN' && <CardDescription>L&apos;amministratore accede comunque a tutte le partite IVA, in lettura e scrittura.</CardDescription>}
        </CardHeader>
        <CardContent><MembershipsForm account={account} tenants={tenants ?? []} /></CardContent>
      </Card>
    </main>
  );
}
