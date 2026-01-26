// Error display banner component

export class ErrorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._message = '';
  }

  static get observedAttributes() {
    return ['message'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'message') {
      this._message = newValue || '';
      this.updateContent();
    }
  }

  get message() {
    return this._message;
  }

  set message(value) {
    this._message = value || '';
    this.setAttribute('message', this._message);
    this.updateContent();
  }

  show(message) {
    this.message = message;
  }

  hide() {
    this.message = '';
  }

  updateContent() {
    const content = this.shadowRoot.querySelector('.content');
    const host = this.shadowRoot.host;

    if (content) {
      content.textContent = this._message;
    }

    if (this._message) {
      this.classList.add('visible');
    } else {
      this.classList.remove('visible');
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          background: var(--error-bg, #fee);
          color: var(--error-text, #c00);
          padding: 12px 20px;
          font-family: var(--font-mono, 'SF Mono', Monaco, monospace);
          font-size: 0.875rem;
          border-top: 1px solid #fcc;
        }

        :host(.visible) {
          display: block;
        }

        .content {
          white-space: pre-wrap;
          word-break: break-word;
        }
      </style>
      <div class="content">${this._message}</div>
    `;
  }
}

customElements.define('error-panel', ErrorPanel);
