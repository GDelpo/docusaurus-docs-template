// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Organization Docs',
  tagline: 'Internal documentation site',
  favicon: 'img/favicon.ico',

  url: 'https://docs.example.com',
  baseUrl: '/',

  organizationName: 'my-org',
  projectName: 'my-org-docs',

  onBrokenLinks: 'warn',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    './plugins/admin-cms',
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ['en'],
        docsRouteBasePath: '/',
        indexDocs: true,
        indexBlog: false,
        highlightSearchTermsOnTargetPage: false,
        searchResultLimits: 8,
        searchBarShortcutHint: true,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',

      // Announcement bar (uncomment when you want to show one)
      // announcementBar: {
      //   id: 'announcement_id',
      //   content: 'Your announcement text here.',
      //   backgroundColor: '#20a8d8',
      //   textColor: '#ffffff',
      //   isCloseable: true,
      // },

      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },

      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },

      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },

      backToTopButton: true,

      navbar: {
        title: 'My Org Docs',
        hideOnScroll: true,
        logo: {
          alt: 'Organization logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          // TODO: replace or remove these example links with your own.
          // {
          //   type: 'dropdown',
          //   label: 'Links',
          //   position: 'left',
          //   items: [
          //     { label: 'Example app', href: 'https://example.com/' },
          //     { label: 'Another link', href: 'https://example.org/' },
          //   ],
          // },
        ],
      },
      footer: {
        style: 'light',
        links: [
          {
            title: 'Resources',
            items: [
              { label: 'Getting started', to: '/inicio/welcome' },
              // TODO: add your own resource links here
            ],
          },
          {
            title: 'Links',
            items: [
              // TODO: replace with your organization's links
              { label: 'Example', href: 'https://example.com/' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} My Organization`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'powershell', 'python', 'sql', 'json', 'yaml', 'csharp', 'java'],
      },
    }),
};

export default config;
