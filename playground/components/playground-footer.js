// Footer component with SVG styling controls

import { store } from '../state/store.js';

export class PlaygroundFooter extends HTMLElement {
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
    // Subscribe to relevant state changes
    store.subscribe(['width', 'height', 'stroke', 'strokeWidth', 'fillEnabled', 'fill', 'background', 'gridEnabled', 'gridColor', 'gridSize'], () => {
      this.syncFromStore();
    });
  }

  syncFromStore() {
    const state = store.getAll();
    const root = this.shadowRoot;

    root.querySelector('#width').value = state.width;
    root.querySelector('#height').value = state.height;
    root.querySelector('#stroke').value = state.stroke;
    root.querySelector('#stroke-width').value = state.strokeWidth;
    root.querySelector('#fill-enabled').checked = state.fillEnabled;
    root.querySelector('#fill').value = state.fill;
    root.querySelector('#fill').disabled = !state.fillEnabled;
    root.querySelector('#bg').value = state.background;
    root.querySelector('#grid-enabled').checked = state.gridEnabled;
    root.querySelector('#grid-color').value = state.gridColor;
    root.querySelector('#grid-size').value = state.gridSize;
  }

  setupEventListeners() {
    const root = this.shadowRoot;

    // Width/Height
    root.querySelector('#width').addEventListener('input', (e) => {
      store.set('width', parseInt(e.target.value) || 200);
      this.dispatchStyleChange();
    });

    root.querySelector('#height').addEventListener('input', (e) => {
      store.set('height', parseInt(e.target.value) || 200);
      this.dispatchStyleChange();
    });

    // Stroke
    root.querySelector('#stroke').addEventListener('input', (e) => {
      store.set('stroke', e.target.value);
      this.dispatchStyleChange();
    });

    root.querySelector('#stroke-width').addEventListener('change', (e) => {
      store.set('strokeWidth', e.target.value);
      this.dispatchStyleChange();
    });

    // Fill
    root.querySelector('#fill-enabled').addEventListener('change', (e) => {
      store.set('fillEnabled', e.target.checked);
      root.querySelector('#fill').disabled = !e.target.checked;
      this.dispatchStyleChange();
    });

    root.querySelector('#fill').addEventListener('input', (e) => {
      store.set('fill', e.target.value);
      this.dispatchStyleChange();
    });

    // Background
    root.querySelector('#bg').addEventListener('input', (e) => {
      store.set('background', e.target.value);
      this.dispatchStyleChange();
    });

    // Grid
    root.querySelector('#grid-enabled').addEventListener('change', (e) => {
      store.set('gridEnabled', e.target.checked);
      this.dispatchStyleChange();
    });

    root.querySelector('#grid-color').addEventListener('input', (e) => {
      store.set('gridColor', e.target.value);
      this.dispatchStyleChange();
    });

    root.querySelector('#grid-size').addEventListener('change', (e) => {
      store.set('gridSize', e.target.value);
      this.dispatchStyleChange();
    });

    // Docs button
    root.querySelector('#docs-btn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-docs', { bubbles: true, composed: true }));
    });
  }

  dispatchStyleChange() {
    this.dispatchEvent(new CustomEvent('style-change', {
      bubbles: true,
      composed: true,
      detail: store.getAll()
    }));
  }

  render() {
    const state = store.getAll();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--bg-primary, #ffffff);
          border-top: 1px solid var(--border-color, #ddd);
          padding: 12px 20px;
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        label {
          font-size: 0.8125rem;
          color: var(--text-secondary, #666);
          white-space: nowrap;
        }

        input[type="number"] {
          width: 70px;
          padding: 6px 8px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          font-family: inherit;
          font-size: 0.875rem;
        }

        input[type="color"] {
          width: 36px;
          height: 30px;
          padding: 2px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          cursor: pointer;
        }

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        select {
          min-width: 60px;
          padding: 6px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          background: var(--bg-primary, #ffffff);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
        }

        .spacer {
          flex: 1;
        }

        button {
          padding: 6px 16px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          background: var(--bg-primary, #ffffff);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          transition: background 0.15s;
        }

        button:hover {
          background: var(--bg-secondary, #f5f5f5);
        }
      </style>

      <div class="controls">
        <div class="control-group">
          <label for="width">Width:</label>
          <input type="number" id="width" value="${state.width}" min="50" max="20000">
        </div>
        <div class="control-group">
          <label for="height">Height:</label>
          <input type="number" id="height" value="${state.height}" min="50" max="20000">
        </div>
        <div class="control-group">
          <label for="stroke">Stroke:</label>
          <input type="color" id="stroke" value="${state.stroke}">
        </div>
        <div class="control-group">
          <label for="fill-enabled">Fill:</label>
          <input type="checkbox" id="fill-enabled" ${state.fillEnabled ? 'checked' : ''}>
          <input type="color" id="fill" value="${state.fill}" ${state.fillEnabled ? '' : 'disabled'}>
        </div>
        <div class="control-group">
          <label for="bg">Background:</label>
          <input type="color" id="bg" value="${state.background}">
        </div>
        <div class="control-group">
          <label for="grid-enabled">Grid:</label>
          <input type="checkbox" id="grid-enabled" ${state.gridEnabled ? 'checked' : ''}>
          <input type="color" id="grid-color" value="${state.gridColor}">
          <select id="grid-size">
            <option value="10" ${state.gridSize == 10 ? 'selected' : ''}>10px</option>
            <option value="20" ${state.gridSize == 20 ? 'selected' : ''}>20px</option>
            <option value="25" ${state.gridSize == 25 ? 'selected' : ''}>25px</option>
            <option value="50" ${state.gridSize == 50 ? 'selected' : ''}>50px</option>
            <option value="100" ${state.gridSize == 100 ? 'selected' : ''}>100px</option>
          </select>
        </div>
        <div class="control-group">
          <label for="stroke-width">Stroke:</label>
          <select id="stroke-width">
            <option value="1" ${state.strokeWidth == 1 ? 'selected' : ''}>1px</option>
            <option value="2" ${state.strokeWidth == 2 ? 'selected' : ''}>2px</option>
            <option value="3" ${state.strokeWidth == 3 ? 'selected' : ''}>3px</option>
            <option value="4" ${state.strokeWidth == 4 ? 'selected' : ''}>4px</option>
            <option value="5" ${state.strokeWidth == 5 ? 'selected' : ''}>5px</option>
            <option value="6" ${state.strokeWidth == 6 ? 'selected' : ''}>6px</option>
            <option value="8" ${state.strokeWidth == 8 ? 'selected' : ''}>8px</option>
            <option value="10" ${state.strokeWidth == 10 ? 'selected' : ''}>10px</option>
          </select>
        </div>
        <div class="spacer"></div>
        <button id="docs-btn">Docs</button>
      </div>
    `;
  }
}

customElements.define('playground-footer', PlaygroundFooter);
