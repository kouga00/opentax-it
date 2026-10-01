import type { FiscalRuleSet } from '../rule-set.js';
import { ruleSet2025 } from './2025.js';
import { ruleSet2026 } from './2026.js';

/** Rule sets shipped with the code, oldest first: the API seeds them as drafts, the documentation shows their F24 codes. */
export const bundledRuleSets: readonly FiscalRuleSet[] = [ruleSet2025, ruleSet2026];
