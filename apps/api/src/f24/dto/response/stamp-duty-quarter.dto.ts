import { ApiProperty } from '@nestjs/swagger';
import { StampDutyF24RefDto } from './stamp-duty-f24-ref.dto.js';

/** A quarter of the stamp duty on e-invoices. */
export class StampDutyQuarterDto {
  @ApiProperty() year!: number;
  @ApiProperty() quarter!: number;
  @ApiProperty({ description: 'Codice tributo (2521-2524)' }) taxCode!: string;
  @ApiProperty({ description: 'Stima dalle fatture con bollo virtuale' }) estimatedAmount!: number;
  @ApiProperty({ description: 'La stima conta fatture senza data di consegna SDI' }) estimated!: boolean;
  @ApiProperty({ type: Number, nullable: true, description: "Importo dell'Agenzia delle Entrate, se salvato" }) dueAmount!: number | null;
  @ApiProperty({ description: 'Scadenza del versamento (AAAA-MM-GG), con i differimenti' }) paymentDeadline!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Scadenza ordinaria, se differita' }) deferredFrom!: string | null;
  @ApiProperty({ type: String, nullable: true, description: "Ultimo giorno per modificare l'elenco B" }) listBChangesBy!: string | null;
  @ApiProperty({ type: String, nullable: true, description: "Giorno entro cui l'Agenzia mostra l'importo dovuto" }) amountAvailableOn!: string | null;
  @ApiProperty({ type: StampDutyF24RefDto, nullable: true }) f24!: StampDutyF24RefDto | null;
  @ApiProperty({ type: String, nullable: true, description: 'Pagato dal portale Fatture e corrispettivi (AAAA-MM-GG)' }) paidOnPortal!: string | null;
}
