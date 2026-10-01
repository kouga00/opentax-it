import { api, currentTenantId, fetchOrNull } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { NoTenant } from '@/components/no-tenant';
import { professionalFundOf } from '@/lib/social-security-schemes';
import { InvoiceForm } from './invoice-form';

export default async function NewInvoicePage() {
  if (!(await currentTenantId())) return <NoTenant />;
  const [me, customers, invoices, terms, banks, rules] = await Promise.all([
    fetchOrNull(() => api.me()),
    fetchOrNull(() => api.customers()),
    fetchOrNull(() => api.invoices()),
    fetchOrNull(() => api.paymentTerms()),
    fetchOrNull(() => api.bankAccounts()),
    fetchOrNull(() => api.activeRules(new Date().getFullYear())),
  ]);
  const issued = (invoices ?? []).filter((i) => i.status !== 'DRAFT' && i.type === 'TD01');
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuova fattura</h1>
        <p className="text-sm text-muted-foreground">
          Bollo, rivalsa INPS, natura IVA e diciture vengono calcolati dal set di regole dell&apos;anno. Il numero viene assegnato all&apos;emissione.
        </p>
      </div>
      <Card>
        <CardContent>
          <InvoiceForm customers={customers ?? []} issuedInvoices={issued.map((i) => ({ id: i.id, number: i.number }))} terms={terms ?? []} banks={banks ?? []} surchargePct={rules?.inps.surchargePct} surchargeAllowed={(me?.profile.socialSecurityScheme ?? 'INPS_SEPARATE') === 'INPS_SEPARATE'} professionalFund={professionalFundOf(me?.profile)} />
        </CardContent>
      </Card>
    </main>
  );
}
