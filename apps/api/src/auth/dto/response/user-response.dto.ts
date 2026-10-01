import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';
import { TenantSummaryResponseDto } from './tenant-summary-response.dto.js';

export class UserResponseDto {
  @ApiProperty({ example: 'cm12345678901234567890123', description: 'Identificativo univoco dell\'utente' })
  id!: string;

  @ApiProperty({ example: 'mario.rossi@example.com', description: 'Indirizzo email dell\'utente' })
  email!: string;

  @ApiPropertyOptional({ example: 'Mario Rossi', nullable: true, description: 'Nome completo dell\'utente' })
  name!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.TENANT_USER, description: 'Ruolo dell\'utente sulla piattaforma' })
  role!: string;

  @ApiPropertyOptional({ example: 'cm98765432109876543210987', nullable: true, description: 'Identificativo della partita IVA attualmente attiva' })
  activeTenantId!: string | null;

  @ApiProperty({ type: () => [TenantSummaryResponseDto], description: 'Elenco delle partite IVA associate all\'utente' })
  tenants!: TenantSummaryResponseDto[];
}
