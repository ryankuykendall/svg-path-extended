// Header component with controls, toggles, and save status

import { store } from '../state/store.js';
import { copyURL } from '../utils/url-state.js';
import { workspaceApi } from '../services/api.js';
import { navigateTo, buildWorkspaceSlugId } from '../utils/router.js';

export class PlaygroundHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._unsubscribe = null;
    this._copying = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.subscribeToStore();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  subscribeToStore() {
    this._unsubscribe = store.subscribe(
      ['annotatedOpen', 'consoleOpen', 'saveStatus', 'saveError', 'workspaceId'],
      () => {
        this.updateToggleStates();
        this.updateSaveStatus();
        this.updateCopyButton();
      }
    );
  }

  updateToggleStates() {
    const annotatedToggle = this.shadowRoot.querySelector('#annotated-toggle');
    const consoleToggle = this.shadowRoot.querySelector('#console-toggle');

    if (annotatedToggle) {
      annotatedToggle.classList.toggle('active', store.get('annotatedOpen'));
    }
    if (consoleToggle) {
      consoleToggle.classList.toggle('active', store.get('consoleOpen'));
    }
  }

  updateCopyButton() {
    const copyBtn = this.shadowRoot.querySelector('#copy-workspace');
    if (copyBtn) {
      const workspaceId = store.get('workspaceId');
      copyBtn.style.display = workspaceId ? 'inline-block' : 'none';
    }
  }

  async copyWorkspace() {
    if (this._copying) return;

    const workspaceId = store.get('workspaceId');
    if (!workspaceId) return;

    this._copying = true;
    const copyBtn = this.shadowRoot.querySelector('#copy-workspace');
    if (copyBtn) {
      copyBtn.textContent = 'Copying...';
      copyBtn.disabled = true;
    }

    try {
      const newWorkspace = await workspaceApi.copy(workspaceId);
      // Navigate to the new workspace (with slug--id format)
      const slugId = buildWorkspaceSlugId(newWorkspace.slug, newWorkspace.id);
      navigateTo('/workspace/:slugId', { params: { slugId } });
    } catch (err) {
      console.error('Failed to copy workspace:', err);
      // Show error briefly
      if (copyBtn) {
        copyBtn.textContent = 'Error';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Workspace';
          copyBtn.disabled = false;
        }, 2000);
      }
    } finally {
      this._copying = false;
      if (copyBtn && !copyBtn.disabled) {
        copyBtn.textContent = 'Copy Workspace';
        copyBtn.disabled = false;
      }
    }
  }

  updateSaveStatus() {
    const statusEl = this.shadowRoot.querySelector('#save-status');
    if (!statusEl) return;

    const status = store.get('saveStatus');
    const error = store.get('saveError');
    const workspaceId = store.get('workspaceId');

    // Only show status for persisted workspaces
    if (!workspaceId) {
      statusEl.className = 'save-status hidden';
      statusEl.textContent = '';
      return;
    }

    statusEl.className = `save-status ${status}`;

    switch (status) {
      case 'idle':
        statusEl.textContent = '';
        statusEl.classList.add('hidden');
        break;
      case 'modified':
        statusEl.textContent = 'Modified';
        break;
      case 'saving':
        statusEl.textContent = 'Saving...';
        break;
      case 'saved':
        statusEl.textContent = 'Saved';
        break;
      case 'error':
        statusEl.textContent = error ? `Error: ${error}` : 'Save failed';
        statusEl.title = error || 'Save failed';
        break;
      default:
        statusEl.textContent = '';
        statusEl.classList.add('hidden');
    }
  }

  setupEventListeners() {
    // Export file
    this.shadowRoot.querySelector('#export-file')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('export-file', { bubbles: true, composed: true }));
    });

    // Copy workspace
    this.shadowRoot.querySelector('#copy-workspace')?.addEventListener('click', () => {
      this.copyWorkspace();
    });

    // Annotated toggle
    this.shadowRoot.querySelector('#annotated-toggle')?.addEventListener('click', () => {
      store.set('annotatedOpen', !store.get('annotatedOpen'));
      this.dispatchEvent(new CustomEvent('toggle-annotated', { bubbles: true, composed: true }));
    });

    // Console toggle
    this.shadowRoot.querySelector('#console-toggle')?.addEventListener('click', () => {
      store.set('consoleOpen', !store.get('consoleOpen'));
      this.dispatchEvent(new CustomEvent('toggle-console', { bubbles: true, composed: true }));
    });

    // Copy URL
    this.shadowRoot.querySelector('#copy-url')?.addEventListener('click', async () => {
      await copyURL(store);
      this.showCopyFeedback();
    });
  }

  showCopyFeedback() {
    const feedback = this.shadowRoot.querySelector('#copy-feedback');
    if (feedback) {
      feedback.classList.add('visible');
      setTimeout(() => feedback.classList.remove('visible'), 2000);
    }
  }

  render() {
    const workspaceId = store.get('workspaceId');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--bg-primary, #ffffff);
          border-bottom: 1px solid var(--border-color, #ddd);
          padding: 8px 16px;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .save-status {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .save-status.hidden {
          display: none;
        }

        .save-status.modified {
          background: var(--warning-bg, #fff3cd);
          color: var(--warning-color, #856404);
        }

        .save-status.saving {
          background: var(--info-bg, #cce5ff);
          color: var(--info-color, #004085);
        }

        .save-status.saved {
          background: var(--success-bg, #d4edda);
          color: var(--success-color, #155724);
        }

        .save-status.error {
          background: var(--error-bg, #f8d7da);
          color: var(--error-color, #721c24);
          cursor: help;
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

        .secondary-btn:hover:not(:disabled) {
          background: var(--bg-secondary, #f5f5f5);
          color: var(--text-primary, #1a1a1a);
        }

        .secondary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        @media (max-width: 768px) {
          .header-content {
            flex-wrap: wrap;
          }

          .header-left,
          .header-right {
            flex-wrap: wrap;
          }
        }
      </style>

      <div class="header-content">
        <div class="header-left">
          <button id="annotated-toggle" class="toggle-btn" title="Show annotated output">
            <span class="toggle-icon">&#9654;</span>
            Annotated
          </button>
          <button id="console-toggle" class="toggle-btn" title="Show console output">
            <span class="toggle-icon">&#9654;</span>
            Console
          </button>
          <span id="save-status" class="save-status hidden"></span>
        </div>
        <div class="header-right">
          <button id="copy-url" class="secondary-btn">Copy URL</button>
          <span id="copy-feedback">Copied!</span>
          <button id="export-file" class="secondary-btn" title="Export to file (Ctrl+S)">Export</button>
          <button id="copy-workspace" class="secondary-btn" title="Duplicate this workspace" style="display: ${workspaceId ? 'inline-block' : 'none'}">Copy Workspace</button>
        </div>
      </div>
    `;
  }
}

customElements.define('playground-header', PlaygroundHeader);
