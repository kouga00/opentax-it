import { describe, expect, it } from 'vitest';
import { normalizeMessageId, parsePecCertificationData } from './pec-daticert.js';

// Built on the DTD of the "dati di certificazione" (Regole tecniche PEC, §7.4): no official sample file is published.
const ACCEPTANCE = `<?xml version="1.0" encoding="UTF-8"?>
<postacert tipo="accettazione" errore="nessuno">
  <intestazione>
    <mittente>mario.rossi@pec.example.it</mittente>
    <destinatari tipo="certificato">sdi01@pec.fatturapa.it</destinatari>
    <risposte>mario.rossi@pec.example.it</risposte>
    <oggetto>IT01234567890_00001.xml</oggetto>
  </intestazione>
  <dati>
    <gestore-emittente>Gestore di prova</gestore-emittente>
    <data zona="+0200"><giorno>26/09/2026</giorno><ora>10:15:00</ora></data>
    <identificativo>opec123.20260926101500.00001.01.1.1@pec.example.it</identificativo>
    <msgid>&lt;abc@opentax.local&gt;</msgid>
  </dati>
</postacert>`;

describe('parsePecCertificationData (Regole tecniche PEC, §7.4)', () => {
  it('reads type, certified sender, provider id and the original Message-ID', () => {
    expect(parsePecCertificationData(ACCEPTANCE)).toEqual({
      type: 'accettazione',
      error: 'nessuno',
      sender: 'mario.rossi@pec.example.it',
      recipients: ['sdi01@pec.fatturapa.it'],
      subject: 'IT01234567890_00001.xml',
      providerId: 'opec123.20260926101500.00001.01.1.1@pec.example.it',
      originalMessageId: 'abc@opentax.local',
      date: { day: '26/09/2026', time: '10:15:00', zone: '+0200' },
      extendedError: undefined,
    });
  });

  it('refuses other XML and unknown types', () => {
    expect(() => parsePecCertificationData('<FatturaElettronica/>')).toThrow('postacert');
    expect(() => parsePecCertificationData('<postacert tipo="altro"><intestazione/><dati/></postacert>')).toThrow('Unknown');
  });

  it('compares Message-IDs without angle brackets', () => {
    expect(normalizeMessageId(' <a@b> ')).toBe('a@b');
    expect(normalizeMessageId('a@b')).toBe('a@b');
    expect(normalizeMessageId('')).toBeUndefined();
  });
});
