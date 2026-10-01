/** An invoice whose collection falls in a year other than its issue year, with the part of the revenue concerned (EUR). */
export interface RevenueDifference {
  invoiceId: string;
  number: string;
  date: string;
  customer: string;
  amount: number;
}
