---
title: Clienti e fatture
---

# Clienti e fatture

> **In breve.** Prima crei il cliente, indicando se è un'azienda o un privato e in quale Paese si trova: da questo dipendono le frasi obbligatorie e il trattamento fiscale della fattura, che OpenTax IT scrive per te. Poi prepari la fattura come bozza, che puoi modificare quanto vuoi. Quando è pronta la **numeri**: OpenTax IT le dà il numero successivo e prepara il file XML da inviare allo SDI. Da quel momento non si modifica più; per correggere una fattura emessa si usa una nota di credito. I termini sono spiegati nel [glossario](glossario.md).

## 1. Il cliente (`/customers`)

Il **tipo di cliente** decide come viene scritta la fattura:

| Tipo | Cosa cambia in fattura |
|---|---|
| Italia, azienda o professionista | Frasi del regime forfettario, nessuna IVA. |
| Italia, privato | Come sopra. |
| Italia, pubblica amministrazione | Per ora l'emissione è bloccata: le fatture alla PA vanno firmate digitalmente, e la firma non è ancora supportata. |
| Unione Europea, azienda o professionista | Operazione senza IVA italiana con la dicitura "inversione contabile" (il cliente applica l'IVA nel suo Paese) ed elenco Intrastat da inviare. |
| Unione Europea, privato | Come un privato italiano. |
| Extra UE, azienda o professionista | Operazione senza IVA con la dicitura "operazione non soggetta". |
| Extra UE, privato | Come un privato italiano, salvo alcuni servizi (per esempio consulenza e fornitura di dati) che si considerano resi fuori dall'Italia: per questi c'è un'opzione nel cliente. |

Queste regole vengono dal DPR 633/72, art. 7-ter e 7-septies, e dalla guida dell'Agenzia delle Entrate alla fattura elettronica; il dettaglio è nella [matrice di conformità](../compliance.md). Se hai dubbi su come classificare un servizio, chiedi a chi ti assiste.

Per i clienti italiani serve anche il **codice destinatario**: 7 caratteri che il cliente ti comunica. Se non ce l'ha, lascia il campo vuoto: lo SDI userà la sua PEC, se la indichi, o metterà la fattura nella sua area riservata. Per i clienti esteri il codice lo imposta l'app.

## 2. La bozza (`/invoices` → Nuova fattura)

Una bozza non ha numero: puoi crearne quante vuoi, modificarle ed eliminarle. Indichi:

- **cliente** e **tipo di documento**: fattura, oppure nota di credito con la fattura che rettifica;
- **data**: mai nel futuro, perché lo SDI la scarterebbe. La fattura va emessa entro 12 giorni dall'operazione, o entro il 15 del mese successivo per i servizi a clienti esteri con partita IVA (DPR 633/72, art. 21 c. 4);
- **valuta**: per le fatture in valuta serve il cambio del giorno, proposto con quello della Banca d'Italia e modificabile (DPR 633/72, art. 13 c. 4);
- **righe**: descrizione, quantità e prezzo;
- **rivalsa INPS**: il 4% che puoi addebitare al cliente come contributo previdenziale (L. 662/1996, art. 1 c. 212), solo se sei in Gestione Separata. Di default segue il profilo, ma si può scegliere per ogni fattura. Conta come compenso;
- **contributo di cassa** (quando la gestione "Cassa professionale" sarà disponibile nel profilo; oggi non si può ancora scegliere): con cassa e aliquota indicate nel profilo, il contributo (per esempio il contributo integrativo) viene aggiunto alla fattura nei "Dati cassa previdenziale". Per legge vale per tutti i compensi (per esempio L. 576/1980 art. 11 per gli avvocati), ma alcune casse escludono certe fatture, come Inarcassa per molti servizi a clienti esteri: per questo nella fattura puoi scegliere di non applicarlo. Non è un ricavo: non entra nel reddito né nelle soglie ("i contributi addebitati al committente in fattura sono esclusi", pagina AdE della precompilata sul quadro LM);
- **pagamento**: profilo di scadenza, modalità (bonifico, ricevuta bancaria, carta, addebito SEPA, contanti...) e conto su cui ricevere il pagamento; l'IBAN compare in fattura solo per bonifico e addebito SEPA. Un profilo può avere **più rate** (per esempio 30/60/90 giorni) e contare i giorni dalla data fattura, con la scadenza spostata eventualmente a **fine mese** ("30 gg f.m." su una fattura del 30/09 scade il 31/10): con più rate la fattura elettronica è "pagamento a rate" (TP01) con una scadenza e un importo per rata, e la copia PDF le elenca. Il totale è diviso in parti uguali, gli eventuali centesimi in più vanno sull'ultima rata ([specifiche FatturaPA 1.9.1, dati di pagamento](https://www.agenziaentrate.gov.it/portale/specifiche-tecniche-versione-1.9));

Al salvataggio OpenTax IT calcola il resto: rivalsa o contributo di cassa, **bollo** da 2 € quando la fattura supera 77,47 € (aggiunto al totale, cioè addebitato al cliente; nel conto dei 77,47 € l'app comprende rivalsa e contributo di cassa, perché l'AdE lega la soglia alla somma "non soggetta ad IVA" e nel forfettario tutta la fattura lo è: risposte 428/2022 e 7/2022; nessuna fonte però li nomina), il codice che indica perché non c'è IVA (la "natura") e le frasi obbligatorie per il forfettario.

## 3. La numerazione

Dalla bozza, **Numera e genera l'XML**:

- la fattura prende il **numero progressivo** dell'anno; le note di credito hanno una serie a parte, che inizia con "NC-" (una scelta dell'app, la norma chiede solo un numero progressivo univoco);
- viene generato il **file XML** della fattura elettronica, con un nome che non si ripete;
- puoi ancora cambiare scadenza e IBAN (con più rate le scadenze seguono il profilo);
- se con questa fattura gli incassi dell'anno rischiano di superare i 100.000 € o il limite personale del profilo, l'app te lo dice e chiede conferma (vedi [Incassi e soglie](incassi-e-soglie.md)).

Da qui la fattura è **Da inviare**: non si modifica più. Il passo successivo è l'[invio allo SDI](pec-e-sdi.md). Numerare non basta: per il fisco la fattura è emessa solo quando lo SDI la consegna o la mette a disposizione del cliente.

## 4. Copia di cortesia e file XML

Da ogni fattura puoi aprire o scaricare la **copia di cortesia in PDF**, da mandare al cliente, e scaricare il **file XML**. La copia di cortesia di una fattura numerata è costruita dal file XML, quindi mostra esattamente quello che è stato inviato allo SDI. L'originale resta l'XML consegnato dallo SDI, e va conservato a norma: vedi [conservazione a norma](glossario.md#conservazione-a-norma).

## 5. Correggere una fattura

- **Bozza**: si modifica o si elimina.
- **Fattura numerata e consegnata**: non si modifica. Per annullarla in tutto o in parte si emette una **nota di credito** che la richiama. Anche la nota di credito paga il bollo, se supera 77,47 €.
- **Fattura scartata dallo SDI**: vedi [Se la fattura viene scartata](pec-e-sdi.md#6-se-la-fattura-viene-scartata).
