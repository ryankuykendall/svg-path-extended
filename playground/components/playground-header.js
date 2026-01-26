// Header component with title, file controls, toggles, and examples

import { store } from '../state/store.js';
import { examples } from '../utils/examples.js';
import { copyURL } from '../utils/url-state.js';

export class PlaygroundHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.subscribeToStore();
  }

  subscribeToStore() {
    store.subscribe(['currentFileName', 'isModified', 'annotatedOpen', 'consoleOpen'], () => {
      this.updateFilenameDisplay();
      this.updateToggleStates();
    });
  }

  updateFilenameDisplay() {
    const display = this.shadowRoot.querySelector('#filename-display');
    const fileName = store.get('currentFileName');
    const isModified = store.get('isModified');

    if (fileName) {
      display.textContent = fileName;
      display.classList.add('has-file');
    } else {
      display.textContent = 'Untitled';
      display.classList.remove('has-file');
    }

    display.classList.toggle('modified', isModified);
  }

  updateToggleStates() {
    const annotatedToggle = this.shadowRoot.querySelector('#annotated-toggle');
    const consoleToggle = this.shadowRoot.querySelector('#console-toggle');

    annotatedToggle.classList.toggle('active', store.get('annotatedOpen'));
    consoleToggle.classList.toggle('active', store.get('consoleOpen'));
  }

  setupEventListeners() {
    // Open file
    this.shadowRoot.querySelector('#open-file').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-file', { bubbles: true, composed: true }));
    });

    // Save file
    this.shadowRoot.querySelector('#save-file').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('save-file', { bubbles: true, composed: true }));
    });

    // Annotated toggle
    this.shadowRoot.querySelector('#annotated-toggle').addEventListener('click', () => {
      store.set('annotatedOpen', !store.get('annotatedOpen'));
      this.dispatchEvent(new CustomEvent('toggle-annotated', { bubbles: true, composed: true }));
    });

    // Console toggle
    this.shadowRoot.querySelector('#console-toggle').addEventListener('click', () => {
      store.set('consoleOpen', !store.get('consoleOpen'));
      this.dispatchEvent(new CustomEvent('toggle-console', { bubbles: true, composed: true }));
    });

    // Copy URL
    this.shadowRoot.querySelector('#copy-url').addEventListener('click', async () => {
      await copyURL(store);
      this.showCopyFeedback();
    });

    // Examples dropdown
    this.shadowRoot.querySelector('#examples').addEventListener('change', (e) => {
      if (e.target.value) {
        this.dispatchEvent(new CustomEvent('load-example', {
          bubbles: true,
          composed: true,
          detail: { name: e.target.value, code: examples[e.target.value] }
        }));
        e.target.value = '';
      }
    });
  }

  showCopyFeedback() {
    const feedback = this.shadowRoot.querySelector('#copy-feedback');
    feedback.classList.add('visible');
    setTimeout(() => feedback.classList.remove('visible'), 2000);
  }

  render() {
    const exampleOptions = Object.keys(examples).map(name => {
      const label = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return `<option value="${name}">${label}</option>`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--bg-primary, #ffffff);
          border-bottom: 1px solid var(--border-color, #ddd);
          padding: 12px 20px;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        h1 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
          margin: 0;
        }

        h1 code {
          font-family: var(--font-mono, 'SF Mono', Monaco, monospace);
          background: var(--bg-secondary, #f5f5f5);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 1rem;
        }

        .filename-display {
          font-family: var(--font-mono, 'SF Mono', Monaco, monospace);
          font-size: 0.875rem;
          color: var(--text-secondary, #666);
          padding: 4px 8px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 4px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .filename-display.has-file {
          color: var(--text-primary, #1a1a1a);
        }

        .filename-display.modified::after {
          content: ' •';
          color: var(--accent-color, #0066cc);
        }

        .secondary-btn {
          padding: 4px 10px;
          font-size: 0.75rem;
          font-family: inherit;
          background: transparent;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          color: var(--text-secondary, #666);
          cursor: pointer;
          transition: all 0.15s;
        }

        .secondary-btn:hover {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #1a1a1a);
        }

        .toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-family: inherit;
          background: transparent;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          color: var(--text-secondary, #666);
          cursor: pointer;
          transition: all 0.15s;
        }

        .toggle-btn:hover {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #1a1a1a);
        }

        .toggle-btn.active {
          background: var(--accent-color, #0066cc);
          border-color: var(--accent-color, #0066cc);
          color: white;
        }

        .toggle-icon {
          font-size: 0.875rem;
          transition: transform 0.2s;
        }

        .toggle-btn.active .toggle-icon {
          transform: rotate(180deg);
        }

        #copy-feedback {
          font-size: 0.75rem;
          color: var(--success-color, #28a745);
          opacity: 0;
          transition: opacity 0.2s;
        }

        #copy-feedback.visible {
          opacity: 1;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-controls label {
          font-size: 0.875rem;
          color: var(--text-secondary, #666);
        }

        select {
          padding: 6px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          background: var(--bg-primary, #ffffff);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
        }
      </style>

      <div class="header-content">
        <div class="header-left">
          <h1><code>svg-path-extended</code> Playground</h1>
          <span id="filename-display" class="filename-display">Untitled</span>
          <button id="open-file" class="secondary-btn">Open</button>
          <button id="save-file" class="secondary-btn">Save</button>
          <button id="annotated-toggle" class="toggle-btn" title="Show annotated output">
            <span class="toggle-icon">&#9654;</span>
            Annotated
          </button>
          <button id="console-toggle" class="toggle-btn" title="Show console output">
            <span class="toggle-icon">&#9654;</span>
            Console
          </button>
          <button id="copy-url" class="secondary-btn">Copy URL</button>
          <span id="copy-feedback">Copied!</span>
        </div>
        <div class="header-controls">
          <label for="examples">Examples:</label>
          <select id="examples">
            <option value="">-- Select --</option>
            ${exampleOptions}
          </select>
        </div>
      </div>
    `;
  }
}

customElements.define('playground-header', PlaygroundHeader);
