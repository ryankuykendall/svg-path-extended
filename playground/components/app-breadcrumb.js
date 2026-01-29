// App Breadcrumb - Contextual navigation trail
// Shows current location: "Workspaces > My Project"

import { store } from '../state/store.js';

const styles = `
  :host {
    display: block;
    background: var(--bg-primary, #ffffff);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    color: var(--text-secondary, #666);
    min-height: 32px;
    box-sizing: border-box;
  }

  .breadcrumb-item {
    display: flex;
    align-items: center;
  }

  .breadcrumb-link {
    color: var(--text-secondary, #666);
    text-decoration: none;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    transition: color 0.15s ease;
  }

  .breadcrumb-link:hover {
    color: var(--accent-color, #0066cc);
    text-decoration: underline;
  }

  .breadcrumb-current {
    color: var(--text-primary, #1a1a1a);
    font-weight: 500;
  }

  .separator {
    margin: 0 0.5rem;
    color: var(--text-tertiary, #999);
    user-select: none;
  }

  .workspace-name {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Hide breadcrumb on landing page */
  :host(.hidden) {
    display: none;
  }

  @media (max-width: 600px) {
    .breadcrumb {
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
    }

    .workspace-name {
      max-width: 120px;
    }
  }
`;

// View display names and parent routes
const viewConfig = {
  landing: {
    label: 'Workspaces',
    parent: null,
    showBreadcrumb: false
  },
  workspace: {
    label: 'Workspace',
    parent: 'landing',
    showBreadcrumb: true
  },
  preferences: {
    label: 'Preferences',
    parent: 'landing',
    showBreadcrumb: true
  },
  docs: {
    label: 'Documentation',
    parent: 'landing',
    showBreadcrumb: true
  },
  storybook: {
    label: 'Component Storybook',
    parent: 'landing',
    showBreadcrumb: true
  },
  'storybook-detail': {
    label: 'Storybook',
    parent: 'landing',
    showBreadcrumb: true
  },
  blog: {
    label: 'Blog',
    parent: 'landing',
    showBreadcrumb: true
  },
  'blog-post': {
    label: 'Blog Post',
    parent: 'blog',
    showBreadcrumb: true
  }
};

class AppBreadcrumb extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();

    // Subscribe to route and workspace changes
    this.unsubscribe = store.subscribe(
      ['currentView', 'routeParams', 'currentFileName', 'workspaces'],
      () => this.render()
    );
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  buildBreadcrumbs() {
    const currentView = store.get('currentView');
    const routeParams = store.get('routeParams') || {};
    const currentFileName = store.get('currentFileName');
    const config = viewConfig[currentView] || viewConfig.landing;

    const crumbs = [];

    // Always start with Workspaces (home)
    crumbs.push({
      label: 'Workspaces',
      route: '/',
      isCurrent: currentView === 'landing'
    });

    // Add current view if not landing
    if (currentView !== 'landing') {
      // For blog-post, add Blog as intermediate crumb
      if (currentView === 'blog-post') {
        crumbs.push({
          label: 'Blog',
          route: '/blog',
          isCurrent: false
        });

        // Get post title from slug (we'll show a readable version)
        const slug = routeParams.slug || 'Post';
        // Convert slug to title case (e.g., "my-post" -> "My Post")
        const label = slug.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        crumbs.push({
          label,
          route: null,
          isCurrent: true
        });
      } else {
        let label = config.label;

        // For workspace, show workspace name if available
        if (currentView === 'workspace') {
          if (routeParams.id && routeParams.id !== 'new') {
            // Try to find workspace name from workspaces list
            const workspaces = store.get('workspaces') || [];
            const workspace = workspaces.find(w => w.id === routeParams.id);
            label = workspace?.name || routeParams.id;
          } else if (currentFileName) {
            label = currentFileName;
          } else {
            label = 'New Workspace';
          }
        }

        crumbs.push({
          label,
          route: null, // Current page, no link
          isCurrent: true
        });
      }
    }

    return crumbs;
  }

  render() {
    const currentView = store.get('currentView');
    const config = viewConfig[currentView] || viewConfig.landing;

    // Hide breadcrumb on landing page
    this.classList.toggle('hidden', !config.showBreadcrumb);

    const crumbs = this.buildBreadcrumbs();

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <nav class="breadcrumb" aria-label="Breadcrumb">
        ${crumbs.map((crumb, index) => `
          <span class="breadcrumb-item">
            ${index > 0 ? '<span class="separator">/</span>' : ''}
            ${crumb.isCurrent
              ? `<span class="breadcrumb-current ${crumb.route === null ? 'workspace-name' : ''}">${crumb.label}</span>`
              : `<button class="breadcrumb-link" data-route="${crumb.route}">${crumb.label}</button>`
            }
          </span>
        `).join('')}
      </nav>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.shadowRoot.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.dataset.route;
        this.dispatchEvent(new CustomEvent('navigate', {
          bubbles: true,
          composed: true,
          detail: { path }
        }));
      });
    });
  }
}

customElements.define('app-breadcrumb', AppBreadcrumb);

export default AppBreadcrumb;
