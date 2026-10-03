import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { currentUser } from '@/lib/api';

/** Only the platform admin creates VAT numbers; the other users get them assigned in Utenti. */
export async function NoTenant() {
  const admin = (await currentUser())?.role === 'PLATFORM_ADMIN';
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nessuna partita IVA selezionata</CardTitle>
          <CardDescription>{admin ? 'Seleziona o crea la partita IVA da gestire.' : 'Seleziona la partita IVA da gestire. Se non ne vedi nessuna, chiedi all\'amministratore di assegnartela.'}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button render={<Link href="/setup" />}>Vai alle impostazioni</Button>
          {admin && <Button variant="outline" render={<Link href="/setup/new" />}>Nuova partita IVA</Button>}
        </CardContent>
      </Card>
    </main>
  );
}
