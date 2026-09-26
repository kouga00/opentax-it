# Contribuire

Grazie per l'interesse. Contribuendo accetti che il software è distribuito senza garanzia e senza alcuna assunzione di responsabilità da parte di autori e contributori ([DISCLAIMER.md](DISCLAIMER.md), AGPL-3.0 sez. 15-16): il progetto non fornisce consulenza fiscale.

## La regola che viene prima di tutte: niente ipotesi

In questo settore un errore costa sanzioni a chi usa il software. Per questo:

- Si lavora **solo su elementi verificati**: testo di legge vigente (Normattiva/Gazzetta Ufficiale), provvedimenti, circolari, risoluzioni e istruzioni ufficiali (Agenzia delle Entrate, INPS, ADM), con **esempi ufficiali** quando esistono (prospetti delle istruzioni, modelli pubblicati, FAQ ufficiali).
- **Nessuna assunzione**: se un dato non è scritto in una fonte ufficiale, non va codificato come regola. Va dichiarato aperto in `docs/compliance.md` (sezione "Non verificato / aperto") e, se serve, chiesto in una issue.
- Ricordi, prassi "di solito si fa così", articoli di blog, risposte di un modello linguistico: possono suggerire dove cercare, non sono mai la fonte. Una PR che cita una di queste cose come fonte non viene accettata.
- Quando due fonti ufficiali sembrano dire cose diverse, si riportano entrambe con la citazione testuale e si lascia il punto aperto: non si sceglie "la più probabile".
- Ogni valore, formula o scadenza nel codice porta con sé: fonte (URL ufficiale), titolo dell'atto, citazione testuale, data di verifica (vedi `sourceRefs` nei set di regole) e un test costruito su un esempio ufficiale o su un documento reale anonimizzato.
- Ogni documento letto va nel [registro delle fonti](docs/fonti/README.md) con la sua copia archiviata; le citazioni nei set di regole puntano alla voce con `sourceId` e devono essere testo esatto del documento: i test lo controllano.

Lo stesso vale per la documentazione e per `TODO.md`: una feature non verificata resta "da verificare", non "da fare".

## Regole fiscali
- **Solo fonti ufficiali**: Agenzia delle Entrate, INPS, Gazzetta Ufficiale/Normattiva, ADM, fatturapa.gov.it e, per la posta elettronica certificata, AgID. Blog e portali fiscali possono orientare, ma non sono una fonte accettabile in una PR.
- Ogni regola in `packages/fiscal-rules` deve avere: riferimento normativo in commento (atto, articolo/comma o provvedimento, data), test con casi presi dagli esempi ufficiali (es. il prospetto rate delle istruzioni Redditi PF), e un'entry in `docs/normativa-*.md`.
- Nessun valore hardcodato nel codice applicativo: aliquote, soglie, scadenze vivono nel `FiscalRuleSet` dell'anno.
- Se una fonte è ambigua, apri una issue prima di codificare.

## Codice
- Convenzioni in [AGENTS.md](AGENTS.md), con i comandi: pacchetti mantenuti invece di codice scritto a mano, niente duplicati di codice, enum e costanti, cartelle fisse per modulo, DTO di richiesta e risposta, mapper, Swagger, pattern API, early return, OWASP e messaggi generici sull'autenticazione. Valgono per tutti, con o senza agente AI.
- TypeScript strict, lint (`pnpm lint`) e test (`pnpm test`) verdi.
- Commit piccoli con messaggio che spiega il *perché*.
- Niente dati reali (P.IVA, IBAN, fatture) negli esempi e nei test: usa dati fittizi.
- Segreti mai nel repo: usa `.env` (ignorato) e `.env.example`.

## Segnalazioni
- Errori di calcolo o normativi: issue con etichetta `fiscal`, indicando la fonte ufficiale che contraddice il comportamento.
- Vulnerabilità: vedi [SECURITY.md](SECURITY.md).
