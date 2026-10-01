import { api, currentTenantId, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { NoTenant } from '@/components/no-tenant';
import { TermsForm } from '../terms-form';

export default async function NewPaymentTermsPage() {
  if (!(await currentTenantId())) return <NoTenant />;
  const terms = (await fetchOrNull(() => api.paymentTerms())) ?? [];
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nuovo profilo di scadenza</h1>
      <Card>
        <CardContent><TermsForm first={terms.length === 0} /></CardContent>
      </Card>
    </main>
  );
}
