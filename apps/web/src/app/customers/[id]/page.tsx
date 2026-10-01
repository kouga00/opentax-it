import { notFound } from 'next/navigation';
import { api, customerLabel, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { CustomerForm } from '../customer-form';

export default async function EditCustomerPage({ params }: PageProps<'/customers/[id]'>) {
  const { id } = await params;
  const customer = await fetchOrNull(() => api.customer(id));
  if (!customer) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica cliente</h1>
        <p className="text-sm text-muted-foreground">{customerLabel(customer)}</p>
      </div>
      <Card>
        <CardContent><CustomerForm customer={customer} /></CardContent>
      </Card>
    </main>
  );
}
