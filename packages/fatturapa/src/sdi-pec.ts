/**
 * SDI "servizio PEC" (Allegato A, Specifiche tecniche FatturaPA 1.9.1, §1.3.1): the file is the attachment of a PEC
 * message sent from a mailbox of a provider in the AgID public list.
 */

/** "La prima volta che il soggetto trasmittente invia una fattura tramite la PEC, deve utilizzare [...] sdi01@pec.fatturapa.it" (§1.3.1). */
export const SDI_FIRST_PEC_ADDRESS = 'sdi01@pec.fatturapa.it';

/** "Il singolo file fattura non può superare la dimensione di 5MB" (§1.3.1). */
export const SDI_MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface PecProvider {
  id: string;
  name: string;
  smtpHost: string;
  imapHost: string;
  /** All presets use implicit SSL/TLS on these ports. */
  smtpPort: number;
  imapPort: number;
  /** Shown next to the login field when it is not the PEC address. */
  usernameHint?: string;
  /** Shown next to the password field. */
  passwordHint?: string;
  /** Official page of the provider with the parameters, and the day they were read. */
  sourceUrl: string;
  verifiedOn: string;
}

/**
 * Connection parameters of PEC providers in the AgID list, from the providers' own pages (read on 26/09/2026).
 * Left out: Register.it, missing from the AgID list of active providers although its operating manual declares it
 * a PEC provider (to be verified), and Namirial, whose servers are not on a reachable official page. Both can be
 * configured by hand as "OTHER".
 */
export const PEC_PROVIDERS: readonly PecProvider[] = [
  {
    id: 'aruba',
    name: 'Aruba PEC',
    smtpHost: 'smtps.pec.aruba.it',
    imapHost: 'imaps.pec.aruba.it',
    smtpPort: 465,
    imapPort: 993,
    passwordHint: 'Con la verifica in due passaggi attiva serve una password dedicata ai programmi di posta, da generare nel pannello Aruba.',
    sourceUrl: 'https://guide.aruba.it/pec/configurazione-programmi-di-posta/client-posta-e-dispositivi-mobili',
    verifiedOn: '2026-09-26',
  },
  {
    id: 'postecert',
    name: 'Poste Italiane (postecert.it)',
    smtpHost: 'mail.postecert.it',
    imapHost: 'mail.postecert.it',
    smtpPort: 465,
    imapPort: 993,
    sourceUrl: 'https://postecert.poste.it/pec/configurazione.shtml',
    verifiedOn: '2026-09-26',
  },
  {
    id: 'postecertifica',
    name: 'Postel (postecertifica.it)',
    smtpHost: 'mail.postecertifica.it',
    imapHost: 'mail.postecertifica.it',
    smtpPort: 465,
    imapPort: 993,
    passwordHint: 'Serve la password per i programmi di posta, generata a parte: scade ogni 90 giorni.',
    sourceUrl: 'https://www.media.poste.it/b22c9cf8-0d42-47ce-808a-205c84215064/file/pec_postecertifica_manuale_operativo',
    verifiedOn: '2026-09-26',
  },
  {
    id: 'legalmail',
    name: 'InfoCert Legalmail',
    smtpHost: 'sendm.cert.legalmail.it',
    imapHost: 'mbox.cert.legalmail.it',
    smtpPort: 465,
    imapPort: 993,
    usernameHint: 'Con Legalmail si accede con lo User ID, non con l\'indirizzo PEC.',
    sourceUrl: 'https://help.infocert.it/home/guida/guida-alla-configurazione-legalmail---apple-mail?lang=it',
    verifiedOn: '2026-09-26',
  },
];

/** Provider id for servers entered by hand. */
export const OTHER_PEC_PROVIDER = 'OTHER';

export const pecProvider = (id: string | null | undefined): PecProvider | undefined => PEC_PROVIDERS.find((p) => p.id === id);
