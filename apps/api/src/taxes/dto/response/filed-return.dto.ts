import { ApiProperty } from '@nestjs/swagger';
import { FiledCreditDto } from './filed-credit.dto.js';

/** The return marked as filed and the credits it registered. */
export class FiledReturnDto {
  @ApiProperty({ description: 'AAAA-MM-GG' }) filedOn!: string;
  @ApiProperty({ type: [FiledCreditDto] }) credits!: FiledCreditDto[];
}
