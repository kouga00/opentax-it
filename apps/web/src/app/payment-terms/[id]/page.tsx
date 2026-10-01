import { notFound } from 'next/navigation';
import { api, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { TermsForm } from '../terms-form';

export default async function EditPaymentTermsPage({ params }: PageProps<'/payment-terms/[id]'>) {
  const { id } = await params;
  const terms = (await fetchOrNull(() => api.paymentTerms()))?.find((t) => t.id === id);
  if (!terms) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica profilo di scadenza</h1>
        <p className="text-sm text-muted-foreground">{terms.name}</p>
      </div>
      <Card>
        <CardContent><TermsForm terms={terms} /></CardContent>
      </Card>
    </main>
  );
}
