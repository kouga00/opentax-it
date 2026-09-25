# TODO — cosa manca e cosa è aperto

Elenco per la community di ciò che non è ancora fatto, per epiche. Prima di prendere un punto leggi [CONTRIBUTING.md](CONTRIBUTING.md): si lavora solo su fonti ufficiali verificate, con esempi ufficiali, senza assunzioni. Ogni epica indica le fonti da cui partire; se una fonte non è ancora stata letta, il punto è marcato **da verificare**.

Stato aggiornato al 24/09/2026. Cosa è già fatto e con quale riferimento normativo: [docs/compliance.md](docs/compliance.md).

## Priorità alta

### Conformità (review del 23/09/2026)
Esito della review dell'intero codice contro le fonti ufficiali; fonti e citazioni in [docs/normativa-2026.md](docs/normativa-2026.md) §5-ter. In ordine di priorità:
1. ~~**Maggiorazione INPS nella riga DPPI**~~ fatto il 24/09/2026 — (differimento 0,40%/0,80%): oggi è sommata al contributo PXX/PXXR in `f24-schedule.ts`; per l'INPS va versata con DPPI insieme agli interessi (Circ. INPS 62/2026 §3-4). Per l'Erario resta dentro il tributo (Fasc. 1 §7). Test INPS con differimento.
2. ~~**Escludere le maggiorazioni**~~ fatto il 24/09/2026 (per gli F24 generati da ora in poi) — dagli acconti e contributi ripresi in dichiarazione (LM45, RR5 col. 16, LM35) in `taxes.service.ts` → `paidFromF24` (Fasc. 3 LM45: "non devono essere considerate le maggiorazioni").
3. ~~**Festività e date**~~ fatto il 24/09/2026 (set 2026 v4 da attivare in Impostazioni) —: 4 ottobre festa nazionale dal 2026 (L. 151/2025) in `calendar.ts`, con la data di inizio validità; proroga 2026 con +0,80% al **20/8** (non 19/8) nel set di regole 2026 (seconda rata 0,30%).
4. ~~**Base e saldo INPS in euro interi**~~ fatto il 24/09/2026 —: base = LM34 arrotondato (Circ. INPS 62/2026 §2.2), contributo RR5 col. 15 e saldo in euro interi, acconti al 40% al centesimo.
5. ~~**Soglie 85.000 / 100.000 €**~~ fatto il 24/09/2026 — (L. 190/2014 c. 54 e 71): badge di avvicinamento in dashboard e in emissione (es. dall'80% di ciascuna soglia, sugli incassi dell'anno più il totale della fattura); sopra 85.000 € avviso che il regime cessa dall'anno successivo; sopra 100.000 € avviso bloccante all'emissione (il regime cessa dall'anno stesso e l'IVA è dovuta dalla fattura che fa superare la soglia) e niente calcolo forfettario né piano F24 per quell'anno. **Limite personale configurabile** nel profilo: cifra oltre la quale l'emissione viene bloccata (es. per restare sotto 85.000 €), con conferma esplicita per superarlo.
6. ~~**Clienti esteri azienda o privato**~~ fatto il 24/09/2026 (resta il punto 14) —: UE privato → N2.2 senza "inversione contabile", INVCONT né Intrastat (art. 7-ter c. 1 lett. b); extra UE privato → N2.1 solo per i servizi dell'art. 7-septies.
7. ~~**Fatture in valuta**~~ fatto il 24/09/2026: cambio obbligatorio in fattura (art. 13 c. 4 DPR 633/72) e all'incasso (TUIR art. 9 c. 2). Resta **da verificare** il bollo nelle fatture in valuta: soglia di 77,47 € sul controvalore in euro e i 2 € oggi sommati al totale nella valuta della fattura.
8. ~~**Fatture alla PA**~~ in parte fatto il 24/09/2026: codice destinatario di 6 caratteri con FPA12 (errore 00427) ed emissione verso la PA bloccata finché manca la firma qualificata. Il resto è nell'epica "Fatture con firma digitale".
9. ~~**Maggiorazione sui debiti compensati**~~ verificato il 24/09/2026: **non va applicata**. La maggiorazione si applica solo sulla differenza tra debiti e crediti, se positiva (AdE, Istruzioni generali Redditi 2026 §4.2; Istr. Unico PF 2007 Fasc. 1 §6). Il codice lo faceva già: nessuna modifica.
10. ~~**Crediti**~~ fatto il 24/09/2026: crediti non proposti prima di "utilizzabile dal"; avviso dei 5.000 € per credito e anno di riferimento, solo compensazione orizzontale, sommando gli F24 già salvati (ris. AdE 110/E/2019).
11. ~~**Nome file SDI univoco**~~ fatto il 24/09/2026: progressivo sopra ogni nome già usato (emesse e importate) e "primo progressivo dei file SDI" nel profilo per i file inviati altrove (errore 00002).
12. **Bollo per data di consegna**: il trimestre dipende dalla data della ricevuta di consegna SDI (Guida AdE bollo giugno 2026). Fatto il 24/09/2026: nello scadenzario il bollo è segnato come "Stima" con la spiegazione. Da fare con l'invio via PEC: usare la data della ricevuta di consegna o di messa a disposizione.
13. Minori: ~~suggerimento "12 giorni" per le fatture estere~~ fatto il 24/09/2026 (15 del mese successivo per i soggetti passivi UE ed extra UE, art. 21 c. 4 lett. c-d); ~~fatture UE B2B senza iscrizione VIES~~ fatto il 24/09/2026 (avviso nella bozza, non blocco; fonti: scheda AdE "Inclusione archivio Vies", Circ. 10/E/2016 §4.1.2); base della soglia del bollo con la rivalsa INPS (**da verificare**); rateazione avvisi bonari da rivedere per il set 2027 (art. 3-bis D.Lgs. 462/97 cambia dal 2027).
14. **Servizi elettronici a privati UE** (art. 7-octies DPR 633/72, **da verificare**): oggi ogni servizio a un privato UE è trattato come reso in Italia (N2.2). Per i servizi prestati per via elettronica, di telecomunicazione e teleradiodiffusione (es. software o SaaS venduti online) a privati UE il luogo può essere lo Stato del cliente oltre la soglia UE, con il regime OSS. Leggere art. 7-octies e regole OSS per i forfettari (fonti AdE), poi distinguere questi servizi sul cliente o sulla fattura.

### Registro delle fonti ufficiali
Decisione (24/09/2026): **documenti archiviati nel repository**. Come funziona: [docs/fonti/README.md](docs/fonti/README.md).
- Fatto il 24/09/2026:
  - **registro** [docs/fonti/registro.json](docs/fonti/registro.json) e **archivio** `docs/fonti/documenti/` con le fonti dei set di regole 2025 e 2026 (più L. 633/1941 art. 5) (PDF e testo estratto; per le pagine web solo il testo dell'atto, senza menu). Leggi archiviate per articolo; circolari INPS dal PDF ufficiale; articoli della Gazzetta Ufficiale dal testo originario;
  - `sourceRefs` con `sourceId` (e `additional` per i valori che si reggono su più fonti); `sourceId` è facoltativo nello schema così i set già salvati nel database restano leggibili;
  - **test automatici** (`packages/fiscal-rules/src/sources.test.ts`): ogni `sourceRef` punta a una fonte registrata con lo stesso URL, ogni parte della citazione compare nel testo archiviato, l'impronta del file coincide con il registro;
  - `node scripts/fonti.mjs archive|check`: archiviazione e controllo delle fonti cambiate (riscarica e confronta l'impronta);
  - 12 citazioni non erano testuali (riassunti, note tra parentesi, parole diverse): riscritte sul testo esatto. Corretto un riferimento sbagliato: il 50% degli acconti per i soggetti ISA era attribuito alle istruzioni Fasc. 2 "LM acconti", ma quel passo riguarda il rigo RM37 (lezioni private); per i forfettari la fonte è la Ris. AdE 93/E/2019, ora archiviata.
  - ogni valore dei set 2025 e 2026 ha una fonte: una voce propria oppure la voce di una sezione in cui un solo passo riporta tutti i valori (elenco esplicito nel test). I test controllano anche che ogni voce corrisponda a un campo vero e che, nel 2025, i valori diversi dal 2026 abbiano una fonte propria. Aggiunte 24 voci (tra cui 51,65 €, 100%, 2 €, 77,47 €, versione 1.9.1, sospensione 1/8–4/9) e archiviate Circ. AdE 10/E/2016, D.Lgs. 33/2025 art. 72, DL 193/2016 art. 7-quater. Nota: le istruzioni non citano 51,65 € ma "inferiore ad euro 52,00" con importi in euro interi, che sulla base LM42 dà lo stesso risultato.
- Da fare:
  - **Fonti del 2025 per i valori uguali al 2026**: il set 2025 eredita dal 2026 anche le citazioni, che per alcuni valori parlano dei versamenti 2026 (es. istruzioni Redditi 2026, D.Lgs. 33/2025 in vigore dal 2026). I valori sono gli stessi, ma per il 2025 servono le fonti in vigore nel 2025 (es. L. 97/1977, istruzioni Redditi 2025).
  - **Citazioni della matrice di conformità e della normativa** collegate al registro: id della fonte, sezione o pagina, testo esatto; normativa e matrice generate o controllate da questi dati. Comprese le fonti verificate il 23-24/09/2026 non ancora archiviate: Circ. INPS 62/2026, Spec. 1.9.1 (già archiviata), guida AdE bollo (già archiviata), ris. 110/E/2019, art. 7-ter e 7-septies DPR 633/72, TUIR art. 9, esempi delle ricevute SDI già in `packages/fatturapa/schemas/messaggi/`.
  - **Pagina "Fonti" nell'app**: fatto il 24/09/2026 elenco (`/sources`, ricerca per testo ed ente, citazioni contate sui set attivi) e dettaglio (dati del documento, copia archiviata e testo estratto, ogni voce dei set attivi che lo cita con il valore e l'estratto del testo con la citazione evidenziata; API `GET /api/sources`, `/api/sources/:id`, `/api/sources/:id/file`). Fatto il 24/09/2026 anche la pagina **Regole fiscali** (`/rules`, spostata da Impostazioni): versioni per anno con attivazione e caricamento, contenuto del set con ogni valore, la sua fonte (link alla citazione nella pagina della fonte) e la citazione esatta; per una bozza, **cosa cambia rispetto al set attivo** (valori e fonti, con cosa cambia di ogni fonte); riferimenti dei `sourceRefs` in italiano. Da fare: dalle pagine imposte, F24 e fatture un link alla regola usata.
  - **Monitoraggio** (epica "Monitoraggio normativo"): il registro sostituisce la tabella `RuleSource` prevista nel design; il job usa `scripts/fonti.mjs check` o la stessa logica.
  - Testo delle tabelle XLS oggi rigenerato a mano (vedi README): estrazione automatica solo se serve, con una dipendenza stabile.
  - **Da valutare** caso per caso i documenti che non sono atti ufficiali in senso stretto (guide divulgative, modelli): base legale L. 633/1941 art. 5 ("Le disposizioni di questa legge non si applicano ai testi degli atti ufficiali dello stato e delle Amministrazioni pubbliche", archiviato). Il modello F24 oggi non è ridistribuito per scelta (`f24-pdf.service.ts`), da riallineare.

### Sicurezza di base (prima dell'autenticazione)
Finché non c'è il login, l'applicazione va usata **solo in locale**: chi raggiunge l'API può leggere e modificare i dati di qualunque partita IVA (OWASP A01). Esito della security review del 23/09/2026 (intero codebase, OWASP Top 10; `pnpm audit` senza vulnerabilità note; parser e builder XML verificati contro XXE, billion laughs e prototype pollution).
- Fatto: API, web e Postgres su `127.0.0.1`; allowlist dell'header Host contro il DNS rebinding (`ALLOWED_HOSTS`); password di Postgres da `.env`; richieste che modificano dati solo JSON (CSRF); id codificati negli URL verso l'API; set di regole attivabili solo da bozza/proposta; import XML con nomi univoci e senza sovrascrittura; SECURITY.md allineato allo stato reale; lock per tenant nell'emissione (`pg_advisory_xact_lock`) contro numeri e nomi file duplicati con emissioni concorrenti.
- Fatto (sforzo piccolo): helmet nell'API e header anti-clickjacking/`nosniff` nel web; body JSON limitato a 1 MB tranne l'import XML; nomi file sicuri nei download e `Numero` validato all'import (String20Type); errori imprevisti non esposti; limiti nei DTO (importi, righe, giorni, note, PEC); modello F24 rifiutato se lo SHA-256 non coincide (`F24_MODEL_ALLOW_UNVERIFIED=true` per forzare); storage con permessi `0700`/`0600` e percorsi confinati nella cartella; cookie `opentax_tenant` `httpOnly` con id validato; CI con `permissions: contents: read`; `NEXT_PUBLIC_API_URL` rinominata `API_URL`.
- Da fare:
  - errori in `/f24` e `/credits` passati come codice invece che come testo nell'URL (rischio basso: React fa l'escape e l'app è solo locale);
  - `updateMany`/`deleteMany` con `tenantId` o un'estensione Prisma che lo inietti, come difesa in profondità per quando ci sarà l'autenticazione.

### Qualità del codice e architettura dell'API
Regole di lavoro in [AGENTS.md](AGENTS.md) (fatto il 24/09/2026, letto anche da Claude Code tramite `CLAUDE.md`). Oggi i DTO sono solo di richiesta, più classi per file (fino a 8 in `invoices.dto.ts`), niente Swagger, e i controller restituiscono direttamente le entità Prisma: ogni campo del database arriva al client (OWASP [API3:2023](https://api-security.owasp.org/editions/2023/en/0x11-t10), Broken Object Property Level Authorization). Documentazione da seguire: NestJS [OpenAPI](https://docs.nestjs.com/openapi/introduction) e [CLI plugin](https://docs.nestjs.com/openapi/cli-plugin), [validazione](https://docs.nestjs.com/techniques/validation).
- **DTO in due cartelle per modulo**: `dto/request/` e `dto/response/`, **una sola classe per file**, nome `<nome>.dto.ts` (richiesto dal plugin Swagger per documentare le proprietà).
- **DTO di risposta e mapper** per ogni endpoint: un mapper (`<nome>.mapper.ts`) costruisce il DTO dalla entità; nessun controller restituisce più entità Prisma o oggetti interni. Scegliere per ogni risposta i campi da esporre (es. niente `tenantId`, percorsi di storage, hash interni). Il mapper può usare **class-transformer** (già installato, 0.5.1, ultima stabile): `@Expose()` su ogni campo del DTO di risposta e `plainToInstance(..., { excludeExtraneousValues: true })` come allowlist dei campi, `@Transform()` per le conversioni (es. `Decimal` di Prisma). Da valutare anche `ClassSerializerInterceptor` di NestJS ([serializzazione](https://docs.nestjs.com/techniques/serialization)), che serializza solo istanze di classe: "A plain JavaScript object ... is not serialized correctly".
- **Swagger** con `@nestjs/swagger` (ultima versione stabile): `DocumentBuilder` e `SwaggerModule.setup` in `main.ts`, plugin CLI in `nest-cli.json` con `classValidatorShim` e `introspectComments`, tipo di risposta dichiarato su ogni endpoint (`@ApiOkResponse` e simili), tag per modulo. La pagina della documentazione solo in locale o disattivabile per ambiente (OWASP API8:2023, Security Misconfiguration).
- **Pattern API**: rivedere percorsi, metodi e codici di stato (es. `POST /fiscal-rules/seed`, azioni come `/issue` e `/activate`) e scegliere una convenzione unica, documentata in AGENTS.md.
- **Migrazione per modulo**, un modulo per volta con i suoi test verdi: prima i piccoli (banche, profili di scadenza, crediti), poi clienti, incassi, F24, fatture; il web si adegua ai tipi di risposta (`apps/web/src/lib/types.ts`).
- **Controlli automatici** perché le regole restino rispettate (le istruzioni in AGENTS.md sono contesto per gli agenti, non un vincolo):
  - test di architettura nell'API: i DTO stanno solo in `dto/request` e `dto/response`, una classe per file; i controller non importano `PrismaService`;
  - test sul documento OpenAPI generato: ogni endpoint dichiara il tipo di risposta e nessuno schema di risposta espone campi vietati (es. `tenantId`);
  - regola di lint `max-classes-per-file` sui DTO, se supportata da oxlint (**da verificare** nella documentazione di oxlint);
  - `openapi.json` versionato e controllato in CI, così ogni modifica all'API si vede nella diff della PR;
  - modello di PR (`.github/pull_request_template.md`) con la checklist: fonte ufficiale e citazione, test, OWASP, documentazione letta, AGENTS.md aggiornato se cambia una convenzione.

### Autenticazione e permessi
Fatto il 25/09/2026.
- **Login e registrazione** (email e password con hashing sicuro `scrypt` e salt casuale da `node:crypto`), sessioni persistite con token hash SHA-256 (`Session`), durata configurabile (default 30 giorni).
- **Ruoli e multi-tenancy**: ruoli (`PLATFORM_ADMIN`, `TENANT_ADMIN`, `TENANT_USER`), supporto a tenant multipli per utente con `TenantMember`. Il primo utente creato diventa automaticamente `PLATFORM_ADMIN`.
- **Sostituzione cookie e header**: `x-tenant-id` e `opentax_tenant` sostituiti dalla sessione (`opentax_session` `httpOnly`, header `Authorization: Bearer <token>`); tenant attivo mantenuto nella sessione con endpoint `POST /auth/select-tenant`.
- **Rate limiting e audit log**: rate limiting a finestra mobile su login ed endpoint sensibili (blocco con HTTP 429 e `Retry-After`); `AuditLogService` registra login, tentativi falliti, registrazioni, logout e cambi tenant su `AuditLog`.
- **Interfaccia web**: pagine `/login` e `/register`, protezione delle rotte applicative, indicazione dell'utente attivo nell'app shell e logout.

### Invio allo SDI via PEC e ricevute
Emissione e XML sono pronti; manca la trasmissione. Normativa verificata in [docs/normativa-2026.md](docs/normativa-2026.md) §4.3; tabelle `SdiTransmission`/`SdiNotification` e `TenantProfile.sdiPecAssigned` già nello schema.

**Canali verificati (24/09/2026, fatturapa.gov.it "Inviare la FatturaPA" e "Test del processo di fatturazione elettronica"; Spec. 1.9.1 §1.5)**
- **PEC**: nessun accreditamento, messaggio fino a 30 MB, primo invio a `sdi01@pec.fatturapa.it` e poi all'indirizzo assegnato dallo SDI. **Non esiste un ambiente di prova per chi usa solo la PEC**: il primo invio è reale.
- **Invio web** dal portale Fatture e Corrispettivi (SPID/CIE/CNS, file fino a 5 MB): manuale, nessuna API.
- **SDICoop (web service SOAP) e SDIFTP**: sono le uniche vie "via API", ma richiedono l'accreditamento sul Sistema di Accreditamento, certificati rilasciati dallo SDI, test di interoperabilità, un accordo di servizio e la "capacità di gestione di certificati digitali"; per ricevere fatture e notifiche va esposto un servizio web raggiungibile da internet (SdICoop - Ricezione). L'ambiente di test esiste solo per i canali accreditati. Non adatti a un'app locale per un singolo professionista.
- **Servizi massivi SDICoop** (agenziaentrate.gov.it, "Servizi massivi SDICoop"): download massivo di fatture e dati, trasmissione dell'elenco B del bollo; riservati ai "provider Web-Service, già accreditati al servizio SdI-Cooperazione Applicativa". Stesso ostacolo dell'accreditamento; utili solo se un giorno il progetto si accreditasse. Esperienze di accreditamento SDICoop (forum.italia.it, "Test interoperabilità soluzioni", fonte secondaria): percorso fattibile ma impegnativo (piano di test di interoperabilità, notifiche da produrre nel formato esatto, firma digitale); il kit di sviluppo su fatturapa.gov.it (piano di test SDICoop, documento "SDICoop ricezione") è il punto di partenza, nelle versioni correnti.

**Piano (canale PEC)**
1. Cifratura a riposo delle credenziali (`APP_ENCRYPTION_KEY`, oggi non usata): la password PEC non va mai salvata in chiaro.
2. Configurazione PEC in Impostazioni: indirizzo, server SMTP e IMAP, credenziali; prova di connessione senza inviare nulla.
3. Invio: pulsante "Invia allo SDI" sulla fattura emessa; SMTP verso `sdi01@pec.fatturapa.it` o l'indirizzo assegnato; registrazione in `SdiTransmission`; stato "inviata".
4. Ricevute: lettura IMAP (pulsante "Controlla ricevute", controllo periodico con l'app aperta); riconoscimento delle ricevute SDI (consegna RC, scarto NS, mancata consegna MC; DT solo per la PA) e delle ricevute del gestore PEC (accettazione e consegna attestano la trasmissione, non l'emissione); aggiornamento dello stato della fattura; salvataggio dell'indirizzo PEC assegnato; archiviazione delle ricevute nello storage.
5. Scarto: correzione e nuovo invio. Verificato (AdE, guida "Cosa fa il Sistema di Interscambio quando riceve una fattura"): "una ricevuta di scarto determina che la fattura non è mai stata emessa"; la fattura corretta va ritrasmessa con lo stesso numero e la stessa data, cambiando il nome del file. Un eventuale termine per il reinvio (es. 5 giorni) **da verificare**.
6. Bollo per data di consegna (punto 12 dell'epica Conformità) con le date delle ricevute.
7. Dipendenze: `nodemailer` (SMTP) e `imapflow` (IMAP), ultime versioni stabili.
8. Test: lettura delle ricevute sugli **esempi ufficiali già scaricati** in `packages/fatturapa/schemas/messaggi/` (schema `MessaggiTypes_v1.1.xsd` ed esempi RC, NS, MC da fatturapa.gov.it, "Documentazione Sistema d'Interscambio"; validi per lo schema). La ricevuta di consegna contiene `IdentificativoSdI`, `NomeFile`, `DataOraRicezione`, `DataOraConsegna` e `MessageId`, ed è firmata (XAdES) dall'AdE. Nessun test automatico può inviare allo SDI. Prove reali del canale, in ordine e senza emettere fatture:
   - prova di connessione SMTP/IMAP alla casella PEC, senza invii;
   - PEC senza allegato a `sdi01@pec.fatturapa.it`: lo SDI risponde con un "messaggio di cortesia" (Spec. 1.9.1 §1.5: "a fronte dell'invio di una PEC priva di allegato da parte del soggetto trasmittente, il SdI invia un messaggio di cortesia");
   - file di prova volutamente scartato (es. data futura, errore 00403), marcato "PROVA": arriva la ricevuta di scarto e, secondo l'AdE, "la fattura non è mai stata emessa". Resta visibile tra le ricevute del portale Fatture e Corrispettivi;
   - solo dopo, il primo invio di una fattura vera, fatto insieme all'utente.
9. Requisiti dell'utente: casella PEC con accesso SMTP e IMAP (dati dei server dal gestore).
- Conservazione: le fatture emesse vanno conservate a norma (DPR 633/72 art. 39; DM 17/06/2014). Fatto: avviso nel README con l'indicazione del servizio gratuito dell'AdE (Fatture e Corrispettivi). Da fare: storico delle fatture nell'applicazione e promemoria di adesione nella pagina di setup.

### Dichiarazione dei redditi: prospetto LM/RR
- Produrre il prospetto dei righi LM (sez. III) e RR (sez. II) con i valori calcolati, per il contribuente o il suo intermediario; segnare la dichiarazione come presentata (`TaxReturn`) e registrare i crediti risultanti (LM47, RR8) nel modulo Crediti.
- Fonti: Istr. Redditi PF 2026 Fasc. 1, 2 (RR) e 3 (LM).

## Fatturazione

### Anteprima e stampa della fattura
- Fatto: copia di cortesia in PDF con layout proprio, aperta in una nuova scheda (anteprima, stampa e download dal browser); per le fatture emesse i dati sono letti dall'XML salvato (PR #10).
- Da fare: invio della fattura via email al cliente (copia di cortesia: l'originale è l'XML consegnato dallo SDI).

### Fatture alla PA e firma digitale — priorità bassa
- Verificato (fatturapa.gov.it, "Firmare la FatturaPA"): ogni fattura verso la PA "deve essere firmato dal soggetto che emette la fattura" con certificato di firma qualificata (AgID), in CAdES Baseline B (`.xml.p7m`) o XAdES Baseline B enveloped; "signing time" valorizzato, marca temporale non obbligatoria. Per le fatture tra privati la firma è facoltativa (Spec. 1.9.1 §1.2.1).
- Oggi l'emissione verso la PA è bloccata. Per sbloccarla: firma con il certificato dell'utente (smart card/token o firma remota), invio del file firmato, e i dati obbligatori per la PA **da verificare** (es. CIG e CUP nei dati dell'ordine o del contratto, art. 25 DL 66/2014; regole del DM 55/2013 allegato A).

### Template di fattura
- Righe ricorrenti, descrizioni e note salvate come modelli; duplicazione di una fattura esistente.

### Import da altri strumenti
- Fatto: import di XML FatturaPA emessi altrove (numero originale, XML conservato).
- Fatto (25/09/2026): import delle emesse da archivi ZIP (es. scaricati dal portale "Fatture e Corrispettivi"), aperti nell'API con limiti contro gli zip bomb (5 MB per file come da Spec. 1.9.1, 2.000 file, 200 MB estratti), e preview prima dell'import con le fatture da scegliere; file di metadati SDI ignorati. Nessuna fonte ufficiale descrive la struttura dello zip del portale: le voci sono riconosciute dal contenuto.
- Da fare: fatture firmate `.xml.p7m` (CAdES, Spec. 1.9.1 §1.2.1; se il file possa arrivare anche in base64 **da verificare**); IdentificativoSdI dai file di metadati (`FileMetadati` AdE e `MetadatiInvioFile` fatturapa.gov.it, quale usi il portale **da verificare**); fatture ricevute; riconciliazione degli incassi.
- Da archiviare nel [registro delle fonti](docs/fonti/README.md): specifiche "Consultazioni e Download Massivi" v2.4 (ivaservizi.agenziaentrate.gov.it), pagina di assistenza "Consultare le fatture elettroniche", XSD `MessaggiFatturaTypes_v1.0`.
- OCR per fatture cartacee/PDF: bassa priorità (dal 2019 ogni fattura emessa esiste come XML; l'OCR servirebbe solo per documenti precedenti o per fatture ricevute da soggetti esclusi).

### Fatture ricevute (acquisti)
- Le fatture ricevute non incidono sul reddito forfettario ma servono per il registro e per l'IVA sugli acquisti esteri (L. 190/2014 c. 60: versamento entro il 16 del mese successivo). Import dallo SDI e scadenza in calendario.

## Versamenti

### F24 e rate — completamenti
- Fatto: piano rate, unica soluzione (1 rata → `0101`), interessi, I24, stampa sul modello ufficiale, compensazione a saldo zero, collegamento F24 pagati → Imposte.
- Da fare: F24 per il bollo trimestrale (codici 2521-2524, scadenze già in calendario); ravvedimento operoso (D.Lgs. 472/97 art. 13; D.Lgs. 471/97 art. 13) con codici 8944/1989/1990 — **da verificare**; export dei dati per F24 web/home banking (formato **da verificare**: non esiste un tracciato pubblico per il contribuente, solo per intermediari).
- Set di regole 2027 quando usciranno circolare INPS, istruzioni e proroghe.
- Messaggi di avviso dell'API in italiano (oggi in inglese).

### Monitoraggio normativo
- Job periodico che controlla le fonti del [registro](docs/fonti/registro.json) e propone un `RuleChangeProposal` all'admin, senza mai attivare nulla da solo. Design in [docs/monitoraggio-normativo.md](docs/monitoraggio-normativo.md).
- Fatto il 24/09/2026: il controllo manuale `node scripts/fonti.mjs check` riscarica ogni fonte registrata e segnala quelle cambiate (impronte stabili tra un download e l'altro, niente falsi allarmi da menu o date del sito).
- Da fare: esecuzione periodica, diff del testo rispetto alla copia archiviata, individuazione dei `sourceRefs` toccati (le citazioni che non compaiono più nel nuovo testo), proposta all'admin; ricerca dei **nuovi** atti (proroghe, circolare INPS di inizio anno, istruzioni dell'anno), che il registro da solo non copre.

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

## Piattaforma

### MCP server per assistenti AI
- Esporre lettura (scadenze, riepilogo imposte, fatture) e azioni sicure (bozza fattura, registrazione incasso) come strumenti MCP, con permessi per tenant. Dipende dall'autenticazione.

### Linguaggio semplice ("human friendly")
- Rendere comprensibili i termini fiscali a chi non è del mestiere: etichette, messaggi e avvisi in parole semplici, con il termine tecnico (es. "rigo LM34", "N2.2", "DPPI") e il riferimento normativo disponibili a richiesta (tooltip o "cosa significa?").
- Partire dalle pagine più dense (Imposte, F24, emissione fattura estera). La spiegazione semplice non deve cambiare il significato della fonte: ogni testo resta legato alla norma che riassume.

### Qualità
- Test e2e dell'API su database reale (oggi c'è un solo test, e `test/app.e2e-spec.ts` non compila con `tsc`: mancano i tipi di `supertest/types`), in particolare: più bozze dello stesso anno e tipo, emissioni concorrenti con il lock per tenant, import con nomi file uguali; test dei componenti web.
- Dipendenze: l'audit segnala vulnerabilità solo in dipendenze transitive del CLI Prisma (`mysql2`, `deepmerge-ts`), non usate a runtime con PostgreSQL; da rivalutare a ogni aggiornamento di Prisma.
- Deploy: immagine Docker per api + web, backup del database e della cartella `storage/`.

### Roadmap su GitHub
- Portare le epiche di questo file in **Issues** (una per epica, etichette per area, priorità e "da verificare") e in un **Project** board del repository, così che la community possa prenderle in carico; questo file resta l'indice. Richiede accesso al repo con `gh auth login` (o token) da parte di un maintainer.

## Punti aperti verificabili
Elencati con la fonte che manca in [docs/compliance.md](docs/compliance.md), sezione "Non verificato / aperto" (es. contributo INPS al centesimo vs quadro RR in euro interi; abbinamento ATECO → ISA; Istr. Redditi PF 2025 non lette per il set 2025).
