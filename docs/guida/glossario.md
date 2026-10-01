---
title: Glossario
---

# Glossario

Le parole di fisco e fatturazione elettronica che trovi nell'app e in questa guida, spiegate in breve. Il dettaglio e le fonti sono nelle pagine collegate.

## Il regime

### Regime forfettario

Il regime fiscale agevolato per chi lavora in proprio con ricavi fino a 85.000 € l'anno. Non si applica l'IVA in fattura e si paga un'unica imposta, calcolata su un reddito stimato con una percentuale fissa (il coefficiente) invece che sulle spese reali. Legge 190/2014, art. 1, commi 54-89.

### Partita IVA

Nell'app è l'attività di cui gestisci fatture e tasse, con il suo profilo fiscale. Si possono gestire più partite IVA e scegliere quella attiva in Impostazioni.

### Codice ATECO

Il codice che descrive la tua attività. Serve a stabilire il coefficiente di redditività.

### Coefficiente di redditività

La percentuale degli incassi che il forfettario considera reddito: con un coefficiente del 78%, su 10.000 € incassati il reddito è 7.800 €. Dipende dal codice ATECO.

### Principio di cassa

Conta quello che incassi nell'anno, non quello che fatturi: una fattura di dicembre pagata a gennaio vale per l'anno dopo. Per questo in OpenTax IT ogni incasso va registrato.

## Fatture e SDI

### Fattura elettronica (FatturaPA)

Un file XML con un formato stabilito dall'Agenzia delle Entrate. Il PDF che mandi al cliente è solo una copia di cortesia: la fattura vera è il file XML consegnato dallo SDI.

### SDI (Sistema di Interscambio)

Il "postino" dell'Agenzia delle Entrate: riceve ogni fattura elettronica, la controlla e la consegna al cliente. Una fattura che non passa dallo SDI non è una fattura elettronica valida.

### PEC (Posta elettronica certificata)

Una email con valore legale, come una raccomandata con ricevuta di ritorno. È uno dei modi per inviare le fatture allo SDI, e quello che usa OpenTax IT.

### Codice destinatario

Sette caratteri che dicono allo SDI dove consegnare la fattura al cliente (il software o l'intermediario che usa). `0000000` vuol dire "nessun codice": lo SDI usa la PEC del cliente, se c'è, o mette la fattura nella sua area riservata. Se però il cliente ha registrato sul portale dell'Agenzia delle Entrate un proprio indirizzo di recapito, lo SDI consegna lì, qualunque codice tu abbia scritto.

### Ricevute SDI

Le risposte dello SDI a ogni fattura inviata:
- **consegna**: il cliente l'ha ricevuta;
- **impossibilità di recapito**: lo SDI non è riuscito a consegnarla, ma l'ha messa a disposizione del cliente nella sua area riservata sul sito dell'Agenzia delle Entrate. La fattura vale comunque;
- **scarto**: la fattura aveva un errore ed è come se non fosse mai stata emessa. Va corretta e rimandata.

### Fattura emessa

Per il fisco una fattura elettronica è emessa quando lo SDI la consegna o la mette a disposizione del cliente. Una fattura scartata non è emessa, anche se ha un numero.

### Nota di credito

Il documento che annulla, in tutto o in parte, una fattura già emessa: per esempio per uno sconto concesso dopo o per un errore negli importi.

### Causale e diciture

Righe di testo libero della fattura elettronica. OpenTax IT ci scrive le frasi obbligatorie per il forfettario (per esempio che l'operazione è senza IVA e senza ritenuta) e, quando serve, il collegamento a una fattura scartata.

### Bollo virtuale

Un'imposta di 2 € sulle fatture senza IVA di importo superiore a 77,47 €. Non si mette una marca da bollo: si indica nella fattura elettronica e si paga ogni trimestre, dal portale Fatture e Corrispettivi o con F24, nell'importo calcolato dall'Agenzia delle Entrate. Si può addebitare al cliente, e in quel caso conta come compenso.

### Condizioni di pagamento (rate, fine mese, RiBa)

Come e quando il cliente deve pagare. In fattura ci sono la **modalità** (bonifico, ricevuta bancaria o **RiBa**, carta, contanti...) e una o più **scadenze**: con più rate (per esempio 30/60/90 giorni) la fattura è "a rate" e ha una scadenza e un importo per rata. **"Fine mese" (f.m.)** vuol dire che, dopo i giorni, la scadenza va all'ultimo giorno del mese: 30 gg f.m. su una fattura del 30 settembre scade il 31 ottobre. "D.f." vuol dire dalla data fattura.

### Conservazione a norma

L'obbligo di conservare le fatture elettroniche in modo che restino integre e leggibili per anni. Salvare i file sul computer non basta: l'Agenzia delle Entrate offre un servizio gratuito dal portale Fatture e Corrispettivi.

## Tasse, contributi e pagamenti

### Imposta sostitutiva

L'unica imposta del forfettario, al posto dell'IRPEF e delle addizionali: 15% del reddito, o 5% per i primi cinque anni di attività quando spetta.

### Contributi INPS Gestione Separata

I contributi per la pensione dei professionisti senza un albo con una cassa propria: per legge ci sono iscritti "esclusivamente i soggetti che svolgono attività il cui esercizio non sia subordinato all'iscrizione ad appositi albi professionali" (DL 98/2011 art. 18 c. 12). Si calcolano sul reddito del forfettario. Chi ha un'impresa artigiana o commerciale versa invece alla gestione Artigiani o Commercianti, chi è iscritto a un albo con una cassa (per esempio avvocati, ingegneri) versa alla propria cassa professionale. La gestione si sceglie nel profilo fiscale; OpenTax IT calcola i contributi della Gestione Separata e di Artigiani e Commercianti, mentre le casse professionali arriveranno una alla volta.

### Contributi INPS Artigiani e Commercianti

Per chi ha un'attività artigiana o commerciale: un contributo **fisso** sul reddito minimo, dovuto anche con un reddito basso e pagato in quattro rate, più un contributo sul reddito **oltre il minimo**, pagato con saldo e acconti come le imposte. Con il regime agevolato del forfettario, chiesto all'INPS, sono ridotti del 35%.

### Saldo e acconti

Le tasse si pagano un po' in anticipo. Il **saldo** chiude il conto dell'anno passato; gli **acconti** sono anticipi su quello in corso, in due rate (giugno e novembre), calcolati su quanto dovuto l'anno prima.

### Soggetti ISA

Chi svolge un'attività per cui esiste un indice sintetico di affidabilità fiscale (ISA). Conta per gli acconti dell'imposta sostitutiva, che si dividono 50% e 50% invece che 40% e 60%. Si indica nel profilo.

### F24

Il modello con cui si pagano tasse e contributi: ogni riga ha un codice tributo che dice cosa stai pagando e per quale anno. OpenTax IT lo compila e lo stampa sul modello ufficiale. I codici sono spiegati in [Codici e causali F24](codici-f24.mdx).

### File Internet

Programma gratuito dell'Agenzia delle Entrate (nel "Desktop Telematico", per chi accede con Fisconline) che controlla, prepara e invia file già pronti, tra cui quelli degli F24. OpenTax IT prepara il file con gli F24 di una data: lo carichi lì invece di ricopiare ogni F24 in F24 web.

### Rateazione

Saldo e primo acconto si possono pagare a rate mensili, con gli interessi previsti, invece che in una volta sola.

### Credito d'imposta e compensazione

Se dalla dichiarazione risulta che hai pagato troppo, hai un credito. Con la **compensazione** lo usi nell'F24 per pagare meno altre tasse o contributi; se il credito copre tutto, l'F24 è "a saldo zero" e va inviato comunque.

### Intrastat

Elenchi da inviare quando fornisci servizi a imprese di altri Paesi dell'Unione Europea.

### Dichiarazione dei redditi (Redditi PF) e precompilata

Chi ha la partita IVA presenta il modello **Redditi Persone fisiche** (non il 730). L'Agenzia prepara una versione **precompilata**, anche per i forfettari, che si controlla, si corregge e si invia online. Per il forfettario i quadri della partita IVA sono **LM** (reddito e imposta sostitutiva) e **RR** (contributi INPS); il risultato va nel quadro **RX**.

## Nell'app

### Set di regole

Tutti i valori fiscali di un anno (aliquote, soglie, scadenze, codici tributo), ognuno con la sua fonte ufficiale. Si attiva a mano, dopo aver visto cosa cambia. Vedi [Regole fiscali e fonti](regole-e-fonti.md).

### Fonte ufficiale

Un documento pubblicato da un ente (Agenzia delle Entrate, INPS, Gazzetta Ufficiale, ADM, fatturapa.gov.it, AgID per la PEC). OpenTax IT codifica solo regole scritte in una fonte ufficiale e ne conserva una copia.
