'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { createTenant, updateTenantProfile } from '@/lib/actions';
import { inpsSurchargeLabel } from '@/lib/format';
import type { ProfessionalFund, SocialSecurityScheme, TenantProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { InpsScopeNote } from '@/components/inps-scope-note';
import { SELECTABLE_SCHEMES, SOCIAL_SECURITY_SCHEME_LABELS } from '@/lib/social-security-schemes';
import { Help } from '@/components/help';
import { NativeSelect } from '@/components/native-select';

export interface OfficeOption { id: string; code: string; name: string }

interface Props {
  offices: OfficeOption[];
  /** Professional funds (TipoCassa TC01-TC21), for the PROFESSIONAL_FUND scheme. */
  funds: ProfessionalFund[];
  /** When set, the form edits the current tenant instead of creating one. */
  current?: { name: string; profile: TenantProfile };
  /** INPS surcharge rate of the current year's rule set, for the label. */
  surchargePct?: number;
}

/** A group of fields: title and a short explanation on the left, the fields on the right (stacked on small screens). */
function Section({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid content-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** A checkbox with its label and optional help, spanning the section width. */
function Option({ name, defaultChecked, children, help }: { name: string; defaultChecked?: boolean; children: ReactNode; help?: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm sm:col-span-2">
      <Checkbox name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <span>{children}{help}</span>
    </label>
  );
}

export function TenantForm({ offices, funds, current, surchargePct }: Props) {
  const [state, action, pending] = useActionState(current ? updateTenantProfile : createTenant, undefined);
  const p = current?.profile;
  const [scheme, setScheme] = useState<SocialSecurityScheme>(p?.socialSecurityScheme ?? 'INPS_SEPARATE');
  const selfEmployed = scheme === 'INPS_ARTISANS' || scheme === 'INPS_TRADERS';
  return (
    <form action={action}>
      <ErrorAlert message={state?.error} />

      <Section title="Anagrafica" description="Il cedente o prestatore delle fatture elettroniche e il contribuente degli F24.">
        <Field label="Nome della partita IVA (interno)" htmlFor="name" hint="Come la vedi nell'elenco delle partite IVA"><Input id="name" name="name" required defaultValue={current?.name ?? ''} /></Field>
        <Field label="Denominazione (facoltativa)" htmlFor="businessName" hint="Se lavori con un nome commerciale"><Input id="businessName" name="businessName" defaultValue={p?.businessName ?? ''} /></Field>
        <Field label="Nome" htmlFor="firstName"><Input id="firstName" name="firstName" required defaultValue={p?.firstName ?? ''} /></Field>
        <Field label="Cognome" htmlFor="lastName"><Input id="lastName" name="lastName" required defaultValue={p?.lastName ?? ''} /></Field>
        <Field label="Codice fiscale" htmlFor="fiscalCode"><Input id="fiscalCode" name="fiscalCode" required minLength={16} maxLength={16} className="font-mono uppercase" defaultValue={p?.fiscalCode ?? ''} /></Field>
        <Field label="Partita IVA" htmlFor="vatNumber"><Input id="vatNumber" name="vatNumber" required pattern="\d{11}" inputMode="numeric" className="font-mono" defaultValue={p?.vatNumber ?? ''} /></Field>
      </Section>

      <Section title="Dati di nascita" description="Servono solo per compilare i dati anagrafici del modello F24.">
        <Field label="Data di nascita" htmlFor="birthDate"><Input id="birthDate" name="birthDate" type="date" defaultValue={p?.birthDate?.slice(0, 10) ?? ''} /></Field>
        <Field label="Sesso" htmlFor="sex">
          <NativeSelect id="sex" name="sex" defaultValue={p?.sex ?? ''}>
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </NativeSelect>
        </Field>
        <Field label="Comune (o Stato estero) di nascita" htmlFor="birthPlace"><Input id="birthPlace" name="birthPlace" defaultValue={p?.birthPlace ?? ''} /></Field>
        <Field label="Provincia di nascita" htmlFor="birthProvince"><Input id="birthProvince" name="birthProvince" minLength={2} maxLength={2} className="uppercase" defaultValue={p?.birthProvince ?? ''} /></Field>
      </Section>

      <Section title="Domicilio fiscale" description="L'indirizzo scritto in fattura e nel modello F24.">
        <div className="sm:col-span-2"><Field label="Indirizzo" htmlFor="address"><Input id="address" name="address" required defaultValue={p?.address ?? ''} /></Field></div>
        <Field label="Comune" htmlFor="city"><Input id="city" name="city" required defaultValue={p?.city ?? ''} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="CAP" htmlFor="postalCode"><Input id="postalCode" name="postalCode" required pattern="\d{5}" inputMode="numeric" defaultValue={p?.postalCode ?? ''} /></Field>
          <Field label="Provincia" htmlFor="province"><Input id="province" name="province" required minLength={2} maxLength={2} className="uppercase" defaultValue={p?.province ?? ''} /></Field>
        </div>
      </Section>

      <Section title="Attività e regime forfettario" description="Da qui dipendono coefficiente di redditività, aliquota dell'imposta sostitutiva e acconti.">
        <Field
          label="Codice ATECO (2007)"
          htmlFor="atecoCode"
          hint="Es. 62.02 — determina il coefficiente di redditività"
          help={<Help topic="atecoCode" />}
        >
          <Input id="atecoCode" name="atecoCode" required placeholder="62.02" className="font-mono" defaultValue={p?.atecoCode ?? ''} />
        </Field>
        <Field
          label="Anno di inizio attività"
          htmlFor="activityStartYear"
          hint="Per l'aliquota del 5% (anno di inizio e i quattro successivi)"
          help={<Help topic="activityStartYear" />}
        >
          <Input id="activityStartYear" name="activityStartYear" type="number" required min={1990} defaultValue={p?.activityStartYear ?? ''} />
        </Field>
        <Option name="reducedRate" defaultChecked={p?.reducedRate}>Aliquota ridotta del 5% (requisiti dell&apos;art. 1 c. 65 L. 190/2014)</Option>
        <Option
          name="isaSubject"
          defaultChecked={p?.isaSubject}
          help={<Help topic="isaSubject" className="ml-1" />}
        >
          Attività con ISA approvato (acconti 50% + 50%)
        </Option>
        <Field
          label="Limite personale di incassi nell'anno (€)"
          htmlFor="revenueLimit"
          hint="Facoltativo. Es. 84000 per restare sotto gli 85.000 €"
          help={<Help topic="revenueLimit" />}
        >
          <Input id="revenueLimit" name="revenueLimit" type="number" min={1} max={1000000} step="1" defaultValue={p?.revenueLimit ? Number(p.revenueLimit) : ''} />
        </Field>
      </Section>

      <Section title="Previdenza" description="La gestione a cui versi i contributi: decide cosa calcola OpenTax IT e cosa va in fattura.">
        <Field
          label="Gestione previdenziale"
          htmlFor="socialSecurityScheme"
          help={<Help topic="socialSecurityScheme" />}
        >
          <NativeSelect id="socialSecurityScheme" name="socialSecurityScheme" value={scheme} onChange={(e) => setScheme(e.target.value as SocialSecurityScheme)}>
            {Object.entries(SOCIAL_SECURITY_SCHEME_LABELS).map(([value, label]) => {
              const selectable = SELECTABLE_SCHEMES.has(value as SocialSecurityScheme);
              return <option key={value} value={value} disabled={!selectable}>{selectable ? label : `${label} (in arrivo)`}</option>;
            })}
          </NativeSelect>
        </Field>
        {scheme !== 'PROFESSIONAL_FUND' ? (
          <Field
            label="Sede INPS (codice sede F24)"
            htmlFor="inpsOfficeId"
            help={<Help topic="inpsOffice" />}
          >
            <NativeSelect id="inpsOfficeId" name="inpsOfficeId" defaultValue={p?.inpsOfficeId ?? ''}>
              <option value="">— non impostata —</option>
              {offices.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
            </NativeSelect>
          </Field>
        ) : (
          <input type="hidden" name="inpsOfficeId" value={p?.inpsOfficeId ?? ''} />
        )}
        {scheme === 'INPS_SEPARATE' && (
          <Option name="applyInpsSurcharge" defaultChecked={p?.applyInpsSurcharge}>Applica in fattura: {inpsSurchargeLabel(surchargePct)}</Option>
        )}
        {selfEmployed && (
          <>
            <Option
              name="inpsFlatRateReduction"
              defaultChecked={p?.inpsFlatRateReduction}
              help={<Help topic="flatRateReduction" className="ml-1" />}
            >
              Regime contributivo agevolato: contributi ridotti del 35%
            </Option>
            <Option
              name="inpsSeniorityBefore1996"
              defaultChecked={p?.inpsSeniorityBefore1996}
              help={<Help topic="seniorityBefore1996" className="ml-1" />}
            >
              Contributi versati prima del 1996
            </Option>
          </>
        )}
        {scheme === 'PROFESSIONAL_FUND' && (
          <>
            <Field
              label="Cassa professionale"
              htmlFor="professionalFundType"
              help={<Help topic="professionalFund" />}
            >
              <NativeSelect id="professionalFundType" name="professionalFundType" defaultValue={p?.professionalFundType ?? ''}>
                <option value="">— nessun contributo in fattura —</option>
                {funds.map((f) => <option key={f.code} value={f.code}>{f.code} · {f.name}</option>)}
              </NativeSelect>
            </Field>
            <Field
              label="Contributo di cassa in fattura (%)"
              htmlFor="professionalFundRatePct"
              hint="Es. il contributo integrativo: l'aliquota la stabilisce la tua cassa"
              help={<Help topic="professionalFundRate" />}
            >
              <Input id="professionalFundRatePct" name="professionalFundRatePct" type="number" min={0.01} max={100} step="0.01" defaultValue={p?.professionalFundRatePct ? Number(p.professionalFundRatePct) : ''} />
            </Field>
            <div className="sm:col-span-2"><InpsScopeNote scheme={scheme} /></div>
          </>
        )}
      </Section>

      <Section title="Fatturazione elettronica" description="Impostazioni per le fatture verso l'estero e per i file inviati allo SDI.">
        <Option name="viesRegistered" defaultChecked={p?.viesRegistered}>Iscritto al VIES (servizi a clienti UE con partita IVA)</Option>
        <Field
          label="Primo progressivo dei file SDI"
          htmlFor="sdiFileProgressiveStart"
          hint="Facoltativo, 1-5 caratteri alfanumerici (es. 00100)"
          help={<Help topic="sdiFileProgressive" />}
        >
          <Input id="sdiFileProgressiveStart" name="sdiFileProgressiveStart" maxLength={5} pattern="[A-Za-z0-9]{1,5}" className="font-mono" defaultValue={p?.sdiFileProgressiveStart ?? ''} />
        </Field>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-(--card-spacing,1.5rem) flex items-center justify-end gap-3 border-t bg-card/95 px-(--card-spacing,1.5rem) py-3 backdrop-blur">
        {current && <p className="mr-auto text-xs text-muted-foreground">Le modifiche valgono per i calcoli e le fatture da ora in poi; le fatture già emesse non cambiano.</p>}
        <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : current ? 'Salva modifiche' : 'Crea partita IVA'}</Button>
      </div>
    </form>
  );
}
