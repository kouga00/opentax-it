import { IsString, Matches } from 'class-validator';

export class ExchangeRateQuery {
  @IsString() @Matches(/^[A-Za-z]{3}$/) currency!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
}
