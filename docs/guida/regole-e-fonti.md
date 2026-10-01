---
title: Regole fiscali e fonti
---

# Regole fiscali e fonti

> **In breve.** Le regole fiscali cambiano ogni anno. Per questo OpenTax IT non ha numeri scritti nel codice: ogni anno ha il suo **set di regole**, con la fonte ufficiale di ogni valore. Quando arriva un set nuovo, vedi cosa cambia e decidi tu quando attivarlo. Ogni documento citato è conservato in copia, così puoi controllare da solo.

Aliquote, soglie, coefficienti, scadenze e codici tributo **non sono scritti nel codice**: stanno in un **set di regole** per anno (`FiscalRuleSet`), e ogni valore porta con sé la sua fonte ufficiale con la citazione esatta.

## Set di regole (`/rules`)

- I set forniti con l'applicazione si caricano come **bozze**; un aggiornamento del codice che cambia un set lo propone come nuova versione in bozza.
- Prima di attivarlo vedi **cosa cambia** rispetto al set attivo, valore per valore, con la fonte.
- L'attivazione è **sempre manuale**: nessun set si attiva da solo. Si attivano solo bozze o set proposti, e un set superato non torna attivo: le correzioni escono come nuova versione.
- La pagina mostra il contenuto del set per sezione, ogni valore con la sua fonte.

## Fonti ufficiali (`/sources`)

Il **registro delle fonti** elenca ogni documento ufficiale letto per scrivere una regola (leggi, circolari, istruzioni, specifiche tecniche), con la copia archiviata e, per ogni fonte, le regole dei set attivi che la citano, con la citazione evidenziata. I test verificano che ogni citazione compaia davvero nel documento archiviato. Come si aggiorna: [Registro delle fonti](../fonti/README.md).

## Cosa è verificato e cosa no

La [matrice di conformità](../compliance.md) collega ogni funzione alla sua fonte e alla data di verifica; la sua sezione "Non verificato / aperto" elenca i punti che non hanno ancora una fonte ufficiale e che quindi non sono implementati come regole.
