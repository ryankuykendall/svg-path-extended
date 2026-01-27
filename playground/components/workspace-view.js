// Workspace View - Code editor, preview, and compilation
// Route: /workspace/:id

import { store } from '../state/store.js';
import { defaultCode, examples } from '../utils/examples.js';
import { loadFromURL, applyURLState } from '../utils/url-state.js';

// Import all sub-components
import './playground-header.js';
import './playground-main.js';
import './playground-footer.js';
import './code-editor-pane.js';
import './annotated-pane.js';
import './console-pane.js';
import './svg-preview-pane.js';
import './docs-panel.js';
import './shared/error-panel.js';

export class WorkspaceView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._debounceTimer = null;
    this._fileHandle = null;
    this._initialized = false;
    this._routeUnsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Subscribe to route changes to initialize when becoming active
    this._routeUnsubscribe = store.subscribe(['currentView'], () => {
      this.handleRouteChange();
    });

    // Check if we should initialize immediately (if already on playground route)
    this.handleRouteChange();
  }

  disconnectedCallback() {
    if (this._routeUnsubscribe) {
      this._routeUnsubscribe();
    }
  }

  handleRouteChange() {
    const currentView = store.get('currentView');
    const isActive = currentView === 'workspace';

    if (isActive && !this._initialized) {
      this.waitForLibrary();
    }
  }

  get editorPane() {
    return this.shadowRoot.querySelector('code-editor-pane');
  }

  get previewPane() {
    return this.shadowRoot.querySelector('svg-preview-pane');
  }

  get annotatedPane() {
    return this.shadowRoot.querySelector('annotated-pane');
  }

  get consolePane() {
    return this.shadowRoot.querySelector('console-pane');
  }

  get docsPanel() {
    return this.shadowRoot.querySelector('docs-panel');
  }

  get errorPanel() {
    return this.shadowRoot.querySelector('error-panel');
  }

  waitForLibrary(maxWait = 5000) {
    const start = Date.now();
    const check = () => {
      if (window.SvgPathExtended) {
        this.initialize();
      } else if (Date.now() - start < maxWait) {
        setTimeout(check, 50);
      } else {
        this.showError('Failed to load svg-path-extended library');
      }
    };
    check();
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    // Load state from URL (query params) or use default
    const urlState = loadFromURL();
    const initialCode = applyURLState(urlState, store) || defaultCode;

    // Set initial code
    this.editorPane.initialCode = initialCode;
    store.set('code', initialCode);

    // Initialize panes based on URL state
    if (store.get('annotatedOpen')) {
      this.annotatedPane.open();
    }
    if (store.get('consoleOpen')) {
      this.consolePane.open();
    }

    // Initial compilation
    this.updatePreview();
  }

  setupEventListeners() {
    // Code changes from editor
    this.shadowRoot.addEventListener('code-change', () => {
      this.debouncedUpdate();
    });

    // Style changes from footer
    this.shadowRoot.addEventListener('style-change', () => {
      this.previewPane.updateSvgStyles();
    });

    // File operations
    this.shadowRoot.addEventListener('open-file', () => this.openFile());
    this.shadowRoot.addEventListener('save-file', () => this.saveFile());

    // Toggle panes
    this.shadowRoot.addEventListener('toggle-annotated', () => {
      this.annotatedPane.toggle();
      if (this.annotatedPane.isOpen) {
        this.updateAnnotatedOutput();
      }
    });

    this.shadowRoot.addEventListener('toggle-console', () => {
      this.consolePane.toggle();
    });

    // Load example
    this.shadowRoot.addEventListener('load-example', (e) => {
      this.editorPane.code = e.detail.code;
      store.set('code', e.detail.code);
      this.updatePreview();
      this.updateAnnotatedOutput();
    });

    // Open docs
    this.shadowRoot.addEventListener('open-docs', () => {
      this.docsPanel.open();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.docsPanel.classList.contains('open')) {
        this.docsPanel.close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        this.openFile();
      }
    });
  }

  debouncedUpdate() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.updatePreview();
      this.updateAnnotatedOutput();
    }, 150);
  }

  updatePreview() {
    const code = store.get('code') || this.editorPane.code;

    try {
      const result = window.SvgPathExtended.compileWithContext(code);
      this.previewPane.pathData = result.path;
      this.consolePane.logs = result.logs || [];
      this.hideError();
    } catch (e) {
      this.showError(e.message);
      this.consolePane.logs = [];
    }
  }

  updateAnnotatedOutput() {
    if (!this.annotatedPane.isOpen) return;

    const code = store.get('code') || this.editorPane.code;
    try {
      const annotated = window.SvgPathExtended.compileAnnotated(code);
      this.annotatedPane.content = annotated;
    } catch (e) {
      this.annotatedPane.content = `// Error: ${e.message}`;
    }
  }

  showError(message) {
    this.errorPanel.show(message);
  }

  hideError() {
    this.errorPanel.hide();
  }

  async saveFile() {
    const code = this.editorPane.code;

    try {
      if ('showSaveFilePicker' in window) {
        const options = {
          suggestedName: store.get('currentFileName') || 'untitled.svgx',
          types: [{
            description: 'SVG Path Extended Files',
            accept: { 'text/plain': ['.svgx'] },
          }],
        };

        if (this._fileHandle) {
          const writable = await this._fileHandle.createWritable();
          await writable.write(code);
          await writable.close();
        } else {
          const handle = await window.showSaveFilePicker(options);
          const writable = await handle.createWritable();
          await writable.write(code);
          await writable.close();
          this._fileHandle = handle;
          store.set('currentFileName', handle.name);
        }

        store.set('isModified', false);
      } else {
        // Fallback
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = store.get('currentFileName') || 'untitled.svgx';
        a.click();
        URL.revokeObjectURL(url);

        if (!store.get('currentFileName')) {
          store.set('currentFileName', 'untitled.svgx');
        }
        store.set('isModified', false);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Save failed:', err);
      }
    }
  }

  async openFile() {
    try {
      if ('showOpenFilePicker' in window) {
        const options = {
          types: [{
            description: 'SVG Path Extended Files',
            accept: { 'text/plain': ['.svgx'] },
          }],
          multiple: false,
        };

        const [handle] = await window.showOpenFilePicker(options);
        const file = await handle.getFile();
        const contents = await file.text();

        this._fileHandle = handle;
        store.set('currentFileName', handle.name);

        this.editorPane.code = contents;
        store.set('code', contents);
        store.set('isModified', false);

        this.updatePreview();
        this.updateAnnotatedOutput();
      } else {
        // Fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svgx';

        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const contents = await file.text();
          store.set('currentFileName', file.name);
          this._fileHandle = null;

          this.editorPane.code = contents;
          store.set('code', contents);
          store.set('isModified', false);

          this.updatePreview();
          this.updateAnnotatedOutput();
        };

        input.click();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Open failed:', err);
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #1a1a1a);
        }

        /* Hide when not active */
        :host(:not(.active)) {
          display: none;
        }

        playground-main {
          flex: 1;
          min-height: 0;
        }
      </style>

      <playground-header></playground-header>

      <playground-main>
        <code-editor-pane></code-editor-pane>
        <annotated-pane></annotated-pane>
        <console-pane></console-pane>
        <svg-preview-pane></svg-preview-pane>
      </playground-main>

      <error-panel></error-panel>

      <docs-panel></docs-panel>

      <playground-footer></playground-footer>
    `;
  }
}

customElements.define('workspace-view', WorkspaceView);
