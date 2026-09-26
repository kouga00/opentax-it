import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { isXmllintAvailable, validateWithXsd } from '@opentax-it/fatturapa';
import { ruleSet2026 } from '@opentax-it/fiscal-rules';
import { Prisma } from '../../generated/prisma/client.js';
import type { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { StorageService } from '../../storage/storage.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicesPdfService } from './invoices-pdf.service.js';

describe('InvoicesService.preview', () => {
  const mockProfile = {
    id: 'prof1',
    tenantId: 'tenant1',
    businessName: null,
    firstName: 'Mario',
    lastName: 'Rossi',
    fiscalCode: 'RSSMRA80A01H501U',
    vatNumber: '01234567890',
    atecoCode: '62.02.00',
    address: 'Via Roma 10',
    postalCode: '00100',
    city: 'Roma',
    province: 'RM',
    country: 'IT',
    activityStartYear: 2020,
    reducedRate: false,
    isaSubject: false,
    birthDate: '1980-01-01',
    sex: 'M',
    birthPlace: 'Roma',
    birthProvince: 'RM',
    applyInpsSurcharge: true,
    viesRegistered: false,
    pecAddress: 'mario.rossi@pec.it',
    inpsOfficeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer = {
    id: 'cust1',
    tenantId: 'tenant1',
    kind: 'IT_B2B' as const,
    businessName: 'Acme Solutions S.r.l.',
    firstName: null,
    lastName: null,
    vatNumber: '09876543210',
    fiscalCode: '09876543210',
    address: 'Via Montenapoleone 1',
    postalCode: '20121',
    city: 'Milano',
    province: 'MI',
    country: 'IT',
    countryCode: 'IT',
    recipientCode: 'M5UXCR1',
    recipientPec: 'acme@pec.it',
    currency: 'EUR',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRules = {
    year: 2026,
    inps: { surchargePct: 4 },
    stampDuty: { threshold: 77.47, amount: 2 },
    eInvoice: {
      taxRegime: 'RF19',
      inpsFundType: 'TC22',
      regimeNote: 'Regime forfettario L. 190/2014',
      noWithholdingNote: 'Ritenuta non applicata L. 190/2014',
      euAnnotation: 'Art. 7-ter DPR 633/72',
    },
  };

  it('builds preview for a DRAFT invoice from database data with Prisma.Decimal', async () => {
    const draftInvoice = {
      id: 'inv-draft-1',
      tenantId: 'tenant1',
      customerId: 'cust1',
      type: 'TD01' as const,
      year: 2026,
      sequence: null,
      number: '',
      date: new Date('2026-09-22T00:00:00Z'),
      currency: 'EUR',
      exchangeRate: new Prisma.Decimal(1),
      vatNature: 'N2_2' as const,
      taxableAmount: new Prisma.Decimal(1000),
      inpsSurcharge: new Prisma.Decimal(40),
      virtualStamp: true,
      stampAmount: new Prisma.Decimal(2),
      total: new Prisma.Decimal(1042),
      notes: ['Nota 1', 'Nota 2'],
      status: 'DRAFT' as const,
      refInvoiceId: null,
      paymentTermsId: 'terms1',
      bankAccountId: 'bank1',
      xmlFileName: null,
      xmlPath: null,
      internalNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: mockCustomer,
      lines: [
        {
          id: 'line1',
          invoiceId: 'inv-draft-1',
          lineNumber: 1,
          description: 'Sviluppo software',
          quantity: new Prisma.Decimal(20),
          unit: 'ore',
          unitPrice: new Prisma.Decimal(50),
          totalPrice: new Prisma.Decimal(1000),
        },
      ],
    };

    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(draftInvoice),
      },
      paymentTerms: {
        findFirst: vi.fn().mockResolvedValue({ id: 'terms1', name: '30 gg', days: 30, method: 'MP05', isDefault: true }),
      },
      bankAccount: {
        findFirst: vi.fn().mockResolvedValue({ id: 'bank1', iban: 'IT60X0542811101000000123456', bic: 'UNCRITM1XXX' }),
      },
    } as unknown as PrismaService;

    const rulesMock = {
      getActive: vi.fn().mockResolvedValue(mockRules),
    } as unknown as FiscalRulesService;

    const tenantsMock = {
      getWithProfile: vi.fn().mockResolvedValue({ profile: mockProfile }),
    } as unknown as TenantsService;

    const storageMock = {
      read: vi.fn(),
      write: vi.fn(),
    } as unknown as StorageService;

    const service = new InvoicesService(prismaMock, rulesMock, tenantsMock, storageMock, new InvoicesPdfService());

    const preview = await service.preview('tenant1', 'inv-draft-1');

    expect(preview.isDraft).toBe(true);
    expect(preview.number).toBe('');
    expect(preview.documentType).toBe('TD01');
    expect(preview.taxableAmount).toBe(1000);
    expect(preview.inpsSurcharge).toBe(40);
    expect(preview.inpsRatePct).toBe(4);
    expect(preview.stampAmount).toBe(2);
    expect(preview.total).toBe(1042);
    expect(preview.supplier.name).toBe('Mario Rossi');
    expect(preview.supplier.taxRegime).toBe('RF19');
    expect(preview.customer.name).toBe('Acme Solutions S.r.l.');
    expect(preview.payment?.iban).toBe('IT60X0542811101000000123456');
    expect(preview.lines[0].vatNature).toBe('N2.2');
  });

  /** Draft of 1,000 + 4% INPS + stamp, with the given payment method, payment terms of 30 days and a bank account. */
  const draftWithMethod = (paymentMethod: string | null) => ({
    id: 'draft-1',
    tenantId: 'tenant1',
    customerId: 'cust1',
    type: 'TD01' as const,
    year: 2026,
    sequence: null,
    number: '',
    date: new Date('2026-09-22T00:00:00Z'),
    currency: 'EUR',
    exchangeRate: new Prisma.Decimal(1),
    vatNature: 'N2_2' as const,
    taxableAmount: new Prisma.Decimal(1000),
    inpsSurcharge: new Prisma.Decimal(40),
    virtualStamp: true,
    stampAmount: new Prisma.Decimal(2),
    total: new Prisma.Decimal(1042),
    notes: ['Nota 1'],
    status: 'DRAFT' as const,
    refInvoiceId: null,
    paymentTermsId: 'terms1',
    bankAccountId: 'bank1',
    paymentMethod,
    xmlFileName: null,
    xmlPath: null,
    internalNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: mockCustomer,
    lines: [{ id: 'line1', invoiceId: 'draft-1', lineNumber: 1, description: 'Sviluppo software', quantity: new Prisma.Decimal(1), unit: null, unitPrice: new Prisma.Decimal(1000), totalPrice: new Prisma.Decimal(1000) }],
  });
  const termsMock = { findFirst: vi.fn().mockResolvedValue({ id: 'terms1', name: '30 gg', days: 30, method: 'MP05', isDefault: true }) };
  const bankMock = () => ({ findFirst: vi.fn().mockResolvedValue({ id: 'bank1', iban: 'IT60X0542811101000000123456', bic: 'UNCRITM1XXX' }) });

  it('uses the method chosen on the draft, not the one of the payment terms, and leaves out the bank for a card payment', async () => {
    const bankAccount = bankMock();
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue(draftWithMethod('MP08')) },
      paymentTerms: termsMock,
      bankAccount,
    } as unknown as PrismaService;
    const service = new InvoicesService(
      prismaMock,
      { getActive: vi.fn().mockResolvedValue(mockRules) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile: mockProfile }) } as unknown as TenantsService,
      {} as unknown as StorageService,
      new InvoicesPdfService(),
    );

    const preview = await service.preview('tenant1', 'draft-1');

    expect(preview.payment).toEqual({ dueDate: '2026-10-22', method: 'MP08', iban: undefined, bic: undefined });
    expect(bankAccount.findFirst).not.toHaveBeenCalled();
  });

  it('issues with the method of the draft when the issue form changes due date and IBAN, and stores it on the invoice', async () => {
    const draft = draftWithMethod('MP19');
    let xml = '';
    const update = vi.fn().mockImplementation(({ data }: { data: object }) => Promise.resolve({ ...draft, ...data }));
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      invoice: {
        findFirst: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => Promise.resolve(where.id === 'draft-1' ? { status: 'DRAFT' } : null)),
        aggregate: vi.fn().mockResolvedValue({ _max: { sequence: 4 } }),
        findMany: vi.fn().mockResolvedValue([]),
        update,
      },
    };
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue(draft) },
      paymentTerms: termsMock,
      bankAccount: bankMock(),
      $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
    const storageMock = { write: vi.fn().mockImplementation((_path: string, content: string) => { xml = content; return Promise.resolve(); }) } as unknown as StorageService;
    const service = new InvoicesService(
      prismaMock,
      { getActive: vi.fn().mockResolvedValue(ruleSet2026) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile: { ...mockProfile, sdiFileProgressiveStart: null } }) } as unknown as TenantsService,
      storageMock,
      new InvoicesPdfService(),
    );

    await service.issue('tenant1', 'draft-1', { payment: { dueDate: '2026-10-31', iban: 'IT02L1234512345123456789012' }, confirmThresholds: true });

    expect(xml).toContain('<ModalitaPagamento>MP19</ModalitaPagamento>');
    expect(xml).toContain('<DataScadenzaPagamento>2026-10-31</DataScadenzaPagamento>');
    expect(xml).toContain('<IBAN>IT02L1234512345123456789012</IBAN>');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ISSUED', paymentMethod: 'MP19' }) }));
    if (isXmllintAvailable()) expect(validateWithXsd(xml)).toEqual([]);
  });

  it('builds preview for an ISSUED invoice by parsing the saved XML file', async () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>M5UXCR1</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA>
        <CodiceFiscale>RSSMRA80A01H501U</CodiceFiscale>
        <Anagrafica><Nome>Mario</Nome><Cognome>Rossi</Cognome></Anagrafica>
        <RegimeFiscale>RF19</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Vecchia Sede 5</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>09876543210</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Acme Solutions S.r.l.</Denominazione></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Montenapoleone 1</Indirizzo>
        <CAP>20121</CAP>
        <Comune>Milano</Comune>
        <Provincia>MI</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2026-09-20</Data>
        <Numero>1/2026</Numero>
        <DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>2.00</ImportoBollo></DatiBollo>
        <DatiCassaPrevidenziale>
          <TipoCassa>TC22</TipoCassa>
          <AlCassa>4.00</AlCassa>
          <ImportoContributoCassa>40.00</ImportoContributoCassa>
          <ImponibileCassa>1000.00</ImponibileCassa>
          <AliquotaIVA>0.00</AliquotaIVA>
          <Natura>N2.2</Natura>
        </DatiCassaPrevidenziale>
        <ImportoTotaleDocumento>1042.00</ImportoTotaleDocumento>
        <Causale>Nota dall XML originale</Causale>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Consulenza salvata nell XML</Descrizione>
        <Quantita>10.00</Quantita>
        <PrezzoUnitario>100.00</PrezzoUnitario>
        <PrezzoTotale>1000.00</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
      </DettaglioLinee>
    </DatiBeniServizi>
    <DatiPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>
        <DataScadenzaPagamento>2026-10-20</DataScadenzaPagamento>
        <ImportoPagamento>1042.00</ImportoPagamento>
        <IBAN>IT00ORIGINALIBAN00000000</IBAN>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

    const issuedInvoice = {
      id: 'inv-issued-1',
      tenantId: 'tenant1',
      customerId: 'cust1',
      type: 'TD01' as const,
      year: 2026,
      sequence: 1,
      number: '1/2026',
      date: new Date('2026-09-20T00:00:00Z'),
      currency: 'EUR',
      exchangeRate: new Prisma.Decimal(1),
      vatNature: 'N2_2' as const,
      taxableAmount: new Prisma.Decimal(1000),
      inpsSurcharge: new Prisma.Decimal(40),
      virtualStamp: true,
      stampAmount: new Prisma.Decimal(2),
      total: new Prisma.Decimal(1042),
      notes: ['Nota obsoleta nel DB'],
      status: 'ISSUED' as const,
      refInvoiceId: null,
      paymentTermsId: 'terms-changed-later',
      bankAccountId: 'bank-changed-later',
      xmlFileName: 'IT01234567890_00001.xml',
      xmlPath: 'invoices/2026/IT01234567890_00001.xml',
      internalNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: mockCustomer,
      lines: [],
    };

    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(issuedInvoice),
      },
    } as unknown as PrismaService;

    const storageMock = {
      read: vi.fn().mockResolvedValue(Buffer.from(xmlContent, 'utf8')),
      write: vi.fn(),
    } as unknown as StorageService;

    const service = new InvoicesService(
      prismaMock,
      {} as unknown as FiscalRulesService,
      {} as unknown as TenantsService,
      storageMock,
      new InvoicesPdfService(),
    );

    const preview = await service.preview('tenant1', 'inv-issued-1');

    // Asserts values come strictly from XML, not from mutated DB state
    expect(preview.isDraft).toBe(false);
    expect(preview.number).toBe('1/2026');
    expect(preview.supplier.address).toBe('Via Vecchia Sede 5'); // original XML address
    expect(preview.supplier.taxRegime).toBe('RF19');
    expect(preview.supplier.pec).toBeUndefined(); // PEC omitted on issued invoice
    expect(preview.payment?.iban).toBe('IT00ORIGINALIBAN00000000'); // original XML IBAN
    expect(preview.notes).toEqual(['Nota dall XML originale']);
    expect(preview.lines[0].description).toBe('Consulenza salvata nell XML');
    expect(preview.lines[0].vatNature).toBe('N2.2');
    expect(preview.inpsRatePct).toBe(4);
    expect(preview.virtualStamp).toBe(true);
    expect(preview.total).toBe(1042);
  });

  it('throws UnprocessableEntityException when an issued invoice has no XML or reading fails', async () => {
    const issuedWithoutXml = {
      id: 'inv-no-xml',
      tenantId: 'tenant1',
      status: 'ISSUED' as const,
      xmlPath: null,
      lines: [],
      customer: mockCustomer,
    };

    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(issuedWithoutXml),
      },
    } as unknown as PrismaService;

    const service = new InvoicesService(
      prismaMock,
      {} as unknown as FiscalRulesService,
      {} as unknown as TenantsService,
      {} as unknown as StorageService,
      new InvoicesPdfService(),
    );

    await expect(service.preview('tenant1', 'inv-no-xml')).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('InvoicesService.issue', () => {
  it('rejects a draft dated in the future (SDI error 00403)', async () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue({ id: 'draft-1', tenantId: 'tenant1', status: 'DRAFT', date: tomorrow, year: tomorrow.getUTCFullYear() }) },
    } as unknown as PrismaService;
    const getActive = vi.fn();
    const rulesMock = { getActive } as unknown as FiscalRulesService;
    const service = new InvoicesService(prismaMock, rulesMock, {} as unknown as TenantsService, {} as unknown as StorageService, new InvoicesPdfService());

    await expect(service.issue('tenant1', 'draft-1')).rejects.toThrow(BadRequestException);
    expect(getActive).not.toHaveBeenCalled();
  });

  it('takes the per-tenant lock and stops when a concurrent request already issued the draft', async () => {
    const calls: string[] = [];
    const tx = {
      $executeRaw: vi.fn().mockImplementation((sql: TemplateStringsArray, key: string) => {
        calls.push(`lock:${sql.join('?')}:${key}`);
        return Promise.resolve(1);
      }),
      invoice: {
        findFirst: vi.fn().mockImplementation(() => {
          calls.push('recheck');
          return Promise.resolve({ status: 'ISSUED' }); // issued by the other request while we waited
        }),
        aggregate: vi.fn(),
        update: vi.fn(),
      },
    };
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue({ id: 'draft-1', tenantId: 'tenant1', status: 'DRAFT', date: new Date('2026-01-15T00:00:00Z'), year: 2026 }) },
      $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
    const write = vi.fn();
    const storageMock = { write } as unknown as StorageService;
    const service = new InvoicesService(
      prismaMock,
      { getActive: vi.fn().mockResolvedValue({}) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile: { country: 'IT', fiscalCode: 'RSSMRA80A01H501U' } }) } as unknown as TenantsService,
      storageMock,
      new InvoicesPdfService(),
    );

    await expect(service.issue('tenant1', 'draft-1', { confirmThresholds: true })).rejects.toThrow('Invoice already issued');
    expect(calls).toEqual(['lock:SELECT pg_advisory_xact_lock(hashtext(?)):issue:tenant1', 'recheck']);
    expect(tx.invoice.aggregate).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('asks for a confirmation when the projected revenue goes above 100,000 (L. 190/2014 par. 71)', async () => {
    const draft = { id: 'draft-1', tenantId: 'tenant1', status: 'DRAFT', type: 'TD01', date: new Date('2026-01-15T00:00:00Z'), year: 2026, total: 6000, exchangeRate: 1 };
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(draft),
        findMany: vi.fn().mockResolvedValue([{ total: 15000, exchangeRate: 1, payments: [] }]),
      },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amountEur: 80000 } }) },
    } as unknown as PrismaService;
    const service = new InvoicesService(
      prismaMock,
      { getActive: vi.fn().mockResolvedValue(ruleSet2026) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile: { revenueLimit: null } }) } as unknown as TenantsService,
      {} as unknown as StorageService,
      new InvoicesPdfService(),
    );
    // 80,000 collected + 15,000 open + 6,000 = 101,000
    await expect(service.issue('tenant1', 'draft-1')).rejects.toThrow(ConflictException);
  });

  it('refuses to issue an invoice to a public administration until qualified signing is supported', async () => {
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue({ id: 'draft-1', tenantId: 'tenant1', status: 'DRAFT', date: new Date('2026-01-15T00:00:00Z'), year: 2026, customer: { kind: 'IT_PA' } }) },
    } as unknown as PrismaService;
    const service = new InvoicesService(prismaMock, {} as unknown as FiscalRulesService, {} as unknown as TenantsService, {} as unknown as StorageService, new InvoicesPdfService());
    await expect(service.issue('tenant1', 'draft-1')).rejects.toThrow('firma qualificata');
  });
});
