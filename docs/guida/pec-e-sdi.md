---
title: Casella PEC e invio allo SDI
---

# Casella PEC e invio allo SDI

> **In breve.** Ogni fattura elettronica passa dallo SDI, il "postino" dell'Agenzia delle Entrate, che la controlla e la consegna al cliente. OpenTax IT gliela manda con la tua casella PEC. Configuri la casella una volta, fai due prove che non emettono nulla, poi invii le fatture con un pulsante. Le risposte dello SDI arrivano nella stessa casella e l'app le legge da sola: la fattura conta come emessa solo quando lo SDI la consegna o la mette a disposizione del cliente. Se viene scartata, la correggi e la rimandi. I termini sono spiegati nel [glossario](glossario.md).

Le fatture elettroniche arrivano al cliente attraverso il Sistema di Interscambio (SDI) dell'Agenzia delle Entrate. OpenTax IT le invia con la **tua casella PEC**, uno dei canali previsti dalle regole tecniche dell'Agenzia (Specifiche tecniche FatturaPA 1.9.1 §1.3.1): non servono intermediari a pagamento né l'accreditamento, una procedura di abilitazione pensata per le aziende di software, che serve solo per gli altri canali.

> **Il canale PEC non ha un ambiente di prova.** Ogni messaggio verso lo SDI è reale. Per questo, prima della prima fattura, conviene fare la prova di connessione e la PEC di prova descritte sotto.

## 1. Configura la casella

In **Impostazioni** (`/setup`), scheda **PEC**:

- **Gestore**: Aruba PEC, Poste Italiane (postecert.it), Postel (postecertifica.it) e InfoCert Legalmail hanno i server già compilati, presi dalle pagine ufficiali dei gestori; per gli altri scegli "Altro gestore" e inserisci server e porte SMTP e IMAP.
- **Indirizzo, nome utente e password** della casella. La password è cifrata nel database con la chiave `APP_ENCRYPTION_KEY` (vedi [Installazione](installazione.md)) e non viene mai mostrata di nuovo.
- **Verifica in due passaggi**: alcuni gestori non accettano la password principale dai programmi di posta quando è attiva. Per Aruba serve la "Password per programmi di posta"; il form rimanda alla guida del gestore scelto.

## 2. Prova la connessione

**Prova la connessione** accede ai server SMTP e IMAP con i dati salvati, senza inviare nulla, e mostra ogni passaggio man mano: connessione cifrata al server di invio, accesso, connessione cifrata al server di ricezione, accesso. Se un passaggio non riesce, il messaggio dice quale dato correggere.

## 3. Invia la PEC di prova allo SDI

**Invia PEC di prova allo SDI** manda allo SDI un messaggio PEC vero ma **vuoto**, senza fatture: non emette nulla. Lo SDI risponde con un messaggio che segnala l'invio vuoto (le specifiche lo chiamano "messaggio di cortesia", §1.3.1). Se arriva, sai che tutta la strada funziona: il tuo gestore ha accettato il messaggio, lo ha consegnato allo SDI e lo SDI ti ha risposto.

Le risposte possono arrivare dopo qualche minuto: premi **Controlla le risposte** prima di inviare un'altra prova.

## 4. Invia una fattura

Dalla fattura numerata (stato **Da inviare**), **Invia allo SDI** allega il file XML a un messaggio PEC. Il primo messaggio va all'indirizzo generale dello SDI, `sdi01@pec.fatturapa.it`. Con la prima risposta lo SDI ti assegna un indirizzo personale da usare per gli invii successivi; OpenTax IT lo legge e lo salva da solo (Allegato B al DM 55/2013, specifiche v1.8.4 §3.1.1). Finché non lo conosce, blocca i nuovi invii: premi **Controlla ricevute** oppure inseriscilo a mano in Impostazioni.

Si invia anche dall'elenco delle fatture, con l'icona **Invia allo SDI** nella riga (o nel menu **⋯** quando le azioni sono più di tre). Le fatture importate (inviate con un altro strumento) e quelle verso la pubblica amministrazione (serve la firma qualificata, non ancora supportata) non si inviano da qui.

**Se l'invio non riesce** (password cambiata, server del gestore irraggiungibile...), la fattura torna **Da inviare** e il dettaglio mostra il motivo: correggi e riprova. Se il messaggio in realtà era partito e arriva l'accettazione del gestore, l'invio si rimette a posto da solo.

**Se l'app si interrompe proprio durante l'invio**, dopo 15 minuti la fattura mostra l'avviso "Invio non confermato". Non reinviare subito: se arriva l'accettazione del gestore lo stato si aggiorna da solo; altrimenti controlla nella posta inviata della casella PEC se il messaggio è partito. Un secondo invio dello stesso file verrebbe scartato come duplicato.

## 5. Ricevute ed esito

OpenTax IT legge la casella PEC **in sola lettura**: non sposta, non cancella e non segna come letto nessun messaggio. La legge all'avvio, ogni 10 minuti finché un invio attende l'esito e quando premi **Controlla ricevute**. Riparte dall'ultimo messaggio letto, quindi recupera anche ciò che è arrivato mentre l'app era spenta.

Arrivano due tipi di risposte:

- le **ricevute del tuo gestore PEC** (accettazione, consegna) dicono solo che il messaggio è partito ed è arrivato alla casella dello SDI: non dicono ancora niente sulla fattura;
- le **ricevute dello SDI** danno l'esito. **Consegna**: il cliente l'ha ricevuta. **Impossibilità di recapito**: lo SDI non è riuscito a consegnarla, ma l'ha messa nell'area riservata del cliente sul sito dell'Agenzia. In entrambi i casi la fattura è **emessa**, e solo da quel momento entra nel fatturato. **Scarto**: la fattura aveva un errore e per il fisco non è mai stata emessa ("si considera non emessa", §1.6).

Se dopo 5 giorni non è arrivato nessun esito, la fattura mostra un avviso: lo scarto arriva entro 5 giorni dalla ricezione del file (§1.6), e lo stato si controlla sul portale Fatture e Corrispettivi.

Anche il **bollo** dipende dalle ricevute: l'Agenzia delle Entrate conta il bollo di una fattura nel trimestre in cui è stata consegnata o messa a disposizione, non in quello della sua data. Una fattura del 30 marzo consegnata il 1° aprile va nel secondo trimestre (guida "L'imposta di bollo sulle fatture elettroniche", giugno 2026). OpenTax IT fa lo stesso; nello scadenzario un trimestre è segnato **Stima** finché contiene fatture di cui non conosce ancora quella data.

## Gli stati di una fattura

Nell'elenco delle fatture ogni documento ha uno stato:

| Stato | Cosa vuol dire |
|---|---|
| **Bozza** | Modificabile, senza numero. |
| **Da inviare** | Numerata, con il file XML pronto: va inviata allo SDI. |
| **Inviata allo SDI** | Partita, in attesa dell'esito dello SDI. |
| **Consegnata** | Lo SDI l'ha consegnata al cliente: è **emessa**. |
| **Messa a disposizione** | Lo SDI non è riuscito a consegnarla e l'ha messa nell'area riservata del cliente: è **emessa** comunque. |
| **Scartata** | Lo SDI l'ha rifiutata: **non è emessa**, va corretta o sostituita. |
| **Da correggere** | Una fattura scartata riaperta per la correzione, con numero e data bloccati. |
| **Scartata e sostituita** | Scartata, e sostituita da una nuova fattura con un nuovo numero: non serve fare altro. |
| **Importata** | Emessa e inviata con un altro strumento, poi caricata qui: conta come emessa. |

Nel dettaglio della fattura, la sezione **Invio allo SDI** mostra ogni invio con le sue ricevute e la data di ciascuna.

## 6. Se la fattura viene scartata

Una fattura scartata non è mai stata emessa, quindi va rimandata. L'Agenzia delle Entrate chiede di farlo, se possibile, entro cinque giorni dalla ricevuta di scarto e con lo stesso numero e la stessa data ("preferibilmente [...] entro cinque giorni dalla notifica di scarto [...] con la data ed il numero del documento originario", circolare 13/E/2018 §1.6). Sulla fattura scartata trovi due azioni:

- **Correggi e reinvia** (la via preferita): la fattura torna modificabile con numero, data e tipo di documento bloccati. Alla nuova emissione il file prende un nome nuovo, perché un nome già usato verrebbe scartato (errore 00002).
- **Riemetti con un nuovo numero**, quando lo stesso numero e la stessa data non sono possibili: crea una nuova fattura datata oggi, collegata a quella scartata. Il collegamento, chiesto dalla circolare, è scritto tra le diciture della nuova fattura con numero, data e identificativo SdI della scartata. Il testo è una scelta di OpenTax IT, perché la circolare non ne indica uno. La fattura scartata resta non emessa.

Le fonti di ogni passaggio sono nella [matrice di conformità](../compliance.md).
