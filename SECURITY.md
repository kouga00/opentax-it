# Sicurezza

Il software gestisce dati fiscali e credenziali (PEC, IBAN). Se trovi una vulnerabilità **non aprire una issue pubblica**: contatta il maintainer in privato tramite il profilo GitHub del repository. Riceverai risposta entro 7 giorni.

Stato attuale (fase iniziale):
- **nessuna autenticazione**: API, web e database ascoltano solo su `127.0.0.1` e rifiutano host non consentiti (DNS rebinding); non esporli in rete finché il login non è pronto ([TODO.md](TODO.md));
- **nessuna cifratura a riposo**: i dati (IBAN, codici fiscali, fatture) sono in chiaro nel database e nella cartella `storage/`. `APP_ENCRYPTION_KEY` è riservata alla cifratura dei segreti, da implementare prima di salvare credenziali PEC/SDI;
- le richieste che modificano dati devono essere JSON: un sito esterno non può inviarle senza il permesso del CORS (protezione CSRF).

Protezioni presenti:
- header di sicurezza (helmet nell'API; divieto di incorporare le pagine web in altri siti, `nosniff`);
- body JSON limitato a 1 MB, 50 MB solo per l'import degli XML;
- validazione degli input con limiti su importi, righe e lunghezze; errori imprevisti non esposti ai client;
- file nello storage con permessi del solo proprietario e percorsi confinati nella cartella di storage;
- cookie della partita IVA `httpOnly`;
- modello F24 usato solo se lo SHA-256 coincide con quello di riferimento;
- CI con permessi di sola lettura e action fissate a un commit.

Chiamate verso servizi esterni: il modello F24 ufficiale dal sito AdE (una volta, poi in cache) e i cambi di riferimento della Banca d'Italia (una volta per giorno richiesto, poi in cache). Vengono inviati solo la data e il codice della valuta, nessun dato del contribuente.

Esito dell'ultima security review e punti ancora aperti: [TODO.md](TODO.md), epica "Sicurezza di base".

Linee guida di progetto:
- isolamento per tenant applicato a livello di query;
- messaggi di errore generici su login, registrazione e recupero password: la risposta non rivela se un account esiste (stesso messaggio, stesso codice di stato, tempi simili), come indica l'[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages);
- nessun dato reale nei test o nei fixture.
