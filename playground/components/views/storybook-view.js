// Storybook View - Component demos for development
// Route: /storybook (hidden, dev only - not shown in nav)

const styles = `
  :host {
    display: block;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-secondary, #f5f5f5);
  }

  .storybook-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 2rem;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .subtitle {
    margin: 0;
    color: var(--text-secondary, #666);
    font-size: 0.875rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #ff6b6b;
    color: white;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: 3px;
    margin-left: 0.5rem;
    vertical-align: middle;
  }

  .component-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .component-card {
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }

  .component-card header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    margin-bottom: 0;
  }

  .component-card h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .component-card .description {
    margin: 0.25rem 0 0 0;
    font-size: 0.8125rem;
    color: var(--text-secondary, #666);
  }

  .demo-area {
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .code-area {
    padding: 1rem;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    overflow-x: auto;
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .code-area pre {
    margin: 0;
  }

  /* Demo component styles */
  .demo-button {
    padding: 0.5rem 1rem;
    background: var(--accent-color, #0066cc);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .demo-button:hover {
    background: var(--accent-hover, #0052a3);
  }

  .demo-button.secondary {
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #1a1a1a);
    border: 1px solid var(--border-color, #e0e0e0);
  }

  .demo-button.secondary:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .demo-input {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.875rem;
    width: 200px;
  }

  .demo-toggle {
    display: flex;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    overflow: hidden;
  }

  .demo-toggle button {
    padding: 0.5rem 1rem;
    border: none;
    background: var(--bg-primary, #ffffff);
    cursor: pointer;
    font-size: 0.8125rem;
  }

  .demo-toggle button:not(:last-child) {
    border-right: 1px solid var(--border-color, #e0e0e0);
  }

  .demo-toggle button.active {
    background: var(--accent-color, #0066cc);
    color: white;
  }

  .demo-color-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .demo-color {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
  }

  .demo-card {
    background: var(--bg-primary, #ffffff);
    padding: 1rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    width: 200px;
  }

  .demo-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
  }

  .demo-card p {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary, #666);
  }

  @media (max-width: 600px) {
    .storybook-container {
      padding: 1rem;
    }

    .component-grid {
      grid-template-columns: 1fr;
    }
  }
`;

class StorybookView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="storybook-container">
        <header>
          <h1>Component Storybook <span class="badge">Dev Only</span></h1>
          <p class="subtitle">UI component demos and documentation for development</p>
        </header>

        <div class="component-grid">
          <!-- Buttons -->
          <div class="component-card">
            <header>
              <h2>Buttons</h2>
              <p class="description">Primary and secondary action buttons</p>
            </header>
            <div class="demo-area">
              <div style="display: flex; gap: 0.5rem;">
                <button class="demo-button">Primary</button>
                <button class="demo-button secondary">Secondary</button>
              </div>
            </div>
            <div class="code-area">
              <pre>&lt;button class="primary"&gt;Primary&lt;/button&gt;
&lt;button class="secondary"&gt;Secondary&lt;/button&gt;</pre>
            </div>
          </div>

          <!-- Input -->
          <div class="component-card">
            <header>
              <h2>Text Input</h2>
              <p class="description">Standard text input field</p>
            </header>
            <div class="demo-area">
              <input type="text" class="demo-input" placeholder="Enter text...">
            </div>
            <div class="code-area">
              <pre>&lt;input type="text" placeholder="Enter text..."&gt;</pre>
            </div>
          </div>

          <!-- Toggle -->
          <div class="component-card">
            <header>
              <h2>Toggle Group</h2>
              <p class="description">Mutually exclusive option selector</p>
            </header>
            <div class="demo-area">
              <div class="demo-toggle">
                <button>List</button>
                <button class="active">Grid</button>
              </div>
            </div>
            <div class="code-area">
              <pre>&lt;div class="toggle-group"&gt;
  &lt;button&gt;List&lt;/button&gt;
  &lt;button class="active"&gt;Grid&lt;/button&gt;
&lt;/div&gt;</pre>
            </div>
          </div>

          <!-- Color Picker -->
          <div class="component-card">
            <header>
              <h2>Color Picker</h2>
              <p class="description">Color input with value display</p>
            </header>
            <div class="demo-area">
              <div class="demo-color-group">
                <input type="color" class="demo-color" value="#0066cc">
                <span style="font-family: monospace; font-size: 0.8125rem;">#0066cc</span>
              </div>
            </div>
            <div class="code-area">
              <pre>&lt;input type="color" value="#0066cc"&gt;
&lt;span&gt;#0066cc&lt;/span&gt;</pre>
            </div>
          </div>

          <!-- Card -->
          <div class="component-card">
            <header>
              <h2>Content Card</h2>
              <p class="description">Container for grouped content</p>
            </header>
            <div class="demo-area">
              <div class="demo-card">
                <h3>Card Title</h3>
                <p>Card description text goes here.</p>
              </div>
            </div>
            <div class="code-area">
              <pre>&lt;div class="card"&gt;
  &lt;h3&gt;Card Title&lt;/h3&gt;
  &lt;p&gt;Description&lt;/p&gt;
&lt;/div&gt;</pre>
            </div>
          </div>

          <!-- Typography -->
          <div class="component-card">
            <header>
              <h2>Typography</h2>
              <p class="description">Text styles and hierarchy</p>
            </header>
            <div class="demo-area" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
              <div style="font-size: 1.5rem; font-weight: 600;">Heading 1</div>
              <div style="font-size: 1.25rem; font-weight: 600;">Heading 2</div>
              <div style="font-size: 1rem; font-weight: 600;">Heading 3</div>
              <div style="font-size: 0.875rem;">Body text</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">Caption text</div>
            </div>
            <div class="code-area">
              <pre>font-sizes: 1.5rem, 1.25rem, 1rem, 0.875rem, 0.75rem</pre>
            </div>
          </div>

          <!-- Colors -->
          <div class="component-card">
            <header>
              <h2>Color Palette</h2>
              <p class="description">Theme colors from CSS variables</p>
            </header>
            <div class="demo-area" style="gap: 0.5rem;">
              <div style="width: 40px; height: 40px; background: var(--accent-color, #0066cc); border-radius: 4px;" title="accent"></div>
              <div style="width: 40px; height: 40px; background: var(--text-primary, #1a1a1a); border-radius: 4px;" title="text-primary"></div>
              <div style="width: 40px; height: 40px; background: var(--text-secondary, #666); border-radius: 4px;" title="text-secondary"></div>
              <div style="width: 40px; height: 40px; background: var(--bg-secondary, #f5f5f5); border: 1px solid var(--border-color); border-radius: 4px;" title="bg-secondary"></div>
              <div style="width: 40px; height: 40px; background: var(--border-color, #e0e0e0); border-radius: 4px;" title="border"></div>
            </div>
            <div class="code-area">
              <pre>--accent-color, --text-primary, --text-secondary, --bg-secondary, --border-color</pre>
            </div>
          </div>

          <!-- Spacing -->
          <div class="component-card">
            <header>
              <h2>Spacing Scale</h2>
              <p class="description">Consistent spacing units</p>
            </header>
            <div class="demo-area" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 4px; height: 16px; background: var(--accent-color);"></div>
                <span style="font-size: 0.75rem;">0.25rem (4px)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 8px; height: 16px; background: var(--accent-color);"></div>
                <span style="font-size: 0.75rem;">0.5rem (8px)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 16px; height: 16px; background: var(--accent-color);"></div>
                <span style="font-size: 0.75rem;">1rem (16px)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 24px; height: 16px; background: var(--accent-color);"></div>
                <span style="font-size: 0.75rem;">1.5rem (24px)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 32px; height: 16px; background: var(--accent-color);"></div>
                <span style="font-size: 0.75rem;">2rem (32px)</span>
              </div>
            </div>
            <div class="code-area">
              <pre>Spacing: 0.25rem, 0.5rem, 1rem, 1.5rem, 2rem</pre>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('storybook-view', StorybookView);

export default StorybookView;
