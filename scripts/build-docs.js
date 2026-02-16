#!/usr/bin/env node

/**
 * Build script to convert markdown docs to a JavaScript module
 *
 * Reads all markdown files from /docs/ and generates
 * playground/utils/docs-content.js with pre-rendered HTML.
 *
 * Usage: npm run build:docs
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';

// Register languages we need
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_DIR = join(ROOT, 'docs');
const OUTPUT_FILE = join(ROOT, 'playground', 'utils', 'docs-content.js');
const HLJS_STYLES_DIR = join(ROOT, 'node_modules', 'highlight.js', 'styles');

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      // Use auto-detection for unlabeled code blocks (most of our DSL examples)
      if (!lang || lang === '') {
        // Try to detect if it looks like our DSL (has path commands or keywords)
        const looksLikeDSL = /^(let |fn |for |if |M |L |H |V |C |Q |A |Z |circle|rect|polygon|star)/m.test(code);
        if (looksLikeDSL) {
          // Highlight as JavaScript (close enough for our DSL)
          return hljs.highlight(code, { language: 'javascript', ignoreIllegals: true }).value;
        }
        // For other unlabeled blocks, try auto-detection
        return hljs.highlightAuto(code).value;
      }
      // Use specified language if available
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      }
      // Fallback to auto-detection
      return hljs.highlightAuto(code).value;
    }
  })
);

marked.setOptions({
  gfm: true,
  breaks: false,
});

// Decode common HTML entities to plain text
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Slugify heading text for use as an id attribute
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')      // strip HTML tags
    .replace(/&[^;]+;/g, '')      // strip HTML entities
    .replace(/[^\w\s-]/g, '')     // strip special chars
    .replace(/\s+/g, '-')         // spaces to hyphens
    .replace(/-+/g, '-')          // dedupe hyphens
    .replace(/^-|-$/g, '');       // trim leading/trailing hyphens
}

// Mapping from markdown filenames to export names
const DOC_FILES = {
  'getting-started.md': 'gettingStarted',
  'syntax.md': 'syntax',
  'stdlib.md': 'stdlib',
  'layers.md': 'layers',
  'debug.md': 'debug',
  'cli.md': 'cli',
  'examples.md': 'examples',
};

// Fallback title from filename
function plainTitle(filename) {
  return filename.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function buildDocs() {
  console.log('Building documentation...\n');

  const exports = {};
  const missing = [];
  const tocData = [];

  for (const [filename, exportName] of Object.entries(DOC_FILES)) {
    const filepath = join(DOCS_DIR, filename);

    try {
      const markdown = await fs.readFile(filepath, 'utf-8');

      // Per-section slug tracker and heading collector
      const seenSlugs = new Set();
      const headings = [];
      // Section key prefix for globally unique IDs (e.g. "syntax-variables")
      const sectionPrefix = slugify(exportName.replace(/([A-Z])/g, '-$1'));

      const renderer = {
        heading({ tokens, depth }) {
          const text = this.parser.parseInline(tokens);
          const plainText = text.replace(/<[^>]*>/g, '');
          let baseSlug = slugify(plainText);
          let slug = `${sectionPrefix}-${baseSlug}`;

          // Deduplicate slugs within section
          if (seenSlugs.has(slug)) {
            let n = 2;
            while (seenSlugs.has(`${slug}-${n}`)) n++;
            slug = `${slug}-${n}`;
          }
          seenSlugs.add(slug);

          headings.push({ id: slug, title: decodeEntities(plainText), level: depth });
          return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
        }
      };

      const html = marked.use({ renderer }).parse(markdown);
      exports[exportName] = html;

      // Extract section title from the first h1 heading
      const sectionTitle = headings.find(h => h.level === 1)?.title || plainTitle(filename);
      tocData.push({
        key: exportName,
        title: sectionTitle,
        headings: headings.filter(h => h.level >= 2),
      });

      console.log(`  ✓ ${filename} → ${exportName} (${headings.length} headings)`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        missing.push(filename);
        console.log(`  ✗ ${filename} (not found)`);
      } else {
        throw err;
      }
    }
  }

  if (missing.length > 0) {
    console.log(`\nWarning: ${missing.length} documentation file(s) not found.`);
    console.log('Create these files to complete the documentation:');
    missing.forEach(f => console.log(`  - docs/${f}`));
    console.log('');
  }

  // Load highlight.js theme CSS
  console.log('\nLoading syntax highlighting themes...');
  const githubLight = await fs.readFile(join(HLJS_STYLES_DIR, 'github.css'), 'utf-8');
  const githubDark = await fs.readFile(join(HLJS_STYLES_DIR, 'github-dark.css'), 'utf-8');
  console.log('  ✓ github (light)');
  console.log('  ✓ github-dark');

  // Generate the JavaScript module
  let output = `// Auto-generated by scripts/build-docs.js
// Do not edit manually - edit the markdown files in /docs/ instead

`;

  for (const [name, html] of Object.entries(exports)) {
    // Escape backticks and ${} for template literals
    const escaped = html
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');

    output += `export const ${name} = \`${escaped}\`;\n\n`;
  }

  // Add a list of all available content for convenience
  const exportNames = Object.values(DOC_FILES).filter(name => exports[name]);
  output += `// All available documentation sections\n`;
  output += `export const sections = {\n`;
  for (const name of exportNames) {
    output += `  ${name},\n`;
  }
  output += `};\n\n`;

  // Add TOC data for sidebar navigation
  const escapeTocJSON = JSON.stringify(tocData, null, 2)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  output += `// Structured table-of-contents data for sidebar navigation\n`;
  output += `export const tocData = JSON.parse(\`${escapeTocJSON}\`);\n\n`;

  // Add syntax highlighting theme CSS
  const escapeCSS = (css) => css
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  output += `// Syntax highlighting themes (GitHub light/dark)\n`;
  output += `export const hljsThemeLight = \`${escapeCSS(githubLight)}\`;\n\n`;
  output += `export const hljsThemeDark = \`${escapeCSS(githubDark)}\`;\n`;

  await fs.writeFile(OUTPUT_FILE, output);

  console.log(`Generated: playground/utils/docs-content.js`);
  console.log(`Exports: ${Object.keys(exports).join(', ')}`);
}

buildDocs().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
