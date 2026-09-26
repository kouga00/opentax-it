'use client';

import { useActionState, useState } from 'react';
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { savePecSettings, testPecSettings } from '@/lib/actions';
import type { ConnectionCheck, PecProvider, PecSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { HelpTip } from '@/components/help-tip';
import { NativeSelect } from '@/components/native-select';

function CheckLine({ label, check }: { label: string; check: ConnectionCheck }) {
  const Icon = check.ok ? CircleCheck : CircleX;
  return <p className="flex items-center gap-2 text-sm"><Icon className={check.ok ? 'size-4 text-green-600' : 'size-4 text-destructive'} /> {label}: {check.message}</p>;
}

export function PecForm({ providers, settings }: { providers: PecProvider[]; settings: PecSettings }) {
  const [state, action, pending] = useActionState(savePecSettings, undefined);
  const [test, testAction, testing] = useActionState(testPecSettings, undefined);
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
          <AlertDescription>La password PEC si salva solo cifrata. Imposta <code>APP_ENCRYPTION_KEY</code> nel file <code>.env</code> con 32 byte casuali in base64 (<code>openssl rand -base64 32</code>) e riavvia l&apos;API. Se la chiave cambia, la password va inserita di nuovo.</AlertDescription>
        </Alert>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <ErrorAlert message={state?.error} />
        <Field
          label="Gestore PEC"
          htmlFor="provider"
          help={<HelpTip><p>Il gestore deve essere nell&apos;elenco pubblico AgID (Specifiche tecniche FatturaPA 1.9.1 §1.3.1). Per i gestori in elenco i server sono già compilati, presi dalle pagine ufficiali dei gestori; per gli altri scegli &quot;Altro gestore&quot; e copia i dati dalla guida del tuo gestore.</p></HelpTip>}
        >
          <NativeSelect id="provider" name="provider" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="OTHER">Altro gestore (server a mano)</option>
          </NativeSelect>
        </Field>
        <Field label="Indirizzo PEC" htmlFor="address"><Input id="address" name="address" type="email" required defaultValue={settings.address ?? ''} /></Field>
        <Field label="Nome utente" htmlFor="username" hint={preset?.usernameHint ?? 'Lascia vuoto se è l\'indirizzo PEC'}><Input id="username" name="username" autoComplete="off" defaultValue={settings.username ?? ''} /></Field>
        <Field label="Password" htmlFor="password" hint={[settings.hasPassword ? 'Salvata cifrata: lascia vuoto per non cambiarla.' : undefined, preset?.passwordHint].filter(Boolean).join(' ') || undefined}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required={!settings.hasPassword} disabled={!settings.encryptionConfigured} />
        </Field>
        {other ? (
          <>
            <Field label="Server SMTP (invio)" htmlFor="smtpHost"><Input id="smtpHost" name="smtpHost" required defaultValue={settings.smtpHost ?? ''} /></Field>
            <Field label="Porta SMTP" htmlFor="smtpPort" hint="SSL/TLS, di solito 465"><Input id="smtpPort" name="smtpPort" type="number" required min={1} max={65535} defaultValue={settings.smtpPort ?? 465} /></Field>
            <Field label="Server IMAP (ricezione)" htmlFor="imapHost"><Input id="imapHost" name="imapHost" required defaultValue={settings.imapHost ?? ''} /></Field>
            <Field label="Porta IMAP" htmlFor="imapPort" hint="SSL/TLS, di solito 993"><Input id="imapPort" name="imapPort" type="number" required min={1} max={65535} defaultValue={settings.imapPort ?? 993} /></Field>
          </>
        ) : preset && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            SMTP {preset.smtpHost}:{preset.smtpPort} · IMAP {preset.imapHost}:{preset.imapPort}, SSL/TLS. Fonte: <a className="underline" href={preset.sourceUrl} target="_blank" rel="noreferrer">pagina del gestore</a>, verificata il {new Date(preset.verifiedOn).toLocaleDateString('it-IT')}.
          </p>
        )}
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

      <form action={testAction} className="space-y-2">
        <p className="text-sm text-muted-foreground">La prova accede ai server SMTP e IMAP con i dati salvati, senza inviare nulla.</p>
        <Button type="submit" variant="outline" disabled={testing || !configured}>{testing ? 'Prova in corso…' : 'Prova la connessione'}</Button>
        <ErrorAlert message={test?.error} />
        {test?.smtp && <CheckLine label="SMTP" check={test.smtp} />}
        {test?.imap && <CheckLine label="IMAP" check={test.imap} />}
      </form>
    </div>
  );
}
