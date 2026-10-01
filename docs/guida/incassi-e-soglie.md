---
title: Incassi e soglie
---

# Incassi e soglie

> **In breve.** Nel forfettario le tasse si calcolano su quanto **incassi** nell'anno, non su quanto fatturi. Per questo, quando un cliente ti paga, segna l'incasso sulla fattura. Con gli incassi OpenTax IT ti dice anche quanto sei lontano dai limiti del regime: oltre 85.000 € l'anno dopo esci, oltre 100.000 € esci subito.

Nel regime forfettario il reddito si calcola sui compensi **percepiti** nell'anno, non su quelli fatturati: principio di cassa (L. 190/2014, art. 1 c. 64, "ricavi o compensi percepiti"). Per questo ogni incasso va registrato.

## Registrare un incasso

Dall'elenco delle fatture (`/invoices`), **Segna come incassata** su una fattura ("Registra rimborso" su una nota di credito) apre una finestra con la data di oggi, secondo il calendario italiano, e il residuo da incassare già proposti. Un incasso può essere parziale; l'incasso eredita la modalità di pagamento della fattura. Il dettaglio della fattura mostra incassato, residuo ed elenco degli incassi, che si possono eliminare.

L'app non accetta incassi con una **data futura**, perché un incasso conta nell'anno in cui avviene davvero, né incassi oltre il **residuo** della fattura: una fattura non si incassa due volte. Un importo negativo registra una restituzione al cliente, fino a quanto già incassato.

Per le fatture in valuta l'importo in euro dell'incasso usa il cambio **del giorno dell'incasso** (TUIR art. 9 c. 2), precompilato con il cambio di riferimento della Banca d'Italia e modificabile.

## Soglie del regime

Il forfettario ha due limiti (L. 190/2014, art. 1 c. 54 e 71):

- se in un anno superi **85.000 €**, dall'anno dopo non puoi più restare nel regime;
- se superi **100.000 €**, esci **subito**, già nell'anno in corso, e da quel momento l'IVA è dovuta.

OpenTax IT li misura sugli **incassi dell'anno**:

- la dashboard mostra l'incassato rispetto alle due soglie, con un avviso quando ci si avvicina (dall'80%, una scelta dell'app) e quando si superano;
- la **proiezione** aggiunge le fatture emesse non ancora incassate e, all'emissione, la fattura che si sta emettendo;
- all'emissione serve una conferma esplicita se la proiezione supera 100.000 € o il **limite personale** che puoi indicare nel profilo;
- sopra 100.000 € incassati, per quell'anno non si calcolano l'imposta forfettaria né il piano F24.

Il bollo addebitato al cliente conta come compenso (Risposta AdE n. 428/2022).

## Fatturato e incassato

- **Fatturato** (elenco fatture e dashboard): solo le fatture davvero emesse, cioè consegnate o messe a disposizione dallo SDI, oppure importate, al netto delle note di credito.
- **Incassato**: la somma degli incassi dell'anno, ed è quella che conta per reddito e soglie.
