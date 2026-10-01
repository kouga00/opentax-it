import { Info } from 'lucide-react';
import { SOCIAL_SECURITY_SCHEME_LABELS } from '@/lib/social-security-schemes';
import type { SocialSecurityScheme } from '@/lib/types';

/**
 * Contributions are computed for the INPS schemes (packages/fiscal-rules/src/contribution-schemes.ts), not for the
 * professional funds: for them the app says so where contributions are computed or paid.
 */
export function InpsScopeNote({ scheme }: { scheme: SocialSecurityScheme | undefined }) {
  if (scheme !== 'PROFESSIONAL_FUND') return null;
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Nel profilo hai scelto <strong className="font-medium text-foreground">{SOCIAL_SECURITY_SCHEME_LABELS[scheme]}</strong>: OpenTax IT non calcola i contributi delle casse, quindi qui non trovi contributi né scadenze della cassa. Le righe F24 che ti comunica la cassa si inseriscono nella pagina F24; i contributi versati altrimenti indicali in &quot;Contributi previdenziali versati&quot; nella pagina Imposte, perché si deducono dal reddito (rigo LM35).
      </span>
    </p>
  );
}
