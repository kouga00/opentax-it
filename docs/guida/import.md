---
title: Import di fatture e ricevute
---

# Import di fatture e ricevute

> **In breve.** Se hai emesso fatture con un altro programma o dal sito dell'Agenzia delle Entrate, puoi caricarle qui, anche tutte insieme in un file ZIP. Così numerazione, bollo, fatturato e incassi dell'anno tornano completi. Puoi caricare anche le ricevute dello SDI di quelle fatture, per sapere se sono state consegnate o scartate. Prima vedi cosa succederebbe, poi scegli cosa importare.

In **Fatture → Importa** (`/invoices/import`) si caricano:

- le **fatture elettroniche** emesse con altri software o scaricate dal portale Fatture e Corrispettivi, per completare numerazione, bolli e incassi dell'anno;
- le **ricevute SDI** delle fatture inviate fuori da qui (consegna, scarto, impossibilità di recapito), per registrarne l'esito.

Si caricano file `.xml` o archivi `.zip`, anche insieme e anche misti, come quelli di "Consultazioni e download massivi" del portale Fatture e Corrispettivi, che "consente di scaricare [...] le ricevute dei file trasmessi" (AdE, "La home page del portale Fatture e Corrispettivi").

## Due passaggi

1. **Analizza** legge i file senza salvare nulla e mostra, per ognuno, cosa succederebbe: da importare, già presente, errore o ignorato, con il motivo.
2. **Importa** importa le righe spuntate. L'API ricontrolla tutto: quello che era valido nell'anteprima può non esserlo più.

Spuntando una ricevuta si spunta anche la fattura a cui si riferisce, se è nello stesso caricamento; togliendo la fattura si tolgono le sue ricevute.

## Cosa viene controllato

- **Fatture**: il cedente deve essere la partita IVA attiva; i clienti mancanti vengono creati. Una fattura con data futura è rifiutata, perché lo SDI la scarterebbe (errore 00403). Il nome del file è unico per partita IVA, perché le ricevute si collegano alla fattura proprio dal nome del file. Le fatture importate contano come emesse finché non se ne importa l'esito e non si inviano da qui.
- **Ricevute**: si collegano alla fattura dal nome del file (`NomeFile`), anche se la fattura arriva nello stesso caricamento. Per una fattura inviata con un altro strumento l'app registra un invio "con un altro strumento" e ne aggiorna lo stato con l'esito della ricevuta, come per quelle inviate da qui: consegnata, messa a disposizione o scartata. Una fattura importata e poi scartata si corregge con lo strumento da cui è stata inviata. La stessa ricevuta caricata due volte viene registrata una volta; un esito diverso da quello già registrato per lo stesso file è rifiutato, perché lo SDI dà un solo esito per file.
- **Altri file**: metadati SDI, messaggi per la pubblica amministrazione e XML non riconosciuti sono ignorati, ciascuno con il motivo.

## Limiti

- 5 MB per file fattura, il limite dello SDI;
- in un caricamento: fino a 200 file, fino a 2.000 file estratti dagli archivi e 200 MB di contenuto estratto (protezione contro gli archivi compressi malevoli);
- le fatture firmate (`.p7m`) non sono ancora supportate.

La struttura degli archivi del portale non è descritta da una fonte ufficiale: i file sono riconosciuti dal contenuto, non dal nome o dalla cartella.
