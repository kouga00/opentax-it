import { TenantSummaryResponseDto } from './tenant-summary-response.dto.js';

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  role!: string;
  activeTenantId!: string | null;
  tenants!: TenantSummaryResponseDto[];
}
