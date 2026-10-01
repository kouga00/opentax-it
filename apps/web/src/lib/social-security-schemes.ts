import type { SocialSecurityScheme, TenantProfile } from './types';

/** Italian names of the social security schemes, in the order of the profile form. */
export const SOCIAL_SECURITY_SCHEME_LABELS: Record<SocialSecurityScheme, string> = {
  INPS_SEPARATE: 'INPS Gestione Separata',
  INPS_ARTISANS: 'INPS Artigiani',
  INPS_TRADERS: 'INPS Commercianti',
  PROFESSIONAL_FUND: 'Cassa professionale',
};

/**
 * Schemes that can be chosen in the profile: the ones OpenTax IT integrates. The professional funds come later, one fund
 * at a time (TODO.md, epic "Gestione INPS Artigiani e Commercianti"); a profile that already has it keeps it.
 */
export const SELECTABLE_SCHEMES: ReadonlySet<SocialSecurityScheme> = new Set(['INPS_SEPARATE', 'INPS_ARTISANS', 'INPS_TRADERS']);

/** The professional fund contribution of the profile, when the scheme is a professional fund and fund and rate are set. */
export function professionalFundOf(profile: TenantProfile | undefined): { type: string; ratePct: number } | undefined {
  if (profile?.socialSecurityScheme !== 'PROFESSIONAL_FUND' || !profile.professionalFundType || !profile.professionalFundRatePct) return undefined;
  return { type: profile.professionalFundType, ratePct: Number(profile.professionalFundRatePct) };
}
