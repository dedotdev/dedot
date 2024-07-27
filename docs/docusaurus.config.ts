import { themes as prismThemes } from 'prism-react-renderer';
import type * as Preset from '@docusaurus/preset-classic';
import npm2yarn from '@docusaurus/remark-plugin-npm2yarn';
import type { Config } from '@docusaurus/types';
import path from 'path';

const config: Config = {
  title: 'Dedot',
  tagline: 'A delightful JavaScript client for Polkadot & Substrate',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://dedot.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'dedotdev', // Usually your GitHub org/user name.
  projectName: 'dedot', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    'docusaurus-plugin-sass',
    [
      'docusaurus-plugin-typedoc-api',
      {
        projectRoot: path.join(__dirname, '..'),
        tsconfigName: 'tsconfig.typedoc.json',
        packages: [
          'packages/dedot',
          'packages/api',
          'packages/codecs',
          'packages/codegen',
          'packages/contracts',
          'packages/providers',
          'packages/runtime-specs',
          'packages/shape',
          'packages/storage',
          'packages/types',
          'packages/utils',
        ],
        sortPackages: (a, d) => {
          // Render dedot package on top!
          if (a.packageName === 'dedot') {
            return -1;
          }

          return a.packageName.localeCompare(d.packageName);
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/dedotdev/dedot/tree/main/docs',
          remarkPlugins: [[npm2yarn, { sync: true }]],
        },
        blog: {
          showReadingTime: true,
          blogSidebarTitle: 'Recent blog posts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/dedotdev/dedot/tree/main/docs',
          remarkPlugins: [[npm2yarn, { sync: true }]],
        },
        theme: {
          customCss: './src/css/custom.scss',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    // Replace with your project's social card
    image: 'img/dedot-dark-logo.png',
    navbar: {
      title: 'Dedot',
      logo: {
        alt: 'Dedot',
        src: 'img/dedot-dark-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'right',
          label: 'Docs',
        },
        { to: '/api', label: 'API', position: 'right' },
        { to: '/blog', label: 'Blog', position: 'right' },
        {
          href: 'https://github.com/dedotdev/dedot',
          position: 'right',
          className: 'navbar-github-link',
        },
      ],
    },
    footer: {
      style: 'light',
      copyright: `Copyright © ${new Date().getFullYear()} Dedot`,
    },
    prism: {
      additionalLanguages: ['bash', 'diff', 'json', 'scss'],
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.vsDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
