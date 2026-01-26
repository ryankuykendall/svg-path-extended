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
          border-right: 1px solid var(--border-color, #ddd);
          position: relative;
          overflow: hidden;
          transition: flex-basis 0.3s ease;
        }

        :host(.open) {
          flex: 1 1 0;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: var(--bg-secondary, #f5f5f5);
          border-bottom: 1px solid var(--border-color, #ddd);
          font-size: 0.75rem;
          color: var(--text-secondary, #666);
        }

        .header span {
          font-weight: 500;
        }

        .clear-btn {
          padding: 4px 10px;
          font-size: 0.75rem;
          font-family: inherit;
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          cursor: pointer;
          opacity: 1;
          transition: opacity 0.15s;
        }

        .clear-btn:hover {
          background: var(--bg-secondary, #f5f5f5);
        }

        #output {
          flex: 1;
          overflow: auto;
          background: #1e1e1e;
          padding: 12px;
          font-family: var(--font-mono, 'SF Mono', Monaco, monospace);
          font-size: 0.75rem;
          line-height: 1.5;
          color: #d4d4d4;
        }

        .empty {
          color: #666;
          font-style: italic;
        }

        @media (max-width: 800px) {
          :host {
            flex-basis: 0;
            border-right: none;
            border-bottom: 1px solid var(--border-color, #ddd);
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
