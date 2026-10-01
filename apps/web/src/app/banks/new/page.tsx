import { api, currentTenantId, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { NoTenant } from '@/components/no-tenant';
import { BankForm } from '../bank-form';

export default async function NewBankPage() {
  if (!(await currentTenantId())) return <NoTenant />;
  const banks = (await fetchOrNull(() => api.bankAccounts())) ?? [];
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nuova banca</h1>
      <Card>
        <CardContent><BankForm first={banks.length === 0} /></CardContent>
      </Card>
    </main>
  );
}
