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
      // Long lines scroll rather than reflow, so indentation stays readable.
      wrap: false,
      transformers: [codeWindow()],
    },
  },
});

/**
 * Display names for the languages actually used across the posts.
 * @type {Record<string, string>}
 */
const LANG_LABELS = {
  bash: 'Shell',
  css: 'CSS',
  go: 'Go',
  html: 'HTML',
  java: 'Java',
  javascript: 'JS',
  json: 'JSON',
  python: 'Python',
  sql: 'SQL',
  typescript: 'TS',
  xml: 'XML',
  yaml: 'YAML',
};

/**
 * @param {string} tagName
 * @param {Record<string, any>} properties
 * @param {any[]} [children]
 * @returns {any}
 */
const h = (tagName, properties, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

/**
 * Wraps every highlighted block in a titled window: macOS-style traffic
 * lights on the left, language on the right, copy button revealed on hover.
 * Built here rather than client-side so the chrome ships in the HTML.
 *
 * @returns {import('shiki').ShikiTransformer}
 */
function codeWindow() {
  return {
    name: 'code-window',
    root(node) {
      const lang = this.options.lang;
      const known = lang && lang !== 'plaintext' && lang !== 'text';
      const label = known ? (LANG_LABELS[lang] ?? lang.toUpperCase()) : '';

      const head = h('div', { class: 'code-head' }, [
        h('span', { class: 'code-dots' }, [
          h('i', {}),
          h('i', {}),
          h('i', {}),
        ]),
        h('span', { class: 'code-lang' }, [{ type: 'text', value: label }]),
      ]);

      node.children = [h('div', { class: 'code-block', 'data-language': lang }, [head, ...node.children])];
    },
  };
}
