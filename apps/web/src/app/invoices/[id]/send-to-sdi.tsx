'use client';

import { useActionState } from 'react';
import { sendToSdi } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/error-alert';

/** There is no test environment for the PEC channel: every transmission is real, hence the confirmation. */
const CONFIRM = 'Inviare la fattura allo SDI? L\'invio è reale: se lo SDI la accetta la fattura è emessa a tutti gli effetti.';

export function SendToSdi({ id, recipient }: { id: string; recipient: string }) {
  const [state, action, pending] = useActionState(sendToSdi, undefined);
  return (
    <form action={action} className="space-y-3">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending} onClick={(e) => { if (!window.confirm(`${CONFIRM}\n\nDestinatario: ${recipient}`)) e.preventDefault(); }}>
        {pending ? 'Invio…' : 'Invia allo SDI'}
      </Button>
    </form>
  );
}
