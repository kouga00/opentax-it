---
title: Per chi contribuisce
---

# Per chi contribuisce

Le regole stanno nel repository, accanto al codice, e valgono con o senza agente AI:

- [CONTRIBUTING.md](https://github.com/kouga00/opentax-it/blob/main/CONTRIBUTING.md): la regola che viene prima di tutte (solo fonti ufficiali, nessuna ipotesi), regole fiscali, codice e segnalazioni.
- [AGENTS.md](https://github.com/kouga00/opentax-it/blob/main/AGENTS.md): struttura del monorepo, comandi e convenzioni del codice (cartelle dei moduli dell'API, DTO e mapper, Swagger, sicurezza OWASP, test).
- [SECURITY.md](https://github.com/kouga00/opentax-it/blob/main/SECURITY.md): come segnalare una vulnerabilità e le protezioni presenti.
- [TODO.md](https://github.com/kouga00/opentax-it/blob/main/TODO.md): il lavoro aperto, per epiche e con le fonti da cui partire.

## Riferimento dell'API

La sezione **API** di questo sito è generata dal documento OpenAPI che `@nestjs/swagger` costruisce dai controller e dai DTO dell'API, quindi è sempre allineata al codice. Per generarlo a mano:

```bash
pnpm --filter @opentax-it/api run openapi <file.json>
```

## Questo sito

Le pagine sono i file Markdown della cartella `docs/` del repository, leggibili anche su GitHub; il sito è costruito con [Docusaurus](https://docusaurus.io) da `apps/docs`:

```bash
pnpm --filter @opentax-it/docs start   # http://127.0.0.1:3002, si aggiorna mentre scrivi
pnpm --filter @opentax-it/docs build   # sito statico in apps/docs/build
```
