import Link from 'next/link';
import { api, fetchOrNull } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantForm } from '../tenant-form';

export default async function NewTenantPage() {
  const [offices, funds, rules] = await Promise.all([fetchOrNull(() => api.inpsOffices()), fetchOrNull(() => api.professionalFunds()), fetchOrNull(() => api.activeRules(new Date().getFullYear()))]);
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nuova partita IVA</h1>
      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" render={<Link href="/setup" />}>Annulla</Button></div>
      <Card>
        <CardHeader>
          <CardTitle>Profilo fiscale</CardTitle>
          <CardDescription>Dati del cedente/prestatore usati nelle fatture elettroniche (FatturaPA, CedentePrestatore) e negli F24. Dopo la creazione diventa la partita IVA attiva.</CardDescription>
        </CardHeader>
        <CardContent><TenantForm offices={offices ?? []} funds={funds ?? []} surchargePct={rules?.inps.surchargePct} /></CardContent>
      </Card>
    </main>
  );
}
