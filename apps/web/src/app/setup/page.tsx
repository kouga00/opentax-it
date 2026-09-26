import Link from 'next/link';
import { api, currentTenantId, fetchOrNull } from '@/lib/api';
import { selectTenant } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect } from '@/components/native-select';
import { PecForm } from './pec-form';
import { TenantForm } from './tenant-form';

export default async function SetupPage() {
  const year = new Date().getFullYear();
  const [tenants, offices, me, rules, pecProviders, pecSettings] = await Promise.all([
    fetchOrNull(() => api.tenants()),
    fetchOrNull(() => api.inpsOffices()),
    fetchOrNull(() => api.me()),
    fetchOrNull(() => api.activeRules(year)),
    fetchOrNull(() => api.pecProviders()),
    fetchOrNull(() => api.pecSettings()),
  ]);
  const current = await currentTenantId();
  const list = tenants ?? [];
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>
      <div className="flex justify-end gap-2"><Button render={<Link href="/setup/new" />}>Nuova partita IVA</Button></div>

      <Card>
        <CardHeader>
          <CardTitle>Partita IVA attiva</CardTitle>
          <CardDescription>Finché non c&apos;è l&apos;autenticazione, la partita IVA attiva è salvata in un cookie del browser.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <form action={selectTenant} className="flex max-w-md gap-2">
              <NativeSelect name="tenantId" defaultValue={current ?? list[0].id}>
                {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </NativeSelect>
              <Button type="submit">Usa</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Nessuna partita IVA: creala con il pulsante &quot;Nuova partita IVA&quot;.</p>
          )}
        </CardContent>
      </Card>

      {me ? (
        <Card>
          <CardHeader>
            <CardTitle>Profilo fiscale — {me.name}</CardTitle>
            <CardDescription>Dati del cedente/prestatore usati nelle fatture elettroniche (FatturaPA, CedentePrestatore) e negli F24.</CardDescription>
          </CardHeader>
          <CardContent><TenantForm offices={offices ?? []} current={{ name: me.name, profile: me.profile }} surchargePct={rules?.inps.surchargePct} /></CardContent>
        </Card>
      ) : null}

      {me && pecSettings ? (
        <Card id="pec">
          <CardHeader>
            <CardTitle>PEC per l&apos;invio allo SDI</CardTitle>
            <CardDescription>Le fatture emesse si inviano allo SDI come allegato di un messaggio PEC, senza accreditamento (Specifiche tecniche FatturaPA 1.9.1 §1.3.1). Serve una casella PEC con accesso SMTP e IMAP; la password resta cifrata nel database.</CardDescription>
          </CardHeader>
          <CardContent><PecForm providers={pecProviders ?? []} settings={pecSettings} /></CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Aliquote, soglie, scadenze e codici sono uguali per tutte le partite IVA: si consultano e si attivano in <Link href="/rules" className="underline">Regole fiscali</Link>.
      </p>
    </main>
  );
}
