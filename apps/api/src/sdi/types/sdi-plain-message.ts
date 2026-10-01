/**
 * A PEC message certified as sent by SDI that carries no receipt, such as the "messaggio di cortesia" SDI sends when a
 * PEC without attachment reaches it (Spec. 1.9.1 §1.3.1). No official source describes its content: it is shown to
 * the user as it is (sender, subject, start of the text), never interpreted.
 */
export interface SdiPlainMessage {
  kind: 'sdi-message';
  /** Certified sender (daticert.xml "mittente"). */
  sdiAddress: string;
  subject?: string;
  date?: string;
  /** Start of the text of the original message, for the user. */
  text?: string;
}
