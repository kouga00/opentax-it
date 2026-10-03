import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserWithMemberships } from '../../auth/types/user-with-memberships.js';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { Roles } from '../../common/roles.decorator.js';
import { SessionToken } from '../../common/session-token.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CreateUserDto } from '../dto/request/create-user.dto.js';
import { SetMembershipsDto } from '../dto/request/set-memberships.dto.js';
import { UpdateUserDto } from '../dto/request/update-user.dto.js';
import { UserAccountDto } from '../dto/response/user-account.dto.js';
import { toUserAccountDto } from '../mappers/users.mapper.js';
import { UsersService } from '../services/users.service.js';

@ApiTags('Utenti')
@Roles(UserRole.PLATFORM_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @ApiOperation({ summary: 'Elenco degli utenti con le partite IVA a cui accedono (solo amministratore)' })
  @Get()
  @ApiOkResponse({ type: [UserAccountDto] })
  async list(): Promise<UserAccountDto[]> {
    return (await this.service.list()).map(toUserAccountDto);
  }

  @ApiOperation({ summary: 'Crea un utente con la password scelta dall\'amministratore' })
  @Post()
  @ApiCreatedResponse({ type: UserAccountDto })
  @ApiConflictResponse({ description: 'Email già usata' })
  async create(@CurrentUser() actor: UserWithMemberships, @Body() dto: CreateUserDto): Promise<UserAccountDto> {
    return toUserAccountDto(await this.service.create(actor.id, dto));
  }

  @ApiOperation({ summary: 'Modifica nome, ruolo o password di un utente' })
  @Patch(':id')
  @ApiOkResponse({ type: UserAccountDto })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse({ description: 'Ruolo di amministratore tolto a sé stessi' })
  async update(@CurrentUser() actor: UserWithMemberships, @SessionToken() token: string, @Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserAccountDto> {
    return toUserAccountDto(await this.service.update(actor.id, token, id, dto));
  }

  @ApiOperation({ summary: 'Imposta le partite IVA a cui l\'utente accede, in sola lettura o in lettura e scrittura' })
  @Put(':id/memberships')
  @ApiOkResponse({ type: UserAccountDto })
  @ApiNotFoundResponse()
  async setMemberships(@CurrentUser() actor: UserWithMemberships, @Param('id') id: string, @Body() dto: SetMembershipsDto): Promise<UserAccountDto> {
    return toUserAccountDto(await this.service.setMemberships(actor.id, id, dto.memberships));
  }

  @ApiOperation({ summary: 'Elimina un utente e le sue sessioni' })
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@CurrentUser() actor: UserWithMemberships, @Param('id') id: string): Promise<void> {
    await this.service.remove(actor.id, id);
  }
}
