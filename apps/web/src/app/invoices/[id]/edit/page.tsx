import { notFound, redirect } from 'next/navigation';
import { api, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceForm, type InvoiceDraft } from '../../new/invoice-form';

export default async function EditInvoicePage({ params }: PageProps<'/invoices/[id]/edit'>) {
  const { id } = await params;
  const inv = await fetchOrNull(() => api.invoice(id));
  if (!inv) notFound();
  if (inv.status !== 'DRAFT') redirect(`/invoices/${id}`);
  const [me, customers, invoices, terms, banks, rules] = await Promise.all([
    fetchOrNull(() => api.me()),
    fetchOrNull(() => api.customers()),
    fetchOrNull(() => api.invoices()),
    fetchOrNull(() => api.paymentTerms()),
    fetchOrNull(() => api.bankAccounts()),
    fetchOrNull(() => api.activeRules(inv.year)),
  ]);
  const issued = (invoices ?? []).filter((i) => i.status !== 'DRAFT' && i.type === 'TD01');
  // The draft stores the surcharge amount, not the choice: keep "as profile" when they agree.
  const surchargeApplied = Number(inv.inpsSurcharge) > 0;
  const draft: InvoiceDraft = {
    id: inv.id,
    customerId: inv.customer.id,
    type: inv.type === 'TD04' ? 'TD04' : 'TD01',
    refInvoiceId: inv.refInvoiceId ?? '',
    date: inv.date.slice(0, 10),
    surcharge: surchargeApplied === me?.profile?.applyInpsSurcharge ? 'default' : surchargeApplied ? 'yes' : 'no',
    paymentTermsId: inv.paymentTermsId ?? '',
    bankAccountId: inv.bankAccountId ?? '',
    paymentMethod: inv.paymentMethod ?? '',
    ecbRate: inv.currency !== 'EUR' && Number(inv.exchangeRate) > 0 ? String(Math.round((1 / Number(inv.exchangeRate)) * 1e4) / 1e4) : undefined,
    lines: (inv.lines ?? []).map((l) => ({ description: l.description, quantity: String(Number(l.quantity)), unit: l.unit ?? '', unitPrice: String(Number(l.unitPrice)) })),
  };
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica bozza</h1>
        <p className="text-sm text-muted-foreground">Bollo, rivalsa INPS, natura IVA e diciture vengono ricalcolati al salvataggio. Il numero viene assegnato all&apos;emissione.</p>
      </div>
      <Card>
        <CardContent>
          <InvoiceForm customers={customers ?? []} issuedInvoices={issued.map((i) => ({ id: i.id, number: i.number }))} terms={terms ?? []} banks={banks ?? []} draft={draft} surchargePct={rules?.inps.surchargePct} />
        </CardContent>
      </Card>
    </main>
  );
}
