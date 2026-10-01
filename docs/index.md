---
slug: /
title: Introduzione
---

# OpenTax IT

Gestionale **open source** per partite IVA italiane in **regime forfettario** (L. 190/2014, art. 1 c. 54-89): fatture elettroniche e invio allo SDI via PEC, incassi e soglie, imposta sostitutiva e contributi INPS, piani F24, scadenze. Ogni regola applicata cita una fonte ufficiale.

L'elenco completo di cosa fa è nel [README del repository](https://github.com/kouga00/opentax-it#cosa-fa); il lavoro aperto in [TODO.md](https://github.com/kouga00/opentax-it/blob/main/TODO.md).

> **Non è consulenza fiscale.** È uno strumento di supporto al calcolo e all'organizzazione e non sostituisce un professionista abilitato. Non si garantisce la correttezza dei dati e dei calcoli: vedi [DISCLAIMER.md](https://github.com/kouga00/opentax-it/blob/main/DISCLAIMER.md).

## Da dove partire

- **Usarlo**: [installazione](guida/installazione.md), poi [clienti e fatture](guida/fatture.md), [casella PEC e invio allo SDI](guida/pec-e-sdi.md), [import di fatture e ricevute](guida/import.md), [incassi e soglie](guida/incassi-e-soglie.md), [imposte, contributi, F24 e dichiarazione](guida/imposte-e-f24.md), [scadenze](guida/scadenze.md) e [regole fiscali e fonti](guida/regole-e-fonti.md). Se un termine non è chiaro, c'è il [glossario](guida/glossario.md).
- **Verificare le regole**: la [matrice di conformità](compliance.md) collega ogni funzione alla sua fonte ufficiale; il [registro delle fonti](fonti/README.md) conserva la copia di ogni documento citato.
- **Integrarlo o contribuire**: il riferimento dell'API (sezione **API** del sito di documentazione) è generato dal codice; le regole per chi contribuisce sono in [Per chi contribuisce](contribuire/index.md).
