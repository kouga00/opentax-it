import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { MembershipDto } from './membership.dto.js';

/** The VAT numbers a user can access, replacing the previous ones. */
export class SetMembershipsDto {
  @ApiProperty({ type: [MembershipDto] })
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => MembershipDto)
  memberships!: MembershipDto[];
}
