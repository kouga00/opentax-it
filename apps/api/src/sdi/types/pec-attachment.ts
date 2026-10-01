/** File attached to a message sent to SDI. */
export interface PecAttachment {
  fileName: string;
  content: Buffer;
}
