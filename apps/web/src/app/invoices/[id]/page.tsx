import Link from 'next/link';
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
import { TYPE_LABELS } from '../page';
import { IssueForm } from './issue-form';
import { Payments } from './payments';
import { SendToSdi } from './send-to-sdi';
import { SyncReceipts } from './sync-receipts';
import type { SdiTransmissionStatus } from '@/lib/types';

const TRANSMISSION_LABELS: Record<SdiTransmissionStatus, string> = {
  PENDING: 'In invio',
  SENT: 'Inviata via PEC',
  ACCEPTED_BY_PEC: 'Accettata dal gestore PEC',
  DELIVERED_TO_SDI: 'Consegnata allo SDI',
  SDI_DELIVERED: 'Consegnata al cliente',
  SDI_NOT_DELIVERED: 'Non consegnata (a disposizione)',
  SDI_REJECTED: 'Scartata',
  ERROR: 'Invio non riuscito',
};

/** Receipts about a transmission: from SDI (Spec. 1.9.1 §1.5.7) and from the PEC provider (Regole tecniche PEC §6). */
const NOTIFICATION_LABELS: Record<string, string> = {
  RC: 'Ricevuta di consegna dello SDI: fattura consegnata al cliente',
  NS: 'Ricevuta di scarto dello SDI: la fattura non è stata emessa',
  MC: 'Impossibilità di recapito: la fattura è emessa ed è a disposizione del cliente nella sua area riservata',
  PEC_ACCETTAZIONE: 'Accettazione del tuo gestore PEC',
  PEC_AVVENUTA_CONSEGNA: 'Consegna alla casella PEC dello SDI',
  PEC_PRESA_IN_CARICO: 'Presa in carico dal gestore dello SDI',
  PEC_PREAVVISO_ERRORE_CONSEGNA: 'Preavviso di mancata consegna del gestore PEC',
  PEC_ERRORE_CONSEGNA: 'Mancata consegna alla casella dello SDI',
  PEC_NON_ACCETTAZIONE: 'Messaggio non accettato dal tuo gestore PEC',
  PEC_RILEVAZIONE_VIRUS: 'Virus rilevato dal gestore PEC',
};

export default async function InvoicePage({ params }: PageProps<'/invoices/[id]'>) {
  const { id } = await params;
  const inv = await fetchOrNull(() => api.invoice(id));
  if (!inv) notFound();
  const isDraft = inv.status === 'DRAFT';
  const rules = Number(inv.inpsSurcharge) > 0 ? await fetchOrNull(() => api.activeRules(inv.year)) : null;
  const collection = isDraft ? null : await fetchOrNull(() => api.collection(id));
  const sendable = !isDraft && !inv.imported;
  const [transmissions, pec] = sendable ? await Promise.all([fetchOrNull(() => api.sdiTransmissions(id)), fetchOrNull(() => api.pecSettings())]) : [null, null];
  const pecReady = Boolean(pec?.address && pec.hasPassword);
  const [terms, banks, thresholds, me] = isDraft
    ? await Promise.all([fetchOrNull(() => api.paymentTerms()), fetchOrNull(() => api.bankAccounts()), fetchOrNull(() => api.invoiceThresholds(id)), fetchOrNull(() => api.me())])
    : [null, null, null, null];
  const missingVies = inv.customer.kind === 'EU' && me?.profile && !me.profile.viesRegistered;
  const chosenTerms = terms?.find((t) => t.id === inv.paymentTermsId) ?? terms?.find((t) => t.isDefault);
  const method = inv.paymentMethod ?? chosenTerms?.method ?? 'MP05';
  const bankUsed = usesBankAccount(method);
  const chosenBank = bankUsed ? (banks?.find((b) => b.id === inv.bankAccountId) ?? banks?.find((b) => b.isDefault)) : undefined;
  const defaultDueDate = chosenTerms ? new Date(new Date(inv.date).getTime() + chosenTerms.days * 86_400_000).toISOString().slice(0, 10) : undefined;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{TYPE_LABELS[inv.type]} {inv.number || '(bozza)'}</h1>
          <InvoiceStatusBadge status={inv.status} />
        </div>
        <p className="text-sm text-muted-foreground">{formatDate(inv.date)} · {customerLabel(inv.customer)}</p>
      </div>
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
                  <span className="font-medium">{TRANSMISSION_LABELS[t.status]}</span>
                  <span className="text-muted-foreground">{new Date(t.sentAt ?? t.createdAt).toLocaleString('it-IT')} · <span className="font-mono">{t.fileName}</span>{t.sdiId && <> · Identificativo SdI {t.sdiId}</>}</span>
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
                        <span className="text-muted-foreground">{new Date(n.receivedAt).toLocaleString('it-IT')}</span>
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
                {pec?.lastReceiptsSyncAt && <p className="text-xs text-muted-foreground">Ultimo controllo della casella: {new Date(pec.lastReceiptsSyncAt).toLocaleString('it-IT')}</p>}
                {pec?.lastReceiptsSyncError && <p className="text-xs text-destructive">Ultimo controllo non riuscito: {pec.lastReceiptsSyncError}</p>}
              </div>
            )}
            {inv.status === 'ISSUED' && inv.customer.kind !== 'IT_PA' && (pecReady
              ? <SendToSdi id={inv.id} recipient={pec!.recipient} />
              : <p className="text-sm text-muted-foreground">Per inviare configura la casella PEC in <Link href="/setup?tab=pec" className="underline">Impostazioni</Link>.</p>)}
          </CardContent>
        </Card>
      )}

      {isDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>Emetti</CardTitle>
            <CardDescription>Assegna il numero progressivo, genera l&apos;XML FatturaPA e lo salva. Dopo l&apos;emissione il documento non è più modificabile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Modalità: {paymentMethodLabel(method)} · Scadenza: {chosenTerms ? `${chosenTerms.name} (${chosenTerms.days} gg)` : 'nessuna'}{bankUsed && <> · Banca: {chosenBank ? chosenBank.name : 'nessuna'}</>}. La modalità si cambia modificando la bozza; scadenza{bankUsed ? ' e IBAN' : ''} anche qui sotto prima di emettere.</p>
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
            <IssueForm id={inv.id} defaultDueDate={defaultDueDate} defaultIban={chosenBank?.iban} showIban={bankUsed} thresholds={thresholds} />
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
