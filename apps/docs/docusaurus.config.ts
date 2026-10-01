import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';
import { themes as prismThemes } from 'prism-react-renderer';
import { relative, resolve } from 'node:path';

const repo = 'https://github.com/kouga00/opentax-it';
const repoRoot = resolve(__dirname, '../..');

/**
 * Links of the docs/ pages to files of the repository outside docs/ (TODO.md, the code...) point to them on GitHub,
 * so that the same Markdown works on GitHub and here. Links that stay broken inside docs/ still fail the build.
 */
function linkToRepository({ sourceFilePath, url }: { sourceFilePath: string; url: string }): string {
  const [path, hash] = url.split('#');
  const target = relative(repoRoot, resolve(__dirname, sourceFilePath, '..', path));
  if (target.startsWith('..') || target.startsWith('docs/')) throw new Error(`Broken link ${url} in ${sourceFilePath}`);
  return `${repo}/blob/main/${target}${hash ? `#${hash}` : ''}`;
}

/**
 * Documentation site. The pages are the Markdown files in the docs/ folder of the repository, read where they are
 * (also readable on GitHub); the API reference is generated from the OpenAPI document of the API (pnpm run openapi)
 * into api/, which is not versioned.
 */
const config: Config = {
  title: 'OpenTax IT',
  tagline: 'Gestionale open source per partite IVA in regime forfettario',
  favicon: 'img/favicon.svg',
  // Publication still to decide (TODO.md, "Documentazione navigabile"): GitHub Pages of the repository for now.
  url: 'https://kouga00.github.io',
  baseUrl: '/opentax-it/',
  organizationName: 'kouga00',
  projectName: 'opentax-it',
  onBrokenLinks: 'throw',
  // As in the demo site of docusaurus-openapi-docs: Rspack bundler (@docusaurus/faster) and the v4 defaults.
  future: { faster: true, v4: true },
  markdown: {
    // The .md files of docs/ are plain Markdown (also read on GitHub): parsed as CommonMark, not as MDX.
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: linkToRepository },
  },
  i18n: { defaultLocale: 'it', locales: ['it'] },
  presets: [
    [
      'classic',
      {
        docs: {
          id: 'default',
          path: '../../docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: ({ docPath }) => `${repo}/edit/main/docs/${docPath}`,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    // Local search, no external service: the index is built with the site (lunr, Italian stemming).
    ['@cmfcmf/docusaurus-search-local', { language: 'it', indexBlog: false }],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api',
        path: 'api',
        routeBasePath: 'api',
        sidebarPath: './sidebars-api.ts',
        docItemComponent: '@theme/ApiItem',
      },
    ],
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi',
        docsPluginId: 'api',
        config: {
          opentax: {
            specPath: 'openapi.json',
            outputDir: 'api',
            sidebarOptions: { groupPathsBy: 'tag' },
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ],
  themes: ['docusaurus-theme-openapi-docs'],
  themeConfig: {
    navbar: {
      title: 'OpenTax IT',
      items: [
        { type: 'docSidebar', sidebarId: 'guide', position: 'left', label: 'Documentazione' },
        { type: 'docSidebar', docsPluginId: 'api', sidebarId: 'api', position: 'left', label: 'API' },
        { href: repo, label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: 'OpenTax IT, licenza AGPL-3.0. Non è consulenza fiscale: vedi DISCLAIMER.md nel repository.',
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
