import { currentTenantId } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { NoTenant } from '@/components/no-tenant';
import { CreditForm } from '../credit-form';

export default async function NewCreditPage() {
  if (!(await currentTenantId())) return <NoTenant />;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuovo credito</h1>
        <p className="text-sm text-muted-foreground">Riporta i dati come risultano dalla dichiarazione (righi LM47, RR8 col. 2, RN, RV) o dal prospetto del commercialista.</p>
      </div>
      <Card>
        <CardContent><CreditForm defaultYear={new Date().getFullYear() - 1} /></CardContent>
      </Card>
    </main>
  );
}
