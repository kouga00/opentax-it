'use client';

import { useEffect } from 'react';

/**
 * Opens the collapsed `<details>` that contain the element named in the URL hash and scrolls to
 * it, so links to a rule inside a closed section land on the rule.
 */
export function RevealHashTarget() {
  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      for (let el = target.parentElement; el; el = el.parentElement) if (el instanceof HTMLDetailsElement) el.open = true;
      target.scrollIntoView({ block: 'start' });
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  return null;
}
