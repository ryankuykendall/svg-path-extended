// New Workspace View - Form for creating new workspaces
// Route: /workspace/new

import { store } from '../../state/store.js';
import { workspaceApi } from '../../services/api.js';
import { examples, defaultCode } from '../../utils/examples.js';
import { navigateTo, buildWorkspaceSlugId } from '../../utils/router.js';

const styles = `
  :host {
    display: block;
    padding: 2rem;
    overflow-y: auto;
    background: var(--bg-primary, #ffffff);
  }

  .form-container {
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

  .form-section {
    margin-bottom: 1.5rem;
  }

  .form-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #1a1a1a);
  }

  .form-group .hint {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-tertiary, #999);
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: inherit;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #1a1a1a);
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent-color, #0066cc);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .form-group input.error,
  .form-group textarea.error {
    border-color: var(--error-color, #dc3545);
  }

  .form-group textarea {
    min-height: 80px;
    resize: vertical;
  }

  .inline-group {
    display: flex;
    gap: 1rem;
  }

  .inline-group .form-group {
    flex: 1;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .checkbox-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .checkbox-group label {
    margin-bottom: 0;
    cursor: pointer;
  }

  .error-message {
    color: var(--error-color, #dc3545);
    font-size: 0.8125rem;
    margin-top: 0.25rem;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .primary-btn {
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

  .primary-btn:hover:not(:disabled) {
    background: var(--accent-hover, #0052a3);
  }

  .primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .secondary-btn {
    padding: 0.625rem 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #1a1a1a);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .secondary-btn:hover {
    background: var(--bg-primary, #ffffff);
    border-color: var(--text-secondary, #666);
  }

  .template-preview {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    max-height: 150px;
    overflow-y: auto;
    white-space: pre-wrap;
    color: var(--text-secondary, #666);
  }

  .template-preview.hidden {
    display: none;
  }

  @media (max-width: 600px) {
    :host {
      padding: 1rem;
    }

    .inline-group {
      flex-direction: column;
      gap: 0;
    }

    .actions {
      flex-direction: column;
    }
  }
`;

class NewWorkspaceView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._unsubscribe = null;
    this._isSubmitting = false;

    // Form state
    this.formData = {
      name: '',
      description: '',
      width: 200,
      height: 200,
      template: '',
      isPublic: false,
    };
    this.errors = {};
  }

  connectedCallback() {
    this.loadPreferences();
    this.render();
    this.setupEventListeners();

    // Subscribe to route changes to reset form when navigating back
    this._unsubscribe = store.subscribe(['currentView'], () => {
      if (store.get('currentView') === 'new-workspace') {
        this.loadPreferences();
        this.resetForm();
      }
    });
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  loadPreferences() {
    const prefs = store.get('preferences') || {};
    this.formData.width = prefs.width || 200;
    this.formData.height = prefs.height || 200;
  }

  resetForm() {
    this.formData = {
      name: '',
      description: '',
      width: this.formData.width,
      height: this.formData.height,
      template: '',
      isPublic: false,
    };
    this.errors = {};
    this.render();
  }

  validate() {
    this.errors = {};

    if (!this.formData.name.trim()) {
      this.errors.name = 'Workspace name is required';
    } else if (this.formData.name.trim().length > 100) {
      this.errors.name = 'Name must be 100 characters or less';
    }

    if (this.formData.description.length > 500) {
      this.errors.description = 'Description must be 500 characters or less';
    }

    if (this.formData.width < 50 || this.formData.width > 2000) {
      this.errors.width = 'Width must be between 50 and 2000';
    }

    if (this.formData.height < 50 || this.formData.height > 2000) {
      this.errors.height = 'Height must be between 50 and 2000';
    }

    return Object.keys(this.errors).length === 0;
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this._isSubmitting) return;
    if (!this.validate()) {
      this.render();
      return;
    }

    this._isSubmitting = true;
    this.render();

    try {
      // Get code based on template selection (empty string if no template selected)
      const code = this.formData.template
        ? examples[this.formData.template]
        : '';

      // Get user preferences for other settings
      const prefs = store.get('preferences') || {};

      const workspace = await workspaceApi.create({
        name: this.formData.name.trim(),
        description: this.formData.description.trim(),
        code,
        isPublic: this.formData.isPublic,
        preferences: {
          width: this.formData.width,
          height: this.formData.height,
          stroke: prefs.stroke || '#000000',
          strokeWidth: prefs.strokeWidth || 2,
          fillEnabled: prefs.fillEnabled || false,
          fill: prefs.fill || '#3498db',
          background: prefs.background || '#f5f5f5',
          gridEnabled: prefs.gridEnabled !== false,
          gridColor: prefs.gridColor || '#cccccc',
          gridSize: prefs.gridSize || 20,
        },
      });

      // Navigate to the new workspace (with slug--id format)
      const slugId = buildWorkspaceSlugId(workspace.slug, workspace.id);
      navigateTo('/workspace/:slugId', { params: { slugId } });
    } catch (err) {
      console.error('Failed to create workspace:', err);
      this.errors.submit = err.message || 'Failed to create workspace';
      this.render();
    } finally {
      this._isSubmitting = false;
    }
  }

  handleCancel() {
    navigateTo('/');
  }

  setupEventListeners() {
    const form = this.shadowRoot.querySelector('form');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Input changes
    form.addEventListener('input', (e) => {
      const { name, value, type, checked } = e.target;

      if (type === 'checkbox') {
        this.formData[name] = checked;
      } else if (type === 'number') {
        this.formData[name] = parseInt(value, 10) || 0;
      } else {
        this.formData[name] = value;
      }

      // Clear error on change
      if (this.errors[name]) {
        delete this.errors[name];
        this.updateFieldError(name);
      }

      // Update template preview
      if (name === 'template') {
        this.updateTemplatePreview();
      }
    });

    // Cancel button
    this.shadowRoot.querySelector('.secondary-btn')?.addEventListener('click', () => {
      this.handleCancel();
    });
  }

  updateFieldError(fieldName) {
    const input = this.shadowRoot.querySelector(`[name="${fieldName}"]`);
    const errorEl = this.shadowRoot.querySelector(`#${fieldName}-error`);

    if (input) {
      input.classList.toggle('error', !!this.errors[fieldName]);
    }
    if (errorEl) {
      errorEl.textContent = this.errors[fieldName] || '';
    }
  }

  updateTemplatePreview() {
    const preview = this.shadowRoot.querySelector('.template-preview');
    if (!preview) return;

    if (this.formData.template && examples[this.formData.template]) {
      preview.textContent = examples[this.formData.template];
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  }

  render() {
    const templateOptions = Object.keys(examples).map(key => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<option value="${key}" ${this.formData.template === key ? 'selected' : ''}>${label}</option>`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="form-container">
        <h1>New Workspace</h1>
        <p class="subtitle">Create a new workspace to start building SVG paths</p>

        <form>
          <div class="form-section">
            <h2>Details</h2>

            <div class="form-group">
              <label for="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value="${this.escapeHtml(this.formData.name)}"
                placeholder="My Awesome Pattern"
                class="${this.errors.name ? 'error' : ''}"
                autofocus
              >
              <span id="name-error" class="error-message">${this.errors.name || ''}</span>
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Optional description of your workspace"
                class="${this.errors.description ? 'error' : ''}"
              >${this.escapeHtml(this.formData.description)}</textarea>
              <span id="description-error" class="error-message">${this.errors.description || ''}</span>
              <span class="hint">Brief description of what this workspace contains</span>
            </div>
          </div>

          <div class="form-section">
            <h2>Canvas Size</h2>

            <div class="inline-group">
              <div class="form-group">
                <label for="width">Width (px)</label>
                <input
                  type="number"
                  id="width"
                  name="width"
                  value="${this.formData.width}"
                  min="50"
                  max="2000"
                  class="${this.errors.width ? 'error' : ''}"
                >
                <span id="width-error" class="error-message">${this.errors.width || ''}</span>
              </div>

              <div class="form-group">
                <label for="height">Height (px)</label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value="${this.formData.height}"
                  min="50"
                  max="2000"
                  class="${this.errors.height ? 'error' : ''}"
                >
                <span id="height-error" class="error-message">${this.errors.height || ''}</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Starting Template</h2>

            <div class="form-group">
              <label for="template">Start from example</label>
              <select id="template" name="template">
                <option value="">Empty workspace</option>
                ${templateOptions}
              </select>
              <span class="hint">Choose an example to start with, or begin with an empty workspace</span>
            </div>

            <div class="template-preview ${this.formData.template ? '' : 'hidden'}">
              ${this.formData.template ? this.escapeHtml(examples[this.formData.template] || '') : ''}
            </div>
          </div>

          <div class="form-section">
            <h2>Visibility</h2>

            <div class="form-group">
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  ${this.formData.isPublic ? 'checked' : ''}
                >
                <label for="isPublic">Make this workspace public</label>
              </div>
              <span class="hint">Public workspaces can be viewed by anyone with the link</span>
            </div>
          </div>

          ${this.errors.submit ? `
            <div class="error-message" style="margin-bottom: 1rem;">
              ${this.escapeHtml(this.errors.submit)}
            </div>
          ` : ''}

          <div class="actions">
            <button type="submit" class="primary-btn" ${this._isSubmitting ? 'disabled' : ''}>
              ${this._isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
            <button type="button" class="secondary-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    this.setupEventListeners();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('new-workspace-view', NewWorkspaceView);

export default NewWorkspaceView;
