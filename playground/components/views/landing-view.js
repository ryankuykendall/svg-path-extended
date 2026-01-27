// Landing View - Workspace list with list/grid toggle
// Route: /

import { store } from '../../state/store.js';

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
  }

  .workspace-item p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary, #666);
  }

  .workspace-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-tertiary, #999);
  }

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

// Stub workspace data for demonstration
const STUB_WORKSPACES = [
  {
    id: 'demo-1',
    name: 'Star Pattern',
    description: 'A 5-pointed star using polygon function',
    lastModified: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'demo-2',
    name: 'Spiral Animation',
    description: 'Archimedean spiral with loops',
    lastModified: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'demo-3',
    name: 'Heart Shape',
    description: 'Bezier curves forming a heart',
    lastModified: new Date(Date.now() - 604800000).toISOString()
  }
];

class LandingView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.viewMode = 'grid'; // 'grid' or 'list'
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
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
        this.navigateTo('/workspace/:id', { id: 'new' });
        return;
      }

      // Workspace item click
      const workspaceItem = e.target.closest('.workspace-item');
      if (workspaceItem) {
        const id = workspaceItem.dataset.id;
        this.navigateTo('/workspace/:id', { id });
        return;
      }
    });
  }

  navigateTo(path, params = {}) {
    this.dispatchEvent(new CustomEvent('navigate', {
      bubbles: true,
      composed: true,
      detail: { path, params }
    }));
  }

  formatDate(isoString) {
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
    const displayWorkspaces = workspaces.length > 0 ? workspaces : STUB_WORKSPACES;

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

      ${displayWorkspaces.length > 0 ? `
        <div class="workspace-list ${this.viewMode}">
          ${displayWorkspaces.map(ws => `
            <div class="workspace-item" data-id="${ws.id}">
              <h3>${ws.name}</h3>
              <p>${ws.description || 'No description'}</p>
              <div class="workspace-meta">
                <span>Modified: ${this.formatDate(ws.lastModified)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <h2>No workspaces yet</h2>
          <p>Create your first workspace to start building SVG paths.</p>
          <button class="new-btn">+ New Workspace</button>
        </div>
      `}
    `;

    this.setupEventListeners();
  }
}

customElements.define('landing-view', LandingView);

export default LandingView;
