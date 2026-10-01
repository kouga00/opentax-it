# Riferimenti normativi per OpenTax IT — aggiornato al 22/09/2026

Tutto ciò che segue è stato verificato su **fonti primarie** (testo di legge su Normattiva/GU, provvedimenti e istruzioni ufficiali AdE, circolari INPS). Dove un dato è stato preso solo da fonti secondarie è marcato con ⚠️ **[non verificato su fonte ufficiale]**. Ogni regola nel codice deve citare in commento il riferimento qui riportato.

Principio guida: **nessun valore hardcodato** — aliquote, soglie, scadenze e numero di rate vanno in un `FiscalRuleSet` versionato per anno, perché proroghe e importi cambiano ogni anno.

---

## 1. Regime forfettario — L. 190/2014, art. 1, commi 54-89 (testo vigente)

Fonte: Normattiva, `urn:nir:stato:legge:2014-12-23;190~art1`; Istruzioni Redditi PF 2026 Fascicolo 3, quadro LM sez. III.

| Regola | Valore | Riferimento |
|---|---|---|
| Soglia accesso/permanenza (ricavi/compensi anno precedente, ragguagliati ad anno) | **85.000 €** | c. 54 lett. a) |
| Uscita **immediata** (dall'anno stesso) | ricavi/compensi percepiti **> 100.000 €**; IVA dovuta dalle operazioni che superano il limite; reddito dell'intero anno ricalcolato in modo ordinario | c. 71; Circ. 32/E/2023 |
| Uscita dall'anno successivo | superamento 85k o causa ostativa c. 57 | c. 71 |
| Spese lavoro dipendente/collaboratori | ≤ 20.000 € lordi | c. 54 lett. b) |
| Causa ostativa redditi di lavoro dipendente anno precedente | > 30.000 €; **per 2025 e 2026 elevato a 35.000 €** (L. 199/2025 art. 1 c. 27) | c. 57 lett. d-ter) |
| Coefficiente redditività ATECO 62 (ATECO 2007, gruppo "altre attività") | **67%** — resta valido finché non approvati i nuovi coefficienti su ATECO 2025 (D.Lgs. 81/2025 art. 1) | c. 64 + all. 4; Istr. LM |
| Imposta sostitutiva | **15%**; **5%** per il periodo di inizio attività e i 4 successivi se ricorrono le condizioni del c. 65 | c. 64, c. 65 |
| Contributi previdenziali versati nell'anno | **deducibili per intero** dal reddito forfettario; eccedenza deducibile dal reddito complessivo (RP21) | c. 64; rigo LM35/LM49 |
| Principio di cassa | reddito = ricavi/compensi **percepiti** nel periodo d'imposta × coefficiente | c. 64; Istr. LM "Determinazione del reddito" |
| Ritenuta d'acconto | non subita; dichiarazione al committente | c. 67 |
| IVA operazioni nazionali | nessuna rivalsa | c. 58 lett. a) |
| Servizi resi/ricevuti con non residenti | si applicano artt. 7-ter ss. DPR 633/72 | c. 58 lett. d) |
| Versamenti imposta sostitutiva | "si applicano le disposizioni in materia di versamento dell'IRPEF" (→ stesse regole acconti/saldo/rate) | c. 64 ultimo periodo |
| Regime contributivo agevolato (-35%) | **solo esercenti attività d'impresa** (artigiani/commercianti), non professionisti in Gestione Separata | c. 76-84 |
| ISA | forfettari esclusi | Istr. LM |
| Concordato preventivo biennale | **non applicabile ai forfettari dal 1/1/2025** (abrogato il capo III del D.Lgs. 13/2024) | D.Lgs. 81/2025 art. 7 |

### Quadro LM — righi rilevanti (Redditi PF 2026, Fascicolo 3)
- LM21: col. 1 requisiti c. 54, col. 2 assenza cause ostative c. 57, col. 3 condizioni aliquota 5%, col. 4 codice ATECO 2025.
- LM22 col. 3: ricavi/compensi **percepiti**; col. 5 = col. 3 × coefficiente.
- LM34: reddito lordo (col. 2 = quota Gestione Separata). LM35: contributi versati (col. 2 = quota che trova capienza). LM36 = LM34 − LM35. LM39 = imposta sostitutiva.
- LM43/LM44: eccedenza imposta anno precedente (da RX31 col. 5) e parte già compensata in F24.
- LM45 col. 2: acconti versati (codici **1790/1791**), al netto di maggiorazioni/interessi da rateazione.
- LM46/LM47: imposta a debito (cod. **1792**) / a credito (→ RX31 col. 2, compensabile ex art. 17 D.Lgs. 241/97).

---

## 2. Versamenti, acconti, rateazione

### 2.1 Codici tributo (Istr. Redditi PF 2026 Fasc. 1, "Principali codici tributo")
- **1790** imposta sostitutiva forfettario — acconto prima rata
- **1791** — acconto seconda rata o unica soluzione
- **1792** — saldo
- **1668** interessi pagamento dilazionato (sez. Erario)
- INPS Gestione Separata professionisti — scheda INPS "F24 per professionisti iscritti alla Gestione Separata" (agg. 8/7/2025): **PXX** saldo/acconto in unica soluzione (aliquota piena; **P10** per pensionati/altra copertura); **PXXR** (P10R) per i versamenti **rateali**; **DPPI** interessi di differimento (0,40%) **e** di rateazione, esposti su riga separata con gli stessi campi del contributo; codice sede in base alla residenza; periodo di riferimento "da" 01AAAA "a" 12AAAA. Tabella causali AdE (02/07/2026) coerente.

#### 2.1-bis Compilazione del modello F24 (verificato il 21/09/2026)
- **AdE, "Avvertenze per la compilazione del mod. F24"**: "Se gli importi dovuti a titolo di saldo o di acconto sono pagati in unica soluzione, nelle colonne 'rateazione/regione/prov./mese rif.' della sezione 'Erario' ... indicare **0101**"; a rate, "la rata che sta pagando e il numero di rate prescelto (ad es., se versa la seconda di sei rate, deve indicare **0206**)". Il documento non è aggiornato sul termine finale ("entro il mese di novembre", oggi 16 dicembre) né sul calcolo degli interessi: usato solo per il formato della colonna.
- **AdE, "Tabella codici tributo" (Erario, 04/01/2021)**: 1790 e 1792 → colonna rateazione `NNRR`; 1791 e 1668 → `0000` (= non compilare); anno di riferimento `AAAA` per tutti e quattro. Legenda: "'NNRR' indicano rispettivamente la rata oggetto di pagamento ed il numero di rate complessivo".
- **Istr. Redditi PF 2026 Fasc. 1 §7**: importi della dichiarazione in **unità di euro** ("arrotondati all'unità di euro, così come determinati nella dichiarazione"); ciò che viene elaborato dopo (rate) si arrotonda **al centesimo**; interessi di rateazione "non vanno cumulati all'imposta, ma versati separatamente mediante l'apposito codice tributo"; importo minimo per codice tributo **1,03 €**; chi differisce di 30 giorni deve "maggiorare preventivamente le somme da versare dello 0,40 per cento".
- **F24 reali (rate 3 e 4 di 5, prima rata 20/7/2026)**: 1792 `0305` anno 2025; 1790 `0305` anno 2026; 1668 senza rateazione, una riga per anno (2025 e 2026); INPS sede 5500, `PXXR` 012025–122025 (saldo) e 012026–122026 (acconto), `DPPI` con gli stessi periodi. Il tool riproduce queste righe nei test (`f24-schedule.test.ts`).
- **Regole per anno**: aliquote, coefficiente e massimale INPS sono dell'**anno d'imposta** (Fasc. 2 RR: massimale 120.607 per il reddito 2025; Circ. INPS 8/2026: 122.295 per il 2026); acconti, scadenze e codici sono dell'**anno di versamento**. Il tool usa due set di regole e avvisa se uno manca.

### 2.2 Acconto (Istr. Fasc. 1, rigo RN62 / LC2; applicabile all'imposta sostitutiva per L. 190 c. 64)
- Acconto = **100%** dell'imposta dell'anno precedente ("differenza").
- **Non dovuto** se differenza < **51,65 €** (D.Lgs. 33/2025 art. 72).
- **Unica soluzione entro 30 novembre** se dovuto < **257,52 €**.
- Altrimenti **due rate**: **40%** entro 30 giugno (o 30 luglio +0,40%) e **60%** entro 30 novembre.
- Metodo previsionale ammesso: si può versare meno se si prevede minore imposta (rischio sanzione se stima errata).
- **Solo saldo e primo acconto sono rateizzabili**; il secondo acconto di novembre **no** (Istr. "Rateazione").
- Misure straordinarie sul **secondo acconto** (verificate su Normattiva): **DL 145/2023 art. 4** (solo 2023) e **DL 155/2024 art. 7-quater** (solo 2024): P.IVA con ricavi/compensi ≤ 170.000 € → versamento entro il 16 gennaio o in 5 rate mensili dal 16 gennaio, con interessi ex art. 20 c. 2 D.Lgs. 241/97; **esclusi i contributi INPS**. Non rinnovata per il 2025; per il 2026 nulla al 19/09/2026. → regola annuale opzionale nel `FiscalRuleSet`.
- **Soggetti ISA (compresi i forfettari con attività per cui è approvato un ISA, entro il limite di ricavi dell'indice)**: acconti in **due rate del 50%** invece di 40/60 — DL 124/2019 art. 58 (Normattiva, vigente); Risoluzione AdE 93/E del 12/11/2019 ("si applica anche ai contribuenti che applicano il regime forfetario ... anche all'imposta sostitutiva ... dovuta dai contribuenti che si avvalgono di forme di determinazione del reddito con criteri forfetari"); Istr. Redditi PF 2026 Fasc. 1 ("il cinquanta per cento per i soggetti ISA"). Il passo del Fasc. 2 "in due rate ciascuna nella misura del 50 per cento" citato in precedenza riguarda il rigo RM37 (lezioni private), non il quadro LM (verificato il 24/09/2026 sul documento archiviato). Confermato dall'F24 reale della prima rata 2026: 1790 = 3.263,50 = 50% di 1792 = 6.527,00. Nel tool: flag `isaSubject` nel profilo (l'abbinamento ATECO → ISA non è verificato automaticamente).
- **Unica soluzione**: la regola primaria è DPR 435/2001 art. 17 c. 3 ("in due rate salvo che il versamento da effettuare alla scadenza della prima rata non superi euro 103"); 257,52 € è la traduzione con il 40% (103/0,40); con il 50% la soglia diventa 206 €.
- **Arrotondamenti osservati sugli F24 reali**: imposta in euro interi (6.527,00, come da Istr. Fasc. 1 §7), acconto al centesimo (3.263,50), contributi INPS al centesimo (saldo 2025 = 4.963,49 compensato + 6.379,50 a rate = 11.342,99; acconto 2026 = 40% = 4.537,20). **Dal 24/09/2026 il tool calcola base e contributo INPS in euro interi** (base = LM34, Circ. INPS 62/2026 §2.2, vedi §5-ter): il saldo reale 11.342,99 diventerebbe 11.343; gli acconti restano al centesimo.
- **Compensazione + rateazione (F24 reale del 29/06/2026)**: un primo modello a saldo zero con crediti IRPEF `4001` (anno 2025, rateazione 0101) e addizionale comunale `3844` (codice comune, 0101) a fronte di `PXX` 012025–122025 per la quota di saldo INPS coperta; un secondo modello con la prima rata (`0105`) del residuo. È la procedura "Compensazione e rateazione" delle Avvertenze F24 ("due modelli: il primo con saldo finale eguale a zero ... con l'indicazione 0101 ...; il secondo per evidenziare l'importo della prima rata"). Implementato in `f24-schedule.ts` → `buildCompensation` (modulo Crediti, `/credits`).

### 2.2-bis Compensazione (Istr. Redditi PF 2026 Fasc. 1 §8; verificato il 22/09/2026)
- Crediti e debiti verso enti diversi (Stato, INPS, enti locali) si compensano nel modello F24, che "deve essere presentato in ogni caso ... anche se il saldo finale ... risulti uguale a zero".
- Crediti da Redditi utilizzabili dal giorno successivo alla chiusura del periodo d'imposta; sopra **5.000 € annui** dal decimo giorno successivo alla presentazione della dichiarazione (art. 3 D.Lgs. 33/2025; Ris. 110/E/2019) e con **visto di conformità** (L. 147/2013 art. 1 c. 574).
- F24 con crediti di imposte sui redditi/sostitutive: solo servizi telematici AdE (art. 37 c. 49-bis DL 223/2006); in ogni caso F24 telematico per chi compensa (art. 11 c. 2 lett. a DL 66/2014).
- Credito INPS GS (RR8 col. 2): "utilizzato in compensazione esclusivamente con modello F24 con l'indicazione dell'anno".
- Procedura con rateazione (Avvertenze F24): primo modello a saldo zero con 0101, secondo con la prima rata del residuo. Nel tool: `buildCompensation` + piano sul residuo.

### 2.3 Rateazione (Istr. Fasc. 1 §"Rateazione"; art. 20 D.Lgs. 241/97 come modificato da D.Lgs. 1/2024 art. 8; **dal 1/1/2026 art. 10 e 11 del D.Lgs. 33/2025 "Testo unico versamenti e riscossione"** — GU S.O. n. 8 del 26/03/2025, letto integralmente: art. 10 = rate mensili di pari importo con interessi, fine 16/12, versamenti entro il 16; art. 11 = differimento 1-20 agosto → 20 agosto; art. 3 = compensazione, >5.000 € dal 10° giorno dopo la dichiarazione; art. 72 = acconto 100%, soglia 51,65 €)
- Rate **mensili di uguale importo**, ciascuna entro il **giorno 16** del mese; il piano deve chiudersi entro il **16 dicembre** dello stesso anno.
- Regola in vigore **dal saldo 2023 (versato nel 2024)**. Prima: fine novembre.
- Interessi: **4% annuo** (DM 21/05/2009 art. 5), **metodo commerciale** (mesi di 30 giorni) dal giorno successivo alla 1ª rata alla scadenza nominale della 2ª (il 16 del mese successivo; lo slittamento al 20 agosto non incide), poi **+0,33%** forfettario per ogni rata successiva. Partenza 30/6 o 30/7 → 0,18 / 0,51 / 0,84 / 1,17 / 1,50 / 1,83 (prospetto ufficiale); partenza 20/7 (proroga 2026) → 0,29 / 0,62 / 0,95 / 1,28 / 1,61 (riscontrato al centesimo su due F24 reali). Interessi versati separatamente: cod. 1668 (Erario), causale DPPI (INPS).
- Il numero di rate **dipende dalla data della prima rata**:

| Prima rata | Rate |
|---|---|
| 30 giugno (ordinaria) | 30/6, 16/7, 20/8, 16/9, 16/10, 16/11, 16/12 → **7** |
| 30 luglio (+0,40%) | 30/7, 20/8, 16/9, 16/10, 16/11, 16/12 → **6** |
| **20 luglio 2026** (proroga forfettari/ISA, senza maggiorazione) | 20/7, 20/8, 16/9, 16/10, 16/11, 16/12 → **6** |
| 20 agosto 2026 (proroga + 0,80%; il 19/8 slitta al 20/8, art. 11 D.Lgs. 33/2025) | 20/8, 16/9, 16/10, 16/11, 16/12 → **5** |

- Scadenze 1-20 agosto slittano al **20 agosto** senza maggiorazione (art. 11 D.Lgs. 33/2025; già art. 37 c. 11-bis DL 223/2006).
- **Correzione rispetto alla conversazione precedente**: "7 rate" è la regola *attuale* (partenza 30/6), non quella vecchia; i forfettari con proroga a luglio ne hanno 6. Il tool deve **calcolare** le rate dalla data di partenza effettiva.
- Anche i **contributi INPS a saldo e primo acconto** sono rateizzabili con le stesse regole (Istr.: "compresi i contributi risultanti dal quadro RR").

### 2.4 Proroga 2026 (DL 22 maggio 2026 n. 89, art. 6 — GU n. 117 del 22/05/2026)
- Soggetti ISA (o con cause di esclusione), regime di vantaggio e **forfettari**: versamenti in scadenza 30/6/2026 → **20 luglio 2026** senza maggiorazione, oppure entro il **30° giorno successivo con +0,80%**: il 19 agosto cade tra l'1 e il 20 agosto e slitta al **20 agosto 2026** (art. 11 D.Lgs. 33/2025; scadenzario AdE al 20/08/2026) (in deroga allo 0,40% ordinario).
- Nota: il DL 89/2026 è stato abrogato dalla L. 113/2026 con salvezza degli effetti (Normattiva). Proroghe analoghe: 2025 → 21 luglio. → regola annuale nel `FiscalRuleSet`.

### 2.5 Dichiarazione
- Redditi PF 2026 telematico: **dal 15 aprile al 2 novembre 2026** (31/10 è sabato). Presentabile in autonomia via Fisconline/SPID o software AdE; nessuna API pubblica per terzi.
- Compensazione crediti > 5.000 € annui: dal 10° giorno successivo alla presentazione della dichiarazione + **visto di conformità** (art. 3 D.Lgs. 33/2025; L. 147/2013 c. 574). Sotto 5.000: dal 1° gennaio.
- F24 con compensazione: **obbligo canali telematici AdE** (Entratel/Fisconline), anche a saldo zero.
- Importi < 12 € per singola imposta: non si versano.

---

## 3. INPS Gestione Separata (professionisti senza altra tutela)

Fonte: Circolare INPS n. 8 del 3/2/2026; L. 335/95 art. 2 c. 26; L. 662/96 art. 1 c. 212-213; Istr. Redditi PF 2026 Fasc. 2 quadro RR sez. II.

| Regola | Valore 2026 |
|---|---|
| Aliquota professionisti senza altra copertura | **26,07%** (25 IVS + 0,72 aggiuntiva + 0,35 ISCRO) |
| Aliquota con altra copertura/pensionati | 24% |
| Massimale reddito | **122.295 €** (2025: 120.607 €) |
| Minimale (accredito anno intero) | **18.808 €** → contributo 4.903,25 € |
| Base imponibile forfettario | reddito forfettario (LM34 col. 2), **al lordo** dei contributi dedotti |
| Rivalsa facoltativa in fattura | **4%** dei compensi (L. 662/96 c. 212) — concorre ai ricavi |
| Acconti | **40% + 40%** del contributo dovuto sui redditi dell'anno precedente (L. 662/96 c. 212 lett. a-b); calcolati con **aliquote dell'anno in corso** (Circ. 8/2026 §4.2) |
| Scadenze | stesse dell'IRPEF: saldo + 1° acconto (30/6 → proroga), 2° acconto 30/11 (Circ. 8/2026 §4.2; D.Lgs. 241/97 art. 18) |
| Rateizzazione | saldo e primo acconto rateizzabili come le imposte (Istr. Fasc. 1) |
| Credito | RR8: compensabile in F24 (anno 2025) o rimborso INPS |
| Codici RR5 col. 14 | A=24%, B=25,72%, C=26,07% |

---

## 3-bis. Valori 2025 (set di regole 2025, verificati il 21/09/2026)
- **INPS Circolare n. 27 del 30/01/2025**: professionisti senza altra tutela 26,07% (25% IVS + 1,07% aggiuntiva); pensionati/altra copertura 24%; massimale 120.607,00 €; minimale 18.555,00 €; "l'acconto per l'anno di imposta 2025 deve essere calcolato applicando le aliquote in vigore per l'anno 2025".
- **DL 84/2025 art. 13** (Normattiva): soggetti ISA e forfettari → versamenti del 30/6/2025 entro il **21 luglio 2025** senza maggiorazione, oppure entro il 30° giorno successivo (20 agosto 2025) con +0,40%.
- **Rateazione 2025**: art. 20 D.Lgs. 241/97 come modificato da D.Lgs. 1/2024 art. 8 (rate al 16, fine 16 dicembre, dal saldo 2023); slittamento 1-20 agosto: DL 223/2006 art. 37 c. 11-bis. Contenuto identico alle norme 2026 (D.Lgs. 33/2025 artt. 10-11).
- Dichiarazione: 31/10/2025 (DPR 322/98 art. 2). Bollo: 31/5, 30/9, 30/11/2025, 28/2/2026 (DM 17/06/2014 art. 6 c. 2). Specifiche FE 1.9 dal 1/4/2025.

## 4. Fattura elettronica e SDI

### 4.1 Obbligo
- Forfettari obbligati alla FE **dal 1/1/2024** per tutti (dal 1/7/2022 se ricavi 2021 > 25.000 €) — DL 36/2022 art. 18 c. 2-3.
- Termine emissione: **12 giorni** dall'effettuazione (art. 21 c. 4 DPR 633/72); per servizi a soggetti passivi UE (7-ter) ed extra-UE: **entro il 15 del mese successivo** (c. 4 lett. c-d).
- Data della fattura mai nel futuro: lo SDI scarta con codice **00403** "La data della fattura non deve essere successiva alla data di emissione" (AdE, *Elenco codici errore SdI*, verificato il 23/09/2026).
- Software: si può usare qualsiasi software, anche privato, purché l'XML rispetti le specifiche tecniche del provvedimento del 24/11/2022; non esiste un software "certificato" obbligatorio (AdE, *Come si predispone una fattura elettronica*, verificato il 23/09/2026).
- **Conservazione a norma** obbligatoria per chi emette e chi riceve (art. 39 DPR 633/72): salvare i file sul computer non basta. Servizio gratuito AdE dal portale "Fatture e Corrispettivi" previa adesione: conserva le fatture transitate dallo SDI per **15 anni** (anche dopo la chiusura della partita IVA); senza data retroattiva conserva quelle inviate dal giorno successivo all'adesione, con recupero possibile fino al 1° gennaio del secondo anno precedente (AdE, *Come si conservano le fatture elettroniche*, *Il servizio di conservazione a norma*, FAQ *Registrazione e conservazione delle fatture*, verificati il 23/09/2026).

### 4.2 Compilazione XML (Specifiche tecniche v. 1.9.1, in uso dal 15/05/2026; Guida AdE FE dicembre 2025)
- `RegimeFiscale` = **RF19**.
- Linee: `AliquotaIVA` = 0, `Natura` = **N2.2** ("non soggette – altri casi") per operazioni nazionali.
- `Causale` obbligatoria: *"Operazione effettuata in regime forfettario ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni"*.
- Professionisti, seconda `Causale`: *"Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 1, comma 67, Legge n. 190 del 2014 e successive modificazioni"*.
- Rivalsa INPS 4% (se applicata): blocco `DatiCassaPrevidenziale` con `TipoCassa` = **TC22** (INPS — confermato in Spec. 1.9.1 e XSD), `AlCassa` 4.00, `ImponibileCassa`, `ImportoContributoCassa`, `AliquotaIVA` 0 + `Natura` N2.2.
- **Bollo**: se totale operazioni non soggette > **77,47 €** → `DatiBollo/BolloVirtuale = SI`, `ImportoBollo` 2,00 opzionale; i 2 € vanno inclusi nel totale documento (Guida AdE).
- Nota di credito: `TipoDocumento` **TD04**, con `DatiFattureCollegate` verso la fattura originale.
- Fatture semplificate (TD07/TD08) ammesse per RF19 anche sopra 400 € (codice errore 00460 non si applica).
- Estero: `CodiceDestinatario` = **XXXXXXX**, `IdPaese` ≠ IT (altrimenti scarto 00313). `Natura` **N2.1** (artt. 7-7-septies). Annotazioni obbligatorie art. 21 c. 6-bis DPR 633/72: UE B2B → **"inversione contabile"**; extra-UE → **"operazione non soggetta"**.
- Servizi UE B2B resi: fattura senza IVA ex art. 7-ter + **elenco Intrastat servizi resi (INTRA-1 quater)** (Circ. 10/E/2016 §4.1.2 lett. c) → serve iscrizione VIES. Periodicità (ADM, Determinazione 493869/2021 e guida "Il sistema Intrastat"): **trimestrale** se l'ammontare trimestrale dei servizi resi è stato < 50.000 € in ciascuno dei 4 trimestri precedenti, altrimenti **mensile** (dal mese successivo al superamento); scadenza **25 del mese successivo** al periodo (slitta se festivo). Servizi ricevuti: nessun elenco sotto 100.000 €/trimestre.
- Servizi **ricevuti** da non residenti: IVA dovuta in Italia sempre (nessuna soglia): integrazione/autofattura **TD17** (extra-UE/UE servizi), **TD18** beni UE, **TD19**; versamento IVA entro il 16 del mese successivo (L. 190 c. 60).

### 4.3 Canale di trasmissione via PEC (Spec. 1.9.1 §1.5 "servizio PEC")
- Primo invio a **sdi01@pec.fatturapa.it**; nella prima risposta il SDI comunica l'indirizzo PEC da usare per gli invii successivi (usarne un altro non garantisce la ricezione).
- Limiti: messaggio ≤ 30 MB, singolo file fattura ≤ 5 MB.
- Ricevute: accettazione + consegna dal gestore PEC (attestano la trasmissione, **non** l'emissione); poi le ricevute SDI (scarto / consegna / impossibilità di recapito) via PEC. → il tool deve leggere la casella PEC (IMAP) e correlare le notifiche al file.
- PEC senza allegato → messaggio di cortesia SDI.
- Nessun accreditamento né costo AdE per il canale PEC: l'accreditamento serve solo per i canali Web Service (SDICoop) e SFTP (fatturapa.gov.it, *Inviare la FatturaPA* e *Cos'è il Sistema di Accreditamento*, verificati il 23/09/2026).

### 4.4 Imposta di bollo (Guida AdE "L'imposta di bollo sulle fatture elettroniche", giugno 2026)
- Elenco A (non modificabile) ed Elenco B (modificabile) nel portale Fatture e Corrispettivi; l'AdE calcola l'importo.
- Criteri Elenco B: somma operazioni > 77,47 € con Natura N2.1/N2.2/N3.5/N3.6/N4 senza indicazione di bollo assolto.

| Trimestre | Elenchi disponibili | Modifica elenco B entro | Importo visibile | **Versamento** |
|---|---|---|---|---|
| 1° | 15 aprile | 30 aprile | 15 maggio | **31 maggio** (*)(**) |
| 2° | 15 luglio | 10 settembre | 20 settembre | **30 settembre** (**) |
| 3° | 15 ottobre | 31 ottobre | 15 novembre | **30 novembre** |
| 4° | 15 gennaio | 31 gennaio | 15 febbraio | **28 febbraio** (29 se bisestile) |

(*) se 1° trim ≤ 5.000 € → si può versare entro 30/9. (**) se 1°+2° ≤ 5.000 € → entro 30/11.
- Codici tributo F24: **2521/2522/2523/2524** (trimestri), 2525 sanzioni, 2526 interessi; in caso di differimento si usano i codici dei trimestri originari. In alternativa addebito diretto dal portale.

---

## 5. I24 — addebito F24 con scadenze future

Fonti: **D.Lgs. 8 gennaio 2024 n. 1, art. 17** (Normattiva); **Provvedimento AdE prot. 313945 del 26/07/2024** (testo integrale letto); scheda AdE "F24 – Compilazione e invio via web".

### 5.1 Cos'è
- "I24" è il nome della **modalità di addebito** delle deleghe F24 inviate tramite i **servizi telematici dell'Agenzia** (F24 web / F24 online via Entratel-Fisconline). Non è un servizio separato da attivare: è la possibilità di inviare oggi uno o più F24 indicando una **data di versamento futura**, con autorizzazione preventiva all'addebito su un conto presso un intermediario della riscossione convenzionato (banca/Poste/PSP).
- Operativo **dal 5 agosto 2024**; la data futura può arrivare fino a **5 anni** dall'invio.
- È pensato esattamente per "versamenti ricorrenti, rateizzati e predeterminati" → le rate di saldo/acconto e INPS rientrano.
- Alla scadenza l'AdE inoltra la delega alla banca e chiede l'addebito.

### 5.2 Vincoli (Provv. §4-5)
- Conto **intestato o cointestato (firma disgiunta) al contribuente** — il CF nell'F24 deve coincidere col titolare del conto. Solo se l'invio è fatto da un **intermediario abilitato** il conto può essere quello dell'intermediario (Provv. 21/06/2007, "F24 addebito unico").
- Il contribuente è responsabile che il conto sia attivo e **capiente per l'intero importo** alla data di addebito (nessun addebito parziale → versamento omesso).
- **Annullamento** possibile fino al **terzultimo giorno lavorativo** prima della data di versamento, solo via canali telematici AdE.
- Se cambia l'obbligo (ricalcolo, ravvedimento, proroga, decadenza del piano) le deleghe **non si annullano da sole**: vanno annullate manualmente.
- Compensazioni ammesse, ma il credito indicato è "bloccato" dal momento dell'invio e deve esistere sia all'invio sia alla scadenza.

### 5.3 Uso in autonomia (gratuito)
- Il commercialista ti dà gli importi delle rate (imposta + interessi 1668, INPS PXX) → tu entri in **F24 web** con SPID, compili un F24 per rata con la relativa **data di versamento futura** e il tuo IBAN, e li invii tutti subito. Puoi annullarne uno fino a 3 giorni lavorativi prima.
- Il tool genera le deleghe per rata stampate sul modello ufficiale; la data limite di annullamento non è più mostrata (decisione del 29/09/2026).
- ⚠️ Non esiste API pubblica per inviare F24: l'invio resta manuale su F24 web (o tramite software AdE + Entratel/Fisconline).

---

## 5-bis. CIVIS — assistenza su comunicazioni/avvisi/cartelle (richiesta aggiunta il 19/09/2026)

Fonte: Guida operativa AdE "Servizio CIVIS" (PDF, letta integralmente nell'indice e cap. 1); pagine AdE "Comunicazione di irregolarità – Canale di assistenza Civis".

- CIVIS **non è un canale di contenzioso** (quello è il processo tributario telematico): è il canale di **assistenza online pre-contenzioso** nell'area riservata AdE (SPID/CIE/CNS o Entratel per intermediari) su:
  - comunicazioni/avvisi telematici di **irregolarità** (controllo automatizzato art. 36-bis DPR 600/73 e liquidazione tassazione separata) e **cartelle di pagamento** derivate;
  - **comunicazioni relative all'imposta di bollo su fatture elettroniche** (rilevante per noi);
  - **correzione F24** (errori su codice tributo/anno/importo → istanza di correzione);
  - documenti per **controllo formale** (36-ter) e per comunicazioni di compliance;
  - istanze di **autotutela** (locazioni);
  - "Consegna documenti e istanze".
- Serve il **numero della comunicazione (13 cifre)**; si può inoltrare una seconda richiesta; stato pratica consultabile online; notifica esito via SMS/email; esito trasmesso via Entratel all'intermediario che ha inviato la dichiarazione.
- **Nessuna API pubblica**: l'interazione è solo via portale. → "Integrazione" possibile nel tool = **registro degli atti ricevuti** (tipo, numero 13 cifre, data notifica, importo, scadenze), checklist della richiesta CIVIS, archivio ricevute/esiti e collegamento a F24/rate generate.
- Collegamento con I24: le somme da comunicazione di irregolarità sono rateizzabili fino a **20 rate trimestrali** (art. 3-bis D.Lgs. 462/97, citato dal Provv. I24) → pianificabili con addebito a data futura.
- Avvisi bonari da controllo automatizzato (D.Lgs. 462/97 artt. 2 e 3-bis, testo vigente su Normattiva): pagamento entro **60 giorni** dal ricevimento (90 dall'invito telematico all'intermediario) con **sanzione ridotta a 1/3**; rateazione fino a **20 rate trimestrali** di pari importo, prima rata entro i 60 giorni, le successive l'ultimo giorno di ciascun trimestre con interessi; decadenza ex art. 15-ter DPR 602/73. Termini sospesi 1/8–4/9 (DL 193/2016 art. 7-quater c. 17).
- Sanzione base omesso/tardivo versamento (D.Lgs. 471/97 art. 13, testo vigente): **25%**; ridotta alla metà se ritardo ≤ 90 gg; entro 15 gg ulteriormente ridotta a 1/15 per giorno. → sanzione ridotta in avviso bonario = 25%/3 ≈ 8,33%. Dal 1/1/2026 le sanzioni sono nel TU sanzioni D.Lgs. 173/2024 (richiamato dall'art. 74 D.Lgs. 33/2025) — testo non riletto.

---

## 5-ter. Revisione di conformità del 23/09/2026 — fonti verificate
Fonti lette integralmente durante la review (citazioni testuali ricontrollate sui documenti scaricati). Le correzioni al codice che ne derivano sono nel [TODO](../TODO.md), epica "Conformità".
- **Circ. INPS n. 62 del 27/05/2026** (istruzioni quadro RR, [PDF](https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/05/Circolare_15271/Allegati/16793_Circolare-numero-62-del-27-05-2026.pdf)):
  - §2.2, base del forfettario: "la somma degli importi indicati nel rigo LM34, colonna 2 (reddito lordo, Gestione separata autonomi …) meno gli importi indicati nel rigo LM37, colonna 2 (perdite pregresse …)". LM34 è un importo della dichiarazione, quindi in euro interi (Istr. Fasc. 1: "Tutti gli importi indicati nella dichiarazione devono essere arrotondati all'unità di euro").
  - §3-4, differimento e rateazione: "La somma dell'interesse corrispettivo deve essere versata separatamente dai contributi"; "per il pagamento degli interessi comprensivi anche della maggiorazione devono essere utilizzate le causali … DPPI (Gestione separata)". Per l'INPS la maggiorazione 0,40%/0,80% va quindi nella riga DPPI, non nel contributo (per l'Erario va invece sommata al tributo, Fasc. 1 §7).
- **Istr. Redditi PF 2026 Fasc. 3, rigo LM45**: "Se gli acconti sono stati pagati usufruendo del differimento dei termini o della rateazione, non devono essere considerate le maggiorazioni dell'importo o gli interessi versati".
- **Istr. Redditi PF 2026 Fasc. 3, decadenza**: il "contribuente decaduto dal regime in corso d'anno è tenuto a determinare il reddito con le modalità ordinarie per l'intero anno d'imposta"; L. 190/2014 c. 71: sopra 100.000 € il regime cessa dall'anno stesso ed "è dovuta l'imposta sul valore aggiunto a partire dalle operazioni effettuate che comportano il superamento".
- **DPR 633/72 art. 7-ter c. 1 lett. b)**: i servizi "rese a committenti non soggetti passivi da soggetti passivi stabiliti nel territorio dello Stato" si considerano effettuati in Italia (cliente UE privato → N2.2, non N2.1). Per i privati extra UE la non territorialità vale solo per i servizi dell'art. 7-septies (es. lett. c: consulenza e assistenza tecnica, elaborazione e fornitura di dati).
- **TUIR art. 9 c. 2**: i corrispettivi in valuta estera "sono valutati secondo il cambio del giorno in cui sono stati percepiti o del giorno antecedente più prossimo".
- **Spec. FatturaPA 1.9.1**: errore 00427 (CodiceDestinatario di 6 caratteri con FPA12, 7 con FPR12); §1.2.2 ed errore 00002 (nome file uguale a uno già trasmesso → scarto). Spec. 1.9.1 confermata versione in uso ("utilizzabili dal 15 maggio 2026").
- **Guida AdE imposta di bollo sulle FE (giugno 2026)**: il trimestre del bollo dipende dalla "data di consegna, contenuta nella 'ricevuta di consegna'" (fattura del 30/3 consegnata l'1/4 → 2° trimestre).
- **L. 8 ottobre 2025 n. 151** ([GU n. 236 del 10/10/2025](https://www.gazzettaufficiale.it/eli/id/2025/10/10/25G00153/sg)): aggiunge il 4 ottobre (San Francesco d'Assisi) alle festività nazionali dell'art. 2 L. 260/1949, dal 2026.
- **Scadenzario AdE 2026**: il termine con maggiorazione 0,80% per i forfettari è il **20 agosto** 2026 (il 19/8 slitta per l'art. 11 D.Lgs. 33/2025).
- **Scheda INPS "F24 per professionisti GS"**: la riga DPPI si compila con "tutti i campi previsti per il versamento dei contributi a cui gli interessi si riferiscono" → una riga DPPI per periodo di riferimento.
- **Maggiorazione con compensazione** (verificato il 24/09/2026): AdE, Istruzioni generali Redditi 2026, Parte generale società ed enti, §4.2 Acconti: "Per coloro che effettuano la compensazione, la maggiorazione si applica solamente sulla differenza tra debiti e crediti, se positiva"; Istr. Unico PF 2007 Fasc. 1 §6 "Come si eseguono i versamenti" (archivio AdE): con compensazione "fra debiti e crediti d'imposta di pari importo" il contribuente "non è tenuto a corrispondere tale maggiorazione"; se i debiti sono superiori "la predetta maggiorazione si applica alla differenza". Le Istr. Redditi PF 2026 non trattano il caso.
- **Esempi ufficiali di F24 compilati** cercati (AdE pagina codice 1668, Avvertenze F24, Istr. Fasc. 1 §7, scadenzario AdE, Circ. INPS 62/2026, scheda INPS GS): nessuno mostra due righe 1668 o DPPI con anni diversi.

## 6. Valori corretti rispetto a versioni precedenti di questo documento
- Rateazione: 7 rate è la regola attuale (da 30/6); con proroga a luglio sono 6; 2° acconto mai rateizzabile.
- Riferimento normativo rateazione: D.Lgs. 241/97 art. 20 → riorganizzato nel **D.Lgs. 33/2025** (testo unico versamenti), citato dalle istruzioni 2026.
- Proroga 2026: 20 luglio / 20 agosto (+0,80%, non 0,40%; il 19/8 slitta al 20/8).
- INPS 2026: 26,07%, massimale 122.295, minimale 18.808.
- Bollo: soglia differimento 5.000 € (non 250).
- Spec. tecniche FE: v. 1.9.1 dal 15/05/2026.

## 7. Verifiche completate il 19/09/2026 (seconda passata)
- Causali INPS F24: tabella AdE `Causali_INPS_02_07_2026.xls` → P10-PXX, P10R-PXXR, DPPI, RUGS.
- `TipoCassa` TC22 = INPS (Spec. FE 1.9.1).
- Intrastat servizi resi: ADM Determinazione 493869/2021 + guida 2023.
- D.Lgs. 81/2025: art. 1 (coefficienti ATECO 2007 fino a nuovi coefficienti), art. 7 (CPB abrogato per forfettari dal 2025).
- D.Lgs. 33/2025 (GU S.O. 8/2025): artt. 3, 10, 11, 72-74; applicazione dal 1/1/2026.
- D.Lgs. 462/97 artt. 2, 3-bis; D.Lgs. 471/97 art. 13; DL 145/2023 art. 4; DL 155/2024 art. 7-quater.

## 8. Ancora aperto
- D.Lgs. 173/2024 (TU sanzioni): riletture puntuali quando si codificano ravvedimento/sanzioni.
- DM interessi rateazione (4%) richiamato dall'art. 10 c. 2 D.Lgs. 33/2025: il valore è quello nelle Istruzioni 2026; verificare ogni anno.
