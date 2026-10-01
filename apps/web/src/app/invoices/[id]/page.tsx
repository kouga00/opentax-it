import Link from 'next/link';
import { ErrorAlert } from '@/components/error-alert';
import { notFound } from 'next/navigation';
import { api, customerLabel, fetchOrNull, formatDate, formatMoney, inpsSurchargeLabel } from '@/lib/api';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from '@/components/invoice-status-badge';
import { paymentMethodLabel, usesBankAccount } from '@/lib/payment-methods';
import { TYPE_LABELS } from '@/lib/invoices';
import { pecReady as isPecReady } from '@/lib/pec';
import { NOTIFICATION_LABELS, transmissionLabel } from '@/lib/sdi-labels';
import { formatDateTime } from '@/lib/format';
import { IssueForm } from './issue-form';
import { Payments } from './payments';
import { SendButton } from '../send-dialog';
import { canCorrect, canSendToSdi, CORRECTION_RULE, REPLACEMENT_RULE } from '@/lib/invoices';
import { reopenInvoiceForCorrection, replaceRejectedInvoice } from '@/lib/actions';
import { SyncReceipts } from './sync-receipts';



export default async function InvoicePage({ params, searchParams }: PageProps<'/invoices/[id]'>) {
  const { id } = await params;
  const { error } = await searchParams;
  const inv = await fetchOrNull(() => api.invoice(id));
  if (!inv) notFound();
  const isDraft = inv.status === 'DRAFT';
  const rules = Number(inv.inpsSurcharge) > 0 ? await fetchOrNull(() => api.activeRules(inv.year)) : null;
  const collection = isDraft ? null : await fetchOrNull(() => api.collection(id));
  // Also a rejected invoice being corrected: its earlier transmission, with the rejection, stays visible.
  const sendable = (!isDraft || inv.correction) && !inv.imported;
  const [transmissions, pec] = sendable ? await Promise.all([fetchOrNull(() => api.sdiTransmissions(id)), fetchOrNull(() => api.pecSettings())]) : [null, null];
  const pecReady = isPecReady(pec);
  const [terms, banks, thresholds, me, draftPayment] = isDraft
    ? await Promise.all([fetchOrNull(() => api.paymentTerms()), fetchOrNull(() => api.bankAccounts()), fetchOrNull(() => api.invoiceThresholds(id)), fetchOrNull(() => api.me()), fetchOrNull(() => api.draftPayment(id))])
    : [null, null, null, null, null];
  const missingVies = inv.customer.kind === 'EU' && me?.profile && !me.profile.viesRegistered;
  const chosenTerms = terms?.find((t) => t.id === inv.paymentTermsId) ?? terms?.find((t) => t.isDefault);
  const method = inv.paymentMethod ?? chosenTerms?.method ?? 'MP05';
  const bankUsed = usesBankAccount(method);
  const chosenBank = bankUsed ? (banks?.find((b) => b.id === inv.bankAccountId) ?? banks?.find((b) => b.isDefault)) : undefined;
  // Installments computed by the API from the payment terms (common/payment-schedule.ts).
  const installments = draftPayment?.installments ?? [];
  const defaultDueDate = installments.length === 1 ? installments[0].dueDate : undefined;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <ErrorAlert message={typeof error === 'string' ? error : undefined} />
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{TYPE_LABELS[inv.type]} {inv.number || '(bozza)'}</h1>
          <InvoiceStatusBadge status={inv.status} imported={inv.imported} correction={inv.correction} replaced={Boolean(inv.replacedBy)} />
        </div>
        <p className="text-sm text-muted-foreground">{formatDate(inv.date)} · {customerLabel(inv.customer)}</p>
      </div>
      {inv.correction && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Correzione della fattura scartata dallo SDI</AlertTitle>
          <AlertDescription>{CORRECTION_RULE} Correggi la bozza, poi genera il nuovo XML e invialo. Numero, data e tipo di documento non si possono cambiare.</AlertDescription>
        </Alert>
      )}
      {inv.replacesInvoiceId && (
        <p className="text-sm">Sostituisce una <Link href={`/invoices/${inv.replacesInvoiceId}`} className="underline">fattura scartata dallo SDI</Link>: il collegamento è tra le diciture in fattura.</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {isDraft && <Button variant="outline" render={<Link href={`/invoices/${inv.id}/edit`} />}>Modifica</Button>}
        <Button variant="outline" render={<a href={`/invoices/${inv.id}/pdf?inline=1`} target="_blank" rel="noreferrer" />}>Anteprima</Button>
        <Button variant="outline" render={<a href={`/invoices/${inv.id}/pdf`} />}>Scarica PDF</Button>
        {inv.xmlFileName && <Button variant="outline" render={<a href={`/invoices/${inv.id}/xml`} />}>Scarica XML</Button>}
      </div>

      <Card>
        <CardHeader><CardTitle>Righe</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>#</TableHead><TableHead>Descrizione</TableHead><TableHead className="text-right">Q.tà</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead className="text-right">Totale</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {inv.lines?.map((l) => (
                <TableRow key={l.lineNumber}>
                  <TableCell>{l.lineNumber}</TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-right font-mono">{Number(l.quantity)} {l.unit ?? ''}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(l.unitPrice, inv.currency)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(l.totalPrice, inv.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <dl className="ml-auto grid w-full max-w-sm grid-cols-2 gap-1 text-sm">
            <dt className="text-muted-foreground">Imponibile</dt><dd className="text-right font-mono">{formatMoney(inv.taxableAmount, inv.currency)}</dd>
            {Number(inv.inpsSurcharge) > 0 && <><dt className="text-muted-foreground">{inpsSurchargeLabel(rules?.inps.surchargePct)}</dt><dd className="text-right font-mono">{formatMoney(inv.inpsSurcharge, inv.currency)}</dd></>}
            {Number(inv.professionalFundContribution) > 0 && <><dt className="text-muted-foreground">Contributo cassa {inv.professionalFundType} {inv.professionalFundRatePct}% (non è un ricavo)</dt><dd className="text-right font-mono">{formatMoney(inv.professionalFundContribution, inv.currency)}</dd></>}
            <dt className="text-muted-foreground">IVA</dt><dd className="text-right font-mono">— ({inv.vatNature.replace('_', '.')})</dd>
            {inv.virtualStamp && <><dt className="text-muted-foreground">Bollo virtuale</dt><dd className="text-right font-mono">{formatMoney(inv.stampAmount, inv.currency)}</dd></>}
            <dt className="font-medium">Totale documento</dt><dd className="text-right font-mono font-medium">{formatMoney(inv.total, inv.currency)}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Diciture in fattura</CardTitle></CardHeader>
        <CardContent><ul className="list-disc space-y-1 pl-5 text-sm">{inv.notes.map((n) => <li key={n}>{n}</li>)}</ul></CardContent>
      </Card>

      {sendable && (
        <Card>
          <CardHeader>
            <CardTitle>Invio allo SDI</CardTitle>
            <CardDescription>L&apos;XML si invia via PEC. Le ricevute del gestore PEC attestano solo la trasmissione: la fattura è emessa quando lo SDI la consegna o la mette a disposizione, mentre uno scarto significa che non è mai stata emessa (Specifiche tecniche FatturaPA 1.9.1 §1.3.1). Le ricevute si leggono dalla tua casella PEC, senza modificarla: ogni 10 minuti finché un invio attende l&apos;esito, all&apos;avvio dell&apos;app e con &quot;Controlla ricevute&quot;.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transmissions?.map((t) => (
              <div key={t.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{transmissionLabel(t)}</span>
                  <span className="text-muted-foreground">{formatDateTime(t.sentAt ?? t.createdAt)} · <span className="font-mono">{t.fileName}</span>{t.sdiId && <> · Identificativo SdI {t.sdiId}</>}</span>
                </div>
                {t.lastError && <p className="text-sm text-destructive">{t.lastError}</p>}
                {t.warning && (
                  <Alert variant="warning">
                    <TriangleAlert />
                    <AlertDescription>{t.warning}</AlertDescription>
                  </Alert>
                )}
                {t.notifications.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {t.notifications.map((n) => (
                      <li key={`${n.type}-${n.receivedAt}-${n.fileName ?? ''}`} className="flex flex-wrap gap-x-2">
                        <span className="text-muted-foreground">{formatDateTime(n.receivedAt)}</span>
                        <span>{NOTIFICATION_LABELS[n.type] ?? n.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {transmissions && transmissions.length > 0 && pecReady && (
              <div className="space-y-1">
                <SyncReceipts id={inv.id} />
                {pec?.lastReceiptsSyncAt && <p className="text-xs text-muted-foreground">Ultimo controllo della casella: {formatDateTime(pec.lastReceiptsSyncAt)}</p>}
                {pec?.lastReceiptsSyncError && <p className="text-xs text-destructive">Ultimo controllo non riuscito: {pec.lastReceiptsSyncError}</p>}
              </div>
            )}
            {inv.status === 'ISSUED' && (
              <p className="text-xs text-muted-foreground">Inviata con un altro strumento, ad esempio dal portale Fatture e Corrispettivi? <Link href="/invoices/import" className="underline">Carica la ricevuta SDI</Link> per registrarne l&apos;esito.</p>
            )}
            {canCorrect(inv) && (
              <div className="space-y-3">
                <form action={reopenInvoiceForCorrection} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{CORRECTION_RULE}</p>
                  <input type="hidden" name="id" value={inv.id} />
                  <Button type="submit">Correggi e reinvia</Button>
                </form>
                <form action={replaceRejectedInvoice} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{REPLACEMENT_RULE}</p>
                  <input type="hidden" name="id" value={inv.id} />
                  <Button type="submit" variant="outline">Riemetti con un nuovo numero</Button>
                </form>
              </div>
            )}
            {inv.replacedBy && (
              <p className="text-sm">Sostituita dalla <Link href={`/invoices/${inv.replacedBy.id}`} className="underline">{inv.replacedBy.number ? `fattura ${inv.replacedBy.number}` : 'bozza di sostituzione'}</Link>, con un nuovo numero e una nuova data.</p>
            )}
            {canSendToSdi(inv) && (pecReady
              ? <SendButton invoice={inv} recipient={pec!.recipient} />
              : <p className="text-sm text-muted-foreground">Per inviare configura la casella PEC in <Link href="/setup?tab=pec" className="underline">Impostazioni</Link>.</p>)}
          </CardContent>
        </Card>
      )}

      {isDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>{inv.correction ? 'Genera il nuovo XML' : <>Numera e genera l&apos;XML</>}</CardTitle>
            <CardDescription>Assegna il numero progressivo e genera l&apos;XML FatturaPA, pronto per l&apos;invio allo SDI. Dopo il documento non è più modificabile. La fattura è emessa quando lo SDI la consegna al cliente o gliela mette a disposizione; uno scarto significa che non è mai stata emessa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Modalità: {paymentMethodLabel(method)} · Scadenza: {chosenTerms ? `${chosenTerms.name} (${chosenTerms.label})` : 'nessuna'}{bankUsed && <> · Banca: {chosenBank ? chosenBank.name : 'nessuna'}</>}. La modalità si cambia modificando la bozza; scadenza{bankUsed ? ' e IBAN' : ''} anche qui sotto prima di emettere.</p>
            {missingVies && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertTitle>Iscrizione al VIES non indicata</AlertTitle>
                <AlertDescription>Per effettuare operazioni intracomunitarie, compresi i servizi a soggetti passivi UE, serve l&apos;inclusione nell&apos;archivio VIES (AdE, scheda &quot;Inclusione archivio Vies&quot;; Circ. AdE 10/E/2016 §4.1.2). Nel profilo non risulti iscritto: verifica e, se sei già iscritto, spunta &quot;Iscritto al VIES&quot; in Impostazioni.</AlertDescription>
              </Alert>
            )}
            {inv.customer.kind === 'IT_PA' && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertTitle>Fattura verso la pubblica amministrazione</AlertTitle>
                <AlertDescription>Le fatture verso la PA vanno firmate con un certificato di firma qualificata (CAdES .xml.p7m o XAdES, fatturapa.gov.it &quot;Firmare la FatturaPA&quot;). La firma non è ancora supportata: l&apos;emissione è bloccata, usa un altro strumento per questa fattura.</AlertDescription>
              </Alert>
            )}
            <IssueForm id={inv.id} defaultDueDate={defaultDueDate} installments={installments} currency={inv.currency} defaultIban={chosenBank?.iban} showIban={bankUsed} thresholds={thresholds} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Incassi</CardTitle>
            <CardDescription>Modalità di pagamento in fattura: {paymentMethodLabel(inv.paymentMethod)}. Principio di cassa: il compenso concorre al reddito dell&apos;anno in cui viene incassato (L. 190/2014 art. 1 c. 64). I nuovi incassi si registrano dall&apos;elenco delle fatture.</CardDescription>
          </CardHeader>
          <CardContent>{collection && <Payments collection={collection} />}</CardContent>
        </Card>
      )}
    </main>
  );
}
