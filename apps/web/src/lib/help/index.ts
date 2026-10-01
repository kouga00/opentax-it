/**
 * The single place for the help tooltips' texts: one JSON file per area, keyed by topic, used with
 * `<Help topic="..." />` (components/help.tsx). Each text keeps its official source inline, as it is shown to the user.
 * The texts are Markdown (links, **bold**, `code`) with `{name}` placeholders, rendered by components/help.tsx.
 */
import credits from './credits.json';
import customers from './customers.json';
import dashboard from './dashboard.json';
import deadlines from './deadlines.json';
import f24 from './f24.json';
import invoices from './invoices.json';
import pec from './pec.json';
import profile from './profile.json';
import stampDuty from './stamp-duty.json';
import taxReturn from './tax-return.json';
import taxes from './taxes.json';

/** Dynamic values of a help text, by placeholder name (`{year}` in the text). */
export type HelpParams = Record<string, string | number | undefined>;

export interface HelpEntry {
  /** Accessible name of the icon; "Informazioni" when missing. */
  label?: string;
  paragraphs: string[];
}

const areas = [credits, customers, dashboard, deadlines, f24, invoices, pec, profile, stampDuty, taxes, taxReturn];
const merged = Object.assign({}, ...areas) as typeof credits & typeof customers & typeof dashboard & typeof deadlines & typeof f24 & typeof invoices & typeof pec & typeof profile & typeof stampDuty & typeof taxes & typeof taxReturn;

// A topic defined in two files would silently hide one of the texts.
const duplicates = areas.flatMap((area) => Object.keys(area)).filter((key, i, keys) => keys.indexOf(key) !== i);
if (duplicates.length > 0) throw new Error(`Help topics defined twice: ${duplicates.join(', ')}`);

export type HelpTopic = keyof typeof merged;

export const HELP: Record<HelpTopic, HelpEntry> = merged;
