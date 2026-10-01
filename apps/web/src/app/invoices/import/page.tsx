import { currentTenantId } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { NoTenant } from '@/components/no-tenant';
import { ImportForm } from './import-form';

export default async function ImportInvoicesPage() {
  if (!(await currentTenantId())) return <NoTenant />;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Importa fatture e ricevute SDI</h1>
        <p className="text-sm text-muted-foreground">Carica le fatture elettroniche emesse con altri software o scaricate dal portale Fatture e Corrispettivi, per completare numerazione, bolli e incassi dell&apos;anno, e le ricevute SDI delle fatture inviate fuori da qui, per registrarne l&apos;esito (consegnata, messa a disposizione, scartata). Prima vedi cosa verrà importato, poi scegli cosa importare.</p>
      </div>
      <Card>
        <CardContent><ImportForm /></CardContent>
      </Card>
    </main>
  );
}
