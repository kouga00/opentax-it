'use client';

import { useEffect, useRef, useState } from 'react';
import { Circle, CircleCheck, CircleMinus, CircleX, Loader2 } from 'lucide-react';
import type { PecTestEventData, PecTestStep, PecTestStepStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Servers { smtpHost: string | null; smtpPort: number | null; imapHost: string | null; imapPort: number | null; username: string }

type StepState = { status?: PecTestStepStatus; message?: string };

const ORDER: PecTestStep[] = ['SMTP_CONNECT', 'SMTP_LOGIN', 'IMAP_CONNECT', 'IMAP_LOGIN'];

function labels(s: Servers): Record<PecTestStep, string> {
  return {
    SMTP_CONNECT: `Connessione cifrata al server di invio (SMTP) ${s.smtpHost}:${s.smtpPort}`,
    SMTP_LOGIN: `Accesso al server di invio come ${s.username}`,
    IMAP_CONNECT: `Connessione cifrata al server di ricezione (IMAP) ${s.imapHost}:${s.imapPort}`,
    IMAP_LOGIN: `Accesso al server di ricezione come ${s.username}`,
  };
}

function StepIcon({ status }: { status?: PecTestStepStatus }) {
  if (status === 'RUNNING') return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === 'OK') return <CircleCheck className="size-4 text-green-600" />;
  if (status === 'FAILED') return <CircleX className="size-4 text-destructive" />;
  if (status === 'SKIPPED') return <CircleMinus className="size-4 text-muted-foreground" />;
  return <Circle className="size-4 text-muted-foreground/50" />;
}

/** Runs the PEC mailbox test and shows each step as the API reports it (Server-Sent Events from /setup/pec-test). */
export function PecTest({ servers, disabled }: { servers: Servers; disabled: boolean }) {
  const [steps, setSteps] = useState<Partial<Record<PecTestStep, StepState>>>({});
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [running, setRunning] = useState(false);
  const source = useRef<EventSource | null>(null);

  useEffect(() => () => source.current?.close(), []);

  function start() {
    source.current?.close();
    setSteps({});
    setResult(null);
    setRunning(true);
    const es = new EventSource('/setup/pec-test');
    source.current = es;
    es.addEventListener('step', (e) => {
      const d = JSON.parse((e as MessageEvent<string>).data) as PecTestEventData;
      if (d.step) setSteps((prev) => ({ ...prev, [d.step!]: { status: d.status, message: d.message } }));
    });
    es.addEventListener('done', (e) => {
      const d = JSON.parse((e as MessageEvent<string>).data) as PecTestEventData;
      setResult({ ok: Boolean(d.ok), message: d.message });
      setRunning(false);
      es.close(); // otherwise EventSource reconnects when the server ends the stream
    });
    // A broken stream must not reconnect on its own: that would repeat the logins.
    es.onerror = () => {
      es.close();
      setRunning(false);
      setResult((r) => r ?? { ok: false, message: 'La prova si è interrotta: riprova.' });
    };
  }

  const started = running || result !== null;
  const text = labels(servers);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">La prova accede ai server SMTP e IMAP con i dati salvati, senza inviare nulla.</p>
      <Button type="button" variant="outline" disabled={running || disabled} onClick={start}>{running ? 'Prova in corso…' : 'Prova la connessione'}</Button>
      {started && (
        <ol className="space-y-2">
          {ORDER.map((step) => {
            const s = steps[step];
            return (
              <li key={step} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5"><StepIcon status={s?.status} /></span>
                <span className={cn(!s?.status && 'text-muted-foreground', s?.status === 'SKIPPED' && 'text-muted-foreground line-through')}>
                  {text[step]}
                  {s?.status === 'FAILED' && s.message && <span className="block text-destructive">{s.message}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {result && (
        <p className={cn('text-sm font-medium', result.ok ? 'text-green-700 dark:text-green-400' : 'text-destructive')}>
          {result.message ?? (result.ok ? 'Prova riuscita.' : 'Prova non riuscita: correggi i dati indicati sopra, salva e riprova.')}
        </p>
      )}
    </div>
  );
}
