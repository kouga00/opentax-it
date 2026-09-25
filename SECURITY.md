# Sicurezza

Il software gestisce dati fiscali e credenziali (PEC, IBAN). Se trovi una vulnerabilità **non aprire una issue pubblica**: contatta il maintainer in privato tramite il profilo GitHub del repository. Riceverai risposta entro 7 giorni.

Stato attuale:
- **autenticazione attiva**: API e web richiedono login e sessione (token cifrato con SHA-256 a riposo, hashing password con `scrypt` e salt casuale, rate limiting e audit log); cookie `httpOnly` `sameSite: lax`;
- **nessuna cifratura a riposo per i dati fiscali**: i dati (IBAN, codici fiscali, fatture) sono in chiaro nel database e nella cartella `storage/`. `APP_ENCRYPTION_KEY` è riservata alla cifratura dei segreti, da implementare prima di salvare credenziali PEC/SDI;
- le richieste che modificano dati devono essere JSON: un sito esterno non può inviarle senza il permesso del CORS (protezione CSRF).

Protezioni presenti:
- header di sicurezza (helmet nell'API; divieto di incorporare le pagine web in altri siti, `nosniff`);
- autenticazione con rate limiting duale su `/auth/register` e `/auth/login` (5 tentativi ogni 15 minuti per IP e per email tramite `@nestjs/throttler`);
- mitigazione timing attack: hash fittizio `scrypt` su utente non trovato in fase di login;
- registrazione con risposta esplicita HTTP 409 Conflict se l'email è già presente (scelta di usabilità per partite IVA individuali, protetta dal rate limiting rigoroso);
- reverse proxy: in produzione è necessario che il reverse proxy fidato (es. Nginx, Caddy, Traefik) sovrascriva o imposti `X-Forwarded-For` e che la variabile `TRUST_PROXY` sia configurata di conseguenza (default `loopback`), prevenendo IP spoofing e garantendo l'accuratezza di audit log e rate limiter;
- body JSON limitato a 1 MB, 50 MB solo per l'import degli XML;
- validazione degli input con limiti su importi, righe e lunghezze; errori imprevisti non esposti ai client;
- file nello storage con permessi del solo proprietario e percorsi confinati nella cartella di storage;
- cookie della partita IVA e di sessione `httpOnly`, `sameSite: lax`;
- modello F24 usato solo se lo SHA-256 coincide con quello di riferimento;
- CI con permessi di sola lettura e action fissate a un commit.

Chiamate verso servizi esterni: il modello F24 ufficiale dal sito AdE (una volta, poi in cache) e i cambi di riferimento della Banca d'Italia (una volta per giorno richiesto, poi in cache). Vengono inviati solo la data e il codice della valuta, nessun dato del contribuente.

Esito dell'ultima security review e punti ancora aperti: [TODO.md](TODO.md), epica "Sicurezza di base".

Linee guida di progetto:
- isolamento per tenant applicato a livello di query;
- nessun dato reale nei test o nei fixture.
