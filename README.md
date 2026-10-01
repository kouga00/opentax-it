# OpenTax IT

[![CI](https://github.com/kouga00/opentax-it/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kouga00/opentax-it/actions/workflows/ci.yml)
[![Licenza: AGPL-3.0](https://img.shields.io/github/license/kouga00/opentax-it)](LICENSE)
[![Node.js 24](https://img.shields.io/badge/node-24-339933?logo=nodedotjs&logoColor=white)](package.json)
[![Stato: fase iniziale](https://img.shields.io/badge/stato-fase%20iniziale-orange)](#stato)
[![Documentazione](https://img.shields.io/badge/docs-kouga00.github.io%2Fopentax--it-blue)](https://kouga00.github.io/opentax-it/)

Gestionale **open source** (`opentax-it`) per partite IVA italiane in **regime forfettario** (L. 190/2014, art. 1 c. 54-89). Ogni regola applicata cita una fonte ufficiale.

![Dashboard di OpenTax IT con dati di prova: prossima scadenza F24, documenti emessi e da inviare allo SDI, bolli, incassato e fatturato rispetto alle soglie del forfettario, prossime scadenze](docs/images/dashboard.png)

## Documentazione

- **Sito della documentazione**: [kouga00.github.io/opentax-it](https://kouga00.github.io/opentax-it/): guide in linguaggio semplice (installazione, fatture, PEC e SDI, imposte e F24, codici e causali F24, glossario) e guida per chi contribuisce. Si aggiorna a ogni push su `main`; in locale: `pnpm --filter @opentax-it/docs start` (http://localhost:3002/opentax-it/).
- **Riferimento dell'API**: [kouga00.github.io/opentax-it/api](https://kouga00.github.io/opentax-it/api/opentax-it-api/), generato dal documento OpenAPI dell'API.
- **Swagger in locale**: con `pnpm dev` attivo, [localhost:3000/api/docs](http://localhost:3000/api/docs) (il documento OpenAPI in JSON è su [/api/docs-json](http://localhost:3000/api/docs-json)); spento in produzione.
- **Conformità e fonti**: [docs/compliance.md](docs/compliance.md) (ogni funzione con il suo riferimento normativo) e il [registro delle fonti ufficiali](docs/fonti/README.md).

## Cosa fa

**Fatture** (`/invoices`)
- Fatture e note di credito in formato **FatturaPA** (XML validato sullo schema ufficiale), con numerazione progressiva assegnata all'emissione e bozze illimitate e modificabili.
- **Clienti italiani, UE ed extra UE**, aziende o privati, con natura IVA e diciture corrette (art. 7-ter e 7-septies DPR 633/72); data mai nel futuro (errore SDI 00403).
- Fatture in **valuta** con il cambio di riferimento della Banca d'Italia precompilato.
- Modalità di pagamento scelta sulla fattura (bonifico, ricevuta bancaria, carta, SEPA Direct Debit, contanti), con il conto di accredito quando serve; profili di scadenza con **più rate** (es. 30/60/90 giorni) e **fine mese**, scritti in fattura come pagamento a rate e riportati nella copia PDF.
- Copia di cortesia in PDF, download dell'XML, **import** di fatture e ricevute SDI da XML e archivi ZIP (anche quelli del portale Fatture e Corrispettivi), con anteprima prima di importare.

**Invio allo SDI** (`/setup`, pagina della fattura)
- Invio via **PEC**, senza provider a pagamento né accreditamento: gestori PEC preconfigurati, password cifrata, prova di connessione passo per passo.
- **Ricevute** lette dalla casella PEC in sola lettura (consegna, scarto, impossibilità di recapito, ricevute del gestore), anche dopo che l'app è rimasta spenta; l'indirizzo assegnato dallo SDI si imposta da solo.
- **PEC di prova allo SDI** senza fatture, per verificare tutto il canale prima del primo invio.
- Fattura **scartata**: "Correggi e reinvia" con lo stesso numero e la stessa data e un nuovo nome file (circolare AdE 13/E/2018).
- Il **fatturato** conta solo le fatture davvero emesse: consegnate o messe a disposizione dallo SDI, oppure importate.
- **Bollo** nel trimestre della data di consegna o di messa a disposizione indicata dalle ricevute SDI, come fa l'Agenzia delle Entrate.

**Incassi e soglie**
- **Principio di cassa**: il reddito si calcola sugli incassi dell'anno, non sul fatturato.
- Incasso registrato dall'elenco fatture, anche parziale, con data e residuo proposti; incassi in valuta al cambio del giorno dell'incasso.
- **Soglie 85.000 / 100.000 €** in dashboard e all'emissione, con proiezione sulle fatture da incassare e un limite personale che chiede conferma prima di emettere.

**Imposte e contributi** (`/taxes`)
- Reddito, imposta sostitutiva, acconti 40/60 o 50/50 per i soggetti ISA; sopra 100.000 € il calcolo forfettario si ferma.
- Contributi INPS secondo la gestione scelta nel profilo: **Gestione Separata** (in euro interi sul rigo LM34) oppure **Artigiani e Commercianti** (contributi fissi in quattro rate, contributi oltre il minimale con saldo e acconti, riduzione del 35% del regime agevolato).

**Dichiarazione dei redditi** (`/taxes/return`)
- Guida alla precompilata **Redditi PF** (il 730 non vale per chi ha la partita IVA): quadri LM, RR e RX31 rigo per rigo con i valori dell'app e cosa fare in ogni rigo; i contributi versati (LM35, che la precompilata non compila), il reddito oltre il minimale di Artigiani e Commercianti e le fatture che spiegano la differenza tra i ricavi proposti per data di emissione e quelli incassati.
- Dichiarazione segnata come presentata: i crediti d'imposta sostitutiva e della Gestione Separata entrano da soli nel registro dei crediti per gli F24.

**F24** (`/f24`, `/credits`)
- Piano di versamento: saldo e acconti in unica soluzione o a **rate mensili** fino al 16 dicembre, con interessi e, in caso di differimento, maggiorazione (per l'INPS nella riga DPPI).
- Deleghe per i contributi: rate fisse di Artigiani e Commercianti create con un clic, righe INPS e "Altri enti previdenziali" inserite a mano con il controllo di causali e codici.
- **Crediti e compensazioni**: registro dei crediti (credito da dichiarazione → F24 che lo usano → residuo) e modello a saldo zero.
- **Bollo sulle fatture** (`/stamp-duty`): per ogni trimestre la stima dalle fatture, la data limite per controllare l'elenco B, l'importo dell'Agenzia e il pagamento, con un F24 (codici 2521-2524) o dal portale Fatture e Corrispettivi.
- Stampa sul **modello ufficiale AdE** e **file per File Internet** (specifiche tecniche AdE): gli F24 di una data si inviano all'Agenzia senza ricopiarli in F24 web. Le deleghe si segnano come pagate con la data e una nota su come sono state pagate.

**Scadenze** (`/deadlines`, `/dashboard`)
- Scadenzario di saldo e acconti (imposta e INPS), imposta di bollo trimestrale, Intrastat e dichiarazione, con le festività nazionali calcolate per ogni anno; in dashboard la prossima cosa da pagare (rata F24 o scadenza), i documenti da inviare e le soglie.

**Regole e fonti** (`/rules`, `/sources`)
- **Regole fiscali versionate per anno** (`FiscalRuleSet`): niente valori scritti nel codice, ogni nuovo set si attiva a mano, dopo aver visto cosa cambia rispetto a quello attivo; consultabili per sezione, ogni valore con la sua fonte e la citazione esatta.
- **Registro delle fonti ufficiali** con la copia archiviata di ogni documento; i test verificano che ogni citazione compaia nel documento archiviato.

**Account** (`/login`, `/register`)
- Login con sessione, **più partite IVA per utente** e ruoli; solo un amministratore carica e attiva le regole fiscali.

**In arrivo** (dettagli in [TODO.md](TODO.md))
- **Casse professionali**, una alla volta, a partire da quelle che si pagano con F24 (Cassa Forense, Inarcassa, ENPAP).
- **Fatture ricevute** (acquisti), importate dal portale Fatture e Corrispettivi.
- Crediti di Artigiani e Commercianti dalla dichiarazione registrati da soli (serve il codice INPS sulle righe di credito).
- Registro degli **avvisi/comunicazioni** (CIVIS) e delle relative rate.
- Controllo periodico delle fonti ufficiali (AdE, INPS, GU/Normattiva, ADM) con proposta delle modifiche alle regole.

> **Avvertenza.** Questo software è uno strumento di supporto al calcolo e all'organizzazione: **non è consulenza fiscale** e non sostituisce un professionista abilitato. **Non si garantisce la veridicità né la correttezza dei dati e dei calcoli prodotti: la responsabilità del loro uso è esclusivamente dell'utilizzatore.** Le regole fiscali cambiano ogni anno; verifica sempre i valori attivi con le fonti ufficiali. Gli autori e i contributori non rispondono di errori di calcolo, sanzioni o omissioni derivanti dall'uso del software: vedi [DISCLAIMER.md](DISCLAIMER.md) e [LICENSE](LICENSE), sez. 15-16.

> **Conservazione a norma.** Chi emette e chi riceve una fattura elettronica è obbligato a conservarla a norma (DPR 633/72 art. 39). Salvare i file sul computer non basta: OpenTax IT archivia l'XML ma **non** è un sistema di conservazione. Finché non lo sarà, aderisci al servizio gratuito dell'Agenzia delle Entrate dal portale "Fatture e Corrispettivi" (sezione "Fatturazione elettronica e Conservazione"): conserva per 15 anni tutte le fatture emesse e ricevute tramite SDI. Fonte: [AdE, "Come si conservano le fatture elettroniche"](https://www.agenziaentrate.gov.it/portale/aree-tematiche/fatturazione-elettronica/guida-fatturazione-elettronica/come-predisporre-inviare-ricevere-fe/come-si-conservano-fe).

## Stato

Fase iniziale, pensato per l'uso **in locale**: login e sessioni ci sono, ma prima di esporlo in rete servono HTTPS e le verifiche di sicurezza del [TODO](TODO.md). Ogni funzione è ancorata a una fonte ufficiale, elencata in [docs/compliance.md](docs/compliance.md); le citazioni verificate sono in [docs/normativa-2026.md](docs/normativa-2026.md).

**Limiti noti** (dettagli in [TODO.md](TODO.md))
- Invio e ricevute via PEC non ancora provati su una casella reale: il canale PEC non ha un ambiente di prova, il primo invio è reale.
- Nessuna conservazione a norma: vedi l'avviso sopra.
- Fatture verso la **PA** bloccate: serve la firma qualificata, non ancora supportata.
- Contributi INPS calcolati per la **Gestione Separata** e per **Artigiani e Commercianti** (contributi fissi in quattro rate, contributi oltre il minimale con saldo e acconti, riduzione del 35% del regime agevolato). La gestione previdenziale si sceglie nel profilo. Le **casse professionali** arriveranno una alla volta: per ora la gestione non si può scegliere (la base c'è già: contributo in fattura nel blocco "Dati cassa previdenziale", escluso dai ricavi, e F24 "Altri enti previdenziali" con le righe comunicate dalla cassa). La rivalsa INPS del 4% vale solo per la Gestione Separata.
- Servizi elettronici a privati UE (art. 7-octies, OSS) e bollo nelle fatture in valuta: da verificare.

**Cosa manca**, per epiche: [TODO.md](TODO.md) (in testa: conformità, sicurezza di base e prova reale dell'invio PEC allo SDI). Regola per chi contribuisce: solo fonti ufficiali verificate, nessuna assunzione ([CONTRIBUTING.md](CONTRIBUTING.md)). Il design del monitoraggio normativo è in [docs/monitoraggio-normativo.md](docs/monitoraggio-normativo.md).

## Struttura

```
apps/api       NestJS + Prisma (PostgreSQL)
apps/web       Next.js + shadcn/ui
packages/fiscal-rules   regole fiscali pure (TypeScript), testate, con riferimento normativo
packages/fatturapa      generatore XML FatturaPA validato contro l'XSD ufficiale
apps/docs      sito della documentazione (Docusaurus), dalle pagine di docs/ e dall'OpenAPI dell'API
docs/          guida, conformità, fonti, normativa
```

## Avvio rapido

Requisiti: Node 24 (vedi `.nvmrc`), pnpm 10, Docker.

```bash
pnpm install
cp .env.example .env   # poi scegli POSTGRES_PASSWORD e riportala in DATABASE_URL
pnpm db:up          # PostgreSQL in Docker
pnpm db:migrate     # schema Prisma
pnpm dev            # api (http://localhost:3000/api) + web (http://localhost:3001) + Swagger (http://localhost:3000/api/docs)
```

> **Uso locale.** API, web e database ascoltano solo su `127.0.0.1`. C'è il login, ma non esporli in rete finché mancano HTTPS e le verifiche di sicurezza del [TODO](TODO.md).

Primo avvio con la creazione dell'account, aggiornamenti (compreso il passaggio al login con `pnpm admin:create`), chiave per la password PEC e dati di prova (`pnpm demo:seed`): [guida all'installazione](docs/guida/installazione.md). La documentazione completa è in [docs/](docs/) e si legge anche come sito con `pnpm --filter @opentax-it/docs start`.

## Contribuire

Leggi [CONTRIBUTING.md](CONTRIBUTING.md): si lavora solo su fonti ufficiali verificate, nessuna assunzione. Ogni regola fiscale deve citare la fonte ufficiale (norma, provvedimento, circolare) nel codice e nei test.

## Cosa manca

La lista dei lavori aperti, per epiche e con le fonti da cui partire, è in [TODO.md](TODO.md). I punti verificabili ma ancora senza fonte sono in [docs/compliance.md](docs/compliance.md), sezione "Non verificato / aperto".

## Licenza

[AGPL-3.0-only](LICENSE). Se modifichi il software e lo offri come servizio in rete, devi rendere disponibile il codice sorgente modificato agli utenti del servizio.
