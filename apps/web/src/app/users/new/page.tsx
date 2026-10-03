import { Card, CardContent } from '@/components/ui/card';
import { currentUser } from '@/lib/api';
import { AdminOnly } from '../admin-only';
import { UserForm } from '../user-form';

export default async function NewUserPage() {
  if ((await currentUser())?.role !== 'PLATFORM_ADMIN') return <AdminOnly />;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuovo utente</h1>
        <p className="text-sm text-muted-foreground">Dopo la creazione scegli a quali partite IVA accede.</p>
      </div>
      <Card><CardContent><UserForm /></CardContent></Card>
    </main>
  );
}
