import { notFound } from 'next/navigation';
import { api, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { BankForm } from '../bank-form';

export default async function EditBankPage({ params }: PageProps<'/banks/[id]'>) {
  const { id } = await params;
  const account = (await fetchOrNull(() => api.bankAccounts()))?.find((b) => b.id === id);
  if (!account) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica banca</h1>
        <p className="text-sm text-muted-foreground">{account.name}</p>
      </div>
      <Card>
        <CardContent><BankForm account={account} /></CardContent>
      </Card>
    </main>
  );
}
