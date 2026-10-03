import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateTenantProfileDto } from './tenants.dto.js';

const errorsFor = (body: object) => validateSync(plainToInstance(UpdateTenantProfileDto, body)).map((e) => e.property);

describe('UpdateTenantProfileDto', () => {
  it('accepts an empty INPS office, sent by the profile form when it is not set', () => {
    expect(errorsFor({ inpsOfficeId: '' })).toEqual([]);
  });

  it('accepts an INPS office id', () => {
    expect(errorsFor({ inpsOfficeId: '1300-milano' })).toEqual([]);
  });

  it('rejects a malformed INPS office id', () => {
    expect(errorsFor({ inpsOfficeId: 'milano' })).toEqual(['inpsOfficeId']);
  });
});
