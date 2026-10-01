import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';
import { F24TelematicFileService } from './f24-telematic-file.service.js';

// Invented taxpayer and INPS code.
const profile = { fiscalCode: 'RSSMRA80A01H501U', lastName: 'Rossi', firstName: 'Mario', sex: 'M', birthDate: new Date('1980-01-01T00:00:00Z'), birthPlace: 'Roma', birthProvince: 'RM' };
const line = (section: string, code: string, amount: number) => ({ section, code, localCode: null, officeCode: section === 'INPS' ? '5100' : null, installmentCode: section === 'TREASURY' ? '0101' : null, positionCode: section === 'INPS' ? '12345678901234567' : null, periodFrom: section === 'INPS' ? '01/2026' : null, periodTo: section === 'INPS' ? '12/2026' : null, referenceYear: 2025, debitAmount: amount, creditAmount: 0 });

function service(forms: unknown[], p: object = profile) {
  const findMany = vi.fn().mockResolvedValue(forms);
  const prisma = { f24: { findMany }, bankAccount: { findFirst: vi.fn().mockResolvedValue({ iban: 'IT60X0542811101000000123456' }) } } as unknown as PrismaService;
  const tenants = { getWithProfile: vi.fn().mockResolvedValue({ profile: p }) } as unknown as TenantsService;
  return { findMany, service: new F24TelematicFileService(prisma, tenants) };
}

describe('F24TelematicFileService', () => {
  it('puts every form still to pay on the date in one file, named after the date', async () => {
    const { service: s, findMany } = service([{ lines: [line('TREASURY', '1790', 100)] }, { lines: [line('INPS', 'AF', 50)] }]);
    const { fileName, content } = await s.file('t1', '2026-11-16');
    expect(fileName).toBe('F24_2026-11-16.txt');
    expect(content.split('\r\n').slice(0, -1).map((r) => r[0])).toEqual(['A', 'M', 'V', 'V', 'Z']);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1', status: 'PLANNED' }) }));
  });

  it('explains what is missing: forms on the date, birth data, sections not written yet', async () => {
    await expect(service([]).service.file('t1', '2026-11-16')).rejects.toThrow(NotFoundException);
    await expect(service([{ lines: [line('TREASURY', '1790', 100)] }], { ...profile, birthDate: null }).service.file('t1', '2026-11-16')).rejects.toThrow('completali nel profilo fiscale');
    await expect(service([{ lines: [line('OTHER_ENTITY', 'E102', 100)] }]).service.file('t1', '2026-11-16')).rejects.toThrow(BadRequestException);
  });
});
