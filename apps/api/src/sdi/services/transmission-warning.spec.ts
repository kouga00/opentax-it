import { describe, expect, it } from 'vitest';
import type { SdiTransmission } from '../../generated/prisma/client.js';
import { transmissionWarning } from './transmission-warning.js';

const at = (iso: string) => new Date(iso);
const t = (data: Partial<SdiTransmission>) => ({ status: 'SENT', createdAt: at('2026-09-20T10:00:00Z'), sentAt: at('2026-09-20T10:00:00Z'), ...data }) as SdiTransmission;

describe('transmissionWarning', () => {
  it('warns about a transmission left PENDING, probably interrupted', () => {
    expect(transmissionWarning(t({ status: 'PENDING', sentAt: null }), at('2026-09-20T10:30:00Z'))).toContain('non confermato');
    expect(transmissionWarning(t({ status: 'PENDING', sentAt: null }), at('2026-09-20T10:05:00Z'))).toBeNull();
  });

  it('warns after 5 days without an SDI outcome (Spec. 1.9.1 §1.6)', () => {
    expect(transmissionWarning(t({ status: 'DELIVERED_TO_SDI' }), at('2026-09-26T10:00:00Z'))).toContain('5 giorni');
    expect(transmissionWarning(t({ status: 'DELIVERED_TO_SDI' }), at('2026-09-24T10:00:00Z'))).toBeNull();
  });

  it('says nothing once SDI answered or the send failed', () => {
    for (const status of ['SDI_DELIVERED', 'SDI_NOT_DELIVERED', 'SDI_REJECTED', 'ERROR'] as const) expect(transmissionWarning(t({ status }), at('2026-12-01T00:00:00Z'))).toBeNull();
  });
});
