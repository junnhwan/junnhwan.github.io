// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://junnhwan.github.io',
  base: '/',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      wrap: true,
      transformers: [
        {
          // Expose the language so CSS can render a badge on the code block.
          pre(node) {
            const lang = this.options.lang;
            if (lang && lang !== 'plaintext' && lang !== 'text') {
              node.properties['data-language'] = lang;
            }
          },
        },
      ],
    },
  },
});
