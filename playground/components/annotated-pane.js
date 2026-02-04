// Annotated output pane component with read-only CodeMirror

export class AnnotatedPane extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._editor = null;
    this._content = '// Click "Annotated" to view debug output';
    this._cmModules = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.shadowRoot.querySelector('#copy-btn').addEventListener('click', () => {
      this.copyContent();
    });
  }

  get isOpen() {
    return this._isOpen;
  }

  async open() {
    this._isOpen = true;
    this.classList.add('open');

    // Create editor if not exists
    if (!this._editor) {
      await this.createEditor();
    }

    this.dispatchEvent(new CustomEvent('open'));
  }

  close() {
    this._isOpen = false;
    this.classList.remove('open');
    this.dispatchEvent(new CustomEvent('close'));
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  set content(value) {
    this._content = value || '';
    if (this._editor && this._isOpen) {
      this._editor.dispatch({
        changes: {
          from: 0,
          to: this._editor.state.doc.length,
          insert: this._content,
        },
      });
    }
  }

  get content() {
    return this._content;
  }

  async loadCodeMirror() {
    if (this._cmModules) return this._cmModules;

    const [state, view, language, langJs] = await Promise.all([
      import('https://esm.sh/@codemirror/state@6'),
      import('https://esm.sh/@codemirror/view@6'),
      import('https://esm.sh/@codemirror/language@6'),
      import('https://esm.sh/@codemirror/lang-javascript@6'),
    ]);

    this._cmModules = { state, view, language, langJs };
    return this._cmModules;
  }

  async createEditor() {
    const container = this.shadowRoot.querySelector('#editor-container');
    if (!container) return;

    const { state, view, language, langJs } = await this.loadCodeMirror();

    const editorState = state.EditorState.create({
      doc: this._content,
      extensions: [
        view.lineNumbers(),
        view.highlightSpecialChars(),
        view.drawSelection(),
        view.highlightActiveLine(),
        language.syntaxHighlighting(language.defaultHighlightStyle),
        langJs.javascript(),
        view.EditorView.lineWrapping,
        state.EditorState.readOnly.of(true),
        view.EditorView.editable.of(false),
      ],
    });

    this._editor = new view.EditorView({
      state: editorState,
      parent: container,
    });
  }

  async copyContent() {
    const text = this._editor ? this._editor.state.doc.toString() : this._content;

    try {
      await navigator.clipboard.writeText(text);
      const btn = this.shadowRoot.querySelector('#copy-btn');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          flex: 0 0 0;
          display: flex;
          flex-direction: column;
          min-width: 0;
          border-right: 1px solid var(--border-color, #ddd);
          position: relative;
          overflow: hidden;
          transition: flex-basis 0.3s ease;
        }

        :host(.open) {
          flex: 1 1 0;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: var(--bg-secondary, #f5f5f5);
          border-bottom: 1px solid var(--border-color, #ddd);
          font-size: 0.75rem;
          color: var(--text-secondary, #666);
        }

        .header span {
          font-weight: 500;
        }

        .copy-btn {
          padding: 4px 10px;
          font-size: 0.75rem;
          font-family: inherit;
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          cursor: pointer;
          opacity: 1;
          transition: opacity 0.15s;
        }

        .copy-btn:hover {
          background: var(--bg-secondary, #f5f5f5);
        }

        .copy-btn.copied {
          background: var(--success-color, #28a745);
          border-color: var(--success-color, #28a745);
          color: white;
        }

        #editor-container {
          flex: 1;
          overflow: auto;
          background: var(--bg-primary, #ffffff);
        }

        #editor-container .cm-editor {
          height: 100%;
          font-size: 13px;
          background: var(--bg-primary, #ffffff);
        }

        #editor-container .cm-editor .cm-content {
          cursor: default;
        }

        #editor-container .cm-editor .cm-scroller {
          font-family: var(--font-mono, 'Inconsolata', monospace);
          font-weight: 500;
        }

        #editor-container .cm-editor.cm-focused {
          outline: none;
        }

        @media (max-width: 800px) {
          :host {
            flex-basis: 0;
            border-right: none;
            border-bottom: 1px solid var(--border-color, #ddd);
          }

          :host(.open) {
            flex: 0 0 200px;
          }
        }
      </style>

      <div class="header">
        <span>Annotated Output</span>
        <button id="copy-btn" class="copy-btn">Copy</button>
      </div>
      <div id="editor-container"></div>
    `;
  }
}

customElements.define('annotated-pane', AnnotatedPane);
