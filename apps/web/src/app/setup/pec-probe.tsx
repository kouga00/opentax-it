'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { checkPecProbe, sendPecProbe } from '@/lib/actions';
import type { PecProbeStatus, PecTestStepStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/error-alert';
import { formatDateTime } from '@/lib/format';
import { StepIcon } from './step-icon';

const formatTime = (iso?: string) => (iso ? formatDateTime(iso) : undefined);

/**
 * Test PEC without attachment to SDI, which answers with a "messaggio di cortesia" (Spec. FatturaPA 1.9.1 §1.3.1):
 * it checks the whole channel without issuing anything. The replies are read from the mailbox on request.
 */
export function PecProbe({ disabled, lastSentAt, lastRecipient, recipient }: { disabled: boolean; lastSentAt: string | null; lastRecipient: string | null; recipient: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PecProbeStatus | null>(lastSentAt ? { sentAt: lastSentAt, recipient: lastRecipient } : null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  // Like the invoice send dialog: it stays open while sending and shows the error inside, closing only on success.
  const send = () =>
    start(async () => {
      setError(undefined);
      const r = await sendPecProbe();
      if (r?.error) return setError(r.error);
      if (r?.status) setStatus(r.status);
      setOpen(false);
    });

  const run = (action: typeof checkPecProbe) =>
    start(async () => {
      setError(undefined);
      const r = await action();
      if (r?.error) setError(r.error);
      else if (r?.status) setStatus(r.status);
    });

  const step = (done: boolean, failed = false): PecTestStepStatus | undefined => (failed ? 'FAILED' : done ? 'OK' : pending ? 'RUNNING' : undefined);
  const steps = status?.sentAt
    ? [
        { label: `Messaggio inviato${status.recipient ? ` a ${status.recipient}` : ''}`, status: 'OK' as const, time: formatTime(status.sentAt) },
        { label: 'Accettazione del tuo gestore PEC', status: step(Boolean(status.acceptedAt)), time: formatTime(status.acceptedAt) },
        { label: 'Consegna alla casella PEC dello SDI', status: step(Boolean(status.deliveredAt), Boolean(status.providerError) && !status.deliveredAt), time: formatTime(status.deliveredAt) },
        { label: 'Risposta dello SDI (messaggio di cortesia)', status: step(Boolean(status.sdiReply)), time: formatTime(status.sdiReply?.receivedAt) },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>PEC di prova allo SDI</CardTitle>
        <CardDescription>
          Parte davvero verso lo SDI ma non contiene fatture: lo SDI risponde con un &quot;messaggio di cortesia&quot; (Specifiche tecniche FatturaPA 1.9.1 §1.3.1). Così verifichi tutto il canale prima della prima fattura. Le risposte possono arrivare dopo qualche minuto: prima di inviare un&apos;altra prova, aspettale e premi &quot;Controlla le risposte&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={disabled || pending} onClick={() => { setError(undefined); setOpen(true); }}><Send /> Invia PEC di prova allo SDI</Button>
        {status?.sentAt && <Button type="button" variant="outline" disabled={pending} onClick={() => run(checkPecProbe)}>{pending ? 'Lettura della casella…' : 'Controlla le risposte'}</Button>}
      </div>
      {!open && <ErrorAlert message={error} />}
      {steps.length > 0 && (
        <ol className="space-y-2" aria-live="polite">
          {steps.map((s) => (
            <li key={s.label} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5"><StepIcon status={s.status} /></span>
              <span className={s.status ? undefined : 'text-muted-foreground'}>
                {s.label}
                {s.time && <span className="text-muted-foreground"> · {s.time}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {status?.providerError && <p className="text-sm text-destructive">{status.providerError}</p>}
      {status?.sdiReply && (
        <div className="space-y-1 rounded-lg border p-3 text-sm">
          <p className="font-medium">{status.sdiReply.subject ?? 'Messaggio dello SDI'}</p>
          <p className="text-muted-foreground">Da {status.sdiReply.from}</p>
          {status.sdiReply.text && <p className="whitespace-pre-line">{status.sdiReply.text}</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invia PEC di prova allo SDI</DialogTitle>
            <DialogDescription>Parte un messaggio PEC vero, senza allegati, verso {recipient}. Non contiene fatture e non emette nulla; lo SDI risponde con un messaggio di cortesia.</DialogDescription>
          </DialogHeader>
          <ErrorAlert message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
            <Button type="button" disabled={pending} onClick={send}>{pending ? 'Invio in corso…' : 'Invia'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  );
}
