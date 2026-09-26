import { describe, expect, it, vi } from 'vitest';
import type { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import type { PaymentsService } from '../../payments/services/payments.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';
import { TaxesService } from './taxes.service.js';

describe('TaxesService.paidFromF24', () => {
  it('excludes the deferral surcharge from the advances carried to the return (LM45)', async () => {
    const findMany = vi
      .fn()
      // advances for the year: 1790 with 2 of surcharge inside, INPS acconto (surcharge already on DPPI)
      .mockResolvedValueOnce([
        { section: 'TREASURY', debitAmount: '502.00', surchargeAmount: '2.00' },
        { section: 'INPS', debitAmount: '500.00', surchargeAmount: '0.00' },
      ])
      // INPS contributions paid in the year
      .mockResolvedValueOnce([{ debitAmount: '500.00', surchargeAmount: '0.00' }]);
    const service = new TaxesService({ f24Line: { findMany } } as unknown as PrismaService, {} as FiscalRulesService, {} as PaymentsService, {} as TenantsService);

    await expect(service.paidFromF24('t1', 2026)).resolves.toEqual({ taxAdvancesPaid: 500, inpsAdvancesPaid: 500, contributionsPaid: 500 });
  });
});
