import { IsNotEmpty, IsString } from 'class-validator';

export class SelectTenantDto {
  @IsString({ message: 'Il tenantId deve essere una stringa' })
  @IsNotEmpty({ message: 'Il tenantId è obbligatorio' })
  tenantId!: string;
}
