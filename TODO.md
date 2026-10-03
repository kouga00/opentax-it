# TODO — cosa manca e cosa è aperto

Elenco per la community di ciò che non è ancora fatto, per epiche. Prima di prendere un punto leggi [CONTRIBUTING.md](CONTRIBUTING.md): si lavora solo su fonti ufficiali verificate, con esempi ufficiali, senza assunzioni. Ogni epica indica le fonti da cui partire; se una fonte non è ancora stata letta, il punto è marcato **da verificare**.

Stato aggiornato al 03/10/2026. Cosa è già fatto e con quale riferimento normativo: [docs/compliance.md](docs/compliance.md).

## Priorità alta

### Conformità (review del 23/09/2026)
Esito della review dell'intero codice contro le fonti ufficiali; fonti e citazioni in [docs/normativa-2026.md](docs/normativa-2026.md) §5-ter. In ordine di priorità:
1. **Bollo nelle fatture in valuta** (**da verificare**): soglia di 77,47 € sul controvalore in euro e i 2 € oggi sommati al totale nella valuta della fattura.
2. Minori: rateazione avvisi bonari da rivedere per il set 2027 (art. 3-bis D.Lgs. 462/97 cambia dal 2027).
3. **Servizi elettronici a privati UE** (art. 7-octies DPR 633/72, **da verificare**): oggi ogni servizio a un privato UE è trattato come reso in Italia (N2.2). Per i servizi prestati per via elettronica, di telecomunicazione e teleradiodiffusione (es. software o SaaS venduti online) a privati UE il luogo può essere lo Stato del cliente oltre la soglia UE, con il regime OSS. Leggere art. 7-octies e regole OSS per i forfettari (fonti AdE), poi distinguere questi servizi sul cliente o sulla fattura.

### Review del 01/10/2026: bug e inesattezze
Sei revisioni per modulo (fatturazione, SDI/PEC, imposte, F24 e crediti, sicurezza, web), una sui flussi tra moduli e una seconda verifica indipendente di ogni punto, con script sulle funzioni vere, xmllint sull'XSD e citazioni delle fonti archiviate. Qui solo i punti **confermati** e ancora aperti (o confermati in parte, con la parte vera); i punti già corretti sono stati tolti, gli smentiti sono in fondo. In ordine di priorità.

**Alta**
1. **Acconti INPS di Artigiani e Commercianti con la riduzione del 35% anche quando l'anno dopo non spetta** (L. 190 c. 82: cessa "a partire dall'anno successivo"; Fasc. 2: "tenendo conto di eventuali agevolazioni spettanti per lo stesso anno"). Commerciante con 90.000 € incassati: 2.735,59 € invece di 4.208,60 €. Aperto: se chi esce dal regime deve l'acconto 1790/1791 che l'app propone (Fasc. 1 RN38 col. 4 dice solo che quelli versati si scomputano dall'IRPEF) — **da verificare**.
2. **XML non validato sull'XSD all'emissione** (`validateWithXsd` solo nei test): cliente italiano senza CAP (dal form il CAP non è obbligatorio) → `<CAP/>`; via API anche CAP di 4 cifre, provincia e codice fiscale minuscoli. Numero assegnato, poi scarto SDI. Validare prima di assegnare il numero e stringere `SaveCustomerDto`.
3. **Stesso nome file su due invii**: dopo un errore SMTP con il messaggio partito davvero, il reinvio usa lo stesso `xmlFileName`; la NS 00002 "Nome file duplicato" del secondo invio viene attribuita alla fattura (ricevute abbinate all'ultima trasmissione per nome file) e una fattura consegnata risulta scartata: rischio di riemetterla. La prima trasmissione resta in attesa per sempre. Nessun campo delle ricevute distingue con certezza i due invii (Hash uguale, PecMessageId non definito come il nostro Message-ID): restano il codice 00002 e DataOraRicezione rispetto a `sentAt`.
4. **IP del client falsificabile**: `apps/web/src/lib/api.ts` inoltra l'`x-forwarded-for` ricevuto, Next lo imposta solo se manca, l'API si fida del loopback → il limite per IP su login è aggirabile, IP falsi in `Session` e `AuditLog`. Con web e API su host diversi, al contrario, tutti condividono l'IP del web e 5 login in 15 minuti bloccano tutti. Media finché tutto ascolta su 127.0.0.1, alta appena esposto.

**Media**
5. **Soglia 85.000 € non ragguagliata ad anno** per chi inizia in corso d'anno (c. 54 lett. a, "ragguagliati ad anno"; Circ. 10/E/2016). Vale per accesso e permanenza (c. 71 richiama il c. 54), non per i 100.000 €. Serve la data di inizio attività nel profilo.
6. **Guida e "dichiarazione presentata" sopra i 100.000 €**: nessun controllo (solo il piano F24 blocca); `markFiled` può registrare crediti inesistenti.
7. **Fatture importate in valuta salvate con cambio 1** (`invoices-import.service.ts`): gonfiano il "da incassare", le soglie e i non incassati della guida. Il "da incassare" delle soglie inoltre non filtra per anno e lascia fuori le TD04, quindi una fattura stornata resta da incassare per sempre e può far scattare la conferma "oltre 100.000".
8. **Incassi su fatture scartate** (REJECTED, anche ISSUED/SENT) ammessi e contati nei ricavi: dopo "Correggi e reinvia" con una nuova fattura (`createReplacement`) l'incasso registrato anche sulla sostitutiva raddoppia il ricavo.
9. **Prezzi a 4 decimali**: `totalPrice` è calcolato sui valori non arrotondati, il DB salva 4 decimali → 1000 × 0,12345 dà PrezzoTotale 123,45 contro 123,50 (errore SDI 00423). Limitare i decimali nel DTO o calcolare sui valori salvati.
10. **Saldo INPS al centesimo, RR in euro interi**; `tax-return-rr.ts` arrotonda la differenza e non i termini: contributo 10.428 e acconti 6.986,50 danno RR7 3.442, ma RR6 col. 1 − col. 2 = 3.441 e l'F24 versa 3.441,50 (Fasc. 2 RR7; Fasc. 1 §7 "arrotondati all'unità di euro"). Stesso difetto in RR2. `TaxReturn.inpsCredit` in centesimi contro il credito RR8 in euro interi.
11. **Massimale per l'acconto della Gestione Separata**: l'app usa quello dell'anno di reddito; Fasc. 2: "tenendo conto del massimale stabilito per il 2026". Con reddito 125.000: 352 € di acconto in meno.
12. **Ricavi negativi** (rimborsi di note di credito oltre gli incassi): contributo GS negativo, credito RR8 inesistente registrato da `markFiled`, acconti negativi. Con reddito zero gli acconti GS escono "in due rate" da 0 invece di "non dovuti".
13. **Avviso dei 5.000 € falso**: `earlierUses` (`tax-credits.service.ts`) somma anche gli usi verticali e quelli degli F24 annullati, mentre sull'F24 in corso conta solo gli orizzontali.
14. **Stati degli F24 senza controlli**: un modello CANCELLED tiene i crediti consumati (registro e LM44); PAID → CANCELLED toglie le somme da LM35/LM45 senza avviso. PAID → PLANNED è voluto ("annulla pagamento").
15. **Prima trasmissione rifiutata dal gestore PEC**: il blocco "dopo il primo invio serve l'indirizzo assegnato" conta anche gli invii finiti in non-accettazione/errore di consegna (`sentAt` non azzerato), ma lo SDI non ha mai risposto (Allegato B §3.1.1: l'indirizzo arriva "con il primo messaggio di risposta"). Contare solo i file arrivati allo SDI.
16. **Un messaggio che fallisce sempre blocca la lettura della casella** del tenant (il cursore si salva solo dopo l'elaborazione, nessun "salta dopo N tentativi"). Caso concreto, poco probabile: DataMessaADisposizione con fuso (`xsd:date` lo ammette, la Spec. dice "YYYY-MM-DD") → data non valida.
17. **MC senza DataMessaADisposizione** (schema fatturapa.gov.it `NotificaMancataConsegna_Type` v1.1, a differenza di `RicevutaImpossibilitaRecapito_Type` AdE): `sdiDeliveredOn` resta vuoto e il trimestre del bollo resta "Stima" per sempre. **Da verificare** quale variante lo SDI manda oggi via PEC.
18. **Errori dei dati all'emissione con risposta 500** (`builder.ts` lancia `Error`): es. codice destinatario di 6 caratteri per un cliente IT B2B, che il DTO cliente accetta.
19. **`/exchange-rates` pubblico e senza limite**: ogni data genera fino a 8 chiamate a Banca d'Italia e scritture; richieste uguali concorrenti → 500 (P2002).
20. **Date impossibili accettate**: "2026-02-31" diventa il 3 marzo (fatture, incassi); "2026-13-01" e le date con orario (`@IsDateString` negli F24, nel bollo, negli F24 contributi) → 500.
21. **Nota di credito su una bozza** (solo via API): `<IdDocumento/>` non valido.
22. **Campi facoltativi che non si svuotano** (PEC, note e provincia del cliente; campi del profilo): il web manda `undefined` e Prisma li ignora.
23. **Aiuto sbagliato per Artigiani e Commercianti**: `lib/help/taxes.json` (`inpsAdvancesPaid`) dice PXX/PXXR e RR5 col. 16; per loro AP/CP e RR2 col. 27.
24. **Prova di connessione PEC con host validato solo con `@IsFQDN`**: un nome che risolve a 127.0.0.1 o alla LAN passa, e i messaggi diversi della prova fanno da oracolo per le porte interne (solo TCP+TLS, non legge dati). Validare l'IP risolto.
25. **Sessioni**: niente "esci da tutti i dispositivi" per l'utente; password come argomento della CLI (finisce nella history). Una nuova password, da CLI o dalla pagina Utenti, chiude già le sessioni.

**Bassa**
26. Arrotondamento al centesimo (`rounding.ts`): 34.050 × 26,07% = 8.876,835 → 8.876,83 invece di 8.876,84 (Fasc. 1 §7); 112 casi su 200.000 basi.
27. Cambio salvato con 6 decimali (`Decimal(12,6)` in euro per unità): −0,13% per IDR, trascurabile per USD e JPY.
28. Web: limite di 21 MB per richiesta nell'import (il testo dice 20 MB per file, 200 file); totale riga con `toFixed(2)`, quantità 0 → 1, form senza `<form>` (`max` e `required` non applicati); scadenzario senza `YearSelect`; `/rules`, `/sources` fuori dai prefissi protetti di `proxy.ts` (sono anche pubbliche: da decidere); route PDF/XML che trasformano 401/404 in 500; `createContributionF24` senza `handleActionError`.
29. Testi di aiuto: `activeTenantCookie` superato; `firstDueDate` cita solo lo 0,40% (non lo 0,80% della proroga); `seniorityBefore1996` con i massimali 2026 scritti a mano invece che dal set di regole.
30. Dashboard: "Fatturato" somma valute diverse senza cambio e con il contributo cassa; "Bolli virtuali" a 2 € fissi per data fattura, la pagina Bollo usa `stampAmount` e la data di consegna.
31. "Anno corrente" con `new Date().getFullYear()` (fuso del server) in `invoices.service.ts` e in circa 12 pagine, contro `todayInItaly()`.
32. Fatturazione minori: `SaveInvoiceDto.payment` accettato e mai salvato; IBAN all'emissione solo con controllo di lunghezza (con spazi non passa l'XSD); `amountEur` dell'incasso non controllato via API; nota importata collegata per numero e TD01 senza anno; PDF con prezzo unitario a 2 decimali; parser che perde tutti i dati di pagamento con più `DatiPagamento`; commento "zero-padded" in `builder.ts` (è base 36).
33. SDI minori: indirizzo assegnato manuale senza controllo `SDI_MAILBOX` e rimasto dopo un cambio di casella; lock della sincronizzazione azzerato anche se preso da un'altra; trasmissione OTHER creata fuori dalla transazione; ricevute senza invio corrispondente saltate (da scrivere in `docs/guida/pec-e-sdi.md`); errori di storage mostrati come errori IMAP; anteprima dell'import con la data di ricezione invece di quella di messa a disposizione; `secret-cipher.ts` senza `authTagLength: 16` (DEP0182) e senza AAD legata al tenant.
34. F24 minori: modello a saldo zero non diviso oltre 6 righe Erario / 4 INPS (bloccato in stampa e nel file, non errato); date di pagamento scelte a mano non spostate al giorno lavorativo (nessuna fonte dice che una festiva sia scartata: **da verificare**); due piani di anni diversi creati insieme possono usare lo stesso credito (lettura del residuo senza lock); avviso per segnare pagato anche il modello a saldo zero, altrimenti gli acconti compensati non entrano in LM45.
35. Regole: `activatedById` sempre vuoto; due set ACTIVE possibili con attivazioni concorrenti (nessun indice unico parziale); `activeVersion` del piano senza `orderBy`; `inpsReducedRate` del piano dedotto confrontando aliquote di anni diversi (oggi coincidono) invece di `TaxYearData.inpsReducedRate`; GET `/taxes/:year/data` (e tutto ciò che passa da `summary()`) scrive con un upsert, e `data` restituisce l'entità Prisma senza mapper.
36. Sicurezza minori: sessione di 30 giorni fissa, senza scadenza per inattività né pulizia; `User.tenantId` legacy elencato ma non selezionabile; logout via GET su `/session-expired` (CSRF, token che resta valido); Swagger senza login se `NODE_ENV` non è `production`; email digitata salvata nei login falliti; `.env.example`, SECURITY.md e il commento in `main.ts` non aggiornati (TRUST_PROXY, NODE_ENV, WEB_ORIGIN; il throttler conta anche i login riusciti ed è in memoria).

**Fonti da archiviare** (citate nel codice ma non nel registro): Circ. INPS 62/2026; ris. AdE 110/E/2019 (il PDF all'URL noto dà 404); scadenzario AdE del 16/09/2026 (0,29% della seconda rata). Correggere i paragrafi della Spec. 1.9.1 in `docs/normativa-2026.md` (canale PEC: §1.3.1, non §1.5) e in questo file (canali §1.3.1).
**Da verificare**: soglia dei 12 € (Fasc. 1 la scrive per IRPEF e addizionali; per l'imposta sostitutiva solo per estensione dalla Circ. 10/E/2016; per l'INPS nessuna fonte); art. 21 c. 4 lett. c-d per il termine di emissione verso clienti esteri (`issueTermHint`, `eInvoice.issueDays`), testo non archiviato.
**Smentiti nella verifica**: interessi della seconda rata dal 20/8 (0,29% è giusto); interessi DPPI sul contributo maggiorato (giusto: la Circ. INPS 62/2026 §4 rateizza anche la maggiorazione); incassi persi eliminando una bozza riaperta (non si può eliminare); nessuna BOLA tra tenant (tutte le query verificate). Il differimento del bollo sopra i 5.000 € per trimestre non può capitare a un forfettario.

### Registro delle fonti ufficiali
Decisione (24/09/2026): **documenti archiviati nel repository**. Come funziona: [docs/fonti/README.md](docs/fonti/README.md).
- **Fonti del 2025 per i valori uguali al 2026**: il set 2025 eredita dal 2026 anche le citazioni, che per alcuni valori parlano dei versamenti 2026 (es. istruzioni Redditi 2026, D.Lgs. 33/2025 in vigore dal 2026). I valori sono gli stessi, ma per il 2025 servono le fonti in vigore nel 2025 (es. L. 97/1977, istruzioni Redditi 2025).
- **Citazioni della matrice di conformità e della normativa** collegate al registro: id della fonte, sezione o pagina, testo esatto; normativa e matrice generate o controllate da questi dati. Comprese le fonti verificate il 23-24/09/2026 non ancora archiviate: Circ. INPS 62/2026, Spec. 1.9.1 (già archiviata), guida AdE bollo (già archiviata), ris. 110/E/2019, art. 7-ter e 7-septies DPR 633/72, TUIR art. 9, esempi delle ricevute SDI già in `packages/fatturapa/schemas/messaggi/`.
- **Link alla regola usata**: dalle pagine imposte, F24 e fatture un link alla regola usata (pagina **Regole fiscali**, `/rules`).
- **Monitoraggio** (epica "Monitoraggio normativo"): il registro sostituisce la tabella `RuleSource` prevista nel design; il job usa `scripts/fonti.mjs check` o la stessa logica.
- Testo delle tabelle XLS oggi rigenerato a mano (vedi README): estrazione automatica solo se serve, con una dipendenza stabile.
- **Da valutare** caso per caso i documenti che non sono atti ufficiali in senso stretto (guide divulgative, modelli): base legale L. 633/1941 art. 5 ("Le disposizioni di questa legge non si applicano ai testi degli atti ufficiali dello stato e delle Amministrazioni pubbliche", archiviato). Il modello F24 oggi non è ridistribuito per scelta (`f24-pdf.service.ts`), da riallineare.

### Sicurezza di base (prima dell'autenticazione)
Finché non c'è il login, l'applicazione va usata **solo in locale**: chi raggiunge l'API può leggere e modificare i dati di qualunque partita IVA (OWASP A01). Esito della security review del 23/09/2026 (intero codebase, OWASP Top 10; `pnpm audit` senza vulnerabilità note; parser e builder XML verificati contro XXE, billion laughs e prototype pollution).
- errori in `/f24` e `/credits` passati come codice invece che come testo nell'URL (rischio basso: React fa l'escape e l'app è solo locale);
- `updateMany`/`deleteMany` con `tenantId` o un'estensione Prisma che lo inietti, come difesa in profondità per quando ci sarà l'autenticazione.

### Qualità del codice e architettura dell'API
Regole di lavoro in [AGENTS.md](AGENTS.md), letto anche da Claude Code tramite `CLAUDE.md`. Oggi i DTO sono solo di richiesta, più classi per file (fino a 8 in `invoices.dto.ts`), e i controller restituiscono direttamente le entità Prisma: ogni campo del database arriva al client (OWASP [API3:2023](https://api-security.owasp.org/editions/2023/en/0x11-t10), Broken Object Property Level Authorization). Documentazione da seguire: NestJS [OpenAPI](https://docs.nestjs.com/openapi/introduction) e [CLI plugin](https://docs.nestjs.com/openapi/cli-plugin), [validazione](https://docs.nestjs.com/techniques/validation).
- **DTO in due cartelle per modulo**: `dto/request/` e `dto/response/`, **una sola classe per file**, nome `<nome>.dto.ts` (richiesto dal plugin Swagger per documentare le proprietà).
- **Cartelle di ogni modulo** (AGENTS.md): da fare per `tenants`, `fiscal-rules`, `sources`, `exchange-rates`.
- **Interfacce e tipi in file dedicati**: le interfacce e i tipi esportati stanno in `types/` del modulo, uno per file (`<nome>.ts`); oggi molti sono ancora dentro i service (es. `InvoiceWithRelations` in `invoices.service.ts`) o nei file dei DTO.
- **Niente duplicati tra API e web** (AGENTS.md, regola 3): oggi il web ricopia elenchi dell'API e dei pacchetti (modalità di pagamento e `usesBankAccount` in `lib/payment-methods.ts`, i valori di `PlanStart`, degli stati e delle sezioni F24 in `lib/types.ts`). Da valutare: il web dipende da `@opentax-it/fatturapa` e `@opentax-it/fiscal-rules` con un export dedicato ai soli dati, senza `xsd.ts` e le altre parti che usano Node; per i tipi delle risposte, tipi generati dall'`openapi.json` (voce qui sotto).
- **DTO di risposta e mapper** per ogni endpoint: un mapper (`<nome>.mapper.ts`) costruisce il DTO dalla entità; nessun controller restituisce più entità Prisma o oggetti interni. Scegliere per ogni risposta i campi da esporre (es. niente `tenantId`, percorsi di storage, hash interni). Il mapper può usare **class-transformer** (già installato, 0.5.1, ultima stabile): `@Expose()` su ogni campo del DTO di risposta e `plainToInstance(..., { excludeExtraneousValues: true })` come allowlist dei campi, `@Transform()` per le conversioni (es. `Decimal` di Prisma). Da valutare anche `ClassSerializerInterceptor` di NestJS ([serializzazione](https://docs.nestjs.com/techniques/serialization)), che serializza solo istanze di classe: "A plain JavaScript object ... is not serialized correctly".
- **Swagger** con `@nestjs/swagger` (ultima versione stabile): `DocumentBuilder` e `SwaggerModule.setup` in `main.ts`, plugin CLI in `nest-cli.json` con `classValidatorShim` e `introspectComments`, tipo di risposta dichiarato su ogni endpoint (`@ApiOkResponse` e simili), tag per modulo. La pagina della documentazione solo in locale o disattivabile per ambiente (OWASP API8:2023, Security Misconfiguration).
- **Pattern API**: rivedere percorsi, metodi e codici di stato (es. `POST /fiscal-rules/seed`, azioni come `/issue` e `/activate`) e scegliere una convenzione unica, documentata in AGENTS.md.
  - `tenants`: banche e profili di scadenza diventano moduli e risorse proprie (`/bank-accounts`, `/payment-terms`); le sedi INPS sono dati di riferimento, non del tenant (`/inps-offices`);
  - `fiscal-rules`: lo stesso segmento vale ora come anno (`GET /fiscal-rules/:year`) e come id (`POST /fiscal-rules/:id/activate`). Separare i set di regole (`/rule-sets?year=`, `/rule-sets/:id`) dallo scadenzario, che è del tenant (`/deadlines?year=`).
  - Ancora senza DTO di risposta: `taxes` (riepilogo e dati dell'anno), `customers`, `sources`, `exchange-rates`.
- **Migrazione per modulo**, un modulo per volta con i suoi test verdi: prima i piccoli (banche, profili di scadenza, crediti), poi clienti, incassi, F24, fatture; il web si adegua ai tipi di risposta (`apps/web/src/lib/types.ts`).
- **Controlli automatici** perché le regole restino rispettate (le istruzioni in AGENTS.md sono contesto per gli agenti, non un vincolo):
  - test di architettura nell'API: i DTO stanno solo in `dto/request` e `dto/response`, una classe per file; i controller non importano `PrismaService`;
  - test sul documento OpenAPI generato: ogni endpoint dichiara il tipo di risposta e nessuno schema di risposta espone campi vietati (es. `tenantId`);
  - regola di lint `max-classes-per-file` sui DTO, se supportata da oxlint (**da verificare** nella documentazione di oxlint);
  - `openapi.json` versionato e controllato in CI, così ogni modifica all'API si vede nella diff della PR;
  - modello di PR (`.github/pull_request_template.md`) con la checklist: fonte ufficiale e citazione, test, OWASP, documentazione letta, AGENTS.md aggiornato se cambia una convenzione.

- Appunti del 01/10/2026 (da decidere uno per uno e poi scrivere in AGENTS.md):
  - **Niente `any`**: regola di lint in API e web; prima contare quelli di oggi.
  - **Stati e codici in enum o `as const`**: gli stati del database vengono già dagli enum del client Prisma generato; nel web e in alcuni tipi dell'API restano stringhe sparse, da portare a `as const` con il tipo derivato (insieme a "Niente duplicati tra API e web").
  - **Descrizioni dei codici in un solo posto**: codici tributo e causali F24, nature IVA, tipi documento, modalità di pagamento, stati SDI hanno oggi descrizioni in più file (pacchetti, API, pagine web: es. `f24-card.tsx`, `lib/payment-methods.ts`, `invoice-status-badge.tsx`). Un solo elenco per codice, da fare insieme all'epica "Testi e messaggi in file (i18n)" per non spostare tutto due volte.
  - **Tipi del web generati dal documento OpenAPI** che `@nestjs/swagger` costruisce (`pnpm --filter @opentax-it/api run openapi`), al posto di `apps/web/src/lib/types.ts` scritto a mano: strumento da scegliere (pacchetto mantenuto, versione stabile).
  - **DTO di richiesta `readonly`**: prima verificare che class-transformer (`transform: true`, che crea le istanze) e class-validator funzionino con proprietà `readonly`.
  - **Prettier**: configurazione nel repository e controllo in CI. Il primo passaggio riformatta molti file: farlo in un commit solo di formattazione, quando non ci sono PR aperte.
  - **Lint**: oggi oxlint nell'API ed ESLint (configurazione di Next.js) nel web. Unificare solo se a uno dei due manca una regola che serve (es. `no-explicit-any`, `max-classes-per-file`).

### Autenticazione e permessi
- **Utenti e permessi**: da fare ancora nel web, per chi ha accesso in **sola lettura**, nascondere o disattivare i pulsanti che modificano (oggi li vede e l'API risponde "Hai accesso in sola lettura a questa partita IVA"); collegamento con la voce "Deploy" (HTTPS) prima di esporre l'app in rete.
- **Registro delle azioni** (01/10/2026): `AuditLog` registra oggi solo accessi, registrazioni e cambi di partita IVA. Estenderlo a ogni scrittura e cancellazione (fatture, incassi, F24, crediti, regole, profilo): chi, quando, cosa e su quale documento, senza dati personali né segreti nel dettaglio (OWASP Logging Cheat Sheet), e una pagina per consultarlo. Utile soprattutto con più utenti sulla stessa partita IVA.
- Resta valida la regola delle risposte uguali sul login e sul recupero password ([OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages)).

### Dati facoltativi del cedente in fattura
- Dal confronto del 30/09/2026 (anagrafica del software in uso). Spec. FatturaPA 1.9.1 (archiviata), CedentePrestatore: `AlboProfessionale`, `ProvinciaAlbo`, `NumeroIscrizioneAlbo`, `DataIscrizioneAlbo` e `CodEORI` sono facoltativi; `IscrizioneREA` è obbligatoria "nei soli casi di società soggette al vincolo dell'iscrizione nel registro delle imprese ai sensi dell'art. 2250 del codice civile", quindi non per le persone fisiche gestite dall'app. Da aggiungere al profilo come facoltativi l'albo (utile con le casse professionali) e il REA per chi vuole indicarlo.

### Invio allo SDI via PEC e ricevute
Normativa verificata in [docs/normativa-2026.md](docs/normativa-2026.md) §4.3. Nessuna prova reale del canale ancora fatta.

**Canali verificati (24/09/2026, fatturapa.gov.it "Inviare la FatturaPA" e "Test del processo di fatturazione elettronica"; Spec. 1.9.1 §1.5)**
- **PEC**: nessun accreditamento, messaggio fino a 30 MB, primo invio a `sdi01@pec.fatturapa.it` e poi all'indirizzo assegnato dallo SDI. **Non esiste un ambiente di prova per chi usa solo la PEC**: il primo invio è reale.
- **Invio web** dal portale Fatture e Corrispettivi (SPID/CIE/CNS, file fino a 5 MB): manuale, nessuna API.
- **SDICoop (web service SOAP) e SDIFTP**: sono le uniche vie "via API", ma richiedono l'accreditamento sul Sistema di Accreditamento, certificati rilasciati dallo SDI, test di interoperabilità, un accordo di servizio e la "capacità di gestione di certificati digitali"; per ricevere fatture e notifiche va esposto un servizio web raggiungibile da internet (SdICoop - Ricezione). L'ambiente di test esiste solo per i canali accreditati. Non adatti a un'app locale per un singolo professionista.
- **Servizi massivi SDICoop** (agenziaentrate.gov.it, "Servizi massivi SDICoop"): download massivo di fatture e dati, trasmissione dell'elenco B del bollo; riservati ai "provider Web-Service, già accreditati al servizio SdI-Cooperazione Applicativa". Stesso ostacolo dell'accreditamento; utili solo se un giorno il progetto si accreditasse. Esperienze di accreditamento SDICoop (forum.italia.it, "Test interoperabilità soluzioni", fonte secondaria): percorso fattibile ma impegnativo (piano di test di interoperabilità, notifiche da produrre nel formato esatto, firma digitale); il kit di sviluppo su fatturapa.gov.it (piano di test SDICoop, documento "SDICoop ricezione") è il punto di partenza, nelle versioni correnti.

**Da fare e da verificare**
1. **Prove reali del canale**, in ordine e senza emettere fatture (nessun test automatico può inviare allo SDI):
   - prova di connessione SMTP/IMAP alla casella PEC, senza invii;
   - PEC senza allegato a `sdi01@pec.fatturapa.it` (pulsante "Invia PEC di prova allo SDI" in Impostazioni PEC): lo SDI risponde con un "messaggio di cortesia" (Spec. 1.9.1 §1.3.1: "a fronte dell'invio di una PEC priva di allegato da parte del soggetto trasmittente, il SdI invia un messaggio di cortesia");
   - file di prova volutamente scartato (es. data futura, errore 00403), marcato "PROVA": arriva la ricevuta di scarto e, secondo l'AdE, "la fattura non è mai stata emessa". Resta visibile tra le ricevute del portale Fatture e Corrispettivi;
   - solo dopo, il primo invio di una fattura vera, fatto insieme all'utente.
2. **Gestori PEC preconfigurati** (`packages/fatturapa/src/sdi-pec.ts`), parametri da ricontrollare periodicamente:
   - Register.it: `imap.pec-email.com` e `smtp.pec-email.com`, anche per i domini personalizzati ([pagina](https://www.register.it/assistenza/configura-la-pec-su-dispositivo/)). **Da verificare**: Register S.p.A. non compare tra i gestori attivi dell'[elenco AgID](https://www.agid.gov.it/it/piattaforme/posta-elettronica-certificata/elenco-gestori-pec), mentre il suo manuale operativo v6.3 del 03/08/2026 la dichiara gestore PEC;
   - Namirial: inserimento manuale. Gli host di Namirial non sono su una pagina ufficiale raggiungibile: la sua guida rimanda alle impostazioni della webmail;
   - InfoCert Legalmail: le guide di configurazione dei client indicano la password della casella; l'autenticazione a due fattori è descritta solo per la webmail (app My InfoCert). **Da verificare** se con la 2FA attiva i client IMAP/SMTP continuino ad accettare la password della casella;
   - Poste Italiane (postecert.it): la pagina di configurazione non parla di autenticazione a due fattori né di password dedicate. **Da verificare**. Il limite che conta è quello dello SDI, 30 MB per messaggio; i gestori ne accettano 100.
3. **Da verificare**: la struttura dello ZIP scaricato dal portale e se il nome dei file delle fatture scaricate coincide con il NomeFile delle ricevute (import manuale delle ricevute SDI).
4. **Da verificare**: le date delle ricevute SDI senza fuso orario (l'esempio ufficiale MC ha "2013-06-06T12:00:00") sono lette come ora italiana (`common/italian-date.ts` → `parseSdiDateTime`); nessuna fonte ufficiale indica il fuso.
5. **Da verificare** con la prima ricevuta reale quale schema arriva via PEC: le Specifiche 1.9.1 (Appendice 4, schema AdE `MessaggiFatturaTypes_v1.0`) chiamano le ricevute `RicevutaScarto` e `RicevutaImpossibilitaRecapito` (con `DataMessaADisposizione`), mentre lo schema di fatturapa.gov.it `MessaggiTypes_v1.1` usa `NotificaScarto` e `NotificaMancataConsegna`. Si leggono entrambi; lo schema AdE non è scaricabile come file separato, il testo è nelle specifiche archiviate.
6. Da fare solo se servirà: per una fattura scartata, l'alternativa b) della circolare 13/E del 2 luglio 2018 §1.6, numerazione sezionale tipo "1/R" (oggi l'app fa il reinvio con lo stesso numero e l'alternativa a), nuovo numero collegato alla scartata).
- Conservazione: le fatture emesse vanno conservate a norma (DPR 633/72 art. 39; DM 17/06/2014). Da fare: storico delle fatture nell'applicazione e promemoria di adesione nella pagina di setup.

### Dichiarazione dei redditi: guida alla precompilata Redditi PF (prospetto LM/RR)
- Obiettivo: aiutare il contribuente a presentare **da solo** la precompilata Redditi PF, correggendo con i dati dell'app i righi che l'Agenzia non può conoscere. L'app non presenta la dichiarazione (invio solo dai servizi AdE) e non gestisce i quadri personali (familiari, spese, altri redditi).
- Verificato il 30/09/2026 (fonti archiviate: `ade-guida-precompilata-redditi-pf-2026`, `ade-infoprecompilata-quadro-lm`):
  - chi ha "redditi di lavoro autonomo per i quali è richiesta la partita Iva" o redditi d'impresa deve presentare Redditi PF, "non potendo utilizzare il modello 730 precompilato (né quello ordinario)";
  - la precompilata "Redditi Web" vale anche per i forfettari (quadro LM); chi è soggetto agli ISA o ha redditi da partecipazione deve usare "Redditi Online";
  - **LM, righi LM22-LM27**: ricavi dalla somma delle fatture elettroniche e dei corrispettivi dell'anno, con la "presunzione [...] che il pagamento sia stato effettuato alla data di emissione della fattura". Per il principio di cassa il contribuente deve includere le fatture dell'anno prima incassate nell'anno ed escludere quelle "che non risultano incassate al 31 dicembre": **è il dato che l'app calcola già** (incassi). Contributi di cassa esclusi dai ricavi per chi ha una cassa, inclusi per la Gestione Separata (come fa l'app). Con più codici ATECO di gruppi diversi i ricavi vanno divisi per rigo;
  - **LM35 non è precompilato**: i contributi versati sono "riportati solo nel foglio informativo" e tocca al contribuente mettere in LM35 quelli dell'attività forfettaria (l'eccedenza in RP21). L'app li ha (F24 pagati e importi inseriti in Imposte);
  - eccedenze e acconti dell'imposta sostitutiva: precompilati da dichiarazione precedente e F24;
  - **RR**: l'INPS fornisce una parte dei dati (sezione I Artigiani e Commercianti: minimale, contributi versati, riduzione "C" del forfettario da cambiare in "D" oltre 100.000 €); il reddito oltre il minimale (colonne 24 e 25 di RR2/RR3) lo integra il contribuente;
  - date 2026: precompilata dal 20 maggio, presentazione dal 27 maggio al 2 novembre.
- Da fare:
  1. crediti di Artigiani e Commercianti (RR4: minimale con AF/CF, oltre il minimale con AP/CP): il registro dei crediti non ha il codice INPS di 17 cifre che la riga F24 di credito richiede ("Formato 3"), né lo passa la compensazione (`buildCompensation`); da aggiungere prima di registrarli in automatico;
  2. quadro RR per attività iniziata in corso d'anno (mesi, minimale e massimale in proporzione) e familiari collaboratori;
  3. riduzione del 50% per i nuovi iscritti del 2025 (codice E in RR2 col. 7), legata alla voce "Gestione INPS Artigiani e Commercianti";
  4. non gestiti: perdite pregresse (LM37), più attività di gruppi ATECO diversi, due moduli (5% e 15% nello stesso anno), diritti d'autore (colonna 4), ripartizione dei crediti di LM40 per colonna.

## Fatturazione

### Anteprima e stampa della fattura
- Da fare: invio della fattura via email al cliente (copia di cortesia: l'originale è l'XML consegnato dallo SDI).
- Proposta del 01/10/2026: **QR code di pagamento** sulla copia di cortesia, con IBAN, beneficiario, importo e causale (numero fattura), secondo lo standard europeo EPC per i bonifici SEPA (EPC069-12, European Payments Council: da archiviare). Il cliente paga inquadrandolo e i bonifici arrivano con la causale giusta, cosa che aiuta anche la riconciliazione bancaria. Non è una regola fiscale; per generare il QR, una libreria mantenuta (regola "non reinventare").

### Fatture alla PA e firma digitale — priorità bassa
- Verificato (fatturapa.gov.it, "Firmare la FatturaPA"): ogni fattura verso la PA "deve essere firmato dal soggetto che emette la fattura" con certificato di firma qualificata (AgID), in CAdES Baseline B (`.xml.p7m`) o XAdES Baseline B enveloped; "signing time" valorizzato, marca temporale non obbligatoria. Per le fatture tra privati la firma è facoltativa (Spec. 1.9.1 §1.2.1).
- Oggi l'emissione verso la PA è bloccata. Per sbloccarla: firma con il certificato dell'utente (smart card/token o firma remota), invio del file firmato, e i dati obbligatori per la PA **da verificare** (es. CIG e CUP nei dati dell'ordine o del contratto, art. 25 DL 66/2014; regole del DM 55/2013 allegato A).

### Data della fattura nel passato
- Il software in uso non permette una data di fattura precedente a oggi; OpenTax IT blocca solo le date future (errore SDI 00403) e accetta quelle passate, per esempio una fattura dimenticata. **Da verificare** sulle fonti (art. 21 DPR 633/72 sui termini di emissione, numerazione progressiva) se servono controlli, per esempio una data precedente a quella dell'ultima fattura numerata o oltre i termini di emissione, come avvisi.

### Azioni rapide nella lista fatture
- Da fare: stato "Incassata" o "Da incassare" nella lista, con l'importo incassato che l'API restituisce già (`InvoiceListItemDto.collected`).

### Solleciti e interessi di mora
Proposta del 01/10/2026, collegata alle fatture scadute in dashboard (epica "Pagina Analytics"). Per le fatture scadute e non incassate verso aziende e professionisti: un sollecito pronto da inviare (testo e PDF, poi via email quando ci sarà l'invio), con gli interessi di mora calcolati dal giorno dopo la scadenza. **Da verificare** sulle fonti prima di scriverlo: D.Lgs. 231/2002 (ambito: solo transazioni commerciali, non i privati consumatori; decorrenza; tasso di riferimento più la maggiorazione; importo forfettario per i costi di recupero, art. 6) e il comunicato semestrale del MEF in Gazzetta Ufficiale con il tasso, da mettere nel set di regole per semestre. Gli interessi di mora incassati non sono ricavi della fattura: come trattarli nel forfettario **da verificare**.

### Controlli sui clienti
Proposta del 01/10/2026.
- **VIES per i clienti UE**: oggi l'app avvisa se l'utente stesso non è iscritto al VIES, ma non controlla il numero IVA del cliente. Interrogare il servizio VIES della Commissione europea quando si crea o modifica un cliente UE "azienda", e prima di emettere una fattura con inversione contabile: un numero non valido vuol dire che il cliente va trattato come privato (art. 7-ter, N2.2). Avviso, non blocco (il servizio a volte non risponde). **Da verificare**: documentazione ufficiale del servizio (REST o SOAP, limiti d'uso) e se conservare l'esito come prova della verifica.
- **Controllo formale** di codice fiscale e partita IVA italiani (carattere di controllo), prima con un pacchetto mantenuto se esiste (regola "non reinventare"); algoritmo dalla fonte ufficiale (DM 23/12/1976 per il codice fiscale, **da verificare**).

### Riconciliazione bancaria degli incassi
Proposta del 01/10/2026. Oggi ogni incasso si registra a mano dalla lista fatture. Import dell'estratto conto (ISO 20022 `camt.053`, standard per le banche europee, e CSV delle banche più diffuse con una mappatura delle colonne) e proposta di abbinamento movimento → fattura (importo, causale con il numero fattura, nome del cliente), da confermare a mano: l'incasso nasce con la data del movimento (principio di cassa, L. 190/2014 c. 64). Più movimenti per una fattura (rate, incassi parziali) e un movimento per più fatture. Prima di scrivere il parser, una libreria mantenuta per `camt.053`. Le API delle banche (PSD2, accesso ai conti) richiedono un fornitore autorizzato: fuori dal perimetro per ora.

### Professioni sanitarie: Sistema Tessera Sanitaria
Proposta del 01/10/2026. Oggi un professionista sanitario non può usare OpenTax IT per le prestazioni sanitarie a persone fisiche. **Da verificare** sulle fonti ufficiali (sistemats.it, AdE, Normattiva):
- divieto di fattura elettronica via SDI per i dati da inviare al Sistema TS (art. 10-bis DL 119/2018 e proroghe; vale per il 2026?): la fattura resta cartacea o PDF, con numerazione e bollo propri;
- obbligo e scadenze di invio dei dati delle spese sanitarie al Sistema TS (DM 31/07/2015 e successivi), tracciato e canale (web service con credenziali dell'utente), opposizione del paziente;
- chi è tenuto (iscritti agli albi sanitari, anche in Gestione Separata o in una cassa, es. ENPAP per gli psicologi).
Poi: tipo di documento "fattura non elettronica" nella numerazione, bollo e fatturato calcolati anche su queste, e file per il Sistema TS. Da fare insieme all'epica "Casse professionali".

### Modalità di pagamento: fine mese, rate, RiBa
Richiesto il 30/09/2026 (confronto con il software in uso: profili come "BN5 Bonifico 10 gg d.f.", "RB3 Ricevuta bancaria 30/60/90 gg f.m."). Oggi un profilo di scadenza ha più rate (`dueDays`), "fine mese" (`fromMonthEnd`) e il metodo.
- Verificato sulla Spec. FatturaPA 1.9.1 (archiviata, §2.1.10 e XSD):
  - `DatiPagamento` si ripete (`maxOccurs="unbounded"`), ognuno con `CondizioniPagamento` ("TP01 pagamento a rate", "TP02 pagamento completo", "TP03 anticipo") e uno o più `DettaglioPagamento` (`maxOccurs="unbounded"`), ciascuno con la propria `ModalitaPagamento`, `DataScadenzaPagamento` e `ImportoPagamento`: più rate si scrivono come più `DettaglioPagamento` sotto TP01;
  - il "fine mese" non è un concetto FatturaPA: si scrive la data di scadenza calcolata, oppure `DataRiferimentoTerminiPagamento` ("data dalla quale decorrono i termini di pagamento") più `GiorniTerminiPagamento` ("Vale 0 (zero) per pagamenti a vista");
  - `ModalitaPagamento` ha 23 codici (MP01-MP23); la RiBa è "MP12 Riba"; **"rimessa diretta" non è tra i codici**: è una condizione commerciale, il metodo resta quello con cui il cliente paga davvero;
  - nessun controllo SDI sui dati di pagamento nell'elenco degli errori della specifica.
- La guida AdE alla compilazione (v1.10, aprile 2025) non tratta i dati di pagamento.
- Da fare: scadenza a **giorno fisso** (es. "R.B. 30 gg al 15 del mese" del software in uso); rate con importi diversi (percentuali) se servono; incassi collegati alle singole rate.
- Campi facoltativi di `DettaglioPagamento` (Spec. 1.9.1, visti nella finestra "Scadenza" del software in uso): data di inizio e giorni dei termini, sconto per pagamento anticipato e data limite, penalità per ritardo e data di decorrenza, beneficiario diverso dal cedente, codice ufficio postale, dati del quietanzante (solo MP04 contanti presso Tesoreria). Da aggiungere solo se servono a qualcuno; oggi l'app scrive metodo, scadenza, importo, IBAN e BIC.
- Modifica a mano di una scadenza o dell'importo di una rata nella bozza, come nel software in uso (oggi le rate seguono il profilo).

### Template di fattura
- Righe ricorrenti, descrizioni e note salvate come modelli; duplicazione di una fattura esistente.
- Dal confronto con il software in uso (30/09/2026): un **catalogo di articoli** (codice, descrizione, unità di misura, prezzo) da richiamare nelle righe; lì anche il bollo è un articolo, come "commento" (solo dicitura) o come "spese" (addebitato al cliente).

### Preventivi
- Proposta del 30/09/2026 (il software in uso ha "Preventivi / Ordini" e DDT tra i documenti di vendita): preventivo al cliente, fuori dallo SDI, da trasformare in bozza di fattura quando accettato. Per un forfettario che vende servizi servono solo i preventivi; DDT (trasporto di beni) non nel perimetro.

### Bollo addebitato o no al cliente
- Oggi l'app somma sempre i 2 € del bollo al totale (addebitato al cliente). Il software in uso permette di scrivere il bollo solo come dicitura, senza addebitarlo. **Da verificare** sulle fonti (DPR 642/1972, guida AdE bollo) chi deve il bollo e se addebitarlo al cliente è facoltativo, prima di aggiungere la scelta nel profilo o nella fattura.

### Situazione iniziale: chi arriva da altri software o da un commercialista
Proposta del 30/09/2026: caricare tutto ciò che serve a capire la situazione di chi inizia a usare OpenTax IT a metà strada, così l'app può aiutarlo a continuare (calcoli, F24, scadenze, dichiarazione). Una procedura per anno che, per ogni voce, dice dove trovarla nei servizi ufficiali e in quale formato; **prima di scriverla va verificato quali esportazioni offrono davvero l'Agenzia (portale Fatture e Corrispettivi, cassetto fiscale) e l'INPS (cassetto previdenziale)**, senza assumere formati.
- Cosa caricare o indicare, e a cosa serve (le fatture emesse si importano già, in XML e ZIP, anche dal portale Fatture e Corrispettivi):
  1. **ricevute SDI** delle fatture importate (RC consegna, MC messa a disposizione, NS scarto): l'import unico le accetta già insieme alle fatture; dicono se la fattura è emessa e in quale trimestre conta il bollo (data di consegna o di messa a disposizione). Senza ricevute la fattura conta con la sua data e il trimestre del bollo è segnato "Stima": la procedura deve chiederle o segnalarne la mancanza;
  2. **incassi** delle fatture importate, con la loro data (principio di cassa): un incasso per fattura, non uno per tutte (vedi "Import da altri strumenti");
  3. **bolli già pagati** per trimestre: pagati con F24 (codici 2521-2524, anche con F24 caricato a mano) o dal portale con addebito sull'IBAN; si segnano già nella pagina Bollo ("Pagato dal portale" con importo e data), resta da aggiungerlo al percorso della situazione iniziale;
  4. **F24 già pagati nell'anno** (acconti, saldi, contributi, bollo): per acconti e contributi versati (LM35, LM45, RR);
  5. **dichiarazione precedente**: acconti dovuti, crediti (LM47, RR8), eccedenze (LM43), da registrare nei Crediti. Non solo all'inizio: ogni anno, dopo la presentazione, si carica la nuova dichiarazione, così crediti da usare, acconti e contributi restano chiari (appunto del 01/10/2026; la generazione della dichiarazione resta fuori: basta la precompilata). Formato del file (telematico o PDF della ricevuta) e possibilità di scaricarlo dal cassetto fiscale **da verificare**;
  6. **dati INPS**: codici di 17 cifre dell'anno, minimale, riduzioni, rate fisse già pagate;
  7. **fatture ricevute** (epica "Fatture ricevute").
- **Controlli sulle fatture ricevute** (dal caso del 30/09/2026: fattura di un professionista non forfettario con la dicitura e la natura N2.2 del forfettario e la ritenuta del 20% verso una cliente forfettaria):
  - ritenuta d'acconto in fattura quando il profilo è forfettario: chi paga "non è tenuto" a operarla (L. 190/2014 c. 69); se la trattiene e la versa (1040) si comporta da sostituto, con gli obblighi relativi (CU, 770: **da verificare** sulle fonti prima di scriverlo nell'app);
  - ritenuta applicata da chi si dichiara forfettario: i suoi compensi "non sono assoggettati a ritenuta d'acconto" (c. 67);
  - dicitura del forfettario e natura N2.2 da chi non lo è, quando lo si può sapere;
  - avvisi, non blocchi: la correzione spetta a chi emette (nota di credito e nuova fattura).

### Import da altri strumenti
- Da fare: fatture firmate `.xml.p7m` (CAdES, Spec. 1.9.1 §1.2.1; se il file possa arrivare anche in base64 **da verificare**); IdentificativoSdI dai file di metadati (`FileMetadati` AdE e `MetadatiInvioFile` fatturapa.gov.it, quale usi il portale **da verificare**); fatture ricevute; riconciliazione degli incassi (epica "Riconciliazione bancaria degli incassi").
- Da archiviare nel [registro delle fonti](docs/fonti/README.md): specifiche "Consultazioni e Download Massivi" v2.4 (ivaservizi.agenziaentrate.gov.it), pagina di assistenza "Consultare le fatture elettroniche", XSD `MessaggiFatturaTypes_v1.0`.
- Scartato il 30/09/2026: "importa e segna tutto come incassato" nell'anteprima dell'import. Per il principio di cassa (L. 190/2014 c. 64) ogni fattura conta alla data vera del suo incasso, e fatture diverse si incassano in giorni diversi: una data unica sarebbe sbagliata.
- OCR per fatture cartacee/PDF: bassa priorità (dal 2019 ogni fattura emessa esiste come XML; l'OCR servirebbe solo per documenti precedenti o per fatture ricevute da soggetti esclusi).

### Fatture ricevute (acquisti)
- Le fatture ricevute non incidono sul reddito forfettario ma servono per il registro e per l'IVA sugli acquisti esteri (L. 190/2014 c. 60: versamento entro il 16 del mese successivo). Import dallo SDI e scadenza in calendario.
- Oggi l'import rifiuta gli XML in cui il cedente non è la partita IVA attiva (`invoices-import.service.ts`): le fatture ricevute non entrano.
- **Come arrivano** (Spec. 1.9.1 §1.5.5, archiviata; verificato il 26/09/2026). Lo SDI recapita a:
  1. l'indirizzo telematico registrato dal destinatario sul portale Fatture e Corrispettivi (§1.5.1.2: la registrazione "verrà considerata dal SdI come prioritaria");
  2. altrimenti il canale del `CodiceDestinatario` scritto dal fornitore (il codice di un software o di un intermediario);
  3. con `CodiceDestinatario` "0000000", la PEC in `PECDestinatario`;
  4. senza PEC, o se il recapito non riesce, l'area riservata del destinatario sul sito dell'Agenzia ("ricevuta di impossibilità di recapito" al fornitore).

  Quindi la PEC riceve le fatture solo se il destinatario l'ha registrata o se il fornitore la indica. I canali web service e SFTP richiedono l'accreditamento (epica "Invio allo SDI via PEC").
- Passi:
  1. **Import dal portale Fatture e Corrispettivi**: estendere l'import di XML e ZIP ai documenti in cui la partita IVA attiva è il cessionario/committente, salvati come acquisti, separati dalle fatture emesse (tabella e pagina proprie). **Da verificare** sulla pagina ufficiale del servizio di consultazione se nel portale sono disponibili tutte le fatture ricevute, anche quelle recapitate via PEC o codice destinatario, o solo quelle messe a disposizione nell'area riservata.
  2. **Via PEC, facoltativa**: per chi registra la propria PEC come indirizzo telematico, leggere dalla casella anche le fatture in arrivo (un file fattura e un file di metadati per messaggio, Allegato B DM 55/2013 v1.8.4 §3.2.1), insieme alle ricevute dell'epica PEC.
  3. Scadenze e versamento dell'IVA sugli acquisti esteri (L. 190/2014 c. 60, **da verificare** nel testo prima di codificarlo).

## Versamenti

### Gestione INPS Artigiani e Commercianti
Per le **casse professionali** c'è la base (contributo in fattura, F24 "Altri enti" con le righe comunicate dalla cassa), ma la gestione non si può ancora scegliere nel profilo: arriverà una cassa alla volta. Ogni gestione è un modulo proprio (`packages/fiscal-rules/src/inps-separate-scheme.ts`, `inps-self-employed.ts`), scelto dal profilo attraverso il registro `contribution-schemes.ts` (Strategy): calcolo, acconti, righe F24 e scadenze di ciascuna. Dettaglio e fonti in [docs/compliance.md](docs/compliance.md).
- **Da verificare**:
  - terza rata fissa 2026: la circolare 14/2026 dice 16 novembre, le schede INPS 17 novembre (usata la circolare);
  - significato di API e CPI: la tabella AdE non li descrive, gli F24 reali li usano per gli interessi della rateazione;
  - dove va la maggiorazione dello 0,40% del differimento per Artigiani e Commercianti (oggi sulla riga API/CPI, come DPPI per la Gestione Separata);
  - regola di arrotondamento dei contributi (nessuna fonte esplicita; scelte dell'app nella matrice);
  - riduzione del 50% per chi si è iscritto per la prima volta nel 2025 (L. 207/2024 c. 186, circ. INPS 83/2025, citata dalla 14/2026): da archiviare e codificare;
  - le "sei rate" delle schede INPS per i contributi oltre il minimale, senza fonte normativa archiviata;
  - coadiuvanti e coadiutori, e soci: non gestiti.
- **Cassa professionale** (verificato il 28/09/2026, fonti archiviate nel registro):
  - Chi esercita un'attività con albo e cassa non va in Gestione Separata: vi sono tenuti "esclusivamente i soggetti che svolgono attività il cui esercizio non sia subordinato all'iscrizione ad appositi albi professionali" (DL 98/2011 art. 18 c. 12). Un forfettario può essere iscritto a una cassa e ne deduce i contributi (L. 190/2014 c. 64; LM35).
  - Le leggi delle casse applicano il contributo integrativo "su tutti i corrispettivi rientranti nel volume annuale d'affari ai fini dell'IVA [...] indipendentemente dall'effettivo pagamento" (L. 576/1980 art. 11, L. 6/1981 art. 10, L. 21/1986 art. 11); per le casse del D.Lgs. 103/1996 tra il 2% e il 5% (art. 8 c. 3). Aliquote 2026 lette sui siti delle casse (non archiviati): Cassa Forense 4%, Inarcassa 4%, CNPADC 4%, ENPAP 2%, EPAP 4%, ENPAPI 4% (2% verso la PA), CIPAG 5% (4% verso la PA), EPPI 5%, ENPAB 4%; ENPAM senza contributo integrativo generale in fattura.
  - **Da verificare**: una fonte sulla Natura del blocco cassa in particolare (oggi si arriva a N2.2 dalla guida v1.10 e dal controllo 00444); note di credito con contributo di cassa; Cassa Notariato (contributi riscossi dagli Archivi notarili, circolare UCAN 8/2024).
- **Casse professionali, calcolo automatico**: non esistono API pubbliche delle casse né dell'INPS per leggere importi o avvisi del singolo iscritto (ricerca del 28/09/2026: solo aree riservate, PDND riservata a PA e imprese per finalità pubbliche, App IO e SEND solo per gli enti mittenti). Aliquote, minimi e scadenze stanno solo nei regolamenti delle casse, sui loro siti: **deciso il 28/09/2026** di ammettere i documenti ufficiali di ciascuna cassa come fonte per le sue regole (AGENTS.md, regola 1; va esteso l'elenco dei domini ammessi nel test del registro quando si archivia la prima). **Da valutare** prima di archiviarne i file: le casse sono enti di diritto privato, e la L. 633/1941 art. 5 esclude dal diritto d'autore gli atti ufficiali "dello stato e delle Amministrazioni pubbliche"; in alternativa si registrano URL, impronta e citazioni senza ridistribuire il documento. Fino all'integrazione la gestione "Cassa professionale" non si può scegliere nel profilo (i profili che la hanno già la mantengono) e il seed non ha una partita IVA demo per le casse. Poi, una cassa alla volta, un modulo registrato come le gestioni INPS, a partire da quelle che si pagano con F24 in autoliquidazione (Cassa Forense, Inarcassa, ENPAP).
- **Monitoraggio**: i feed RSS delle circolari e dei messaggi INPS (`https://www.inps.it/it/it.rss.circolari.xml`, `...rss.messaggi.xml`) segnalano la circolare annuale di ogni gestione; da usare nell'epica "Monitoraggio normativo".

### F24 e rate — completamenti
- Da fare: ravvedimento del bollo con F24 (sanzione 2525, interessi 2526), oggi rimandato al portale (pagina **Bollo**, `/stamp-duty`).
- Da fare: ravvedimento operoso (D.Lgs. 472/97 art. 13; D.Lgs. 471/97 art. 13) con codici 8944/1989/1990 — **da verificare**.
- **File F24 per File Internet** (`packages/fiscal-rules/src/f24-telematic-file.ts`, `GET /f24/telematic-file?date=`; fonti archiviate nel registro): vincoli e punti aperti.
  - Non esiste un'API pubblica per inviare F24. Il file va controllato e "preparato" (obbligatorio, con le credenziali del contribuente) in File Internet del Desktop Telematico e poi inviato da lì o dall'area riservata ("Servizi → Trasmissioni telematiche"); SPID non si può usare per agire sull'area riservata al posto dell'utente.
  - Il tracciato esiste anche per il contribuente, non solo per gli intermediari: Allegato 1 al provvedimento del 09/03/2015, "Specifiche tecniche per la trasmissione telematica dei Modelli F24 da parte dei contribuenti", ultima versione sulla [pagina AdE](https://www.agenziaentrate.gov.it/portale/schede/pagamenti/f24/specifiche-tecniche-f24-ordinario). Vale per F24 compilati "con strumenti informatici diversi" dal software AdE.
  - Record di 1.900 caratteri (A testa, M anagrafica, un V per F24, Z coda), chiusi da "A" + CR LF; importi in centesimi. Record V "tipo A" = modello con sezione IMU v.2013, lo stesso modello che stampiamo; righe: Erario 6, INPS 4, Regioni 4, IMU 4, INAIL 3, Altri enti 2 (un ente per F24).
  - Data di addebito futura nel campo 45 del record M, uguale per tutti gli F24 del file: un file per data. IBAN facoltativo (campo 40), conto intestato al contribuente.
  - Codice INPS ("Tabella formati matricole e codici" e tabella causali AdE): Artigiani e Commercianti "Formato 3" (17 cifre), Gestione Separata "Formato 6" (vuoto). Coerente con i controlli attuali.
  - Versamenti da dichiarazione inviati prima della scadenza: addebito "con valuta alla data di scadenza, anche se nel modello è stata indicata una data di versamento precedente" ([servizi telematici](https://telematici.agenziaentrate.gov.it/Main/Versamenti.jsp)).
  - **Da chiarire**: il tracciato vuole il codice posizione "Altri enti" obbligatorio (tranne INPDAP), le tabelle AdE di 8 casse su 9 dicono di lasciarlo vuoto.
  - Scritte le sezioni Erario, INPS, Regioni e IMU e altri tributi locali (crediti della dichiarazione in compensazione); "Altri enti" esclusa finché non si chiarisce il codice posizione.
  - **Da provare** con il programma di controllo AdE "Pagamenti con modello F24" (obbligatorio per i file fatti con altri software, pagina dei servizi telematici) su un file vero: scelte da confermare nel commento del modulo (nomi in maiuscolo senza accenti, rateazione 0000 quando non richiesta, progressivo modulo 00000001 su ogni record V, campi facoltativi vuoti).
  - Da fare: promemoria (quando inviare, saldo del conto).
  - Deciso il 29/09/2026: tolti lo stato "I24 programmato", la data limite di annullamento e il badge "Pianificato" (non aggiungevano molto a "Pagato"); "Segna pagato" apre una modale con data e note su come è stato pagato, per lo storico. Il promemoria sull'ultimo giorno per annullare non si fa.
- Set di regole 2027 quando usciranno circolare INPS, istruzioni e proroghe.
- **Usi dei crediti fuori dall'app**: oggi un credito si consuma solo con le righe degli F24 generati qui. Registrare a mano un uso esterno (data, codice tributo del debito, importo), es. il credito 4001 usato dall'intermediario per versare le ritenute (codice 1040) sulle sue fatture. Gli usi esterni orizzontali contano nel limite dei 5.000 € per credito e anno (ris. AdE 110/E/2019).

### Camera di commercio: diritto annuale
Appunto del 01/10/2026. Riguarda chi è iscritto al Registro delle imprese. L'iscrizione è una pratica a parte (fuori dal perimetro: al più un promemoria e il numero REA nel profilo, vedi "Dati facoltativi del cedente"). Per il **diritto annuale** **da verificare** sulle fonti ufficiali (L. 580/1993 art. 18; note del Ministero delle imprese; istruzioni F24) chi lo deve, importo, eventuali maggiorazioni della Camera, scadenza e modalità di pagamento: c'è chi lo paga tramite il commercialista con addebito SEPA. Poi: scadenza nello scadenzario e, se si paga con F24, una riga nel piano o un F24 a parte; altrimenti solo la registrazione del pagamento.

### Più attività con codici ATECO diversi
Proposta del 01/10/2026. Il profilo ha un solo codice ATECO (`Tenant.atecoCode` / `atecoCode2025`), quindi un solo coefficiente di redditività. Chi svolge più attività con coefficienti diversi deve distinguere i ricavi per attività. **Da verificare** sulle fonti prima di toccare il modello: L. 190/2014 c. 55 e c. 64 e allegato 4 (coefficienti), istruzioni del quadro LM (un rigo per attività, LM22-LM27), regola sull'attività prevalente per la soglia e per gli ISA. Poi: più attività nel profilo, l'attività scelta su ogni fattura (o riga), reddito per attività in Imposte e nella guida alla dichiarazione.

### Gestione Separata: mesi accreditati e prestazioni
Proposta del 01/10/2026.
- **Mesi accreditati ai fini della pensione**: con un contributo sotto quello del minimale (oggi in `docs/normativa-2026.md`, 18.808 € per il 2026) l'anno non vale per intero; mostrare in Imposte quanti mesi vengono accreditati e quanto manca per l'anno intero. **Da verificare**: regola di accredito proporzionale (L. 335/1995 art. 2 c. 29 e circolare INPS annuale), arrotondamento dei mesi.
- **Prestazioni INPS per chi è in Gestione Separata**: controllo dei requisiti per l'ISCRO (l'aliquota 0,35% è già nel set di regole, la prestazione no) e per l'indennità di maternità/paternità e di malattia, con i link alle domande sul sito INPS. **Da verificare** su norme e circolari INPS (ISCRO: L. 213/2023 e messaggi INPS) requisiti di reddito, anzianità e contributi.

### Monitoraggio normativo
- Job periodico che controlla le fonti del [registro](docs/fonti/registro.json) e propone un `RuleChangeProposal` all'admin, senza mai attivare nulla da solo. Design in [docs/monitoraggio-normativo.md](docs/monitoraggio-normativo.md). Il controllo manuale c'è già (`node scripts/fonti.mjs check`).
- Da fare: esecuzione periodica, diff del testo rispetto alla copia archiviata, individuazione dei `sourceRefs` toccati (le citazioni che non compaiono più nel nuovo testo), proposta all'admin; ricerca dei **nuovi** atti (proroghe, circolare INPS di inizio anno, istruzioni dell'anno), che il registro da solo non copre.

- Appunto del 01/10/2026: feed RSS dell'Agenzia delle Entrate per accorgersi di proroghe e nuove scadenze, se esistono (**da verificare** sul sito AdE); come per l'INPS, il feed segnala e l'amministratore verifica e attiva il nuovo set di regole.

### Avvisi bonari e CIVIS
- Registro delle comunicazioni (numero atto a 13 cifre), scadenze a 60 giorni, sanzione ridotta a 1/3, piano fino a 20 rate (D.Lgs. 462/97 art. 2-3-bis), collegamento agli F24 con codice atto. Design in `docs/normativa-2026.md` §5-bis.

## Analisi

### Pagina Analytics — contenuti da definire
Una pagina di analisi dei dati già presenti (fatture, incassi, imposte, F24), separata dalla dashboard che resta un riepilogo dell'anno. **Cosa mostrare è ancora da decidere**: le voci qui sotto sono proposte da valutare, non lavoro già definito. Le grandezze fiscali (reddito, imposte, soglia) vanno calcolate con le stesse regole di `/taxes`, senza formule nuove non verificate.
- Incassato ed emesso per mese, con confronto con l'anno precedente.
- Andamento dell'incassato rispetto alla soglia degli 85.000 € (L. 190/2014 c. 54) e proiezione a fine anno sul ritmo attuale, dichiarata come stima.
- Ripartizione per cliente (concentrazione del fatturato) e per tipo di cliente (Italia, UE, extra UE).
- Tempi di incasso: giorni medi tra data fattura e incasso; fatture scadute non incassate.
- Quanto accantonare: imposta sostitutiva e INPS stimate sull'incassato dell'anno, rispetto a quanto già versato con gli F24.
- Calendario di cassa: uscite previste (rate F24, bollo) nei prossimi mesi.
- **In dashboard** (appunto del 01/10/2026): fatture emesse **scadute** e **in scadenza** non incassate del tutto. Subito il caso semplice (residuo da incassare e ultima scadenza passata o vicina); con più rate e incassi parziali serve collegare gli incassi alle rate (voce "Modalità di pagamento: fine mese, rate, RiBa").

## Piattaforma

### MCP server per assistenti AI
- Esporre lettura (scadenze, riepilogo imposte, fatture) e azioni sicure (bozza fattura, registrazione incasso) come strumenti MCP, con permessi per tenant. Dipende dall'autenticazione.

### Scadenze fuori dall'app: calendario e promemoria
Proposta del 01/10/2026. Oggi le scadenze si vedono solo aprendo l'app.
- **Calendario**: feed `.ics` (RFC 5545) dello scadenzario della partita IVA (saldo e acconti, rate F24 pianificate, bollo, Intrastat, dichiarazione), da aggiungere a Google Calendar, Apple Calendar o Outlook. URL con un token personale revocabile e in sola lettura, senza dati personali nel titolo degli eventi oltre al necessario. Libreria mantenuta per generare il file.
- **Promemoria via email**: qualche giorno prima di ogni scadenza (giorni scelti nel profilo), e il giorno prima di una rata F24 da pagare. SMTP con `nodemailer`, già nelle dipendenze per la PEC; invio periodico con `@nestjs/schedule`. Dipende dalla configurazione SMTP (vedi anche il link d'invito in "Autenticazione e permessi").

### Esportazione dei dati
Proposta del 01/10/2026.
- **Per il commercialista**: CSV/XLSX dell'anno con fatture emesse (numero, data, cliente, imponibile, bollo, rivalsa, cassa, stato SDI), incassi (data, fattura, importo, cambio), F24 (data, righe, crediti usati, pagato) e crediti; un archivio ZIP con gli XML delle fatture e le ricevute SDI.
- **Esportazione completa** della partita IVA (dati e file), per cambiare software o installazione e per la portabilità dei dati (GDPR art. 20); il formato va documentato. Da tenere distinta dal backup del database (voce "Deploy" in "Qualità").

### Testi e messaggi in file (i18n)
Richiesto il 29/09/2026: tutti i testi per l'utente (messaggi di errore e avvisi dell'API, etichette e testi delle pagine) raccolti in file, un JSON per area come i tooltip di `apps/web/src/lib/help/`, con chiavi al posto dei testi nel codice. Per ora solo italiano; un'altra lingua diventa un file in più.
- Librerie da valutare (regola "non reinventare"), solo versioni stabili:
  - API: `nestjs-i18n` (10.8.5 al 29/09/2026), anche per i messaggi di validazione di class-validator; dichiara `@nestjs/*` con qualsiasi versione, **da provare** con NestJS 12 prima di adottarla.
  - Web: `next-intl` (4.14.8, supporta Next 16); i testi di `lib/help` passerebbero lì, così resta un solo sistema.
- Ordine proposto: prima l'API (circa 120 eccezioni, oggi in italiano scritte nel codice, e gli avvisi dei calcoli), poi le pagine web.
- Da chiarire: i testi che citano una norma restano legati alla fonte (vedi "Linguaggio semplice").

### Linguaggio semplice ("human friendly")
- Rendere comprensibili i termini fiscali a chi non è del mestiere: etichette, messaggi e avvisi in parole semplici, con il termine tecnico (es. "rigo LM34", "N2.2", "DPPI") e il riferimento normativo disponibili a richiesta (tooltip o "cosa significa?").
- Partire dalle pagine più dense (Imposte, F24, emissione fattura estera). La spiegazione semplice non deve cambiare il significato della fonte: ogni testo resta legato alla norma che riassume.

### Qualità
- Test e2e dell'API su database reale (oggi c'è un solo test, e `test/app.e2e-spec.ts` non compila con `tsc`: mancano i tipi di `supertest/types`), in particolare: più bozze dello stesso anno e tipo, emissioni concorrenti con il lock per tenant, import con nomi file uguali; test dei componenti web.
- Dipendenze: l'audit segnala vulnerabilità solo in dipendenze transitive del CLI Prisma (`mysql2`, `deepmerge-ts`), non usate a runtime con PostgreSQL; da rivalutare a ogni aggiornamento di Prisma.
- Deploy: immagine Docker per api + web, backup del database e della cartella `storage/`.

### Documentazione navigabile
- Sito in `apps/docs` (Docusaurus). Da fare: schermate nelle guide.
- Pubblicazione su GitHub Pages con `.github/workflows/docs.yml` (gratuita per i repository pubblici), attiva quando in Settings → Pages si sceglie "GitHub Actions" come sorgente.

### Roadmap su GitHub
- Portare le epiche di questo file in **Issues** (una per epica, etichette per area, priorità e "da verificare") e in un **Project** board del repository, così che la community possa prenderle in carico; questo file resta l'indice. Richiede accesso al repo con `gh auth login` (o token) da parte di un maintainer.

## Punti aperti verificabili
Elencati con la fonte che manca in [docs/compliance.md](docs/compliance.md), sezione "Non verificato / aperto" (es. contributo INPS al centesimo vs quadro RR in euro interi; abbinamento ATECO → ISA; Istr. Redditi PF 2025 non lette per il set 2025).
