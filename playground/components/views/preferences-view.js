// Preferences View - Default SVG styling settings
// Route: /preferences

import { store } from '../../state/store.js';

const styles = `
  :host {
    display: block;
    padding: 2rem;
    overflow-y: auto;
    background: var(--bg-primary, #ffffff);
  }

  .preferences-container {
    max-width: 600px;
    margin: 0 auto;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: var(--text-secondary, #666);
    font-size: 0.875rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .form-group {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .form-group label {
    flex: 0 0 140px;
    font-size: 0.875rem;
    color: var(--text-primary, #1a1a1a);
  }

  .form-group input[type="number"],
  .form-group input[type="text"] {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.875rem;
    max-width: 120px;
  }

  .form-group input[type="color"] {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
  }

  .form-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .color-input-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-value {
    font-family: var(--font-mono, monospace);
    font-size: 0.8125rem;
    color: var(--text-secondary, #666);
  }

  .actions {
    display: flex;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .save-btn {
    padding: 0.625rem 1.5rem;
    background: var(--accent-color, #0066cc);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .save-btn:hover {
    background: var(--accent-hover, #0052a3);
  }

  .reset-btn {
    padding: 0.625rem 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #1a1a1a);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .reset-btn:hover {
    background: var(--bg-primary, #ffffff);
    border-color: var(--text-secondary, #666);
  }

  .notice {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    font-size: 0.8125rem;
    color: var(--text-secondary, #666);
  }

  .notice strong {
    color: var(--text-primary, #1a1a1a);
  }

  @media (max-width: 600px) {
    :host {
      padding: 1rem;
    }

    .form-group {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .form-group label {
      flex: none;
    }

    .form-group input[type="number"],
    .form-group input[type="text"] {
      max-width: none;
      width: 100%;
    }
  }
`;

// Default preferences
const DEFAULTS = {
  width: 200,
  height: 200,
  stroke: '#000000',
  strokeWidth: 2,
  fillEnabled: false,
  fill: '#3498db',
  background: '#f5f5f5',
  gridEnabled: true,
  gridColor: '#cccccc',
  gridSize: 20
};

class PreferencesView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.formValues = { ...DEFAULTS };
  }

  connectedCallback() {
    // Load current preferences from store
    const storedPrefs = store.get('preferences');
    if (storedPrefs) {
      this.formValues = { ...DEFAULTS, ...storedPrefs };
    }
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const form = this.shadowRoot.querySelector('form');
    if (!form) return;

    // Handle form input changes
    form.addEventListener('input', (e) => {
      const { name, value, type, checked } = e.target;
      if (type === 'checkbox') {
        this.formValues[name] = checked;
      } else if (type === 'number') {
        this.formValues[name] = parseFloat(value) || 0;
      } else {
        this.formValues[name] = value;
      }

      // Update color value display
      if (type === 'color') {
        const valueDisplay = e.target.nextElementSibling;
        if (valueDisplay?.classList.contains('color-value')) {
          valueDisplay.textContent = value;
        }
      }
    });

    // Save button
    this.shadowRoot.querySelector('.save-btn')?.addEventListener('click', () => {
      this.savePreferences();
    });

    // Reset button
    this.shadowRoot.querySelector('.reset-btn')?.addEventListener('click', () => {
      this.resetToDefaults();
    });
  }

  savePreferences() {
    store.set('preferences', { ...this.formValues });
    // Show feedback (could add toast notification later)
    alert('Preferences saved!');
  }

  resetToDefaults() {
    this.formValues = { ...DEFAULTS };
    store.set('preferences', { ...DEFAULTS });
    this.render();
  }

  render() {
    const prefs = this.formValues;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="preferences-container">
        <h1>Preferences</h1>
        <p class="subtitle">Default settings for new workspaces</p>

        <form>
          <div class="section">
            <h2>Canvas Size</h2>
            <div class="form-group">
              <label for="width">Width (px)</label>
              <input type="number" id="width" name="width" value="${prefs.width}" min="50" max="2000">
            </div>
            <div class="form-group">
              <label for="height">Height (px)</label>
              <input type="number" id="height" name="height" value="${prefs.height}" min="50" max="2000">
            </div>
          </div>

          <div class="section">
            <h2>Stroke</h2>
            <div class="form-group">
              <label for="stroke">Stroke Color</label>
              <div class="color-input-group">
                <input type="color" id="stroke" name="stroke" value="${prefs.stroke}">
                <span class="color-value">${prefs.stroke}</span>
              </div>
            </div>
            <div class="form-group">
              <label for="strokeWidth">Stroke Width</label>
              <input type="number" id="strokeWidth" name="strokeWidth" value="${prefs.strokeWidth}" min="0.5" max="20" step="0.5">
            </div>
          </div>

          <div class="section">
            <h2>Fill</h2>
            <div class="form-group">
              <label for="fillEnabled">Enable Fill</label>
              <input type="checkbox" id="fillEnabled" name="fillEnabled" ${prefs.fillEnabled ? 'checked' : ''}>
            </div>
            <div class="form-group">
              <label for="fill">Fill Color</label>
              <div class="color-input-group">
                <input type="color" id="fill" name="fill" value="${prefs.fill}">
                <span class="color-value">${prefs.fill}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Background & Grid</h2>
            <div class="form-group">
              <label for="background">Background Color</label>
              <div class="color-input-group">
                <input type="color" id="background" name="background" value="${prefs.background}">
                <span class="color-value">${prefs.background}</span>
              </div>
            </div>
            <div class="form-group">
              <label for="gridEnabled">Show Grid</label>
              <input type="checkbox" id="gridEnabled" name="gridEnabled" ${prefs.gridEnabled ? 'checked' : ''}>
            </div>
            <div class="form-group">
              <label for="gridColor">Grid Color</label>
              <div class="color-input-group">
                <input type="color" id="gridColor" name="gridColor" value="${prefs.gridColor}">
                <span class="color-value">${prefs.gridColor}</span>
              </div>
            </div>
            <div class="form-group">
              <label for="gridSize">Grid Size (px)</label>
              <input type="number" id="gridSize" name="gridSize" value="${prefs.gridSize}" min="5" max="100" step="5">
            </div>
          </div>

          <div class="actions">
            <button type="button" class="save-btn">Save Preferences</button>
            <button type="button" class="reset-btn">Reset to Defaults</button>
          </div>
        </form>

        <div class="notice">
          <strong>Note:</strong> These preferences apply to new workspaces only.
          Existing workspaces retain their individual settings.
        </div>
      </div>
    `;

    this.setupEventListeners();
  }
}

customElements.define('preferences-view', PreferencesView);

export default PreferencesView;
