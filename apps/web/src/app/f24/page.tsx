import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/error-alert';
import { Field } from '@/components/field';
import { Help } from '@/components/help';
import { NativeSelect } from '@/components/native-select';
import { InpsScopeNote } from '@/components/inps-scope-note';
import { NoTenant } from '@/components/no-tenant';
import { createFixedContributions, createPlan, deletePlan } from '@/lib/actions';
import { api, ApiError, currentTenantId, fetchOrNull, fetchOrReason, formatDate, formatMoney, formatPct, yearRange, type PlanOptions, type PlanPreview, type PlanStart } from '@/lib/api';
import { todayInItaly } from '@/lib/format';
import { ContributionF24Form } from './contribution-f24-form';
import { F24Card } from './f24-card';
import { YearSelect } from '@/components/year-select';
import { TriangleAlert } from 'lucide-react';

const START_LABELS: Record<PlanStart, string> = {
  ORDINARY: 'Scadenza ordinaria',
  EXTENDED: 'Proroga dell’anno (forfettari/ISA)',
  DEFERRED: 'Differimento di 30 giorni (+0,40%)',
  DEFERRED_EXTENDED: 'Differimento di 30 giorni dalla proroga',
};

function startLabel(o: PlanOptions['starts'][number]): string {
  const base = START_LABELS[o.start];
  const surcharge = o.surchargePct ? ` (+${o.surchargePct.toLocaleString('it-IT')}%)` : '';
  return `${formatDate(o.date)} — ${o.start.startsWith('DEFERRED') ? base.replace(/ \(\+.*\)$/, '') + surcharge : base}`;
}

function AmountsRow({ label, value, code }: { label: string; value: number | string; code?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span>{label}{code && <span className="ml-2 font-mono text-xs text-muted-foreground">{code}</span>}</span>
      <span className="font-mono tabular-nums">{formatMoney(value)}</span>
    </div>
  );
}

/** INPS Artigiani or Commercianti. */
const selfEmployedScheme = (scheme?: string) => scheme === 'INPS_ARTISANS' || scheme === 'INPS_TRADERS';

export default async function F24Page({ searchParams }: PageProps<'/f24'>) {
  if (!(await currentTenantId())) return <NoTenant />;
  const params = await searchParams;
  const today = todayInItaly();
  const taxYear = Number(params.year ?? new Date().getFullYear() - 1);
  const error = typeof params.error === 'string' ? params.error : undefined;
  // Installments and their interest follow the rules of the payment year.
  const paymentYear = taxYear + 1;
  const [plan, { value: options, reason: optionsReason }, credits, paymentRules, me, paymentYearForms, codes] = await Promise.all([
    fetchOrNull(() => api.plan(taxYear)),
    fetchOrReason(() => api.planOptions(taxYear)),
    fetchOrNull(() => api.taxCredits()),
    fetchOrNull(() => api.activeRules(paymentYear)),
    fetchOrNull(() => api.me()),
    fetchOrNull(() => api.f24s(paymentYear)),
    fetchOrNull(() => api.contributionCodes()),
  ]);
  const [taxYearCodes, paymentYearCodes] = selfEmployedScheme(me?.profile.socialSecurityScheme)
    ? await Promise.all([fetchOrNull(() => api.taxYearData(taxYear)), fetchOrNull(() => api.taxYearData(paymentYear))])
    : [null, null];
  // INPS codes saved in Imposte, suggested in the contribution form (they are personal, assigned by INPS).
  const knownInpsCodes = [taxYearCodes, paymentYearCodes].flatMap((d) => d ? [
    ...d.inpsFixedCodes.map((code, i) => ({ code, label: `Rata fissa ${i + 1} di 4 del ${d.year}` })),
    ...(d.inpsExcessCode ? [{ code: d.inpsExcessCode, label: `Contributi oltre il minimale ${d.year}` }] : []),
  ] : []).filter((c) => c.code);
  const scheme = me?.profile.socialSecurityScheme;
  const selfEmployed = selfEmployedScheme(scheme);
  // INPS reasons of balance and advances by scheme (packages/fiscal-rules: inpsReasons and inpsSelfEmployed).
  const inpsCode = scheme === 'INPS_ARTISANS' ? { single: 'AP', installments: 'APR' } : scheme === 'INPS_TRADERS' ? { single: 'CP', installments: 'CPR' } : { single: 'PXX', installments: 'PXXR' };
  const inpsShown = scheme !== 'PROFESSIONAL_FUND';
  // Contribution forms (fixed installments, rows entered by hand) are paid in the payment year, outside the plan.
  const contributionForms = (paymentYearForms ?? []).filter((f) => f.kind === 'OTHER');
  // Stamp duty forms (created in /stamp-duty) are paid in the payment year too, and go in the same File Internet file.
  const stampDutyForms = (paymentYearForms ?? []).filter((f) => f.kind === 'STAMP_DUTY');
  const fixedCreated = contributionForms.some((f) => f.lines.some((l) => (l.code === 'AF' || l.code === 'CF') && l.referenceYear === paymentYear));
  // The profile stores the office as "<code>-<name>" (packages/fiscal-rules INPS_OFFICES).
  const officeCode = me?.profile.inpsOfficeId?.slice(0, 4);
  const availableCredit = (credits ?? []).reduce((s, c) => s + c.remaining, 0);
  const useCredits = params.useCredits === undefined ? availableCredit > 0 : params.useCredits === 'on';
  const creditOrder = params.creditOrder === 'TAX_FIRST' ? 'TAX_FIRST' : 'INPS_FIRST';

  const start = (typeof params.start === 'string' ? params.start : options?.starts[0]?.start) as PlanStart | undefined;
  const startOpt = options?.starts.find((o) => o.start === start);
  const installments = Math.min(Number(params.installments ?? startOpt?.maxInstallments ?? 1) || 1, startOpt?.maxInstallments ?? 1);
  let preview: PlanPreview | null = null;
  let previewError: string | undefined;
  if (!plan && options && start) {
    try {
      preview = await api.previewPlan(taxYear, { start, installments, useCredits, creditOrder });
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      previewError = e.message;
    }
  }

  const forms = plan?.f24s ?? [];
  const next = forms.find((f) => f.status !== 'PAID' && f.status !== 'CANCELLED' && f.paymentDate.slice(0, 10) >= today) ?? forms.find((f) => f.status !== 'PAID' && f.status !== 'CANCELLED');

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">F24 e rate — periodo d&apos;imposta {taxYear}</h1>
        <p className="text-sm text-muted-foreground">Saldo {taxYear} e acconti {taxYear + 1}, versati nel {taxYear + 1}. Deleghe calcolate dal riepilogo imposte: verifica gli importi con chi ti assiste prima di pagare.</p>
      </div>
      <InpsScopeNote scheme={scheme} />
      <div className="flex flex-wrap justify-end gap-2">
        <YearSelect path="/f24" value={taxYear} years={yearRange(new Date().getFullYear() - 4, new Date().getFullYear(), taxYear)} label="Periodo d'imposta" />
      </div>

      <ErrorAlert message={error ?? previewError} />
      {(plan ? [] : (preview?.warnings ?? options?.warnings ?? [])).length > 0 && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Attenzione</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">{(preview?.warnings ?? options?.warnings ?? []).map((w) => <li key={w}>{w}</li>)}</ul>
          </AlertDescription>
        </Alert>
      )}

      {!options && !plan && (
        <Card><CardHeader><CardTitle>Piano non disponibile</CardTitle><CardDescription>{optionsReason ?? `Serve un set di regole attivo per il ${taxYear} o il ${taxYear + 1}.`}</CardDescription></CardHeader></Card>
      )}

      {plan ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Piano salvato</CardTitle>
                <CardDescription>
                  Prima scadenza {formatDate(plan.firstDueDate)} · {plan.installments === 1 ? 'unica soluzione' : `${plan.installments} rate mensili`}
                  {Number(plan.surchargePct) > 0 && ` · maggiorazione ${Number(plan.surchargePct).toLocaleString('it-IT')}%`}
                  {Number(plan.creditsUsed) > 0 && ` · crediti compensati ${formatMoney(plan.creditsUsed)}`}
                  {plan.ruleSetVersion && ` · regole ${plan.paymentYear} v${plan.ruleSetVersion}`}
                </CardDescription>
              </div>
              <form action={deletePlan}>
                <input type="hidden" name="taxYear" value={taxYear} />
                <Button type="submit" variant="destructive" size="sm">Elimina piano</Button>
              </form>
            </div>
          </CardHeader>
          <CardContent className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y">
              <AmountsRow label={`Saldo imposta sostitutiva ${taxYear}`} value={plan.taxBalance} code="1792" />
              <AmountsRow label={`Primo acconto imposta ${taxYear + 1}`} value={plan.taxFirstAdvance} code="1790" />
              <AmountsRow label={`Secondo acconto imposta ${taxYear + 1}`} value={plan.taxSecondAdvance} code="1791" />
            </div>
            {inpsShown && <div className="divide-y">
              <AmountsRow label={`Saldo INPS ${taxYear}`} value={plan.inpsBalance} code={`${inpsCode.single}/${inpsCode.installments}`} />
              <AmountsRow label={`Primo acconto INPS ${taxYear + 1}`} value={plan.inpsFirstAdvance} code={`${inpsCode.single}/${inpsCode.installments}`} />
              <AmountsRow label={`Secondo acconto INPS ${taxYear + 1}`} value={plan.inpsSecondAdvance} code={inpsCode.single} />
            </div>}
          </CardContent>
        </Card>
      ) : options ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuovo piano di versamento</CardTitle>
            <CardDescription>
              Saldo e primo acconto si possono rateizzare in rate mensili di pari importo entro il 16 dicembre (D.Lgs. 33/2025 art. 10); il secondo acconto del 30 novembre no. {paymentRules ? `Interessi ${formatPct(paymentRules.installments.annualInterestPct)} annuo con metodo commerciale sulla seconda rata e +${formatPct(paymentRules.installments.incrementPct)} sulle successive` : 'Interessi con metodo commerciale sulla seconda rata e maggiorazione forfettaria sulle successive'} (Istr. Redditi PF, &quot;Rateazione&quot;).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="get" className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="year" value={taxYear} />
              <Field label="Prima scadenza" htmlFor="start" help={<Help topic="firstDueDate" />}>
                <NativeSelect id="start" name="start" defaultValue={start}>
                  {options.starts.map((o) => <option key={o.start} value={o.start}>{startLabel(o)}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Numero di rate" htmlFor="installments" help={<Help topic="installments" />}>
                <NativeSelect id="installments" name="installments" defaultValue={installments}>
                  {Array.from({ length: startOpt?.maxInstallments ?? 1 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'Unica soluzione' : `${n} rate`}</option>)}
                </NativeSelect>
              </Field>
              {availableCredit > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Checkbox name="useCredits" defaultChecked={useCredits} /> Usa i crediti disponibili ({formatMoney(availableCredit)}) in un modello a saldo zero
                    <Help topic="useCredits" />
                  </label>
                  <Field label="Compensa prima" htmlFor="creditOrder" help={<Help topic="creditOrder" />}>
                    <NativeSelect id="creditOrder" name="creditOrder" defaultValue={creditOrder}>
                      <option value="INPS_FIRST">Saldo INPS, poi acconto INPS, poi imposta</option>
                      <option value="TAX_FIRST">Saldo imposta, poi acconto imposta, poi INPS</option>
                    </NativeSelect>
                  </Field>
                </>
              )}
              <div className="flex items-end"><Button type="submit" variant="outline">Aggiorna anteprima</Button></div>
            </form>

            {preview && (
              <>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <div className="divide-y">
                    <AmountsRow label={`Saldo imposta sostitutiva ${taxYear}`} value={preview.amounts.taxBalance} code="1792" />
                    <AmountsRow label={`Primo acconto imposta ${taxYear + 1}`} value={preview.amounts.taxFirstAdvance} code="1790" />
                    <AmountsRow label={`Secondo acconto imposta ${taxYear + 1}`} value={preview.amounts.taxSecondAdvance} code="1791" />
                  </div>
                  {inpsShown && <div className="divide-y">
                    <AmountsRow label={`Saldo INPS ${taxYear}`} value={preview.amounts.inpsBalance} code={installments > 1 ? inpsCode.installments : inpsCode.single} />
                    <AmountsRow label={`Primo acconto INPS ${taxYear + 1}`} value={preview.amounts.inpsFirstAdvance} code={installments > 1 ? inpsCode.installments : inpsCode.single} />
                    <AmountsRow label={`Secondo acconto INPS ${taxYear + 1}`} value={preview.amounts.inpsSecondAdvance} code={inpsCode.single} />
                  </div>}
                </div>
                {(preview.credits.tax > 0 || preview.credits.inps > 0) && (
                  <p className="text-sm text-muted-foreground">
                    Crediti non inclusi nelle deleghe: imposta {formatMoney(preview.credits.tax)} (LM47), INPS {formatMoney(preview.credits.inps)} (RR8). La compensazione in F24 sarà gestita dal modulo compensazioni.
                  </p>
                )}
                {preview.compensation.used > 0 && (
                  <p className="text-sm">
                    Crediti usati nel modello a saldo zero: <span className="font-mono">{formatMoney(preview.compensation.used)}</span>
                    {preview.compensation.unused > 0 && <> · residuo non usato {formatMoney(preview.compensation.unused)}</>}. Importi rateizzati al netto dei crediti.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {preview.inpsOfficeCode && <>Sede INPS {preview.inpsOfficeCode} dal profilo.{' '}</>}
                  {preview.forms.length === 0
                    ? `Nulla da versare: nessun saldo o acconto a debito per il ${taxYear} (servono incassi registrati nel ${taxYear}).`
                    : `${preview.forms.length} deleghe: totale ${formatMoney(preview.forms.reduce((s, f) => s + Number(f.totalDebit), 0))}.`}
                </p>
                <form action={createPlan}>
                  <input type="hidden" name="taxYear" value={taxYear} />
                  <input type="hidden" name="start" value={preview.start} />
                  <input type="hidden" name="installments" value={preview.installments} />
                  <input type="hidden" name="useCredits" value={useCredits ? 'true' : 'false'} />
                  <input type="hidden" name="creditOrder" value={preview.compensation.order} />
                  <Button type="submit" disabled={preview.forms.length === 0 || preview.rulesYear !== taxYear + 1}>Salva piano</Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {(selfEmployed || scheme === 'PROFESSIONAL_FUND') && codes && (
        <Card>
          <CardHeader>
            <CardTitle>Contributi {paymentYear} fuori dal piano</CardTitle>
            <CardDescription>
              {selfEmployed ? (
                <>Le quattro rate fisse sul minimale (causale {scheme === 'INPS_ARTISANS' ? 'AF' : 'CF'}) si pagano alle date della circolare INPS, ognuna con il suo codice INPS: indicali in <Link href={`/taxes?year=${paymentYear}`} className="underline">Imposte {paymentYear}</Link>. Saldo e acconti oltre il minimale sono già nel piano qui sopra. Qui sotto puoi aggiungere altre righe comunicate dall&apos;INPS (anni pregressi, avvisi di pagamento).</>
              ) : (
                <>OpenTax IT non calcola i contributi delle casse: indica le righe che ti comunica la cassa, con causale e periodo del suo codice F24 (sezione &quot;Altri enti previdenziali e assicurativi&quot;). Alcune casse (per esempio ENPAM, geometri, veterinari) non si pagano con F24.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selfEmployed && (
              <form action={createFixedContributions}>
                <input type="hidden" name="taxYear" value={taxYear} />
                <input type="hidden" name="year" value={paymentYear} />
                <Button type="submit" disabled={fixedCreated}>{fixedCreated ? `Rate fisse ${paymentYear} già create` : `Crea le quattro rate fisse ${paymentYear}`}</Button>
              </form>
            )}
            <ContributionF24Form codes={codes} section={selfEmployed ? 'INPS' : 'OTHER_ENTITY'} officeCode={officeCode} fundType={me?.profile.professionalFundType} knownInpsCodes={knownInpsCodes} inpsKind={scheme === 'INPS_ARTISANS' ? 'ARTISANS' : scheme === 'INPS_TRADERS' ? 'TRADERS' : undefined} />
          </CardContent>
        </Card>
      )}
      {contributionForms.length > 0 && (
        <section className="space-y-4">
          {contributionForms.map((f) => <F24Card key={f.id} f={f} taxYear={taxYear} collapsible />)}
        </section>
      )}

      {stampDutyForms.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Bollo sulle fatture elettroniche · pagato nel {paymentYear}</h2>
          {stampDutyForms.map((f) => <F24Card key={f.id} f={f} taxYear={taxYear} collapsible />)}
        </section>
      )}

      <section className="space-y-4">
        {plan
          ? forms.map((f) => <F24Card key={f.id} f={f} taxYear={taxYear} highlight={next?.id === f.id} collapsible open={next?.id === f.id} />)
          : (preview?.forms ?? []).map((f, i) => <F24Card key={`${f.kind}-${f.paymentDate}-${i}`} f={f} taxYear={taxYear} />)}
      </section>
    </main>
  );
}
