import { Circle, CircleCheck, CircleMinus, CircleX, Loader2 } from 'lucide-react';
import type { PecTestStepStatus } from '@/lib/types';

/** Status icon of a step of the PEC checks: waiting, running, done, failed, skipped. */
export function StepIcon({ status }: { status?: PecTestStepStatus }) {
  return (
    <>
      <Icon status={status} />
      <span className="sr-only">{STATUS_TEXT[status ?? 'WAITING']}: </span>
    </>
  );
}

/** What screen readers say in place of the icon, which is only visual. */
const STATUS_TEXT: Record<PecTestStepStatus | 'WAITING', string> = { WAITING: 'In attesa', RUNNING: 'In corso', OK: 'Riuscito', FAILED: 'Non riuscito', SKIPPED: 'Saltato' };

function Icon({ status }: { status?: PecTestStepStatus }) {
  if (status === 'RUNNING') return <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />;
  if (status === 'OK') return <CircleCheck aria-hidden className="size-4 text-green-600" />;
  if (status === 'FAILED') return <CircleX aria-hidden className="size-4 text-destructive" />;
  if (status === 'SKIPPED') return <CircleMinus aria-hidden className="size-4 text-muted-foreground" />;
  return <Circle aria-hidden className="size-4 text-muted-foreground/50" />;
}

