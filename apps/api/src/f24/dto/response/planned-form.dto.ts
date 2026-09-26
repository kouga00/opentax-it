import { ApiProperty } from '@nestjs/swagger';
import { F24LineDto } from './f24-line.dto.js';

/** A form of a plan preview, not saved yet. */
export class PlannedFormDto {
  @ApiProperty({ description: 'Tipo di modello (saldo e primo acconto, rata, secondo acconto, compensazione)' }) kind!: string;
  @ApiProperty({ description: 'Data di versamento (AAAA-MM-GG), spostata al primo giorno feriale' }) paymentDate!: string;
  @ApiProperty({ description: 'Scadenza nominale (AAAA-MM-GG), su cui si calcolano gli interessi' }) nominalPaymentDate!: string;
  @ApiProperty({ type: Number, nullable: true }) installmentNumber!: number | null;
  @ApiProperty({ type: Number, nullable: true }) installmentsTotal!: number | null;
  @ApiProperty() totalDebit!: number;
  @ApiProperty() totalCredit!: number;
  @ApiProperty({ description: 'Ultimo giorno per revocare un addebito programmato (I24), AAAA-MM-GG' }) i24CancelBy!: string;
  @ApiProperty({ type: [F24LineDto] }) lines!: F24LineDto[];
}
