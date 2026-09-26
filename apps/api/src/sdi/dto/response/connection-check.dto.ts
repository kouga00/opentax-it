import { ApiProperty } from '@nestjs/swagger';

export class ConnectionCheckDto {
  @ApiProperty() ok!: boolean;
  @ApiProperty() message!: string;
}
