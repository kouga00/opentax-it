import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';

export class TenantSummaryResponseDto {
  @ApiProperty({ example: 'cm98765432109876543210987', description: 'Identificativo della partita IVA' })
  id!: string;

  @ApiProperty({ example: 'Mario Rossi Architetto', description: 'Denominazione o nome della partita IVA' })
  name!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.TENANT_ADMIN, description: 'Ruolo dell\'utente all\'interno della partita IVA' })
  role!: string;
}
