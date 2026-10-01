import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectTenantDto {
  @ApiProperty({ example: 'cuid12345678901234567890', description: 'ID della partita IVA da selezionare' })
  @IsString({ message: 'Seleziona una partita IVA' })
  @IsNotEmpty({ message: 'Seleziona una partita IVA' })
  tenantId!: string;
}
