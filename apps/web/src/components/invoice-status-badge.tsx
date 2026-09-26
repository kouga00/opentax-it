import type { InvoiceStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * The invoice is issued only when SDI delivers it (Consegnata) or makes it available to the customer (Messa a
 * disposizione, MC); a rejection means it was never issued (Spec. 1.9.1 §1.6). Before sending it is numbered with
 * its XML ready: "Da inviare".
 */
export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Bozza',
  ISSUED: 'Da inviare',
  SENT: 'Inviata allo SDI',
  DELIVERED: 'Consegnata',
  NOT_DELIVERED: 'Messa a disposizione',
  REJECTED: 'Scartata',
  CANCELLED: 'Annullata',
};

/**
 * One color per state along the SDI flow: neutral while in progress, blue once issued and sent,
 * green when delivered, amber when it needs a check (made available on the portal), red when rejected.
 */
const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  DRAFT: 'border-dashed border-border text-muted-foreground',
  ISSUED: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  SENT: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  DELIVERED: 'bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  NOT_DELIVERED: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  REJECTED: 'bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
};

/** Imported invoices were issued and sent with another tool: shown as such instead of "Da inviare". */
export function InvoiceStatusBadge({ status, imported, className }: { status: InvoiceStatus; imported?: boolean; className?: string }) {
  if (imported && status === 'ISSUED') return <Badge variant="outline" className={cn('border-transparent bg-muted text-muted-foreground', className)}>Importata</Badge>;
  return <Badge variant="outline" className={cn(STATUS_CLASSES[status], status !== 'DRAFT' && 'border-transparent', className)}>{STATUS_LABELS[status]}</Badge>;
}
