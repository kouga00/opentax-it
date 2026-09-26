'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveInvoice, type InvoiceInput } from '@/lib/actions';
import { customerLabel, inpsSurchargeLabel } from '@/lib/format';
import type { BankAccount, Customer, PaymentTerms } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { useExchangeRate } from '@/components/exchange-rate';
import { HelpTip } from '@/components/help-tip';
import { NativeSelect } from '@/components/native-select';
import { PAYMENT_METHOD_OPTIONS, usesBankAccount } from '@/lib/payment-methods';
import { ErrorAlert } from '@/components/error-alert';

interface LineDraft { description: string; quantity: string; unit: string; unitPrice: string }

const emptyLine = (): LineDraft => ({ description: '', quantity: '1', unit: '', unitPrice: '' });

/** Values of an existing draft, to edit it. */
export interface InvoiceDraft {
  id: string;
  customerId: string;
  type: 'TD01' | 'TD04';
  refInvoiceId: string;
  date: string;
  surcharge: 'default' | 'yes' | 'no';
  paymentTermsId: string;
  bankAccountId: string;
  /** ModalitaPagamento; empty when the draft has none. */
  paymentMethod: string;
  /** Foreign currency: ECB rate "1 EUR = X units", as entered. */
  ecbRate?: string;
  lines: LineDraft[];
}

/** Issue term by customer (DPR 633/72 art. 21 par. 4): 15th of the next month for services to foreign taxable persons. */
function issueTermHint(kind?: string): string {
  if (kind === 'EU') return "Entro il 15 del mese successivo all'operazione (servizi a soggetti passivi UE, art. 21 c. 4 lett. c DPR 633/72), mai nel futuro";
  if (kind === 'NON_EU') return "Entro il 15 del mese successivo all'operazione (servizi a soggetti passivi extra UE, art. 21 c. 4 lett. d DPR 633/72), mai nel futuro";
  return "Entro 12 giorni dall'operazione (art. 21 c. 4 DPR 633/72), mai nel futuro";
}

export function InvoiceForm({ customers, issuedInvoices, terms, banks, draft, surchargePct }: { customers: Customer[]; issuedInvoices: Array<{ id: string; number: string }>; terms: PaymentTerms[]; banks: BankAccount[]; draft?: InvoiceDraft; surchargePct?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [customerId, setCustomerId] = useState(draft?.customerId ?? customers[0]?.id ?? '');
  const [type, setType] = useState<'TD01' | 'TD04'>(draft?.type ?? 'TD01');
  const [refInvoiceId, setRefInvoiceId] = useState(draft?.refInvoiceId || (issuedInvoices[0]?.id ?? ''));
  const [date, setDate] = useState(draft?.date ?? new Date().toISOString().slice(0, 10));
  const [surcharge, setSurcharge] = useState<'default' | 'yes' | 'no'>(draft?.surcharge ?? 'default');
  const [paymentTermsId, setPaymentTermsId] = useState(draft ? draft.paymentTermsId : (terms.find((t) => t.isDefault)?.id ?? terms[0]?.id ?? ''));
  const [bankAccountId, setBankAccountId] = useState(draft ? draft.bankAccountId : (banks.find((b) => b.isDefault)?.id ?? banks[0]?.id ?? ''));
  const termsMethod = (id: string) => terms.find((t) => t.id === id)?.method ?? 'MP05';
  const [paymentMethod, setPaymentMethod] = useState(draft?.paymentMethod || termsMethod(paymentTermsId));
  const bankUsed = usesBankAccount(paymentMethod);
  // A payment terms profile carries its own method: choosing the profile proposes it.
  const chooseTerms = (id: string) => {
    setPaymentTermsId(id);
    if (id) setPaymentMethod(termsMethod(id));
  };
  const [lines, setLines] = useState<LineDraft[]>(draft?.lines.length ? draft.lines : [emptyLine()]);
  const [ecbRate, setEcbRate] = useState(draft?.ecbRate ?? '');
  const currency = customers.find((c) => c.id === customerId)?.currency ?? 'EUR';
  const foreignCurrency = currency !== 'EUR';
  const rate = useExchangeRate(currency, date, ecbRate, setEcbRate);

  const setLine = (i: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const submit = () => {
    setError(undefined);
    start(async () => {
      const input: InvoiceInput = {
        customerId,
        type,
        refInvoiceId: type === 'TD04' ? refInvoiceId : undefined,
        date,
        applyInpsSurcharge: surcharge === 'default' ? undefined : surcharge === 'yes',
        paymentTermsId: paymentTermsId || undefined,
        bankAccountId: (bankUsed && bankAccountId) || undefined,
        paymentMethod,
        // ECB quotes "1 EUR = X units"; the API stores EUR per unit.
        exchangeRate: foreignCurrency && Number(ecbRate) > 0 ? Math.round((1 / Number(ecbRate.replace(',', '.'))) * 1e6) / 1e6 : undefined,
        lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity) || 1, unit: l.unit || undefined, unitPrice: Number(l.unitPrice) })),
      };
      const res = await saveInvoice(draft?.id, input);
      if (res.error) setError(res.error);
      else router.push(`/invoices/${res.id}`);
    });
  };

  return (
    <div className="space-y-6">
      <ErrorAlert message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" htmlFor="customer">
          <NativeSelect id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => <option key={c.id} value={c.id}>{customerLabel(c)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Tipo documento" htmlFor="type">
          <NativeSelect id="type" value={type} onChange={(e) => setType(e.target.value as 'TD01' | 'TD04')}>
            <option value="TD01">Fattura (TD01)</option>
            <option value="TD04">Nota di credito (TD04)</option>
          </NativeSelect>
        </Field>
        {type === 'TD04' && (
          <Field label="Fattura da rettificare" htmlFor="ref">
            <NativeSelect id="ref" value={refInvoiceId} onChange={(e) => setRefInvoiceId(e.target.value)}>
              {issuedInvoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}
            </NativeSelect>
          </Field>
        )}
        <Field label="Data" htmlFor="date" hint={issueTermHint(customers.find((c) => c.id === customerId)?.kind)}><Input id="date" type="date" max={new Date().toLocaleDateString('en-CA')} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {foreignCurrency && (
          <Field
            label={`Cambio: 1 EUR = … ${currency}`}
            htmlFor="ecbRate"
            hint={rate.info ?? "Cambio del giorno dell'operazione o della fattura (art. 13 c. 4 DPR 633/72)"}
            help={<HelpTip><p>Il cliente è fatturato in {currency}. Gli importi in valuta si convertono con il cambio del giorno di effettuazione dell&apos;operazione o, se non indicato in fattura, del giorno di emissione (art. 13 c. 4 DPR 633/72). Si può usare il cambio di riferimento della Banca centrale europea, pubblicato dalla Banca d&apos;Italia nella forma &quot;1 EUR = X {currency}&quot;. Il reddito invece si calcola con il cambio del giorno dell&apos;incasso (art. 9 c. 2 TUIR), da indicare quando registri l&apos;incasso.</p></HelpTip>}
          >
            <Input id="ecbRate" type="number" step="0.000001" min="0.000001" required value={ecbRate} onChange={(e) => rate.onManualChange(e.target.value)} />
          </Field>
        )}
        <Field label="Profilo di scadenza" htmlFor="terms" hint={terms.length === 0 ? 'Nessun profilo: creane uno nelle impostazioni' : undefined}>
          <NativeSelect id="terms" value={paymentTermsId} onChange={(e) => chooseTerms(e.target.value)}>
            <option value="">— nessuna scadenza in fattura —</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.days} gg)</option>)}
          </NativeSelect>
        </Field>
        <Field label="Modalità di pagamento" htmlFor="paymentMethod" hint="Come chiedi al cliente di pagare (ModalitaPagamento)">
          <NativeSelect id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label} ({o.code})</option>)}
            {!PAYMENT_METHOD_OPTIONS.some((o) => o.code === paymentMethod) && <option value={paymentMethod}>{paymentMethod}</option>}
          </NativeSelect>
        </Field>
        {bankUsed && (
          <Field label="Conto di accredito" htmlFor="bank" hint={banks.length === 0 ? 'Nessuna banca: aggiungila nelle impostazioni' : 'IBAN su cui il cliente paga'}>
            <NativeSelect id="bank" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">— nessun IBAN in fattura —</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}{b.bankName ? ` · ${b.bankName}` : ''}</option>)}
            </NativeSelect>
          </Field>
        )}
        <Field label={inpsSurchargeLabel(surchargePct)} htmlFor="surcharge">
          <NativeSelect id="surcharge" value={surcharge} onChange={(e) => setSurcharge(e.target.value as 'default' | 'yes' | 'no')}>
            <option value="default">Come da profilo</option>
            <option value="yes">Applica</option>
            <option value="no">Non applicare</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-6">Descrizione</div><div className="col-span-2">Quantità</div><div className="col-span-1">U.M.</div><div className="col-span-2">Prezzo unitario</div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 items-center gap-2">
            <Input className="col-span-6" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Descrizione" />
            <Input className="col-span-2" type="number" step="0.01" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <Input className="col-span-1" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} placeholder="ore" />
            <Input className="col-span-2" type="number" step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} placeholder="0,00" />
            <Button className="col-span-1" variant="ghost" size="sm" type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}>×</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])}>Aggiungi riga</Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Imponibile righe: <span className="font-mono">{total.toFixed(2)}</span> — bollo e rivalsa vengono aggiunti dal server.</p>
        <div className="flex gap-2">
          {draft && <Button variant="ghost" type="button" onClick={() => router.push(`/invoices/${draft.id}`)}>Annulla</Button>}
          <Button onClick={submit} disabled={pending || !customerId || lines.some((l) => !l.description || !l.unitPrice) || (foreignCurrency && !(Number(ecbRate) > 0))}>{pending ? 'Salvataggio…' : draft ? 'Salva modifiche' : 'Salva bozza'}</Button>
        </div>
      </div>
    </div>
  );
}
