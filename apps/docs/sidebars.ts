import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/** Pages of docs/ (ids are their paths without extension), in reading order. */
const sidebars: SidebarsConfig = {
  guide: [
    'index',
    {
      type: 'category',
      label: 'Guida',
      collapsed: false,
      items: ['guida/installazione', 'guida/fatture', 'guida/pec-e-sdi', 'guida/import', 'guida/incassi-e-soglie', 'guida/imposte-e-f24', 'guida/scadenze', 'guida/regole-e-fonti', 'guida/glossario', 'guida/codici-f24'],
    },
    {
      type: 'category',
      label: 'Conformità e fonti',
      items: ['compliance', 'normativa-2026', 'fonti/README', 'monitoraggio-normativo'],
    },
    {
      type: 'category',
      label: 'Per chi contribuisce',
      items: ['contribuire/index'],
    },
  ],
};

export default sidebars;
