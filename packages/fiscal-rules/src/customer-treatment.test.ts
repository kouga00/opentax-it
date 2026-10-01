import { describe, expect, it } from 'vitest';
import { customerTreatment } from './customer-treatment';
import { ruleSet2026 } from './rule-sets/2026';

describe('customerTreatment (DPR 633/72 art. 7-ter, 7-septies, 21 par. 6-bis)', () => {
  it('EU taxable person: N2.1, "inversione contabile", INVCONT, Intrastat', () => {
    expect(customerTreatment(ruleSet2026, 'EU')).toEqual({ foreign: true, nature: 'N2.1', annotation: 'inversione contabile', reverseChargeLines: true, intrastat: true, legalReference: 'Art. 7-ter DPR 633/72' });
  });

  it('non-EU taxable person: N2.1, "operazione non soggetta", no INVCONT nor Intrastat', () => {
    expect(customerTreatment(ruleSet2026, 'NON_EU')).toMatchObject({ nature: 'N2.1', annotation: 'operazione non soggetta', reverseChargeLines: false, intrastat: false });
  });

  it('EU private customer: made in Italy (art. 7-ter par. 1 lett. b), N2.2 like a domestic one', () => {
    expect(customerTreatment(ruleSet2026, 'EU_B2C')).toEqual({ foreign: true, nature: 'N2.2', reverseChargeLines: false, intrastat: false, legalReference: 'Art. 1, commi 54-89, L. 190/2014' });
  });

  it('non-EU private customer: N2.1 only for art. 7-septies services, otherwise N2.2', () => {
    expect(customerTreatment(ruleSet2026, 'NON_EU_B2C', true)).toMatchObject({ nature: 'N2.1', annotation: 'operazione non soggetta', legalReference: 'Art. 7-septies DPR 633/72' });
    const other = customerTreatment(ruleSet2026, 'NON_EU_B2C', false);
    expect(other).toMatchObject({ foreign: true, nature: 'N2.2' });
    expect(other.annotation).toBeUndefined();
  });

  it('Italian customers: N2.2, not foreign', () => {
    expect(customerTreatment(ruleSet2026, 'IT_B2C')).toMatchObject({ foreign: false, nature: 'N2.2' });
  });
});
