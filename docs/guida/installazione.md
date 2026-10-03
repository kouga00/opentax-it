---
title: Installazione
---

# Installazione

> **In breve.** Per ora OpenTax IT si installa e si usa sul tuo computer, non online. Servono alcuni programmi (Node, pnpm, Docker) e pochi comandi da terminale; poi lo apri nel browser, crei il tuo account e la tua partita IVA.

OpenTax IT gira sul tuo computer: API, sito web e database ascoltano solo su `127.0.0.1`.

> **Uso locale.** Per entrare servono account e password, e ogni utente vede solo le proprie partite IVA. API, web e database però ascoltano solo su `127.0.0.1` e rifiutano le richieste con un host diverso da quelli in `ALLOWED_HOSTS` (protezione contro il DNS rebinding): non esporli in rete, nemmeno su un NAS, finché mancano HTTPS e le altre verifiche di sicurezza ([SECURITY.md](https://github.com/kouga00/opentax-it/blob/main/SECURITY.md)).

## Requisiti

Node 24 (vedi `.nvmrc`), pnpm 10, Docker.

## Primo avvio

```bash
pnpm install
cp .env.example .env   # poi scegli POSTGRES_PASSWORD e riportala in DATABASE_URL
pnpm db:up          # PostgreSQL in Docker
pnpm db:migrate     # schema Prisma
pnpm dev            # api (http://localhost:3000/api) + web (http://localhost:3001) + Swagger (http://localhost:3000/api/docs)
```

Per salvare la password della casella PEC serve anche `APP_ENCRYPTION_KEY` in `.env`: una chiave di 32 byte in base64, generata ad esempio con `openssl rand -base64 32`. Se la chiave cambia, la password PEC va inserita di nuovo in Impostazioni.

Poi:

1. crea il tuo account, che è anche l'amministratore (solo un amministratore carica e attiva i set di regole fiscali): `pnpm admin:create <tua-email>` (con `pnpm dev` attivo, che compila l'API), che ti chiede la password. Non c'è una pagina di registrazione: gli account si creano solo così;
2. accedi su http://localhost:3001/login;
3. apri http://localhost:3001/setup/new e crea la partita IVA (profilo fiscale).

Altri utenti (per esempio il commercialista) li crei tu nella pagina **Utenti** (`/users`, solo per l'amministratore): scegli la loro password e a quali partite IVA accedono, in sola lettura o in lettura e scrittura.

In **Regole fiscali** (`/rules`) carica i set forniti con l'applicazione e attiva quello di ogni anno; conti bancari e profili di scadenza si aggiungono nelle pagine **Banche** (`/banks`) e **Profili di scadenza** (`/payment-terms`).

## Dopo ogni aggiornamento

```bash
pnpm install        # nuove dipendenze
pnpm db:migrate     # nuove migrazioni del database
pnpm dev            # rigenera il client Prisma e riavvia api e web
```

**Se aggiorni da una versione senza login**, le partite IVA che hai già non appartengono ancora a nessun account: esegui `pnpm admin:create <tua-email>`. Il comando crea il tuo account (o, se esiste già, lo rende amministratore) e ti assegna tutte le partite IVA senza un account. Senza questo passo, dopo il login non vedresti i tuoi dati.

Se l'aggiornamento porta nuovi set di regole, in **Regole fiscali** (`/rules`) vengono proposti come nuova versione in bozza, con il confronto rispetto al set attivo: controlla cosa cambia e attivali. Non vengono mai attivati automaticamente.

## Dati di prova

`pnpm demo:seed` (con `pnpm dev` attivo) crea la partita IVA "Demo Forfettario" (Gestione Separata) con clienti, fatture e incassi dell'anno scorso e di quest'anno, esiti SDI, due crediti e il piano rate F24, e due partite IVA iscritte ad Artigiani e Commercianti: "Demo Artigiano" e "Demo Commerciante" (con la riduzione del 35%), con codici INPS inventati, le quattro rate fisse dell'anno e il piano F24 con i contributi oltre il minimale. Selezionale in `/setup` e apri `/taxes` e `/f24`. `pnpm demo:seed --reset` le cancella e le ricrea con le regole attive. Il seed carica prima i set di regole forniti con il codice e si ferma se c'è una bozza più recente di quella attiva: non attiva mai nulla da solo.
