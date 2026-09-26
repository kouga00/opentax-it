/** Everything needed to open the PEC mailbox: servers of the preset or entered by hand, login and decrypted password. */
export interface PecConnection {
  address: string;
  username: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
}
