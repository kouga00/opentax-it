import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { bundledRuleSets, type FiscalRuleSet, OTHER_ENTITIES, type SourceRef } from '@opentax-it/fiscal-rules';

/**
 * Tables of the F24 codes used by OpenTax IT, for docs/guida/codici-f24.mdx. The codes are read from the rule sets
 * shipped with the code (@opentax-it/fiscal-rules), so the documentation never keeps a copy of them; here are only
 * the plain explanations, keyed by the field of the rule set, and the sources are the sourceRefs of the same set.
 */

const years = bundledRuleSets.map((r) => r.year);
const latest = bundledRuleSets[bundledRuleSets.length - 1];

interface Entry {
  /** Reads the code from a rule set. */
  code: (r: FiscalRuleSet) => string;
  name: string;
  what: ReactNode;
  /** How the "rateazione" and year columns of the form are filled. */
  columns: ReactNode;
}

const TREASURY: Entry[] = [
  {
    code: (r) => r.taxCodes.substituteTaxBalance,
    name: 'Imposta sostitutiva, saldo',
    what: "Il conguaglio dell'imposta dell'anno passato: quanto dovuto meno gli acconti già versati.",
    columns: <>Rateazione <code>0101</code> se paghi in una volta, altrimenti rata e numero di rate (<code>0205</code> = seconda di cinque). Anno: l&apos;anno d&apos;imposta, cioè quello passato.</>,
  },
  {
    code: (r) => r.taxCodes.substituteTaxFirstAdvance,
    name: 'Imposta sostitutiva, primo acconto',
    what: "L'anticipo sull'imposta dell'anno in corso, pagato insieme al saldo.",
    columns: <>Rateazione come il saldo (<code>0101</code> o rata/numero di rate). Anno: l&apos;anno in corso.</>,
  },
  {
    code: (r) => r.taxCodes.substituteTaxSecondAdvance,
    name: 'Imposta sostitutiva, secondo acconto',
    what: "Il resto dell'anticipo sull'anno in corso, a novembre. Non si paga a rate.",
    columns: <>Rateazione vuota. Anno: l&apos;anno in corso.</>,
  },
  {
    code: (r) => r.taxCodes.installmentInterest,
    name: 'Interessi della rateazione',
    what: "Gli interessi quando saldo e primo acconto si pagano a rate. Vanno su una riga a parte, mai sommati all'imposta.",
    columns: <>Rateazione vuota. Anno: quello dell&apos;importo rateizzato.</>,
  },
];

const INPS: Entry[] = [
  {
    code: (r) => r.inpsReasons.contribution,
    name: 'Contributi Gestione Separata',
    what: "Saldo e acconti dei contributi INPS, pagati in una volta, con l'aliquota ordinaria.",
    columns: <>Periodo da gennaio a dicembre dell&apos;anno di riferimento: l&apos;anno passato per il saldo, quello in corso per gli acconti.</>,
  },
  {
    code: (r) => r.inpsReasons.installments,
    name: 'Contributi Gestione Separata, a rate',
    what: 'Come sopra, quando saldo e primo acconto si pagano a rate: la "R" finale vuol dire rateizzato.',
    columns: <>Come sopra.</>,
  },
  {
    code: (r) => r.inpsReasons.contributionReducedRate,
    name: 'Contributi con aliquota ridotta',
    what: "Per chi è già pensionato o iscritto a un'altra forma di previdenza obbligatoria, che paga l'aliquota ridotta.",
    columns: <>Come sopra.</>,
  },
  {
    code: (r) => r.inpsReasons.installmentsReducedRate,
    name: 'Contributi con aliquota ridotta, a rate',
    what: 'Come sopra, a rate.',
    columns: <>Come sopra.</>,
  },
  {
    code: (r) => r.inpsReasons.interest,
    name: 'Interessi e maggiorazione',
    what: 'Gli interessi della rateazione e, se paghi con il differimento di 30 giorni, la maggiorazione sui contributi. Su una riga a parte.',
    columns: <>Periodo e anno dei contributi a cui si riferiscono.</>,
  },
];

/** Artigiani and Commercianti: artisans' and traders' reasons side by side ("AF · CF"). */
const selfEmployed = (pick: (reasons: { fixed: string; excess: string; excessInstallments: string; excessInterest: string }) => string) => (r: FiscalRuleSet) =>
  r.inpsSelfEmployed ? `${pick(r.inpsSelfEmployed.artisansReasons)} · ${pick(r.inpsSelfEmployed.tradersReasons)}` : '—';

const SELF_EMPLOYED: Entry[] = [
  {
    code: selfEmployed((x) => x.fixed),
    name: 'Contributi fissi sul minimale',
    what: "Le quattro rate del contributo dovuto comunque, anche con un reddito basso (maggio, agosto, novembre, febbraio dell'anno dopo).",
    columns: <>Periodo da gennaio a dicembre dell&apos;anno; codice INPS di 17 cifre, diverso per ogni rata, dalla comunicazione INPS.</>,
  },
  {
    code: selfEmployed((x) => x.excess),
    name: 'Contributi oltre il minimale',
    what: 'Saldo e acconti dei contributi sul reddito che supera il minimale, alle scadenze delle imposte.',
    columns: <>Periodo dell&apos;anno a cui si riferiscono; codice INPS di 17 cifre di quell&apos;anno.</>,
  },
  {
    code: selfEmployed((x) => x.excessInstallments),
    name: 'Contributi oltre il minimale, a rate',
    what: 'Come sopra, quando saldo e primo acconto si pagano a rate.',
    columns: <>Come sopra.</>,
  },
  {
    code: selfEmployed((x) => x.excessInterest),
    name: 'Interessi della rateazione',
    what: 'Gli interessi delle rate, su una riga a parte. La tabella AdE elenca la causale senza descriverla: OpenTax IT la usa così perché così la usano gli F24 reali.',
    columns: <>Periodo e codice INPS dei contributi a cui si riferiscono.</>,
  },
];

const QUARTERS = [1, 2, 3, 4] as const;

function CodeCells({ code }: { code: (r: FiscalRuleSet) => string }) {
  return <>{bundledRuleSets.map((r) => <td key={r.year}><code>{code(r)}</code></td>)}</>;
}

function EntryTable({ entries }: { entries: Entry[] }) {
  return (
    <table>
      <thead>
        <tr>
          {years.map((y) => <th key={y}>{y}</th>)}
          <th>Cosa paghi</th>
          <th>Come si compila</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.name}>
            <CodeCells code={e.code} />
            <td><strong>{e.name}</strong><br />{e.what}</td>
            <td>{e.columns}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Years of the rule sets the codes come from, and the year of the sources shown. */
export function RuleSetYears(): ReactNode {
  return <>{years.join(', ')} (fonti del set {latest.year})</>;
}

export function TreasuryCodes(): ReactNode {
  return <EntryTable entries={TREASURY} />;
}

export function InpsCodes(): ReactNode {
  return <EntryTable entries={INPS} />;
}

export function SelfEmployedCodes(): ReactNode {
  return <EntryTable entries={SELF_EMPLOYED} />;
}

/** Professional funds paid in the "Altri enti previdenziali e assicurativi" section, from packages/fiscal-rules other-entities.ts. */
export function OtherEntityCodes(): ReactNode {
  return (
    <table>
      <thead>
        <tr>
          <th>Codice ente</th>
          <th>Cassa</th>
          <th>Causali</th>
          <th>Periodo di riferimento</th>
        </tr>
      </thead>
      <tbody>
        {OTHER_ENTITIES.map((e) => (
          <tr key={e.code}>
            <td><code>{e.code}</code></td>
            <td><strong>{e.name}</strong>{e.positionCode === 'REQUIRED' && <><br />Serve il codice posizione generato dalla cassa.</>}</td>
            <td>{e.reasons.map((r) => <span key={r.code}><code>{r.code}</code> {r.description}<br /></span>)}</td>
            <td>{e.periodRule}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StampDutyCodes(): ReactNode {
  return (
    <table>
      <thead>
        <tr>
          {years.map((y) => <th key={y}>{y}</th>)}
          <th>Trimestre</th>
          <th>Scadenza {latest.year}</th>
        </tr>
      </thead>
      <tbody>
        {QUARTERS.map((q) => (
          <tr key={q}>
            <CodeCells code={(r) => r.stampDuty.deadlines.find((d) => d.quarter === q)?.taxCode ?? '—'} />
            <td>{q}° trimestre</td>
            <td>{latest.stampDuty.deadlines.find((d) => d.quarter === q)?.date.split('-').reverse().join('/')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Official source of a group of codes, from the sourceRefs of the latest rule set, with its exact quotation. */
export function Source({ refKey }: { refKey: string }): ReactNode {
  const ref: SourceRef | undefined = latest.sourceRefs[refKey];
  if (!ref) return null;
  return (
    <details>
      <summary>Fonte: <Link to={ref.url}>{ref.title}</Link></summary>
      <blockquote>{ref.quote}</blockquote>
    </details>
  );
}
