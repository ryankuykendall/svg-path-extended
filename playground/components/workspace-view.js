// Workspace View - Code editor, preview, and compilation
// Route: /workspace/:id

import { store } from '../state/store.js';
import { defaultCode, examples } from '../utils/examples.js';
import { loadFromURL, applyURLState } from '../utils/url-state.js';
import { workspaceApi } from '../services/api.js';
import { autosave, SaveStatus } from '../services/autosave.js';
import { getUserId } from '../services/user-id.js';
import { BASE_PATH, parseWorkspaceSlugId, buildWorkspaceSlugId } from '../utils/router.js';

// Import all sub-components
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
    this._loadingWorkspace = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Subscribe to route changes to initialize when becoming active
    this._routeUnsubscribe = store.subscribe(['currentView', 'routeParams'], () => {
      this.handleRouteChange();
    });

    // Check if we should initialize immediately (if already on workspace route)
    this.handleRouteChange();
  }

  disconnectedCallback() {
    if (this._routeUnsubscribe) {
      this._routeUnsubscribe();
    }
    // Stop autosave when leaving
    autosave.stop();
    // Clean up event listeners
    this.cleanupEventListeners();
  }

  handleRouteChange() {
    const currentView = store.get('currentView');
    const routeParams = store.get('routeParams') || {};
    const isActive = currentView === 'workspace';

    // Parse workspace ID from slugId (format: slug--id or just id)
    const { id: workspaceId } = parseWorkspaceSlugId(routeParams.slugId);

    if (isActive) {
      // Check if we need to load a different workspace
      if (!this._initialized || this._currentWorkspaceId !== workspaceId) {
        this._currentWorkspaceId = workspaceId;
        this.waitForLibrary();
      }
    } else {
      // Stop autosave when leaving workspace view
      if (this._initialized) {
        autosave.stop();
      }
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

  async initialize() {
    this._initialized = true;
    const routeParams = store.get('routeParams') || {};
    const routeQuery = store.get('routeQuery') || {};
    // Parse workspace ID from slugId (format: slug--id or just id)
    const { id: workspaceId } = parseWorkspaceSlugId(routeParams.slugId);

    // Reset workspace state
    store.update({
      workspaceId: null,
      workspaceName: null,
      workspaceDescription: null,
      workspaceIsPublic: false,
      workspaceOwnerId: null,
      workspaceUpdatedAt: null,
      saveStatus: SaveStatus.IDLE,
      saveError: null,
    });

    // Check for URL state (backward compatibility for shareable links)
    if (routeQuery.state) {
      const urlState = loadFromURL();
      const initialCode = applyURLState(urlState, store) || defaultCode;
      this.editorPane.initialCode = initialCode;
      store.set('code', initialCode);
      // Don't initialize autosave for URL-state workspaces (they're not persisted)
    }
    // Load workspace from API if ID is provided and not 'new'
    else if (workspaceId && workspaceId !== 'new') {
      await this.loadWorkspace(workspaceId);
    }
    // New workspace
    else {
      // Use default code for new workspaces
      const preferences = store.get('preferences');
      this.editorPane.initialCode = defaultCode;
      store.update({
        code: defaultCode,
        currentFileName: null,
      });
      // Apply user preferences to SVG styles
      if (preferences) {
        store.update({
          width: preferences.width,
          height: preferences.height,
          stroke: preferences.stroke,
          strokeWidth: preferences.strokeWidth,
          fillEnabled: preferences.fillEnabled,
          fill: preferences.fill,
          background: preferences.background,
          gridEnabled: preferences.gridEnabled,
          gridColor: preferences.gridColor,
          gridSize: preferences.gridSize,
        });
      }
    }

    // Initialize panes based on store state
    if (store.get('annotatedOpen')) {
      this.annotatedPane.open();
    }
    if (store.get('consoleOpen')) {
      this.consolePane.open();
    }

    // Initial compilation
    this.updatePreview();
  }

  updateUrlWithSlug(id, slug) {
    // Only update if slug exists and URL doesn't already have it
    if (!slug) return;

    const routeParams = store.get('routeParams') || {};
    const currentSlugId = routeParams.slugId || '';
    const expectedSlugId = buildWorkspaceSlugId(slug, id);

    if (currentSlugId === expectedSlugId) return;

    // Build new URL with slug--id format
    const newPath = `${BASE_PATH}/workspace/${encodeURIComponent(expectedSlugId)}`;

    // Use replaceState to avoid adding to history
    history.replaceState(null, '', newPath);

    // Update store with new slugId
    store.set('routeParams', { ...routeParams, slugId: expectedSlugId });
  }

  async loadWorkspace(id) {
    if (this._loadingWorkspace) return;
    this._loadingWorkspace = true;

    try {
      const workspace = await workspaceApi.get(id);
      const userId = getUserId();

      // Update store with workspace data
      store.update({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceDescription: workspace.description,
        workspaceIsPublic: workspace.isPublic,
        workspaceOwnerId: workspace.userId,
        workspaceUpdatedAt: workspace.updatedAt,
        code: workspace.code,
        currentFileName: workspace.name,
      });

      // Apply workspace preferences to SVG styles
      if (workspace.preferences) {
        const prefs = workspace.preferences;
        store.update({
          width: prefs.width ?? store.get('width'),
          height: prefs.height ?? store.get('height'),
          stroke: prefs.stroke ?? store.get('stroke'),
          strokeWidth: prefs.strokeWidth ?? store.get('strokeWidth'),
          fillEnabled: prefs.fillEnabled ?? store.get('fillEnabled'),
          fill: prefs.fill ?? store.get('fill'),
          background: prefs.background ?? store.get('background'),
          gridEnabled: prefs.gridEnabled ?? store.get('gridEnabled'),
          gridColor: prefs.gridColor ?? store.get('gridColor'),
          gridSize: prefs.gridSize ?? store.get('gridSize'),
        });
      }

      // Set editor code
      this.editorPane.initialCode = workspace.code;

      // Update URL with slug if not already present
      this.updateUrlWithSlug(workspace.id, workspace.slug);

      // Initialize autosave if user owns this workspace
      if (workspace.userId === userId) {
        autosave.init(workspace.id, workspace.contentHash);
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
      if (err.status === 404) {
        this.showError('Workspace not found');
      } else if (err.status === 403) {
        this.showError('You do not have access to this workspace');
      } else {
        this.showError('Failed to load workspace: ' + err.message);
      }

      // Fall back to default code
      this.editorPane.initialCode = defaultCode;
      store.set('code', defaultCode);
    } finally {
      this._loadingWorkspace = false;
    }
  }

  setupEventListeners() {
    // Code changes from editor
    this.shadowRoot.addEventListener('code-change', () => {
      this.debouncedUpdate();

      // Trigger autosave
      const code = store.get('code');
      autosave.onChange(code);
    });

    // Style changes from footer
    this.shadowRoot.addEventListener('style-change', () => {
      this.previewPane.updateSvgStyles();
    });

    // Open docs
    this.shadowRoot.addEventListener('open-docs', () => {
      this.docsPanel.open();
    });

    // Listen for events from app-header and app-breadcrumb (bubble up through DOM)
    // These listeners are on document to catch events from outside shadow DOM
    this._handleExportFile = () => {
      if (store.get('currentView') === 'workspace') {
        this.exportFile();
      }
    };
    document.addEventListener('export-file', this._handleExportFile);

    this._handleCopyCode = () => {
      if (store.get('currentView') === 'workspace') {
        this.copyCode();
      }
    };
    document.addEventListener('copy-code', this._handleCopyCode);

    this._handleCopySvg = () => {
      if (store.get('currentView') === 'workspace') {
        this.copySvg();
      }
    };
    document.addEventListener('copy-svg', this._handleCopySvg);

    this._handleToggleAnnotated = () => {
      if (store.get('currentView') === 'workspace') {
        this.annotatedPane.toggle();
        if (this.annotatedPane.isOpen) {
          this.updateAnnotatedOutput();
        }
      }
    };
    document.addEventListener('toggle-annotated', this._handleToggleAnnotated);

    this._handleToggleConsole = () => {
      if (store.get('currentView') === 'workspace') {
        this.consolePane.toggle();
      }
    };
    document.addEventListener('toggle-console', this._handleToggleConsole);

    // Keyboard shortcuts
    this._handleKeydown = (e) => {
      if (store.get('currentView') !== 'workspace') return;

      if (e.key === 'Escape' && this.docsPanel.classList.contains('open')) {
        this.docsPanel.close();
      }
      // Ctrl/Cmd+S now exports
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.exportFile();
      }
    };
    document.addEventListener('keydown', this._handleKeydown);
  }

  cleanupEventListeners() {
    document.removeEventListener('export-file', this._handleExportFile);
    document.removeEventListener('copy-code', this._handleCopyCode);
    document.removeEventListener('copy-svg', this._handleCopySvg);
    document.removeEventListener('toggle-annotated', this._handleToggleAnnotated);
    document.removeEventListener('toggle-console', this._handleToggleConsole);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  copyCode() {
    const code = this.editorPane.code;
    navigator.clipboard.writeText(code).catch(err => {
      console.error('Failed to copy code:', err);
    });
  }

  copySvg() {
    const svgElement = this.previewPane.shadowRoot?.querySelector('svg');
    if (svgElement) {
      const svgString = svgElement.outerHTML;
      navigator.clipboard.writeText(svgString).catch(err => {
        console.error('Failed to copy SVG:', err);
      });
    }
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

  // Export file (renamed from saveFile)
  async exportFile() {
    const code = this.editorPane.code;
    const workspaceName = store.get('workspaceName') || store.get('currentFileName') || 'untitled';
    const suggestedName = workspaceName.endsWith('.svgx') ? workspaceName : `${workspaceName}.svgx`;

    try {
      if ('showSaveFilePicker' in window) {
        const options = {
          suggestedName,
          types: [{
            description: 'SVG Path Extended Files',
            accept: { 'text/plain': ['.svgx'] },
          }],
        };

        const handle = await window.showSaveFilePicker(options);
        const writable = await handle.createWritable();
        await writable.write(code);
        await writable.close();
      } else {
        // Fallback for browsers without File System Access API
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Export failed:', err);
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
