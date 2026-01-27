// App Header - Top navigation bar
// Contains logo, main navigation links, and user actions

import { store } from '../state/store.js';
import { routeUrl } from '../utils/router.js';

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

  .action-btn:hover {
    border-color: var(--accent-color, #0066cc);
    color: var(--accent-color, #0066cc);
  }

  .action-btn.primary {
    background: var(--accent-color, #0066cc);
    color: white;
    border-color: var(--accent-color, #0066cc);
  }

  .action-btn.primary:hover {
    background: var(--accent-hover, #0052a3);
    border-color: var(--accent-hover, #0052a3);
    color: white;
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
      display: none;
    }
  }
`;

class AppHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Subscribe to route changes to update active nav link
    this.unsubscribe = store.subscribe(['currentView'], () => {
      this.updateActiveLink();
    });
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
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
      }
    });
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
      '/workspace/:id': 'workspace',
      '/docs': 'docs',
      '/preferences': 'preferences'
    };
    return routeToView[route] === currentView;
  }

  render() {
    const currentView = store.get('currentView');

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
          <button class="nav-link ${currentView === 'preferences' ? 'active' : ''}" data-route="/preferences">
            Preferences
          </button>
        </nav>

        <div class="actions">
          <button class="action-btn primary" data-route="/workspace/:id" data-params='{"id":"new"}'>
            + New
          </button>
        </div>
      </header>
    `;

    this.updateActiveLink();
  }
}

customElements.define('app-header', AppHeader);

export default AppHeader;
