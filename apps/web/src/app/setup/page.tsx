import Link from 'next/link';
import { api, currentTenantId, fetchOrNull } from '@/lib/api';
import { selectTenant } from '@/lib/actions';
import type { PecSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Help } from '@/components/help';
import { NativeSelect } from '@/components/native-select';
import { PecForm } from './pec-form';
import { SetupTabs } from './setup-tabs';
import { TenantForm } from './tenant-form';
const TABS = ['profile', 'pec'] as const;

export default async function SetupPage({ searchParams }: PageProps<'/setup'>) {
  const { tab, error } = (await searchParams) ?? {};
  const year = new Date().getFullYear();
  const [tenants, offices, funds, me, rules, pecProviders, pecSettings] = await Promise.all([
    fetchOrNull(() => api.tenants()),
    fetchOrNull(() => api.inpsOffices()),
    fetchOrNull(() => api.professionalFunds()),
    fetchOrNull(() => api.me()),
    fetchOrNull(() => api.activeRules(year)),
    fetchOrNull(() => api.pecProviders()),
    fetchOrNull(() => api.pecSettings()),
  ]);
  const current = await currentTenantId();
  const list = tenants ?? [];
  // ?tab=pec opens the PEC tab, e.g. from the invoice page when the mailbox is not configured yet.
  const initialTab = TABS.find((t) => t === tab) ?? 'profile';
  // The forms read the saved values as defaults: the keys recreate them when a save changes those values.
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>
      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {list.length > 0 ? (
          <form action={selectTenant} className="flex w-full max-w-md items-center gap-2">
            <NativeSelect name="tenantId" aria-label="Partita IVA attiva" defaultValue={current ?? list[0].id}>
              {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect>
            <Button type="submit" variant="outline">Usa</Button>
            <Help topic="activeTenantCookie" />
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Nessuna partita IVA: creala con il pulsante &quot;Nuova partita IVA&quot;.</p>
        )}
        <Button render={<Link href="/setup/new" />}>Nuova partita IVA</Button>
      </div>

      {me ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{me.name}</h2>
            <p className="text-sm text-muted-foreground">Partita IVA {me.profile.vatNumber} · {me.profile.fiscalCode}</p>
          </div>
          <SetupTabs defaultValue={initialTab}>
            <TabsList variant="line" className="w-full justify-start border-b">
              <TabsTrigger value="profile" className="flex-none px-3">Profilo fiscale</TabsTrigger>
              <TabsTrigger value="pec" className="flex-none px-3">Impostazioni PEC</TabsTrigger>
            </TabsList>
            {/* keepMounted: switching tab does not lose what was typed in the other form. */}
            <TabsContent value="profile" keepMounted>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Profilo fiscale</CardTitle>
                  <CardDescription>Dati del cedente/prestatore usati nelle fatture elettroniche (FatturaPA, CedentePrestatore) e negli F24.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TenantForm key={JSON.stringify(me)} offices={offices ?? []} funds={funds ?? []} current={{ name: me.name, profile: me.profile }} surchargePct={rules?.inps.surchargePct} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="pec" keepMounted>
              <div className="pt-4">
                {pecSettings ? <PecForm key={pecFormKey(pecSettings)} providers={pecProviders ?? []} settings={pecSettings} /> : <p className="text-sm text-muted-foreground">Impostazioni PEC non disponibili.</p>}
              </div>
            </TabsContent>
          </SetupTabs>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Aliquote, soglie, scadenze e codici sono uguali per tutte le partite IVA: si consultano e si attivano in <Link href="/rules" className="underline">Regole fiscali</Link>.
      </p>
    </main>
  );
}

/** Remounts the PEC form only when its saved fields change, not when a test or a sync updates the other settings. */
function pecFormKey(s: PecSettings): string {
  return JSON.stringify([s.provider, s.address, s.username, s.smtpHost, s.smtpPort, s.imapHost, s.imapPort, s.hasPassword, s.sdiPecAssigned]);
}
