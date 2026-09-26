import { describe, expect, it } from 'vitest';
import type { SdiReceipt } from '@opentax-it/fatturapa';
import { providerReceiptTransition, sdiReceiptTransition } from './transmission-transitions.js';

const receipt = (type: SdiReceipt['type'], errors: SdiReceipt['errors'] = []): SdiReceipt => ({ type, sdiId: '111', fileName: 'x.xml', receivedAt: '2026-09-26T10:00:00Z', errors, messageId: '1' });
const at = new Date('2026-09-26T10:05:00Z');

describe('sdiReceiptTransition (Spec. 1.9.1 §1.5.7)', () => {
  it('RC delivers, MC makes available, NS rejects with the error codes', () => {
    expect(sdiReceiptTransition(receipt('RC'))).toEqual({ transmission: { status: 'SDI_DELIVERED', sdiId: '111' }, invoice: 'DELIVERED' });
    expect(sdiReceiptTransition(receipt('MC'))).toEqual({ transmission: { status: 'SDI_NOT_DELIVERED', sdiId: '111' }, invoice: 'NOT_DELIVERED' });
    expect(sdiReceiptTransition(receipt('NS', [{ code: '00404', description: 'Fattura duplicata' }]))).toEqual({
      transmission: { status: 'SDI_REJECTED', sdiId: '111', lastError: '00404 Fattura duplicata' }, invoice: 'REJECTED',
    });
  });
});

describe('providerReceiptTransition (Regole tecniche PEC §6.3.3, §6.5)', () => {
  it('acceptance closes a PENDING transmission and keeps the provider id', () => {
    expect(providerReceiptTransition({ status: 'PENDING', sentAt: null }, { type: 'accettazione', providerId: 'p1' }, at)).toEqual({
      transmission: { status: 'ACCEPTED_BY_PEC', sentAt: at, pecProviderId: 'p1' },
    });
  });

  it('delivery to SDI moves forward, never backward', () => {
    expect(providerReceiptTransition({ status: 'ACCEPTED_BY_PEC', sentAt: at }, { type: 'avvenuta-consegna' }, at)?.transmission.status).toBe('DELIVERED_TO_SDI');
    expect(providerReceiptTransition({ status: 'DELIVERED_TO_SDI', sentAt: at }, { type: 'accettazione' }, at)).toBeUndefined();
  });

  it('a delivery error reopens the invoice', () => {
    expect(providerReceiptTransition({ status: 'SENT', sentAt: at }, { type: 'errore-consegna', error: 'no-dest' }, at)).toEqual({
      transmission: { status: 'ERROR', lastError: 'Il messaggio non è stato consegnato alla casella dello SDI. no-dest' }, invoice: 'REOPEN',
    });
  });

  it('nothing overrides the SDI outcome, and warnings only get recorded', () => {
    expect(providerReceiptTransition({ status: 'SDI_DELIVERED', sentAt: at }, { type: 'errore-consegna' }, at)).toBeUndefined();
    expect(providerReceiptTransition({ status: 'SENT', sentAt: at }, { type: 'preavviso-errore-consegna' }, at)).toBeUndefined();
  });
});
