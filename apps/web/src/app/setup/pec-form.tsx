'use client';

import { useActionState, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { savePecSettings } from '@/lib/actions';
import type { PecProvider, PecSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { HelpTip } from '@/components/help-tip';
import { NativeSelect } from '@/components/native-select';
import { PecTest } from './pec-test';

/** Inline command or file name inside the alert text. */
const CODE = 'rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs break-all';

/** Server fields filled by a preset provider: visibly not editable. */
const PRESET_FIELD = 'read-only:bg-muted/50 read-only:text-muted-foreground';

export function PecForm({ providers, settings }: { providers: PecProvider[]; settings: PecSettings }) {
  const [state, action, pending] = useActionState(savePecSettings, undefined);
  const [providerId, setProviderId] = useState(settings.provider ?? providers[0]?.id ?? 'OTHER');
  const preset = providers.find((p) => p.id === providerId);
  const other = providerId === 'OTHER';
  const configured = Boolean(settings.address && settings.hasPassword);
  return (
    <div className="space-y-6">
      {!settings.encryptionConfigured && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Manca la chiave di cifratura</AlertTitle>
          <AlertDescription>
            <p>La password PEC si salva solo cifrata: serve una chiave nel file <code className={CODE}>.env</code>.</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Genera la chiave dal terminale:
                <dl className="mt-1 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
                  <dt>macOS e Linux</dt>
                  <dd><code className={CODE}>openssl rand -base64 32</code></dd>
                  <dt>Windows</dt>
                  <dd><code className={CODE}>node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;base64&apos;))&quot;</code></dd>
                </dl>
              </li>
              <li>Nel file <code className={CODE}>.env</code> nella cartella principale del progetto scrivi <code className={CODE}>APP_ENCRYPTION_KEY=&quot;la-chiave-generata&quot;</code></li>
              <li>Riavvia l&apos;API.</li>
            </ol>
            <p className="mt-2">Conserva la chiave: se cambia, la password PEC va inserita di nuovo.</p>
          </AlertDescription>
        </Alert>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <ErrorAlert message={state?.error} />
        <Field
          label="Gestore PEC"
          htmlFor="provider"
          help={
            <HelpTip>
              <p>Il gestore deve essere nell&apos;elenco pubblico AgID (Specifiche tecniche FatturaPA 1.9.1 §1.3.1). Per i gestori in elenco i server sono già compilati, presi dalle pagine ufficiali dei gestori; per gli altri scegli &quot;Altro gestore&quot; e copia i dati dalla guida del tuo gestore.</p>
              {preset && <p>Server di {preset.name}: <a className="underline" href={preset.sourceUrl} target="_blank" rel="noreferrer">pagina del gestore</a>, verificata il {new Date(preset.verifiedOn).toLocaleDateString('it-IT')}.</p>}
            </HelpTip>
          }
        >
          <NativeSelect id="provider" name="provider" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="OTHER">Altro gestore (server a mano)</option>
          </NativeSelect>
        </Field>
        <Field label="Indirizzo PEC" htmlFor="address"><Input id="address" name="address" type="email" required defaultValue={settings.address ?? ''} /></Field>
        <Field label="Nome utente" htmlFor="username" hint={preset?.usernameHint ?? 'Lascia vuoto se è l\'indirizzo PEC'}><Input id="username" name="username" autoComplete="off" defaultValue={settings.username ?? ''} /></Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={
            <>
              {settings.hasPassword && 'La password è salvata cifrata e non viene mostrata: scrivine una solo per cambiarla. '}
              {preset?.passwordHint && `${preset.passwordHint} `}
              {preset ? <a className="underline" href={preset.clientGuideUrl} target="_blank" rel="noreferrer">Guida di {preset.name} per i programmi di posta</a> : 'Usa la password per i programmi di posta indicata dal tuo gestore.'}
            </>
          }
        >
          {/* The saved password is never sent back: the placeholder only says that one is stored. */}
          <Input id="password" name="password" type="password" autoComplete="new-password" required={!settings.hasPassword} disabled={!settings.encryptionConfigured} placeholder={settings.hasPassword ? '•••••••• (salvata)' : undefined} />
        </Field>
        {/* Presets fill the servers read-only; the key resets the fields when the provider changes. */}
        <Field label="Server SMTP (invio)" htmlFor="smtpHost" hint={other ? undefined : 'Impostato dal gestore'}>
          <Input key={`smtpHost-${providerId}`} id="smtpHost" name="smtpHost" required readOnly={!other} className={PRESET_FIELD} defaultValue={preset?.smtpHost ?? settings.smtpHost ?? ''} />
        </Field>
        <Field label="Porta SMTP" htmlFor="smtpPort" hint="SSL/TLS, di solito 465">
          <Input key={`smtpPort-${providerId}`} id="smtpPort" name="smtpPort" type="number" required min={1} max={65535} readOnly={!other} className={PRESET_FIELD} defaultValue={preset?.smtpPort ?? settings.smtpPort ?? 465} />
        </Field>
        <Field label="Server IMAP (ricezione)" htmlFor="imapHost" hint={other ? undefined : 'Impostato dal gestore'}>
          <Input key={`imapHost-${providerId}`} id="imapHost" name="imapHost" required readOnly={!other} className={PRESET_FIELD} defaultValue={preset?.imapHost ?? settings.imapHost ?? ''} />
        </Field>
        <Field label="Porta IMAP" htmlFor="imapPort" hint="SSL/TLS, di solito 993">
          <Input key={`imapPort-${providerId}`} id="imapPort" name="imapPort" type="number" required min={1} max={65535} readOnly={!other} className={PRESET_FIELD} defaultValue={preset?.imapPort ?? settings.imapPort ?? 993} />
        </Field>
        <Field
          label="Indirizzo PEC assegnato dallo SDI"
          htmlFor="sdiPecAssigned"
          hint="Vuoto fino al primo invio"
          help={<HelpTip><p>Il primo invio va a sdi01@pec.fatturapa.it; con il primo messaggio di risposta lo SDI comunica l&apos;indirizzo da usare per gli invii successivi, e un indirizzo diverso &quot;non garantisce il buon fine della ricezione&quot; (Specifiche tecniche FatturaPA 1.9.1 §1.3.1). Finché la lettura delle ricevute non è disponibile, copialo qui dalla risposta arrivata nella tua casella PEC: senza, dopo il primo invio i successivi sono bloccati.</p></HelpTip>}
        >
          <Input id="sdiPecAssigned" name="sdiPecAssigned" type="email" defaultValue={settings.sdiPecAssigned ?? ''} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : 'Salva'}</Button>
        </div>
      </form>

      <PecTest
        disabled={!configured}
        servers={{ smtpHost: settings.smtpHost, smtpPort: settings.smtpPort, imapHost: settings.imapHost, imapPort: settings.imapPort, username: settings.username ?? settings.address ?? '' }}
      />
    </div>
  );
}
