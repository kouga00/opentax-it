---
title: Imposte, contributi e F24
---

# Imposte, contributi e F24

> **In breve.** Dagli incassi dell'anno OpenTax IT stima quanto devi di imposta e di contributi INPS, e quanto dovrai anticipare per l'anno dopo (gli acconti). Poi prepara i modelli F24 per pagarli, in una volta o a rate, e li stampa sul modello ufficiale. Se hai crediti, per esempio perché l'anno prima hai pagato troppo, puoi usarli per pagare meno. Sono stime a supporto, non una dichiarazione: i valori ufficiali sono quelli della dichiarazione dei redditi presentata.

> **La tua gestione previdenziale.** Nel profilo fiscale (Impostazioni) scegli a chi versi i contributi: Gestione Separata (i professionisti senza un albo con una cassa propria, DL 98/2011 art. 18 c. 12), Artigiani o Commercianti. OpenTax IT calcola i contributi, le scadenze e le righe INPS degli F24 per tutte e tre. Le **casse professionali** arriveranno una alla volta e per ora non si possono scegliere: se sei iscritto a una cassa, i contributi che versi li indichi in "Contributi previdenziali versati", perché si deducono comunque dal reddito (rigo LM35).

## Imposte e contributi (`/taxes`)

Per ogni anno d'imposta la pagina calcola, dagli incassi dell'anno:

- **reddito**: gli incassi moltiplicati per il coefficiente della tua attività (per esempio il 78%), meno i contributi previdenziali pagati nell'anno, di qualunque gestione o cassa (L. 190/2014 c. 64, righi LM22-LM36 delle istruzioni Redditi PF);
- **imposta sostitutiva** al 15%, o al 5% per l'anno di inizio attività e i quattro successivi quando spetta (c. 64-65);
- **contributo INPS Gestione Separata** sul reddito lordo (rigo LM34), in euro interi, entro il massimale, con l'aliquota della circolare INPS dell'anno; solo se nel profilo hai scelto la Gestione Separata;
- **contributi Artigiani e Commercianti**, se hai scelto una di queste gestioni: il contributo **fisso sul minimale** (dovuto anche con un reddito basso, più il contributo di maternità), in quattro rate a maggio, agosto, novembre e febbraio; e il contributo sul **reddito oltre il minimale** (reddito lordo, rigo LM34), con aliquota più alta di un punto sopra la prima fascia ed entro il massimale, pagato con saldo e acconti alle scadenze delle imposte. Valori della circolare INPS dell'anno (per il 2026 la n. 14). Con il **regime agevolato** (chiesto all'INPS entro il 28 febbraio) i contributi sono ridotti del 35%, la maternità no (L. 190/2014 c. 77; circolare INPS 35/2016). Nel profilo indichi anche se hai contributi prima del 1996, che cambiano il massimale;
- **acconti** dell'anno successivo: imposta sostitutiva in due rate 40% + 60%, o 50% + 50% per i soggetti ISA (indicalo nel profilo), non dovuti sotto 51,65 € e in unica soluzione se la prima rata non supera 103 €; contributo Gestione Separata 40% + 40%; per Artigiani e Commercianti due acconti di pari importo, calcolati sul reddito dell'anno con minimale, massimali e aliquote dell'anno successivo (istruzioni Redditi, fascicolo 2).

Contributi e acconti già versati si ricavano dagli F24 segnati come pagati in OpenTax IT; quelli versati in altro modo si inseriscono a mano nella stessa pagina. Le regole usate sono quelle del set dell'anno d'imposta per aliquote, coefficiente e massimale, e dell'anno di versamento per acconti, scadenze e codici tributo.

## Piano di versamento e F24 (`/f24`)

Da un anno d'imposta si crea il **piano di versamento** di saldo e primo acconto:

- in **unica soluzione** o a **rate mensili** al 16 di ogni mese, fino al 16 dicembre, con gli interessi di rateazione su righe proprie (codice 1668 per l'Erario, causale DPPI per l'INPS);
- con la data di partenza ordinaria, la proroga dell'anno quando c'è, o il differimento di 30 giorni con la maggiorazione (per l'INPS nella riga DPPI);
- l'anteprima mostra i modelli F24 prima di salvarli. Un piano per anno, eliminabile finché nessun modello è pagato.

Per Artigiani e Commercianti il piano contiene anche saldo e acconti oltre il minimale (causali AP/CP, APR/CPR a rate, con gli interessi su API/CPI), ognuno con il **codice INPS** di 17 cifre del suo anno: lo trovi nel cassetto previdenziale INPS ("Dati del mod. F24") e lo inserisci nella pagina Imposte dell'anno, insieme ai codici delle quattro rate fisse. Le rate fisse sono deleghe a parte: nella pagina F24, "Crea le quattro rate fisse".

Per le **casse professionali** che si pagano con F24 (quando la gestione sarà disponibile), nella pagina F24 si crea un modello con le righe che comunica la cassa: codice ente, causale e periodo vengono dalle tabelle AdE di ciascun ente e l'app li controlla; la parte deducibile (il contributo soggettivo, non l'integrativo) conta da sola in LM35 quando segni il modello come pagato. Lo stesso form serve oggi per le righe INPS di Artigiani e Commercianti che l'app non calcola (anni pregressi, avvisi di pagamento): la causale si cerca scrivendo codice o descrizione, e il codice INPS propone quelli già salvati nella pagina Imposte, perché è personale e non esiste un elenco pubblico.

Cosa vuol dire ogni codice del modello (1792, PXX, AF, DPPI...) è spiegato in [Codici e causali F24](codici-f24.mdx).

Ogni modello si stampa sul **modello ufficiale F24** dell'Agenzia delle Entrate, scaricato dal sito AdE al primo uso, e si segna come **pagato** quando l'hai pagato: indichi la data e, se vuoi, una nota su come l'hai pagato (per esempio F24 web o home banking), per ritrovarlo in seguito.

Per non ricopiare gli F24 in F24 web, il pulsante **File per File Internet** scarica un file con tutti gli F24 da pagare in quella data, già pronti con codici, importi, IBAN del conto predefinito e data di addebito. Lo apri in **File Internet**, il programma gratuito dell'Agenzia delle Entrate per chi accede con Fisconline: **Controlla** (serve il programma di controllo "Pagamenti con modello F24"), **Prepara file** e **Invia**, oppure lo invii dall'area riservata in "Servizi → Trasmissioni telematiche". L'addebito avviene alla data indicata. Il file segue le [specifiche tecniche F24 per i contribuenti](https://www.agenziaentrate.gov.it/portale/schede/pagamenti/f24/specifiche-tecniche-f24-ordinario); per ora non contiene la sezione "Altri enti previdenziali" delle casse professionali.

## Bollo sulle fatture elettroniche (`/stamp-duty`)

Il bollo da 2 € delle fatture non lo calcoli tu: lo calcola l'Agenzia delle Entrate, trimestre per trimestre, dagli elenchi che mette nel portale Fatture e Corrispettivi. Nell'**elenco A** ci sono le fatture con il bollo indicato; nell'**elenco B** quelle in cui, secondo l'Agenzia, il bollo andava e non c'è. L'elenco B si può correggere entro l'ultimo giorno del mese dopo il trimestre (per il 2° trimestre il 10 settembre); poi l'Agenzia mostra l'importo dovuto, entro il 15 del secondo mese (per il 2° trimestre il 20 settembre).

La pagina **Bollo** mostra per ogni trimestre:

- la **stima** di OpenTax IT dalle tue fatture con bollo, utile per controllare gli elenchi;
- la data limite per l'elenco B e la data entro cui l'Agenzia mostra l'importo;
- la **scadenza** del pagamento, con i differimenti quando gli importi sono piccoli;
- lo stato: da pagare, F24 creato, pagato.

Si paga in due modi:

- **dal portale**, indicando l'IBAN di un conto intestato a te: poi in OpenTax IT segni il trimestre come **pagato dal portale**, con importo e data;
- con un **F24**: "Crea F24" chiede l'importo dell'Agenzia (propone la stima) e prepara il modello con il codice del trimestre (2521-2524) nella sezione Erario e l'anno del trimestre come anno di riferimento. Il modello compare nella pagina F24 e finisce nel **file per File Internet** della sua data. Un trimestre pagato più tardi con il differimento mantiene il suo codice.

Dopo la scadenza servono anche sanzione e interessi del ravvedimento: in quel caso OpenTax IT non crea l'F24 e conviene pagare dal portale, che li calcola da solo. Se paghi prima della data limite, l'elenco B non si può più modificare. Fonti: [guida AdE "L'imposta di bollo sulle fatture elettroniche", giugno 2026](https://www.agenziaentrate.gov.it/portale/documents/d/guest/l-imposta_di_bollo_sulle_fatture_elettronichegiugno2026), [risoluzione AdE 42/E del 9 aprile 2019](https://www.agenziaentrate.gov.it/portale/documents/20143/302007/risoluzione+n+42+del+09042019_RISOLUZIONE+n.+42_09042019.pdf/3de9d99b-74e2-7f36-df09-9ef8be8f445b).

## Dichiarazione dei redditi (`/taxes/return`)

Chi ha la partita IVA non può usare il 730: presenta il modello **Redditi Persone fisiche**, anche nella versione precompilata dell'Agenzia delle Entrate, che vale pure per i forfettari. Il pulsante **Guida alla dichiarazione** della pagina Imposte mostra i quadri **LM** (imposta sostitutiva), **RR** (contributi della gestione scelta nel profilo: Gestione Separata o Artigiani e Commercianti) e **RX31** (risultato) rigo per rigo, con i valori calcolati dall'app e, per ogni rigo, cosa fare nella precompilata:

- **da inserire**: la precompilata non lo propone. Il caso più importante sono i **contributi versati** (LM35), che l'Agenzia mette solo nel foglio informativo;
- **da controllare**: la precompilata lo propone e va verificato. I **ricavi** (LM22 colonna 3) sono proposti sommando le fatture emesse nell'anno, come se fossero state incassate alla data della fattura; il forfettario invece dichiara gli incassi. La guida elenca le fatture dell'anno non incassate entro il 31 dicembre (da togliere) e quelle degli anni precedenti incassate nell'anno (da aggiungere);
- **risultato**: deriva dai righi sopra (reddito, imposta, saldo);
- **dato tuo**: l'app non lo conosce, per esempio il codice ATECO 2025.

Il credito della dichiarazione precedente (LM43) e la parte già compensata (LM44) vengono dal registro dei Crediti. Nel quadro RR, per Artigiani e Commercianti, il reddito oltre il minimale e i relativi contributi (colonne 24 e 25) non sono nella precompilata: l'INPS avvisa di aggiungerli.

Dopo l'invio, **Segna come presentata** registra nei Crediti il credito d'imposta sostitutiva da compensare (RX31) e quello della Gestione Separata (RR8), pronti per gli F24; si può annullare finché nessun F24 li usa. I crediti di Artigiani e Commercianti vanno ancora inseriti a mano.

La guida riguarda solo la parte della partita IVA: familiari, spese e altri redditi restano nei quadri della precompilata. Non gestisce le perdite degli anni precedenti, più attività di gruppi diversi, i familiari collaboratori e l'attività iniziata in corso d'anno (mesi e minimale in proporzione). Fonti: [guida AdE alla precompilata Redditi PF 2026](https://www.agenziaentrate.gov.it/portale/documents/d/guest/precompilata_2026_redditi_persone_fisiche), [istruzioni Redditi PF 2026, fascicolo 3](https://www.agenziaentrate.gov.it/portale/documents/d/guest/pf3_istruzioni_2026_agg-13-05-2026).

## Crediti e compensazione (`/credits`)

Il **registro dei crediti** raccoglie i crediti d'imposta e contributivi utilizzabili in F24, con codice, sezione, anno di riferimento e data da cui sono utilizzabili; per ognuno mostra quanto è già stato usato. Un credito si usa in compensazione nel piano di versamento, anche con un modello **a saldo zero**; l'ordine con cui i crediti coprono i debiti lo scegli tu.

Gli avvisi ricordano i vincoli delle istruzioni: un F24 con compensazioni si presenta solo con i servizi telematici dell'Agenzia delle Entrate, e oltre 5.000 € di compensazione orizzontale per credito e anno serve il visto di conformità.

I crediti d'imposta sostitutiva (RX31) e della Gestione Separata (RR8) entrano da soli nel registro quando segni la dichiarazione come presentata nella Guida alla dichiarazione; gli altri, per esempio quelli di Artigiani e Commercianti, vanno inseriti a mano.
