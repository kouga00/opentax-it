# AGENTS.md — istruzioni per chi sviluppa con un agente AI

Gestionale open source per partite IVA in regime forfettario: fatture elettroniche, imposte, INPS, F24. Panoramica in [README.md](README.md), regole per contribuire in [CONTRIBUTING.md](CONTRIBUTING.md), lavoro aperto in [TODO.md](TODO.md). Le istruzioni esplicite di chi ti sta chiedendo il lavoro prevalgono su questo file.

## Struttura e comandi

```
apps/api                NestJS + Prisma + PostgreSQL (API REST sotto /api)
apps/web                Next.js + shadcn/ui (leggi anche apps/web/AGENTS.md)
packages/fiscal-rules   regole fiscali pure, senza I/O, con le fonti in sourceRefs
packages/fatturapa      XML FatturaPA (builder, parser, XSD ufficiali)
docs/fonti              registro delle fonti ufficiali con le copie archiviate
```

```sh
pnpm install
pnpm db:up && pnpm db:migrate   # Postgres in Docker e migrazioni
pnpm dev                        # API :3000, web :3001, solo su 127.0.0.1
pnpm lint && pnpm test && pnpm build   # quello che esegue la CI: deve restare verde
pnpm fonti check                # fonti ufficiali cambiate rispetto all'archivio
```

## Regole che valgono sempre

1. **Mai lavorare per assunti.** Le regole fiscali vengono solo da fonti ufficiali (AdE, INPS, Normattiva/GU, ADM, fatturapa.gov.it; AgID per la PEC), con citazione esatta archiviata nel [registro](docs/fonti/README.md): i test lo verificano. Lo stesso vale per le tecnologie: prima di usare un'API di NestJS, Prisma, Next.js, Base UI, class-validator o Swagger leggi la documentazione ufficiale della versione installata (per Next.js quella in `node_modules/next/dist/docs/`). Se una cosa non è scritta in una fonte ufficiale, dillo e fermati.
2. **Non reinventare la ruota.** Prima di scrivere a mano un'utility generica (rate limiting, IP del client, parsing, crittografia, date…) controlla se il framework la offre già o se esiste un pacchetto mantenuto, diffuso e ben testato: per NestJS prima i pacchetti ufficiali `@nestjs/*` (es. `@nestjs/throttler`), per Express le sue impostazioni (es. `trust proxy`). Codice nostro solo se non esiste niente di adatto, e va detto nella PR. **Solo versioni stabili** delle dipendenze, mai beta o release candidate.
3. **Non duplicare** se il contesto non lo richiede: codice, enum, costanti ed elenchi di valori hanno una sola definizione, riusata da chi ne ha bisogno (gli enum del database dal client Prisma generato, le regole fiscali e i dati FatturaPA dai pacchetti in `packages/`). Una copia è ammessa solo quando un confine la impone, e va detto nel commento dove si trova l'originale.
4. **Codice in inglese** (file, identificatori, commenti, campi del database); **testi per l'utente in italiano**.
5. **Commit**: in inglese, una riga, niente righe `Co-Authored-By`. Si committa solo quando richiesto.
6. **KISS prima di tutto.** SOLID e design pattern si usano quando risolvono un problema presente nel codice, non in anticipo: il pattern va nominato nel commento del modulo che lo introduce, con il problema che risolve. **Early return**: casi di errore e condizioni di uscita gestiti subito in testa alla funzione, così il percorso principale resta senza `else` e senza annidamenti.
7. **Sicurezza OWASP** (Top 10 e [API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x11-t10)): ogni query filtra per `tenantId`; input validato con whitelist; niente segreti nel codice né nei log; errori imprevisti senza dettagli interni; **messaggi generici sugli endpoint di autenticazione** (login, registrazione, recupero password): stessa risposta, stesso codice di stato e tempi simili che l'account esista o no, così non si può scoprire chi è registrato ([OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages)); file e percorsi confinati nella loro cartella. Vedi [SECURITY.md](SECURITY.md).
8. **Test** per ogni regola, costruiti su esempi ufficiali o documenti reali anonimizzati; mai dati personali reali nei test.

## API (apps/api): struttura richiesta

Il codice attuale non la segue ancora del tutto: la migrazione è nell'epica "Qualità del codice e architettura dell'API" di [TODO.md](TODO.md). **Il codice nuovo o modificato la segue già.**

- **Cartelle di ogni modulo**: nella radice del modulo c'è solo `<nome>.module.ts`; il resto sta in `controllers/`, `services/` (anche le funzioni di supporto del modulo), `mappers/`, `dto/request/`, `dto/response/` e `types/` (tipi e interfacce). I test stanno accanto al file che provano. Il codice condiviso tra moduli resta in `common/`, `prisma/` e `storage/`. È una scelta del progetto: l'esempio della [documentazione di NestJS](https://docs.nestjs.com/modules) tiene controller e service nella radice e le interfacce in `interfaces/`, ma qui i moduli hanno più controller e service, e cartelle fisse uguali ovunque rendono i file più facili da trovare.
- **Controller sottili**: ricevono il DTO di richiesta, chiamano il service, restituiscono il DTO di risposta. Nessuna logica di dominio e nessun accesso a Prisma nei controller.
- **DTO in due cartelle per modulo**: `dto/request/` e `dto/response/`. **Una sola classe per file**, nome file `<nome>.dto.ts` (serve anche al plugin Swagger).
- **Interfacce e tipi in file dedicati**: le interfacce e i tipi esportati (quelli usati da più di un file, es. i risultati di un service) stanno in `types/` del modulo, **uno per file**, nome file `<nome>.ts`. Restano nel file che li usa solo i tipi non esportati.
- **Validazione** delle richieste con class-validator: la `ValidationPipe` globale ha `whitelist` e `forbidNonWhitelisted`. Con class-transformer (`transform: true`) il body diventa un'istanza del DTO; `@Type()` per gli oggetti annidati e le date.
- **Risposte solo tramite mapper**: ogni risposta passa da un mapper (`mappers/<nome>.mapper.ts`) che costruisce il DTO di risposta. Non si restituiscono mai entità Prisma né oggetti interni, così nessun campo esce per sbaglio (OWASP API3:2023, Broken Object Property Level Authorization, che comprende l'esposizione eccessiva di dati). Allo stesso modo i DTO di richiesta accettano solo i campi previsti (mass assignment, stessa voce). Il mapper può usare [class-transformer](https://github.com/typestack/class-transformer): `@Expose()` su ogni campo del DTO di risposta e `plainToInstance(<Dto>, entity, { excludeExtraneousValues: true })`, così esce solo ciò che è dichiarato; `@Transform()` per i valori calcolati o convertiti (es. `Decimal` di Prisma in numero). Se la conversione è semplice, un mapper scritto a mano va bene (KISS). Vedi anche la [serializzazione di NestJS](https://docs.nestjs.com/techniques/serialization).
- **Swagger** (`@nestjs/swagger`) su tutti i DTO di richiesta e di risposta e su ogni endpoint, con il tipo di risposta dichiarato.
- **Pattern API**: risorse al plurale, metodi HTTP con il loro significato (GET senza effetti, POST crea, PUT sostituisce, PATCH modifica in parte, DELETE rimuove con 204), codici di stato corretti, errori con la struttura standard di NestJS.

## Web (apps/web)

Componenti shadcn/ui (Base UI); le tabelle usano le azioni di `components/row-actions.tsx`: fino a tre icone con tooltip, oltre le prime due e un menu "⋯" con le altre (i dialog stanno fuori dal menu, con lo stato nella riga); gli anni si scelgono con `components/year-select.tsx`. Pagine server che chiamano l'API da `lib/api.ts`; il browser non raggiunge mai l'API direttamente.
