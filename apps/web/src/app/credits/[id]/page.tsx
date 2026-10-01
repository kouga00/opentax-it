import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, fetchOrNull, formatMoney } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { CreditForm } from '../credit-form';

export default async function EditCreditPage({ params }: PageProps<'/credits/[id]'>) {
  const { id } = await params;
  const credit = await fetchOrNull(() => api.taxCredit(id));
  if (!credit) notFound();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica credito</h1>
        <p className="text-sm text-muted-foreground">{credit.code} · anno {credit.referenceYear} · {formatMoney(credit.amount)}</p>
      </div>
      <Card>
        <CardContent>
          {credit.used > 0 ? (
            <p className="text-sm">
              Il credito è già usato in F24 per {formatMoney(credit.used)}: modificarlo renderebbe incoerenti le deleghe. Per cambiarlo elimina prima il piano in <Link href="/f24" className="underline">F24 e rate</Link>.
            </p>
          ) : (
            <CreditForm credit={credit} defaultYear={credit.referenceYear} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
