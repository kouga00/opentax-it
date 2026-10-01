# SDI receipts: official schema and examples

Downloaded on 2026-09-24 from fatturapa.gov.it, "Documentazione Sistema d'Interscambio"
(https://www.fatturapa.gov.it/it/norme-e-regole/DocumentazioneSDI/), to test the reading of SDI receipts:

- `MessaggiTypes_v1.1.xsd` — schema of the SDI messages (`/export/documenti/messaggi/v1.1/`);
- `IT01234567890_11111_RC_001.xml` — delivery receipt (ricevuta di consegna);
- `IT01234567890_11111_NS_001.xml` — rejection receipt (ricevuta di scarto);
- `IT01234567890_11111_MC_001.xml` — receipt of failed delivery (impossibilità di recapito);
- `xmldsig-core-schema.xsd` — W3C XML Signature schema imported by `MessaggiTypes_v1.1.xsd`.

The examples validate against the schema with `xmllint --noout --nonet --schema MessaggiTypes_v1.1.xsd <file>`.
File names follow Spec. 1.9.1, "Nomenclatura dei file per la trasmissione di ricevute/notifiche":
`<invoice file name without extension>_<RC|NS|MC|MT>_<progressive>.xml`.
