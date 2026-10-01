import { ApiProperty } from '@nestjs/swagger';
import { PaymentDto } from './payment.dto.js';

export class InvoiceCollectionDto {
  @ApiProperty() invoiceId!: string;
  @ApiProperty({ example: 'EUR' }) currency!: string;
  @ApiProperty({ description: 'Totale del documento' }) total!: number;
  @ApiProperty({ description: 'Nota di credito: gli incassi sono rimborsi, registrati con importo negativo' }) refund!: boolean;
  @ApiProperty({ description: 'Già incassato (o rimborsato), in positivo' }) collected!: number;
  @ApiProperty({ description: 'Residuo: totale meno quanto già incassato' }) remaining!: number;
  @ApiProperty({ type: String, nullable: true, description: 'ModalitaPagamento indicata nel documento, es. MP05' }) paymentMethod!: string | null;
  @ApiProperty({ type: [PaymentDto] }) payments!: PaymentDto[];
}
