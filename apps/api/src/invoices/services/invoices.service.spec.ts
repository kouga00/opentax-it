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
        findFirst: vi.fn().mockResolvedValue({ id: 'terms1', name: '30 gg', dueDays: [30], fromMonthEnd: false, method: 'MP05', isDefault: true }),
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
  const termsMock = { findFirst: vi.fn().mockResolvedValue({ id: 'terms1', name: '30 gg', dueDays: [30], fromMonthEnd: false, method: 'MP05', isDefault: true }) };
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

    expect(preview.payment).toEqual({ installments: [{ dueDate: '2026-10-22', amount: expect.any(Number) }], method: 'MP08', iban: undefined, bic: undefined });
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
      sdiTransmission: { findMany: vi.fn().mockResolvedValue([]) },
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

  it('issues a rejected invoice being corrected with its own number and a file name never sent before (Circ. 13/E/2018 §1.6)', async () => {
    const draft = { ...draftWithMethod('MP05'), sequence: 2 };
    const update = vi.fn().mockImplementation(({ data }: { data: object }) => Promise.resolve({ ...draft, ...data }));
    const rejectedFile = `IT${mockProfile.fiscalCode}_00001.xml`;
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      invoice: {
        findFirst: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
        aggregate: vi.fn().mockResolvedValue({ _max: { sequence: 9 } }),
        findMany: vi.fn().mockResolvedValue([]),
        update,
      },
      // The rejected file is no longer on the invoice, only on its transmission.
      sdiTransmission: { findMany: vi.fn().mockResolvedValue([{ fileName: rejectedFile }]) },
    };
    const prismaMock = {
      invoice: { findFirst: vi.fn().mockResolvedValue(draft) },
      paymentTerms: termsMock,
      bankAccount: bankMock(),
      $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
    const service = new InvoicesService(
      prismaMock,
      { getActive: vi.fn().mockResolvedValue(ruleSet2026) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile: { ...mockProfile, sdiFileProgressiveStart: null } }) } as unknown as TenantsService,
      { write: vi.fn().mockResolvedValue(undefined) } as unknown as StorageService,
      new InvoicesPdfService(),
    );

    await service.issue('tenant1', 'draft-1', { confirmThresholds: true });

    const data = (update.mock.calls[0][0] as { data: { sequence: number; number: string; xmlFileName: string } }).data;
    expect(data.sequence).toBe(2);
    expect(data.number).toBe('2/2026');
    expect(data.xmlFileName).not.toBe(rejectedFile);
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

    await expect(service.issue('tenant1', 'draft-1', { confirmThresholds: true })).rejects.toThrow('già stata emessa');
    expect(calls).toEqual(['lock:SELECT pg_advisory_xact_lock(hashtext(?)):issue:tenant1', 'recheck']);
    expect(tx.invoice.aggregate).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('asks for a confirmation when the projected revenue goes above 100,000 (L. 190/2014 par. 71)', async () => {
    const draft = { id: 'draft-1', tenantId: 'tenant1', status: 'DRAFT', type: 'TD01', date: new Date('2026-01-15T00:00:00Z'), year: 2026, total: 6000, exchangeRate: 1, professionalFundContribution: 0 };
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(draft),
        findMany: vi.fn().mockResolvedValue([{ total: 15000, professionalFundContribution: 0, exchangeRate: 1, payments: [] }]),
      },
      payment: { findMany: vi.fn().mockResolvedValue([{ amountEur: 80000, invoice: { total: 80000, professionalFundContribution: 0 } }]) },
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

describe('InvoicesService: correction of a rejected invoice (Circ. AdE 13/E/2018 §1.6)', () => {
  const rejected = { id: 'inv-1', tenantId: 't1', status: 'REJECTED', imported: false, replacedBy: null, sequence: 3, number: '3/2026', type: 'TD01', date: new Date('2026-09-20T00:00:00Z'), xmlFileName: 'IT01234567890_00003.xml' };
  const serviceWith = (invoice: object, updateMany = vi.fn().mockResolvedValue({ count: 1 })) => ({
    updateMany,
    service: new InvoicesService(
      { invoice: { findFirst: vi.fn().mockResolvedValue(invoice), updateMany, delete: vi.fn() } } as unknown as PrismaService,
      {} as FiscalRulesService,
      {} as TenantsService,
      {} as StorageService,
      new InvoicesPdfService(),
    ),
  });

  it('reopens a rejected invoice as a draft, keeping number and date and leaving the old file to its transmission', async () => {
    const { service, updateMany } = serviceWith(rejected);
    await service.reopenForCorrection('t1', 'inv-1');
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'inv-1', tenantId: 't1', status: 'REJECTED' }, data: { status: 'DRAFT', xmlFileName: null, xmlPath: null, sdiDeliveredOn: null } });
  });

  it('refuses invoices that are not rejected, and imported ones', async () => {
    await expect(serviceWith({ ...rejected, status: 'DELIVERED' }).service.reopenForCorrection('t1', 'inv-1')).rejects.toThrow(BadRequestException);
    await expect(serviceWith({ ...rejected, imported: true }).service.reopenForCorrection('t1', 'inv-1')).rejects.toThrow(BadRequestException);
  });

  it('a rejected invoice already replaced with a new number is neither corrected nor replaced again', async () => {
    const replaced = { ...rejected, replacedBy: { id: 'inv-2', number: '' } };
    await expect(serviceWith(replaced).service.reopenForCorrection('t1', 'inv-1')).rejects.toThrow('già stata sostituita');
    await expect(serviceWith(replaced).service.createReplacement('t1', 'inv-1')).rejects.toThrow(ConflictException);
    await expect(serviceWith({ ...rejected, status: 'DELIVERED', replacedBy: null }).service.createReplacement('t1', 'inv-1')).rejects.toThrow(BadRequestException);
  });

  it('keeps date and type of the correction draft, and does not delete it', async () => {
    const draft = { ...rejected, status: 'DRAFT', xmlFileName: null };
    const { service } = serviceWith(draft);
    const dto = { customerId: 'c1', date: '2026-09-25', lines: [{ description: 'x', unitPrice: 100 }] };
    await expect(service.update('t1', 'inv-1', dto)).rejects.toThrow('stesso numero, la stessa data');
    await expect(service.update('t1', 'inv-1', { ...dto, date: '2026-09-20', type: 'TD04' })).rejects.toThrow('stesso numero, la stessa data');
    await expect(service.remove('t1', 'inv-1')).rejects.toThrow('ha già un numero');
  });
});

describe('InvoicesService: INPS surcharge and the social security scheme (L. 662/1996 art. 1 par. 212)', () => {
  const serviceFor = (socialSecurityScheme: string) =>
    new InvoicesService(
      {
        customer: { findFirst: vi.fn().mockResolvedValue({ id: 'c1', kind: 'IT_B2B', currency: 'EUR', art7SeptiesServices: false }) },
        paymentTerms: { findFirst: vi.fn().mockResolvedValue(null) },
      } as unknown as PrismaService,
      { getActive: vi.fn().mockResolvedValue({ inps: { surchargePct: 4 } }) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile: { socialSecurityScheme, applyInpsSurcharge: false } }) } as unknown as TenantsService,
      {} as StorageService,
      new InvoicesPdfService(),
    );
  const dto = { customerId: 'c1', date: '2026-09-25', lines: [{ description: 'x', unitPrice: 100 }], applyInpsSurcharge: true };

  it('charges the professional fund contribution of the profile, counted in the total and the stamp duty threshold', async () => {
    const create = vi.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const profile = { socialSecurityScheme: 'PROFESSIONAL_FUND', applyInpsSurcharge: false, professionalFundType: 'TC01', professionalFundRatePct: new Prisma.Decimal(4) };
    const service = new InvoicesService(
      {
        customer: { findFirst: vi.fn().mockResolvedValue({ id: 'c1', kind: 'IT_B2B', currency: 'EUR', art7SeptiesServices: false }) },
        paymentTerms: { findFirst: vi.fn().mockResolvedValue(null) },
        invoice: { create },
      } as unknown as PrismaService,
      { getActive: vi.fn().mockResolvedValue(ruleSet2026) } as unknown as FiscalRulesService,
      { getWithProfile: vi.fn().mockResolvedValue({ profile }) } as unknown as TenantsService,
      {} as StorageService,
      new InvoicesPdfService(),
    );
    const invoice = await service.create('t1', { customerId: 'c1', date: '2026-09-25', lines: [{ description: 'Consulenza', unitPrice: 1000 }] });
    expect(invoice).toMatchObject({ inpsSurcharge: 0, professionalFundType: 'TC01', professionalFundRatePct: 4, professionalFundContribution: 40, stampAmount: 2, total: 1042 });
    // Left out on one invoice (e.g. a fund's own exclusions).
    const without = await service.create('t1', { customerId: 'c1', date: '2026-09-25', lines: [{ description: 'Consulenza', unitPrice: 1000 }], applyProfessionalFund: false });
    expect(without).toMatchObject({ professionalFundType: null, professionalFundContribution: 0, total: 1002 });
  });

  it('refuses the surcharge for a professional fund or the Artigiani and Commercianti schemes', async () => {
    for (const scheme of ['PROFESSIONAL_FUND', 'INPS_ARTISANS', 'INPS_TRADERS']) {
      await expect(serviceFor(scheme).create('t1', dto)).rejects.toThrow('solo agli iscritti alla Gestione Separata');
    }
  });
});
