# Sicurezza

Il software gestisce dati fiscali e credenziali (PEC, IBAN). Se trovi una vulnerabilità **non aprire una issue pubblica**: contatta il maintainer in privato tramite il profilo GitHub del repository. Riceverai risposta entro 7 giorni.

Stato attuale (fase iniziale):
- **autenticazione attiva**: API e web richiedono login e sessione (token salvato come hash SHA-256, password con `scrypt` e salt casuale, rate limiting su login e registrazione, audit log); l'API accetta il token solo nell'header `Authorization: Bearer` (nessun cookie né header personalizzato sull'API, contro il CSRF); il web usa un cookie di sessione `httpOnly` `sameSite: lax`. API, web e database ascoltano comunque solo su `127.0.0.1` e rifiutano host non consentiti (DNS rebinding): prima di esporli in rete servono HTTPS e le verifiche dell'epica "Qualità" (deploy) in [TODO.md](TODO.md);
- **cifratura a riposo solo per i segreti**: la password della casella PEC è cifrata (AES-256-GCM) con `APP_ENCRYPTION_KEY` e mai restituita dall'API; gli altri dati (IBAN, codici fiscali, fatture) sono in chiaro nel database e nella cartella `storage/`;
- le richieste che modificano dati devono essere JSON: un sito esterno non può inviarle senza il permesso del CORS (protezione CSRF).

Protezioni presenti:
- header di sicurezza (helmet nell'API; divieto di incorporare le pagine web in altri siti, `nosniff`);
- autenticazione con rate limiting mirato solo su `/auth/register` e `/auth/login` (5 tentativi ogni 15 minuti per IP, 20 tentativi all'ora per email tramite `@nestjs/throttler`), evitando blocchi durante la normale navigazione web;
- mitigazione timing attack: hash fittizio `scrypt` su utente non trovato in fase di login;
- registrazione: tempo di risposta costante (hashing `scrypt` computato sempre prima dell'inserimento, gestione del duplicato intercettata dal vincolo univoco del database), messaggio di errore generico se l'email è già registrata ("Registrazione non riuscita. Se hai già un account, accedi.") e rate limiting rigoroso; la completa neutralizzazione dell'account enumeration richiede un flusso di attivazione via email (vedi TODO.md);
- percorso di aggiornamento: `pnpm admin:create` associa automaticamente all'amministratore tutte le partite IVA esistenti prive di membri come `TENANT_ADMIN` e conferisce il ruolo `PLATFORM_ADMIN` necessario per l'attivazione dei set di regole;
- reverse proxy: in produzione è necessario che il reverse proxy fidato (es. Nginx, Caddy, Traefik) sovrascriva o imposti `X-Forwarded-For` e che la variabile `TRUST_PROXY` sia configurata di conseguenza (default `loopback`; accetta booleano `true`/`false`, numero di hop es. `1`, o IP/subnet; vedi [guida Express](https://expressjs.com/en/guide/behind-proxies.html)), prevenendo IP spoofing e garantendo l'accuratezza di audit log e rate limiter;
- body JSON limitato a 1 MB, 50 MB solo per l'import di fatture e ricevute (`/api/imports`); gli archivi ZIP si aprono con limiti contro gli zip bomb;
- validazione degli input con limiti su importi, righe e lunghezze; errori imprevisti non esposti ai client;
- file nello storage con permessi del solo proprietario e percorsi confinati nella cartella di storage;
- autenticazione API confinata a header `Authorization: Bearer` (nessuna lettura di cookie su porte localhost); cookie di sessione web `httpOnly`, `sameSite: lax`;
- modello F24 usato solo se lo SHA-256 coincide con quello di riferimento;
- CI con permessi di sola lettura e action fissate a un commit.

Chiamate verso servizi esterni: il modello F24 ufficiale dal sito AdE (una volta, poi in cache) e i cambi di riferimento della Banca d'Italia (una volta per giorno richiesto, poi in cache). Vengono inviati solo la data e il codice della valuta, nessun dato del contribuente.

Esito dell'ultima security review e punti ancora aperti: [TODO.md](TODO.md), epica "Sicurezza di base".

Linee guida di progetto:
- isolamento per tenant applicato a livello di query;
- messaggi di errore generici su login, registrazione e recupero password: la risposta non rivela se un account esiste (stesso messaggio, stesso codice di stato, tempi simili), come indica l'[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages);
- nessun dato reale nei test o nei fixture.
