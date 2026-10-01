/** A return marked as filed, with the credits it put in the credit registry. */
export interface FiledReturn {
  filedOn: string;
  credits: Array<{ id: string; section: string; code: string; referenceYear: number; amount: number }>;
}
