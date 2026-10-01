import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { SaveCustomerDto } from '../dto/request/save-customer.dto.js';
import { CustomersService } from './customers.service.js';

const base = { businessName: 'Acme Ltd', vatNumber: '123456789', address: '1 High St', city: 'London' };

function service() {
  const create = vi.fn().mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data));
  return { svc: new CustomersService({ customer: { create } } as unknown as PrismaService), create };
}

describe('CustomersService kind and country', () => {
  it('refuses a United Kingdom or Northern Ireland customer created as EU', async () => {
    const { svc } = service();
    for (const countryCode of ['GB', 'XI']) {
      await expect(svc.create('t1', { ...base, kind: 'EU', countryCode } as SaveCustomerDto)).rejects.toThrow(BadRequestException);
    }
  });

  it('accepts them as NON_EU, with XXXXXXX and CAP 00000', async () => {
    const { svc } = service();
    const c = await svc.create('t1', { ...base, kind: 'NON_EU', countryCode: 'GB' } as SaveCustomerDto);
    expect(c).toMatchObject({ kind: 'NON_EU', countryCode: 'GB', recipientCode: 'XXXXXXX', postalCode: '00000' });
  });

  it('refuses an EU member state created as NON_EU and accepts it as EU', async () => {
    const { svc } = service();
    await expect(svc.create('t1', { ...base, kind: 'NON_EU', countryCode: 'DE' } as SaveCustomerDto)).rejects.toThrow("è uno Stato membro dell'UE");
    await expect(svc.create('t1', { ...base, kind: 'EU', countryCode: 'DE' } as SaveCustomerDto)).resolves.toMatchObject({ kind: 'EU' });
  });
});
