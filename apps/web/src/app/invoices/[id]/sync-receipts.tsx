'use client';

import { useActionState } from 'react';
import { syncReceipts } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/error-alert';

/** "Controlla ricevute": reads the PEC mailbox now instead of waiting for the periodic check. */
export function SyncReceipts({ id }: { id: string }) {
  const [state, action, pending] = useActionState(syncReceipts, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Controllo in corso…' : 'Controlla ricevute'}</Button>
      <ErrorAlert message={state?.error} />
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  );
}
