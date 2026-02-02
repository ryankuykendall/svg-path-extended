// App Header - Top navigation bar
// Contains logo, main navigation links, and workspace-specific actions

import { store } from '../state/store.js';
import { routeUrl, buildWorkspaceSlugId, navigateTo } from '../utils/router.js';
import { copyURL } from '../utils/url-state.js';
import { workspaceApi } from '../services/api.js';

const styles = `
  :host {
    display: block;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    max-width: 100%;
    height: 48px;
    box-sizing: border-box;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-mono, monospace);
  }

  .logo:hover {
    color: var(--accent-color, #0066cc);
  }

  .version {
    font-size: 0.75rem;
    color: var(--text-secondary, #666);
    font-family: var(--font-mono, monospace);
  }

  nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-link {
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    text-decoration: none;
    color: var(--text-primary, #1a1a1a);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.15s ease;
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  .nav-link:hover {
    background: var(--bg-hover, rgba(0, 0, 0, 0.05));
  }

  .nav-link.active {
    background: var(--accent-color, #0066cc);
    color: white;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    border: 1px solid var(--border-color, #e0e0e0);
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #1a1a1a);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover:not(:disabled) {
    border-color: var(--accent-color, #0066cc);
    color: var(--accent-color, #0066cc);
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Overflow menu */
  .menu-container {
    position: relative;
  }

  .menu-btn {
    padding: 0.375rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border-color, #e0e0e0);
    background: var(--bg-primary, #ffffff);
    color: var(--text-secondary, #666);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-btn:hover {
    border-color: var(--accent-color, #0066cc);
    color: var(--accent-color, #0066cc);
  }

  .menu-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 160px;
    z-index: 1000;
    display: none;
  }

  .menu-dropdown.open {
    display: block;
  }

  .menu-dropdown button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

  .menu-dropdown button:only-child {
    border-radius: 6px;
  }

  .menu-dropdown button:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .menu-dropdown .menu-icon {
    width: 16px;
    height: 16px;
    opacity: 0.6;
  }

  .copy-feedback {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--success-bg, #d4edda);
    color: var(--success-color, #155724);
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .copy-feedback.visible {
    opacity: 1;
  }

  @media (max-width: 600px) {
    .header {
      padding: 0.5rem;
    }

    .version {
      display: none;
    }

    .nav-link {
      padding: 0.375rem 0.5rem;
      font-size: 0.8125rem;
    }

    .actions {
      gap: 0.25rem;
    }

    .action-btn {
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
    }
  }
`;

class AppHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribe = null;
    this._menuOpen = false;
    this._copying = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Subscribe to route and workspace changes
    this.unsubscribe = store.subscribe(['currentView', 'workspaceId'], () => {
      this.updateActiveLink();
      this.updateWorkspaceActions();
    });

    // Close menu on outside click
    this._handleOutsideClick = (e) => {
      if (!this._menuOpen) return;

      // Check if click is on menu button or dropdown using composedPath
      const path = e.composedPath();
      const isMenuClick = path.some(el =>
        el.classList && (el.classList.contains('menu-btn') || el.classList.contains('menu-dropdown') || el.classList.contains('menu-container'))
      );

      if (!isMenuClick) {
        this._menuOpen = false;
        const dropdown = this.shadowRoot.querySelector('.menu-dropdown');
        if (dropdown) {
          dropdown.classList.remove('open');
        }
      }
    };
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    document.removeEventListener('click', this._handleOutsideClick);
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
      // Navigation links
      const navLink = e.target.closest('[data-route]');
      if (navLink) {
        e.preventDefault();
        const path = navLink.dataset.route;
        const params = navLink.dataset.params ? JSON.parse(navLink.dataset.params) : {};
        this.dispatchEvent(new CustomEvent('navigate', {
          bubbles: true,
          composed: true,
          detail: { path, params }
        }));
        return;
      }

      // Export button
      if (e.target.closest('#export-btn')) {
        this.dispatchEvent(new CustomEvent('export-file', { bubbles: true, composed: true }));
        return;
      }

      // Menu toggle
      if (e.target.closest('.menu-btn')) {
        e.stopPropagation();
        this._menuOpen = !this._menuOpen;
        // Toggle class directly instead of re-rendering to avoid DOM replacement issues
        const dropdown = this.shadowRoot.querySelector('.menu-dropdown');
        if (dropdown) {
          dropdown.classList.toggle('open', this._menuOpen);
        }
        return;
      }

      // Menu actions
      const menuAction = e.target.closest('[data-action]');
      if (menuAction) {
        e.stopPropagation();
        const action = menuAction.dataset.action;
        this.handleMenuAction(action);
        return;
      }
    });
  }

  async handleMenuAction(action) {
    // Close the menu
    this._menuOpen = false;
    const dropdown = this.shadowRoot.querySelector('.menu-dropdown');
    if (dropdown) {
      dropdown.classList.remove('open');
    }

    switch (action) {
      case 'copy-url':
        await copyURL(store);
        this.showFeedback('URL copied!');
        break;

      case 'copy-workspace':
        await this.copyWorkspace();
        break;

      case 'copy-svg':
        this.dispatchEvent(new CustomEvent('copy-svg', { bubbles: true, composed: true }));
        this.showFeedback('SVG copied!');
        break;
    }
  }

  async copyWorkspace() {
    if (this._copying) return;

    const workspaceId = store.get('workspaceId');
    if (!workspaceId) return;

    this._copying = true;

    try {
      const newWorkspace = await workspaceApi.copy(workspaceId);
      const slugId = buildWorkspaceSlugId(newWorkspace.slug, newWorkspace.id);
      navigateTo('/workspace/:slugId', { params: { slugId } });
    } catch (err) {
      console.error('Failed to copy workspace:', err);
      this.showFeedback('Copy failed');
    } finally {
      this._copying = false;
    }
  }

  showFeedback(message) {
    const feedback = this.shadowRoot.querySelector('.copy-feedback');
    if (feedback) {
      feedback.textContent = message;
      feedback.classList.add('visible');
      setTimeout(() => feedback.classList.remove('visible'), 2000);
    }
  }

  updateActiveLink() {
    const currentView = store.get('currentView');
    const links = this.shadowRoot.querySelectorAll('.nav-link[data-route]');

    links.forEach(link => {
      const route = link.dataset.route;
      const isActive = this.isRouteActive(route, currentView);
      link.classList.toggle('active', isActive);
    });
  }

  isRouteActive(route, currentView) {
    const routeToView = {
      '/': 'landing',
      '/workspace/:slugId': 'workspace',
      '/docs': 'docs',
      '/blog': 'blog',
      '/preferences': 'preferences'
    };
    return routeToView[route] === currentView;
  }

  render() {
    const currentView = store.get('currentView');
    const workspaceId = store.get('workspaceId');
    const isWorkspaceView = currentView === 'workspace';
    const hasWorkspace = isWorkspaceView && workspaceId;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <header class="header">
        <div class="logo-section">
          <a class="logo" data-route="/">svg-path-extended</a>
          <span class="version">v1.0</span>
        </div>

        <nav>
          <button class="nav-link ${currentView === 'landing' ? 'active' : ''}" data-route="/">
            Workspaces
          </button>
          <button class="nav-link ${currentView === 'docs' ? 'active' : ''}" data-route="/docs">
            Docs
          </button>
          <button class="nav-link ${currentView === 'blog' ? 'active' : ''}" data-route="/blog">
            Blog
          </button>
          <button class="nav-link ${currentView === 'preferences' ? 'active' : ''}" data-route="/preferences">
            Preferences
          </button>
        </nav>

        <div class="actions">
          ${isWorkspaceView ? `
            <button id="export-btn" class="action-btn" title="Export to file (Ctrl+S)">Export</button>
            <div class="menu-container">
              <button class="menu-btn" title="More actions">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5"/>
                  <circle cx="8" cy="8" r="1.5"/>
                  <circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              <div class="menu-dropdown ${this._menuOpen ? 'open' : ''}">
                <button data-action="copy-url">
                  <svg class="menu-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-1a.5.5 0 011 0v1a2.5 2.5 0 01-2.5 2.5h-7A2.5 2.5 0 012 11.5v-7A2.5 2.5 0 014.5 2h1a.5.5 0 010 1h-1z"/>
                    <path d="M6 5.5A1.5 1.5 0 017.5 4h5A1.5 1.5 0 0114 5.5v5a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 016 10.5v-5z"/>
                  </svg>
                  Copy URL
                </button>
                ${hasWorkspace ? `
                  <button data-action="copy-workspace">
                    <svg class="menu-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 2.5A1.5 1.5 0 014.5 1h5A1.5 1.5 0 0111 2.5v1A1.5 1.5 0 0112.5 5h1A1.5 1.5 0 0115 6.5v7a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 13.5v-1A1.5 1.5 0 013.5 11h-1A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1H3v1.5zM4.5 2a.5.5 0 00-.5.5v7a.5.5 0 00.5.5h1A1.5 1.5 0 017 11.5v1a.5.5 0 00.5.5h5a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5h-1A1.5 1.5 0 0110 3.5v-1a.5.5 0 00-.5-.5h-5z"/>
                    </svg>
                    Copy Workspace
                  </button>
                ` : ''}
                <button data-action="copy-svg">
                  <svg class="menu-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z"/>
                    <path d="M6.5 5a.5.5 0 00-.5.5v5a.5.5 0 001 0V8h1.5a.5.5 0 000-1H7V6h2a.5.5 0 000-1H6.5z"/>
                  </svg>
                  Copy SVG
                </button>
              </div>
              <span class="copy-feedback"></span>
            </div>
          ` : ''}
        </div>
      </header>
    `;

    this.updateActiveLink();
  }

  updateWorkspaceActions() {
    const currentView = store.get('currentView');
    const workspaceId = store.get('workspaceId');
    const isWorkspaceView = currentView === 'workspace';
    const hasWorkspace = isWorkspaceView && workspaceId;

    const actionsContainer = this.shadowRoot.querySelector('.actions');
    if (!actionsContainer) return;

    // Update visibility of workspace-specific actions
    if (isWorkspaceView) {
      actionsContainer.innerHTML = `
        <button id="export-btn" class="action-btn" title="Export to file (Ctrl+S)">Export</button>
        <div class="menu-container">
          <button class="menu-btn" title="More actions">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
          <div class="menu-dropdown">
            <button data-action="copy-url">
              <svg class="menu-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13h7a1.5 1.5 0 001.5-1.5v-1a.5.5 0 011 0v1a2.5 2.5 0 01-2.5 2.5h-7A2.5 2.5 0 012 11.5v-7A2.5 2.5 0 014.5 2h1a.5.5 0 010 1h-1z"/>
                <path d="M6 5.5A1.5 1.5 0 017.5 4h5A1.5 1.5 0 0114 5.5v5a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 016 10.5v-5z"/>
              </svg>
              Copy URL
            </button>
            ${hasWorkspace ? `
              <button data-action="copy-workspace">
                <svg class="menu-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 2.5A1.5 1.5 0 014.5 1h5A1.5 1.5 0 0111 2.5v1A1.5 1.5 0 0112.5 5h1A1.5 1.5 0 0115 6.5v7a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 13.5v-1A1.5 1.5 0 013.5 11h-1A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1H3v1.5zM4.5 2a.5.5 0 00-.5.5v7a.5.5 0 00.5.5h1A1.5 1.5 0 017 11.5v1a.5.5 0 00.5.5h5a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5h-1A1.5 1.5 0 0110 3.5v-1a.5.5 0 00-.5-.5h-5z"/>
                </svg>
                Copy Workspace
              </button>
            ` : ''}
            <button data-action="copy-svg">
              <svg class="menu-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z"/>
                <path d="M6.5 5a.5.5 0 00-.5.5v5a.5.5 0 001 0V8h1.5a.5.5 0 000-1H7V6h2a.5.5 0 000-1H6.5z"/>
              </svg>
              Copy SVG
            </button>
          </div>
          <span class="copy-feedback"></span>
        </div>
      `;
    } else {
      actionsContainer.innerHTML = '';
    }
  }
}

customElements.define('app-header', AppHeader);

export default AppHeader;
