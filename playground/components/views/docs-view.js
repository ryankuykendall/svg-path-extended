// Docs View - Full-page documentation
// Route: /docs

import { gettingStarted, syntax, stdlib, debug, cli, examples } from '../../utils/docs-content.js';

const styles = `
  :host {
    display: block;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-primary, #ffffff);
  }

  .docs-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: var(--text-secondary, #666);
    font-size: 0.875rem;
  }

  .toc {
    background: var(--bg-secondary, #f5f5f5);
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .toc h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .toc ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .toc li {
    margin-bottom: 0.5rem;
  }

  .toc a {
    color: var(--accent-color, #0066cc);
    text-decoration: none;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .toc a:hover {
    text-decoration: underline;
  }

  section {
    margin-bottom: 3rem;
  }

  /* Section titles from markdown h1 */
  section h1 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--accent-color, #0066cc);
  }

  section h2 {
    margin: 1.5rem 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  section h3 {
    margin: 1.5rem 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  section h4 {
    margin: 1rem 0 0.5rem 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  p {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1a1a1a);
    line-height: 1.6;
  }

  code {
    font-family: var(--font-mono, monospace);
    font-size: 0.875em;
    background: var(--bg-secondary, #f5f5f5);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
  }

  pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 1rem 0;
  }

  pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .keyword { color: #569cd6; }
  .function { color: #dcdcaa; }
  .number { color: #b5cea8; }
  .string { color: #ce9178; }
  .comment { color: #6a9955; }

  ul, ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
    color: var(--text-primary, #1a1a1a);
  }

  li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  th {
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    background: var(--bg-secondary, #f5f5f5);
  }

  td {
    color: var(--text-primary, #1a1a1a);
  }

  td code {
    white-space: nowrap;
  }

  hr {
    border: none;
    border-top: 1px solid var(--border-color, #e0e0e0);
    margin: 2rem 0;
  }

  .external-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--accent-color, #0066cc);
    text-decoration: none;
  }

  .external-link:hover {
    text-decoration: underline;
  }

  .external-link::after {
    content: '↗';
    font-size: 0.75em;
  }

  @media (max-width: 600px) {
    .docs-container {
      padding: 1rem;
    }

    pre {
      font-size: 0.8125rem;
    }

    table {
      display: block;
      overflow-x: auto;
    }
  }
`;

class DocsView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupScrollLinks();
  }

  setupScrollLinks() {
    // Handle TOC anchor clicks with JS scrolling (avoids hash routing conflict)
    this.shadowRoot.addEventListener('click', (e) => {
      const link = e.target.closest('[data-scroll-to]');
      if (link) {
        e.preventDefault();
        const targetId = link.dataset.scrollTo;
        const target = this.shadowRoot.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="docs-container">
        <h1>Documentation</h1>
        <p class="subtitle">Learn how to use svg-path-extended to create dynamic SVG paths</p>

        <nav class="toc">
          <h2>Table of Contents</h2>
          <ul>
            <li><a href="javascript:void(0)" data-scroll-to="getting-started">Getting Started</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="syntax">Syntax Reference</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="stdlib">Standard Library</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="debug">Debug & Console</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="cli">CLI Reference</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="examples">Examples</a></li>
          </ul>
        </nav>

        <section id="getting-started" class="doc-section">
          ${gettingStarted}
        </section>

        <section id="syntax" class="doc-section">
          ${syntax}
        </section>

        <section id="stdlib" class="doc-section">
          ${stdlib}
        </section>

        <section id="debug" class="doc-section">
          ${debug}
        </section>

        <section id="cli" class="doc-section">
          ${cli}
        </section>

        <section id="examples" class="doc-section">
          ${examples}
        </section>
      </div>
    `;
  }
}

customElements.define('docs-view', DocsView);

export default DocsView;
