'use client';

import { useActionState } from 'react';
import { createTenant, updateTenantProfile } from '@/lib/actions';
import { inpsSurchargeLabel } from '@/lib/format';
import type { TenantProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { HelpTip } from '@/components/help-tip';
import { NativeSelect } from '@/components/native-select';

export interface OfficeOption { id: string; code: string; name: string }

interface Props {
  offices: OfficeOption[];
  /** When set, the form edits the current tenant instead of creating one. */
  current?: { name: string; profile: TenantProfile };
  /** INPS surcharge rate of the current year's rule set, for the label. */
  surchargePct?: number;
}

export function TenantForm({ offices, current, surchargePct }: Props) {
  const [state, action, pending] = useActionState(current ? updateTenantProfile : createTenant, undefined);
  const p = current?.profile;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <ErrorAlert message={state?.error} />
      <Field label="Nome (interno)" htmlFor="name"><Input id="name" name="name" required defaultValue={current?.name ?? ''} /></Field>
      <Field label="Denominazione (opzionale)" htmlFor="businessName"><Input id="businessName" name="businessName" defaultValue={p?.businessName ?? ''} /></Field>
      <Field label="Nome" htmlFor="firstName"><Input id="firstName" name="firstName" required defaultValue={p?.firstName ?? ''} /></Field>
      <Field label="Cognome" htmlFor="lastName"><Input id="lastName" name="lastName" required defaultValue={p?.lastName ?? ''} /></Field>
      <Field label="Data di nascita" htmlFor="birthDate" hint="Per il modello F24 (dati anagrafici)"><Input id="birthDate" name="birthDate" type="date" defaultValue={p?.birthDate?.slice(0, 10) ?? ''} /></Field>
      <Field label="Sesso" htmlFor="sex">
        <NativeSelect id="sex" name="sex" defaultValue={p?.sex ?? ''}>
          <option value="">—</option>
          <option value="M">M</option>
          <option value="F">F</option>
        </NativeSelect>
      </Field>
      <Field label="Comune (o Stato estero) di nascita" htmlFor="birthPlace"><Input id="birthPlace" name="birthPlace" defaultValue={p?.birthPlace ?? ''} /></Field>
      <Field label="Provincia di nascita" htmlFor="birthProvince"><Input id="birthProvince" name="birthProvince" minLength={2} maxLength={2} defaultValue={p?.birthProvince ?? ''} /></Field>
      <Field label="Codice fiscale" htmlFor="fiscalCode"><Input id="fiscalCode" name="fiscalCode" required minLength={16} maxLength={16} defaultValue={p?.fiscalCode ?? ''} /></Field>
      <Field label="Partita IVA" htmlFor="vatNumber"><Input id="vatNumber" name="vatNumber" required pattern="\d{11}" defaultValue={p?.vatNumber ?? ''} /></Field>
      <Field
        label="Codice ATECO (2007)"
        htmlFor="atecoCode"
        hint="Es. 62.02 — determina il coefficiente di redditività"
        help={
          <HelpTip label="Dove trovo il codice ATECO">
            <p>Lo trovi nel <a className="underline" href="https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata" target="_blank" rel="noreferrer">cassetto fiscale</a> (area riservata AdE → Dati anagrafici → Attività) o sul certificato di attribuzione della partita IVA (mod. AA9).</p>
            <p>Per cercare la descrizione: <a className="underline" href="https://www.istat.it/classificazione/ateco-2025/" target="_blank" rel="noreferrer">ISTAT ATECO</a>. Qui va il codice ATECO 2007, usato per il coefficiente fino ai nuovi coefficienti ATECO 2025 (D.Lgs. 81/2025 art. 1).</p>
          </HelpTip>
        }
      >
        <Input id="atecoCode" name="atecoCode" required placeholder="62.02" defaultValue={p?.atecoCode ?? ''} />
      </Field>
      <Field
        label="Anno inizio attività"
        htmlFor="activityStartYear"
        hint="Per l'aliquota 5% (primi 5 anni)"
        help={
          <HelpTip label="Dove trovo la data di inizio attività">
            <p>Nel cassetto fiscale (Dati anagrafici → partita IVA: data inizio attività) o sul certificato di attribuzione della partita IVA.</p>
            <p>L&apos;aliquota ridotta del 5% vale per l&apos;anno di inizio e i quattro successivi, se ricorrono le condizioni dell&apos;art. 1 c. 65 L. 190/2014.</p>
          </HelpTip>
        }
      >
        <Input id="activityStartYear" name="activityStartYear" type="number" required min={1990} defaultValue={p?.activityStartYear ?? ''} />
      </Field>
      <Field label="Indirizzo" htmlFor="address"><Input id="address" name="address" required defaultValue={p?.address ?? ''} /></Field>
      <Field label="CAP" htmlFor="postalCode"><Input id="postalCode" name="postalCode" required pattern="\d{5}" defaultValue={p?.postalCode ?? ''} /></Field>
      <Field label="Comune" htmlFor="city"><Input id="city" name="city" required defaultValue={p?.city ?? ''} /></Field>
      <Field label="Provincia" htmlFor="province"><Input id="province" name="province" required minLength={2} maxLength={2} defaultValue={p?.province ?? ''} /></Field>
      <Field
        label="Limite personale di incassi nell'anno (€)"
        htmlFor="revenueLimit"
        hint="Facoltativo. Es. 84000 per restare sotto gli 85.000 €"
        help={<HelpTip><p>Quando emetti una fattura, incassato dell&apos;anno + fatture non ancora incassate + la nuova fattura vengono confrontati con questo limite: se lo superano, l&apos;emissione chiede una conferma esplicita. Le soglie di legge restano quelle della L. 190/2014 c. 54 e 71 (85.000 €: uscita dall&apos;anno successivo; 100.000 €: uscita immediata e IVA dalla fattura che fa superare la soglia).</p></HelpTip>}
      >
        <Input id="revenueLimit" name="revenueLimit" type="number" min={1} max={1000000} step="1" defaultValue={p?.revenueLimit ? Number(p.revenueLimit) : ''} />
      </Field>
      <Field
        label="Primo progressivo dei file SDI"
        htmlFor="sdiFileProgressiveStart"
        hint="Facoltativo, 1-5 caratteri alfanumerici (es. 00100)"
        help={<HelpTip><p>Il nome del file inviato allo SDI è codice paese + codice fiscale + &quot;_&quot; + un progressivo di massimo 5 caratteri alfanumerici; un nome già usato con lo stesso codice fiscale viene scartato (errore 00002, Specifiche tecniche 1.9.1 §1.2.2). OpenTax IT parte già dal progressivo più alto tra le fatture emesse e importate qui; se hai inviato altre fatture con il tuo codice fiscale da altri strumenti (es. il portale Fatture e Corrispettivi) senza importarle, indica qui un valore più alto di quelli usati.</p></HelpTip>}
      >
        <Input id="sdiFileProgressiveStart" name="sdiFileProgressiveStart" maxLength={5} pattern="[A-Za-z0-9]{1,5}" defaultValue={p?.sdiFileProgressiveStart ?? ''} />
      </Field>
      <Field
        label="Sede INPS (codice sede F24)"
        htmlFor="inpsOfficeId"
        help={
          <HelpTip label="Dove trovo la sede INPS">
            <p>È la sede INPS competente in base alla residenza (scheda INPS &quot;F24 per professionisti iscritti alla Gestione Separata&quot;). La trovi su un F24 già pagato (sezione INPS, colonna &quot;codice sede&quot;) o nel cassetto previdenziale INPS.</p>
            <p>Elenco ufficiale: <a className="underline" href="https://www.agenziaentrate.gov.it/portale/strumenti/codici-attivita-e-tributo/f24-codici-tributo-per-i-versamenti/tabelle-dei-codici-tributo-e-altri-codici-per-il-modello-f24/tabelle-codici-inps-e-enti-previdenziali-ed-assicurativi/tabella-codici-sede-inps" target="_blank" rel="noreferrer">Tabella codici sede INPS (AdE)</a>.</p>
          </HelpTip>
        }
      >
        <NativeSelect id="inpsOfficeId" name="inpsOfficeId" defaultValue={p?.inpsOfficeId ?? ''}>
          <option value="">— non impostata —</option>
          {offices.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.name}</option>)}
        </NativeSelect>
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm"><Checkbox name="reducedRate" defaultChecked={p?.reducedRate} /> Aliquota ridotta 5% (requisiti art. 1 c. 65 L. 190/2014)</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="applyInpsSurcharge" defaultChecked={p?.applyInpsSurcharge} /> Applica in fattura: {inpsSurchargeLabel(surchargePct)}</label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isaSubject" defaultChecked={p?.isaSubject} /> Attività con ISA approvato (acconti 50% + 50%)
          <HelpTip>
            <p>Chi esercita un&apos;attività per cui è approvato un indice sintetico di affidabilità (ISA), con compensi entro il limite dell&apos;indice, versa gli acconti in due rate del 50% invece di 40% + 60%: DL 124/2019 art. 58, esteso ai forfettari e all&apos;imposta sostitutiva dalla Risoluzione AdE 93/E/2019. Verifica con chi ti assiste se al tuo codice ATECO corrisponde un ISA (elenco sul sito AdE, sezione ISA).</p>
          </HelpTip>
        </label>
        <label className="flex items-center gap-2 text-sm"><Checkbox name="viesRegistered" defaultChecked={p?.viesRegistered} /> Iscritto al VIES</label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : current ? 'Salva modifiche' : 'Crea'}</Button>
      </div>
    </form>
  );
}
