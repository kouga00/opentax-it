import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import type { StorageService } from '../../storage/storage.service.js';
import { F24PdfService, type F24PrintData } from './f24-pdf.service.js';

const data: F24PrintData = { fiscalCode: 'RSSMRA80A01H501U', name: 'Rossi', city: 'Roma', province: 'RM', address: 'Via Roma 1', lines: [] };

describe('F24PdfService model check', () => {
  afterEach(() => {
    delete process.env.F24_MODEL_ALLOW_UNVERIFIED;
  });

  it('refuses a model whose SHA-256 differs from the calibrated one', async () => {
    const storage = { read: vi.fn().mockResolvedValue(Buffer.from('not the official model')), write: vi.fn() } as unknown as StorageService;
    await expect(new F24PdfService(storage).render(data)).rejects.toThrow(UnprocessableEntityException);
  });

  it('only logs the mismatch when F24_MODEL_ALLOW_UNVERIFIED=true', async () => {
    process.env.F24_MODEL_ALLOW_UNVERIFIED = 'true';
    const storage = { read: vi.fn().mockResolvedValue(Buffer.from('not the official model')), write: vi.fn() } as unknown as StorageService;
    // Past the check, loading the fake bytes as a PDF fails: a different error than the hash one.
    await expect(new F24PdfService(storage).render(data)).rejects.not.toThrow(UnprocessableEntityException);
  });
});
