import { randomUUID } from 'node:crypto';

/**
 * Message-ID for a message we send, without angle brackets, chosen before sending and saved: the provider replaces it
 * with its own and keeps ours in X-Riferimento-Message-ID of every receipt (Regole tecniche PEC §6.3).
 */
export const newPecMessageId = (senderAddress: string): string => `${randomUUID()}@${senderAddress.split('@')[1]}`;
