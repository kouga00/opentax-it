import type { ReactNode } from 'react';
import Link from 'next/link';
import Markdown, { type Components } from 'react-markdown';
import { HELP, type HelpParams, type HelpTopic } from '@/lib/help';
import { HelpTip } from '@/components/help-tip';

/** Placeholders of the help texts, filled from the params: `{year}`. */
const PLACEHOLDER = /\{(\w+)\}/g;

/** A value put in a text is shown as is, not read as Markdown. */
const escapeMarkdown = (value: string) => value.replace(/[\\`*_[\]()#<>]/g, '\\$&');

/** The few elements the help texts use; anything else in a text is dropped. */
const ALLOWED = ['p', 'a', 'strong', 'em', 'code'];

const components: Components = {
  // Internal pages stay in the app; official sources open in a new tab.
  a: ({ href = '', children }) =>
    href.startsWith('/') ? <Link href={href} className="underline">{children}</Link> : <a className="underline" href={href} target="_blank" rel="noreferrer">{children}</a>,
};

/**
 * Help tooltip by topic: the texts live in lib/help (one JSON per area, in Markdown, rendered by react-markdown, which
 * does not run HTML). A paragraph whose placeholder has no value is left out (e.g. the server details of a PEC provider
 * when none is chosen). `label` replaces the topic's one when it is computed on the page; `trigger` opens the text on
 * that element (e.g. a status badge) instead of the info icon.
 */
export function Help({ topic, params, label, className, trigger }: { topic: HelpTopic; params?: HelpParams; label?: string; className?: string; trigger?: ReactNode }) {
  const entry = HELP[topic];
  const paragraphs = entry.paragraphs.flatMap((text) => {
    let missing = false;
    const filled = text.replace(PLACEHOLDER, (_, name: string) => {
      const value = params?.[name];
      if (value === undefined || value === '') missing = true;
      return escapeMarkdown(String(value ?? ''));
    });
    return missing ? [] : [filled];
  });
  return (
    <HelpTip label={label ?? entry.label} className={className} trigger={trigger}>
      {paragraphs.map((text, i) => <Markdown key={i} allowedElements={ALLOWED} unwrapDisallowed components={components}>{text}</Markdown>)}
    </HelpTip>
  );
}
