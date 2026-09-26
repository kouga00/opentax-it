import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsString, Length, MaxLength } from 'class-validator';

/** Largest accepted upload: a 20 MB archive, base64-encoded (4 characters every 3 bytes). */
const MAX_BASE64_LENGTH = Math.ceil((20 * 1024 * 1024) / 3) * 4;

export class ImportFileDto {
  @ApiProperty({ description: 'Nome del file scelto: .xml (fattura FatturaPA o ricevuta SDI) oppure .zip con i file XML', example: 'IT01234567890_00001.xml' })
  @IsString() @Length(1, 200) name!: string;

  @ApiProperty({ description: 'Contenuto del file in base64 (fino a 20 MB)' })
  @IsString() @IsBase64() @MaxLength(MAX_BASE64_LENGTH) contentBase64!: string;
}
