// Console pane component for log output

import './shared/log-entry.js';

export class ConsolePane extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._logs = [];
    this._isOpen = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.shadowRoot.querySelector('#clear-btn').addEventListener('click', () => {
      this.clear();
    });
  }

  get logs() {
    return this._logs;
  }

  set logs(value) {
    this._logs = value || [];
    this.updateContent();
  }

  get isOpen() {
    return this._isOpen;
  }

  open() {
    this._isOpen = true;
    this.classList.add('open');
    this.updateContent();
    this.dispatchEvent(new CustomEvent('open'));
  }

  close() {
    this._isOpen = false;
    this.classList.remove('open');
    this.dispatchEvent(new CustomEvent('close'));
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  clear() {
    this._logs = [];
    this.updateContent();
    this.dispatchEvent(new CustomEvent('clear'));
  }

  updateContent() {
    if (!this._isOpen) return;

    const output = this.shadowRoot.querySelector('#output');
    if (!output) return;

    output.innerHTML = '';

    if (this._logs.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty';
      emptyDiv.textContent = 'No log output';
      output.appendChild(emptyDiv);
    } else {
      for (const logEntry of this._logs) {
        const entry = document.createElement('log-entry');
        entry.data = logEntry;
        output.appendChild(entry);
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          flex: 0 0 0;
          display: flex;
          flex-direction: column;
          min-width: 0;
          border-right: 1px solid var(--border-color, #e2e8f0);
          position: relative;
          overflow: hidden;
          transition: flex-basis var(--transition-slow, 0.3s ease);
          background: var(--bg-secondary, #ffffff);
        }

        :host(.open) {
          flex: 1 1 0;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary, #f0f1f2);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
        }

        .header span {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .clear-btn {
          padding: 0.25rem 0.625rem;
          font-size: 0.6875rem;
          font-family: inherit;
          font-weight: 500;
          background: var(--bg-secondary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          color: var(--text-secondary, #64748b);
          transition: all var(--transition-base, 0.15s ease);
        }

        .clear-btn:hover {
          background: var(--hover-bg, rgba(0, 0, 0, 0.04));
          border-color: var(--border-strong, #cbd5e1);
          color: var(--text-primary, #1a1a2e);
        }

        #output {
          flex: 1;
          overflow: auto;
          background: #1a1a1a;
          padding: 0.75rem 1rem;
          font-family: var(--font-mono, 'Inconsolata', monospace);
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1.6;
          color: #e0e0e0;
        }

        .empty {
          color: #666;
          font-style: italic;
        }

        @media (max-width: 800px) {
          :host {
            flex-basis: 0;
            border-right: none;
            border-bottom: 1px solid var(--border-color, #e2e8f0);
          }

          :host(.open) {
            flex: 0 0 200px;
          }
        }
      </style>

      <div class="header">
        <span>Console</span>
        <button id="clear-btn" class="clear-btn">Clear</button>
      </div>
      <div id="output">
        <div class="empty">No log output</div>
      </div>
    `;
  }
}

customElements.define('console-pane', ConsolePane);
