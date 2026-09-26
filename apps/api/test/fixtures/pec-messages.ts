import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MailComposer from 'nodemailer/lib/mail-composer';

/**
 * Test messages built with the headers and attachments the PEC technical rules prescribe (Regole tecniche PEC,
 * §6.3.3 receipts, §6.3.4 transport envelope, §7.3-7.4 attachments), with the official SDI receipt examples. No
 * official sample of a whole PEC message is published. Used only by the tests.
 */

// The package entry is dist/index.js; the official examples sit in its schemas folder.
const fatturapaDir = join(dirname(fileURLToPath(import.meta.resolve('@opentax-it/fatturapa'))), '..');
export const officialReceipt = (name: string) => readFileSync(join(fatturapaDir, 'schemas', 'messaggi', name));

const build = (mail: ConstructorParameters<typeof MailComposer>[0]) => new MailComposer(mail).compile().build();

const daticert = (tipo: string, mittente: string, extra = '') => `<?xml version="1.0" encoding="UTF-8"?>
<postacert tipo="${tipo}" errore="nessuno"><intestazione><mittente>${mittente}</mittente><destinatari tipo="certificato">mario.rossi@pec.example.it</destinatari><risposte>${mittente}</risposte><oggetto>Esito</oggetto></intestazione>
<dati><gestore-emittente>Gestore</gestore-emittente><data zona="+0200"><giorno>26/09/2026</giorno><ora>10:20:00</ora></data><identificativo>opec-1@pec.example.it</identificativo>${extra}</dati></postacert>`;

/** Receipt of our own provider about our message (§6.3.3 acceptance, §6.5.2 delivery, §6.5.3 delivery error). */
export function providerReceipt(type: string, originalMessageId: string, fileName = 'IT01234567890_11111.xml.p7m') {
  const prefix = { accettazione: 'ACCETTAZIONE', 'avvenuta-consegna': 'CONSEGNA', 'errore-consegna': 'ERRORE DI CONSEGNA' }[type] ?? type.toUpperCase();
  return build({
    from: 'posta-certificata@pec.example.it',
    to: 'mario.rossi@pec.example.it',
    subject: `${prefix}: ${fileName}`,
    headers: { 'X-Ricevuta': type, 'X-Riferimento-Message-ID': `<${originalMessageId}>` },
    text: 'Ricevuta',
    attachments: [{ filename: 'daticert.xml', content: daticert(type, 'mario.rossi@pec.example.it', `<msgid>&lt;${originalMessageId}&gt;</msgid>`), contentType: 'application/xml' }],
  });
}

/** Transport envelope of a message whose certified sender is `certifiedSender`, carrying an SDI receipt. */
export async function sdiEnvelope(certifiedSender: string, receiptFile = 'IT01234567890_11111_RC_001.xml', from = 'sdi27@pec.fatturapa.it') {
  const original = await build({ from, to: 'mario.rossi@pec.example.it', subject: 'Ricevuta', text: 'Ricevuta', attachments: [{ filename: receiptFile, content: officialReceipt(receiptFile), contentType: 'application/xml' }] });
  return build({
    from: `"Per conto di: ${from}" <posta-certificata@pec.example.it>`,
    to: 'mario.rossi@pec.example.it',
    subject: 'POSTA CERTIFICATA: Ricevuta',
    headers: { 'X-Trasporto': 'posta-certificata' },
    text: 'Messaggio di posta certificata',
    attachments: [
      { filename: 'daticert.xml', content: daticert('posta-certificata', certifiedSender), contentType: 'application/xml' },
      { filename: 'postacert.eml', content: original, contentType: 'message/rfc822' },
    ],
  });
}

export const ordinaryMail = () => build({ from: 'amico@example.it', to: 'mario.rossi@pec.example.it', subject: 'Ciao', text: 'ciao' });
