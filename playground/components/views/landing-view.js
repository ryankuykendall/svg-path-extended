// Landing View - Workspace list with list/grid toggle
// Route: /

import { store } from '../../state/store.js';
import { workspaceApi } from '../../services/api.js';
import { navigateTo, buildWorkspaceSlugId } from '../../utils/router.js';

const styles = `
  :host {
    display: block;
    padding: 2rem;
    overflow-y: auto;
    background: var(--bg-primary, #ffffff);
  }

  .landing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .view-toggle {
    display: flex;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    overflow: hidden;
  }

  .view-toggle button {
    padding: 0.375rem 0.75rem;
    border: none;
    background: var(--bg-primary, #ffffff);
    color: var(--text-secondary, #666);
    cursor: pointer;
    font-size: 0.8125rem;
    transition: all 0.15s ease;
  }

  .view-toggle button:not(:last-child) {
    border-right: 1px solid var(--border-color, #e0e0e0);
  }

  .view-toggle button.active {
    background: var(--accent-color, #0066cc);
    color: white;
  }

  .view-toggle button:hover:not(.active) {
    background: var(--bg-secondary, #f5f5f5);
  }

  .new-btn {
    padding: 0.5rem 1rem;
    background: var(--accent-color, #0066cc);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .new-btn:hover {
    background: var(--accent-hover, #0052a3);
  }

  .workspace-list {
    display: grid;
    gap: 1rem;
  }

  .workspace-list.grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .workspace-list.list {
    grid-template-columns: 1fr;
  }

  .workspace-item {
    position: relative;
    padding: 1rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--bg-primary, #ffffff);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .workspace-item:hover {
    border-color: var(--accent-color, #0066cc);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .workspace-item h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary, #1a1a1a);
    padding-right: 2rem; /* Space for menu */
  }

  .workspace-item p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary, #666);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .workspace-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-tertiary, #999);
  }

  .workspace-meta .public-badge {
    background: var(--success-bg, #d4edda);
    color: var(--success-color, #155724);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
  }

  /* Overflow menu */
  .menu-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary, #999);
    transition: all 0.15s ease;
  }

  .menu-btn:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #1a1a1a);
  }

  .menu-dropdown {
    position: absolute;
    top: 2.5rem;
    right: 0.5rem;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 140px;
    z-index: 100;
    display: none;
  }

  .menu-dropdown.open {
    display: block;
  }

  .menu-dropdown button {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    text-align: left;
    font-size: 0.8125rem;
    color: var(--text-primary, #1a1a1a);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .menu-dropdown button:first-child {
    border-radius: 6px 6px 0 0;
  }

  .menu-dropdown button:last-child {
    border-radius: 0 0 6px 6px;
  }

  .menu-dropdown button:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .menu-dropdown button.danger {
    color: var(--error-color, #dc3545);
  }

  .menu-dropdown button.danger:hover {
    background: var(--error-bg, #f8d7da);
  }

  /* Loading state */
  .loading-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary, #666);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #e0e0e0);
    border-top-color: var(--accent-color, #0066cc);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error state */
  .error-state {
    text-align: center;
    padding: 3rem;
    color: var(--error-color, #dc3545);
  }

  .error-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary, #666);
  }

  .empty-state h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--text-primary, #1a1a1a);
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
  }

  @media (max-width: 600px) {
    :host {
      padding: 1rem;
    }

    .landing-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .controls {
      justify-content: space-between;
    }

    .workspace-list.grid {
      grid-template-columns: 1fr;
    }
  }
`;

class LandingView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.viewMode = 'grid';
    this._unsubscribe = null;
    this._loading = false;
    this._error = null;
    this._openMenuId = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Subscribe to view changes to reload when becoming active
    this._unsubscribe = store.subscribe(['currentView'], () => {
      if (store.get('currentView') === 'landing') {
        this.loadWorkspaces();
      }
    });

    // Initial load if we're on landing
    if (store.get('currentView') === 'landing') {
      this.loadWorkspaces();
    }

    // Close menu on outside click
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
    document.removeEventListener('click', this._handleOutsideClick);
  }

  _handleOutsideClick = (e) => {
    if (!this._openMenuId) return;

    // Use composedPath to check clicks across shadow DOM boundaries
    const path = e.composedPath();
    const isMenuClick = path.some(el =>
      el.classList && (el.classList.contains('menu-btn') || el.classList.contains('menu-dropdown'))
    );

    if (!isMenuClick) {
      const dropdown = this.shadowRoot.querySelector(`.workspace-item[data-id="${this._openMenuId}"] .menu-dropdown`);
      if (dropdown) dropdown.classList.remove('open');
      this._openMenuId = null;
    }
  };

  async loadWorkspaces() {
    this._loading = true;
    this._error = null;
    this.render();

    try {
      const workspaces = await workspaceApi.list();
      store.set('workspaces', workspaces);
      this._loading = false;
      this.render();
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      this._loading = false;
      this._error = err.message || 'Failed to load workspaces';
      this.render();
    }
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
      // View toggle
      const toggleBtn = e.target.closest('.view-toggle button');
      if (toggleBtn) {
        this.viewMode = toggleBtn.dataset.view;
        this.render();
        return;
      }

      // New workspace button
      if (e.target.closest('.new-btn')) {
        navigateTo('/workspace/new');
        return;
      }

      // Menu button
      const menuBtn = e.target.closest('.menu-btn');
      if (menuBtn) {
        e.stopPropagation();
        const id = menuBtn.dataset.id;

        // Close any currently open menu
        if (this._openMenuId && this._openMenuId !== id) {
          const oldDropdown = this.shadowRoot.querySelector(`.workspace-item[data-id="${this._openMenuId}"] .menu-dropdown`);
          if (oldDropdown) oldDropdown.classList.remove('open');
        }

        // Toggle the clicked menu
        const dropdown = menuBtn.closest('.workspace-item').querySelector('.menu-dropdown');
        if (dropdown) {
          const isOpen = dropdown.classList.toggle('open');
          this._openMenuId = isOpen ? id : null;
        }
        return;
      }

      // Menu actions
      const menuAction = e.target.closest('.menu-dropdown button');
      if (menuAction) {
        e.stopPropagation();
        const action = menuAction.dataset.action;
        const id = menuAction.closest('.workspace-item').dataset.id;
        this.handleMenuAction(action, id);
        return;
      }

      // Workspace item click (but not on menu)
      const workspaceItem = e.target.closest('.workspace-item');
      if (workspaceItem && !e.target.closest('.menu-btn') && !e.target.closest('.menu-dropdown')) {
        const id = workspaceItem.dataset.id;
        const slug = workspaceItem.dataset.slug;
        const slugId = buildWorkspaceSlugId(slug, id);
        navigateTo('/workspace/:slugId', { params: { slugId } });
        return;
      }

      // Retry button
      if (e.target.closest('.retry-btn')) {
        this.loadWorkspaces();
        return;
      }
    });
  }

  async handleMenuAction(action, id) {
    // Close the menu
    const dropdown = this.shadowRoot.querySelector(`.workspace-item[data-id="${this._openMenuId}"] .menu-dropdown`);
    if (dropdown) dropdown.classList.remove('open');
    this._openMenuId = null;

    switch (action) {
      case 'copy':
        navigateTo('/workspace/new', { query: { copyFrom: id } });
        break;

      case 'toggle-publish':
        try {
          const workspaces = store.get('workspaces') || [];
          const workspace = workspaces.find(w => w.id === id);
          if (!workspace) return;

          const newIsPublic = !workspace.isPublic;
          await workspaceApi.update(id, { isPublic: newIsPublic });

          // Update local state
          workspace.isPublic = newIsPublic;
          store.set('workspaces', [...workspaces]);
          this.render();
        } catch (err) {
          console.error('Failed to update workspace visibility:', err);
          alert('Failed to update visibility: ' + err.message);
        }
        break;

      case 'delete':
        if (confirm('Are you sure you want to delete this workspace? This cannot be undone.')) {
          try {
            await workspaceApi.delete(id);
            // Remove from local state
            const workspaces = store.get('workspaces') || [];
            store.set('workspaces', workspaces.filter(w => w.id !== id));
            this.render();
          } catch (err) {
            console.error('Failed to delete workspace:', err);
            alert('Failed to delete workspace: ' + err.message);
          }
        }
        break;
    }
  }

  formatDate(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  render() {
    const workspaces = store.get('workspaces') || [];

    let content = '';

    if (this._loading) {
      content = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading workspaces...</p>
        </div>
      `;
    } else if (this._error) {
      content = `
        <div class="error-state">
          <p>Failed to load workspaces: ${this.escapeHtml(this._error)}</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;
    } else if (workspaces.length === 0) {
      content = `
        <div class="empty-state">
          <h2>No workspaces yet</h2>
          <p>Create your first workspace to start building SVG paths.</p>
          <button class="new-btn">+ New Workspace</button>
        </div>
      `;
    } else {
      content = `
        <div class="workspace-list ${this.viewMode}">
          ${workspaces.map(ws => `
            <div class="workspace-item" data-id="${ws.id}" data-slug="${ws.slug || ''}">
              <button class="menu-btn" data-id="${ws.id}" title="More options">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5"/>
                  <circle cx="8" cy="8" r="1.5"/>
                  <circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              <div class="menu-dropdown ${this._openMenuId === ws.id ? 'open' : ''}">
                <button data-action="copy">Duplicate</button>
                <button data-action="toggle-publish">${ws.isPublic ? 'Make Private' : 'Make Public'}</button>
                <button data-action="delete" class="danger">Delete</button>
              </div>
              <h3>${this.escapeHtml(ws.name)}</h3>
              <p>${this.escapeHtml(ws.description) || 'No description'}</p>
              <div class="workspace-meta">
                <span>Modified: ${this.formatDate(ws.updatedAt)}</span>
                ${ws.isPublic ? '<span class="public-badge">Public</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="landing-header">
        <h1>My Workspaces</h1>
        <div class="controls">
          <div class="view-toggle">
            <button data-view="list" class="${this.viewMode === 'list' ? 'active' : ''}">List</button>
            <button data-view="grid" class="${this.viewMode === 'grid' ? 'active' : ''}">Grid</button>
          </div>
          <button class="new-btn">+ New Workspace</button>
        </div>
      </div>

      ${content}
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('landing-view', LandingView);

export default LandingView;
