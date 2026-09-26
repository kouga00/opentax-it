/** An open SMTP connection, before login: lets the connection test report the two steps separately. */
export interface SmtpSession {
  login(): Promise<void>;
  close(): void;
}
