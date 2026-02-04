// Code editor pane with CodeMirror

import { store } from '../state/store.js';
import { svgPathCompletions } from '../utils/codemirror-setup.js';

export class CodeEditorPane extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._editor = null;
    this._cmModules = null;
    this._initialCode = '';
  }

  connectedCallback() {
    this.render();
    this.loadCodeMirror();
  }

  set initialCode(code) {
    this._initialCode = code;
    if (this._editor) {
      this._editor.dispatch({
        changes: {
          from: 0,
          to: this._editor.state.doc.length,
          insert: code,
        },
      });
    }
  }

  get code() {
    return this._editor ? this._editor.state.doc.toString() : this._initialCode;
  }

  set code(value) {
    if (this._editor) {
      this._editor.dispatch({
        changes: {
          from: 0,
          to: this._editor.state.doc.length,
          insert: value,
        },
      });
    } else {
      this._initialCode = value;
    }
  }

  async loadCodeMirror() {
    if (this._cmModules) return;

    try {
      const [state, view, commands, language, langJs, autocomplete] = await Promise.all([
        import('https://esm.sh/@codemirror/state@6'),
        import('https://esm.sh/@codemirror/view@6'),
        import('https://esm.sh/@codemirror/commands@6'),
        import('https://esm.sh/@codemirror/language@6'),
        import('https://esm.sh/@codemirror/lang-javascript@6'),
        import('https://esm.sh/@codemirror/autocomplete@6'),
      ]);

      this._cmModules = { state, view, commands, language, langJs, autocomplete };
      this.createEditor();
    } catch (err) {
      console.error('Failed to load CodeMirror:', err);
    }
  }

  createEditor() {
    const container = this.shadowRoot.querySelector('#editor-container');
    if (!container || !this._cmModules) return;

    const { state, view, commands, language, langJs, autocomplete } = this._cmModules;

    const updateExtension = view.EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        store.set('isModified', true);
        store.set('code', this._editor.state.doc.toString());
        this.dispatchEvent(new CustomEvent('code-change', {
          bubbles: true,
          composed: true,
          detail: { code: this._editor.state.doc.toString() }
        }));
      }
    });

    const editorState = state.EditorState.create({
      doc: this._initialCode,
      extensions: [
        view.lineNumbers(),
        view.highlightActiveLineGutter(),
        view.highlightSpecialChars(),
        commands.history(),
        view.drawSelection(),
        view.rectangularSelection(),
        view.highlightActiveLine(),
        language.indentOnInput(),
        language.bracketMatching(),
        language.syntaxHighlighting(language.defaultHighlightStyle),
        langJs.javascript(),
        view.keymap.of([
          ...commands.defaultKeymap,
          ...commands.historyKeymap,
          ...autocomplete.completionKeymap,
          commands.indentWithTab,
        ]),
        autocomplete.autocompletion({
          override: [svgPathCompletions],
        }),
        updateExtension,
        view.EditorView.lineWrapping,
      ],
    });

    this._editor = new view.EditorView({
      state: editorState,
      parent: container,
    });

    // Focus the editor
    this._editor.focus();

    this.dispatchEvent(new CustomEvent('editor-ready', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          border-right: 1px solid var(--border-color, #ddd);
          position: relative;
        }

        @media (max-width: 800px) {
          :host {
            border-right: none;
            border-bottom: 1px solid var(--border-color, #ddd);
            min-height: 300px;
          }
        }

        #editor-container {
          flex: 1;
          overflow: auto;
        }

        /* CodeMirror styles */
        #editor-container .cm-editor {
          height: 100%;
          font-size: 14px;
        }

        #editor-container .cm-editor .cm-scroller {
          font-family: var(--font-mono, 'Inconsolata', monospace);
          font-weight: 500;
        }

        #editor-container .cm-editor.cm-focused {
          outline: none;
        }
      </style>

      <div id="editor-container"></div>
    `;
  }
}

customElements.define('code-editor-pane', CodeEditorPane);
