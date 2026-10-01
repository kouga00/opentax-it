import { describe, expect, it } from 'vitest';
import { EU_MEMBER_STATES, isEuMemberState } from './eu';

describe('EU member states', () => {
  it('lists the 26 foreign member states, with Greece under both GR and EL', () => {
    expect(EU_MEMBER_STATES.size).toBe(27); // 27 members - Italy + EL alias
    expect(isEuMemberState('DE')).toBe(true);
    expect(isEuMemberState('el')).toBe(true);
    expect(isEuMemberState('GR')).toBe(true);
  });

  it('treats the United Kingdom and Northern Ireland as non-EU for services, and excludes Italy', () => {
    expect(isEuMemberState('GB')).toBe(false);
    expect(isEuMemberState('XI')).toBe(false);
    expect(isEuMemberState('IT')).toBe(false);
    expect(isEuMemberState('US')).toBe(false);
  });
});
