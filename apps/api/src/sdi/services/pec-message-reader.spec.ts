import { describe, expect, it } from 'vitest';
import { readPecMessage } from './pec-message-reader.js';
import { ordinaryMail, providerReceipt, sdiEnvelope } from '../../../test/fixtures/pec-messages.js';

describe('readPecMessage', () => {
  it('recognizes the provider acceptance receipt and the Message-ID of our message', async () => {
    expect(await readPecMessage(await providerReceipt('accettazione', 'abc@opentax.local', 'IT01234567890_00001.xml'))).toMatchObject({
      kind: 'provider-receipt', type: 'accettazione', originalMessageId: 'abc@opentax.local', originalSubject: 'IT01234567890_00001.xml', providerId: 'opec-1@pec.example.it',
    });
  });

  it('reads the SDI receipt from postacert.eml and the certified SDI address', async () => {
    expect(await readPecMessage(await sdiEnvelope('sdi27@pec.fatturapa.it'))).toMatchObject({
      kind: 'sdi-receipt', sdiAddress: 'sdi27@pec.fatturapa.it', receipts: [{ fileName: 'IT01234567890_11111_RC_001.xml', receipt: { type: 'RC', sdiId: '111' } }],
    });
  });

  it('ignores an envelope that claims to come from SDI but is certified as sent by someone else', async () => {
    expect(await readPecMessage(await sdiEnvelope('someone@pec.example.it'))).toEqual({ kind: 'other' });
  });

  it('ignores ordinary mail', async () => {
    expect(await readPecMessage(await ordinaryMail())).toEqual({ kind: 'other' });
  });
});
