import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isEuMemberState } from '@opentax-it/fiscal-rules';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { SaveCustomerDto } from '../dto/request/save-customer.dto.js';

/**
 * Customer master data. Defaults follow the FatturaPA rules for CodiceDestinatario
 * (spec 1.9.1 §2.1.1): "0000000" for Italian customers without a registered channel,
 * "XXXXXXX" for customers not established in Italy. For foreign addresses the AdE FAQ
 * ("Fatture verso e da soggetti stranieri") prescribes CAP "00000" and no Provincia.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(dto: SaveCustomerDto) {
    const foreign = dto.kind === 'EU' || dto.kind === 'EU_B2C' || dto.kind === 'NON_EU' || dto.kind === 'NON_EU_B2C';
    const eu = dto.kind === 'EU' || dto.kind === 'EU_B2C';
    const countryCode = dto.countryCode ?? (foreign ? undefined : 'IT');
    if (foreign && (!countryCode || countryCode === 'IT')) throw new BadRequestException('Foreign customers need a non-IT countryCode');
    // The kind drives Natura, annotations, INVCONT and Intrastat: it must match the country (GB and XI are non-EU for services).
    if (eu && !isEuMemberState(countryCode ?? '')) throw new BadRequestException(`${countryCode} non è uno Stato membro dell'UE: scegli un tipo "Extra UE" (Regno Unito, GB, e Irlanda del Nord, XI, sono fuori dall'UE per i servizi)`);
    if (foreign && !eu && isEuMemberState(countryCode ?? '')) throw new BadRequestException(`${countryCode} è uno Stato membro dell'UE: scegli un tipo "Unione Europea"`);
    if (!foreign && !dto.vatNumber && !dto.fiscalCode) throw new BadRequestException('Italian customers need a VAT number or a fiscal code');
    // AdE FAQ (fatture verso soggetti stranieri): foreign customers are identified with IdCodice (max 28 chars, not validated by SDI).
    if (foreign && !dto.vatNumber) throw new BadRequestException('Foreign customers need an identifier (VAT id or other code) in vatNumber');
    if (!dto.businessName && !(dto.firstName && dto.lastName)) throw new BadRequestException('businessName or firstName+lastName required');
    if (dto.kind === 'IT_PA' && !dto.recipientCode) throw new BadRequestException('Public administrations need the 6-char IPA recipient code');
    const { kind, businessName, firstName, lastName, vatNumber, fiscalCode, address, city, province, recipientPec, currency, notes } = dto;
    return {
      kind, businessName, firstName, lastName, vatNumber, fiscalCode, address, city, province, recipientPec, currency, notes,
      art7SeptiesServices: kind === 'NON_EU_B2C' && dto.art7SeptiesServices === true,
      countryCode: countryCode ?? 'IT',
      country: dto.country ?? countryCode ?? 'IT',
      postalCode: dto.postalCode ?? (foreign ? '00000' : undefined),
      recipientCode: dto.recipientCode ?? (foreign ? 'XXXXXXX' : '0000000'),
    };
  }

  list(tenantId: string) {
    return this.prisma.customer.findMany({ where: { tenantId }, orderBy: [{ businessName: 'asc' }, { lastName: 'asc' }] });
  }

  async get(tenantId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException(`Customer ${id} not found`);
    return c;
  }

  async create(tenantId: string, dto: SaveCustomerDto) {
    return this.prisma.customer.create({ data: { tenantId, ...this.normalize(dto) } });
  }

  async update(tenantId: string, id: string, dto: SaveCustomerDto) {
    await this.get(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data: this.normalize(dto) });
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    const used = await this.prisma.invoice.count({ where: { customerId: id } });
    if (used) throw new BadRequestException('Customer has invoices and cannot be deleted');
    await this.prisma.customer.delete({ where: { id } });
  }
}
