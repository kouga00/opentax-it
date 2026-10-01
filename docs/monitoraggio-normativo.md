# Monitoraggio normativo e attivazione regole per l'anno successivo

Requisito (19/09/2026): il sistema deve controllare periodicamente se sono uscite nuove direttive/valori per l'anno successivo (o modifiche in corso d'anno) e proporle all'admin, che decide se attivarle. **Nessuna regola fiscale cambia senza approvazione umana.**

## 1. Modello dati

- `FiscalRuleSet` (già previsto): un set completo di regole per `year`, con `status` = `draft | proposed | active | superseded`, `version`, `activatedBy`, `activatedAt`, `sourceRefs[]`.
  Contenuto (esempi): soglie 85k/100k, coefficienti per ATECO, aliquote 5/15%, aliquota INPS GS, minimale/massimale, regole acconto (51,65 €, 257,52 €, 40/60 o 50/50 per i soggetti ISA), calendario scadenze (30/6, 30/11, eventuale proroga e maggiorazione), regola rate (giorno 16, fine 16/12, tasso 4%), bollo (77,47 €, 2 €, soglie 5.000 €, scadenze trimestrali), causali/codici tributo, versione specifiche FE, soglie Intrastat, termini avviso bonario (60 gg, 20 rate).
- Fonti monitorate: il [registro delle fonti](fonti/README.md) (`docs/fonti/registro.json`) al posto di una tabella `RuleSource` separata. Ogni voce ha già URL, URL di download, formato, selettore del testo, impronta e copia archiviata; `node scripts/fonti.mjs check` riscarica e confronta. Da aggiungere per il job: `lastCheckedAt`, `checkInterval`, `enabled`.
- `RuleChangeProposal`: creata quando una sorgente cambia. Campi: `sourceId`, `detectedAt`, `snapshotBefore/After` (testo estratto), `diff`, `extractedValues` (JSON: campo → valore proposto, con citazione testuale e pagina/riga), `targetYear`, `status` = `pending | approved | rejected | partially_approved`, `reviewedBy`, `reviewNotes`.
- `AuditLog`: ogni approvazione/rifiuto con chi, quando, cosa.

## 2. Sorgenti da monitorare (tutte ufficiali)

| Sorgente | Cosa rileva | Come |
|---|---|---|
| AdE – pagina "Modello Redditi PF {anno}" + PDF istruzioni Fasc. 1/2/3 | acconti, rateazione, codici tributo, quadro LM/RR, soglie | i PDF espongono `Last-Modified`; hash del testo estratto (pdftotext) |
| AdE – scadenzario fiscale (`www1.agenziaentrate.gov.it/servizi/scadenzario`) | proroghe, scadenze effettive | HTML per mese (rendering JS parziale: usare la vista lista) |
| Gazzetta Ufficiale / Normattiva | DL di proroga (es. DL 89/2026), legge di bilancio (dicembre), decreti "adempimenti" | ricerca per parole chiave su GU (`forfetari`, `versamenti`, `acconto`, `190/2014`) + rilettura articoli su Normattiva; niente RSS affidabile |
| INPS – elenco circolari (endpoint JSON `dettaglio.content-fragment-detail…json`) | circolare aliquote GS (gen/feb), minimale/massimale | polling lista circolari, filtro titolo "Gestione separata" |
| AdE – tabella causali INPS (`Causali_INPS_*.xls`) e tabelle codici tributo | nuove causali/codici | link nella pagina, hash file |
| AdE – Specifiche tecniche FE (pagina "Specifiche tecniche versione x.y") | nuova versione tracciato, data di utilizzo | hash pagina + nuovo PDF Allegato A |
| AdE – Guida bollo FE, Guida FE | soglie e scadenze bollo, diciture | `Last-Modified` + hash |
| ADM – pagina Intrastat | soglie/periodicità | hash |
| Normattiva – L. 190/2014 art. 1, D.Lgs. 33/2025, D.Lgs. 462/97, D.Lgs. 471/97 | modifiche al testo vigente | hash del testo dell'articolo (`~artN!vig=`) |

Le sorgenti stanno nel registro delle fonti (dati, non codice): aggiungerne una passa da una PR con la copia archiviata e le citazioni verificate dai test.

## 3. Pipeline (job schedulato, es. settimanale + intensivo a dic-feb e maggio-luglio)

1. **Fetch** ogni fonte del registro (HEAD prima: `Last-Modified`/`ETag`; poi GET se cambiato o se mancano header).
2. **Normalizza** (pdftotext / html→testo / xls→righe) e calcola hash. Se uguale → aggiorna `lastCheckedAt`, fine.
3. **Diff** testuale rispetto allo snapshot precedente; salva entrambi.
4. **Estrazione assistita**: un estrattore per sorgente (regex mirate: "26,07%", "massimale … è pari a", "entro il 16 dicembre", codici tributo) più, opzionale, un passaggio LLM (Claude) che riceve **solo il diff + snapshot** e restituisce JSON `{campo, valoreProposto, citazione, confidenza}`. L'LLM propone, non decide: ogni valore mostra la citazione esatta e il link alla fonte.
5. **Crea `RuleChangeProposal`** con i valori estratti mappati sui campi del `FiscalRuleSet` dell'anno target (se il set non esiste, ne crea uno `draft` clonando l'anno precedente).
6. **Notifica l'admin** (email/PEC interna/in-app) con riepilogo: sorgente, cosa è cambiato, valori proposti, confidenza.
7. **Revisione**: schermata "Proposte" con diff affiancato (vecchio/nuovo), citazioni, link (base già pronta: il confronto tra un set in bozza e quello attivo nella pagina Regole fiscali, `diffRuleSets` in `packages/fiscal-rules`); l'admin approva campo per campo o rifiuta con nota. Approvazione → scrive nel `FiscalRuleSet` `draft/proposed`.
8. **Attivazione**: azione esplicita "Attiva set {anno}" che porta a `active` e mette il precedente in `superseded`. Si attivano solo set `draft`/`proposed`: un set `superseded` non torna attivo, una correzione esce come nuova versione (implementato in `fiscal-rules.service.ts` → `activate`). Il motore di calcolo usa solo set `active`; se manca il set dell'anno, blocca i calcoli con avviso (non fa fallback silenzioso).

## 4. Regole di sicurezza

- Nessuna auto-attivazione, nemmeno con confidenza alta.
- Fonti solo da whitelist di domini ufficiali (`agenziaentrate.gov.it`, `gazzettaufficiale.it`, `normattiva.it`, `inps.it`, `adm.gov.it`, `fatturapa.gov.it`); tutto ciò che proviene dal web è dato, non istruzione (rilevante se si usa l'LLM in estrazione).
- Ogni valore attivo conserva `sourceRef` (URL + citazione) per essere ricostruibile.
- Promemoria annuale fisso all'admin, indipendente dai cambiamenti rilevati: gennaio (circolare INPS, legge di bilancio), marzo-aprile (istruzioni Redditi), maggio-giugno (eventuale proroga), settembre (rate), novembre (2° acconto, eventuali misure straordinarie).

## 5. Multi-tenant

`FiscalRuleSet` e proposte sono globali (non per tenant): l'admin di piattaforma le approva una volta e valgono per tutti; eventuali override per tenant (es. aliquota 5% vs 15%, ATECO) restano nel profilo del tenant, non nel rule set.
