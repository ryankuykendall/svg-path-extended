// Observable state store for playground
// Simple pub/sub pattern - no framework needed

function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Map(); // key -> Set of callbacks

  return {
    get(key) {
      return state[key];
    },

    getAll() {
      return { ...state };
    },

    set(key, value) {
      if (state[key] !== value) {
        state[key] = value;
        this.notify(key);
      }
    },

    update(updates) {
      const changedKeys = [];
      for (const [key, value] of Object.entries(updates)) {
        if (state[key] !== value) {
          state[key] = value;
          changedKeys.push(key);
        }
      }
      changedKeys.forEach(key => this.notify(key));
    },

    subscribe(keys, callback) {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach(key => {
        if (!listeners.has(key)) {
          listeners.set(key, new Set());
        }
        listeners.get(key).add(callback);
      });

      // Return unsubscribe function
      return () => {
        keyArray.forEach(key => {
          listeners.get(key)?.delete(callback);
        });
      };
    },

    notify(key) {
      listeners.get(key)?.forEach(callback => callback(state[key], key));
    },

    // Batch updates without intermediate notifications
    batch(fn) {
      const oldState = { ...state };
      fn(state);
      const changedKeys = Object.keys(state).filter(k => state[k] !== oldState[k]);
      changedKeys.forEach(key => this.notify(key));
    }
  };
}

// Main playground store
export const store = createStore({
  // Routing
  currentRoute: '/',
  currentView: 'landing',
  routeParams: {},        // e.g., { id: 'workspace-123' }
  routeQuery: {},         // e.g., { state: 'base64...' }

  // Workspaces
  workspaces: [],         // Array of saved workspace metadata
  workspacesLoading: false,
  workspacesError: null,

  // Current workspace (loaded from API)
  workspaceId: null,              // ID of current workspace (null = unsaved)
  workspaceName: null,            // Name of current workspace
  workspaceDescription: null,     // Description
  workspaceIsPublic: false,       // Visibility
  workspaceOwnerId: null,         // Owner user ID
  workspaceUpdatedAt: null,       // Last update timestamp

  // Save status for autosave
  saveStatus: 'idle',     // 'idle', 'modified', 'saving', 'saved', 'error'
  saveError: null,        // Error message if save failed

  // User preferences (defaults for new workspaces)
  preferences: {
    width: 200,
    height: 200,
    stroke: '#000000',
    strokeWidth: 2,
    fillEnabled: false,
    fill: '#3498db',
    background: '#f5f5f5',
    gridEnabled: true,
    gridColor: '#cccccc',
    gridSize: 20,
  },

  // Editor
  code: '',
  isModified: false,

  // Compilation results
  pathData: '',
  annotatedOutput: '',
  logs: [],
  error: null,

  // SVG styles
  width: 200,
  height: 200,
  stroke: '#000000',
  strokeWidth: 2,
  fillEnabled: false,
  fill: '#3498db',
  background: '#f5f5f5',
  gridEnabled: true,
  gridColor: '#cccccc',
  gridSize: 20,

  // Zoom/pan
  zoomLevel: 1,
  panX: 0,
  panY: 0,

  // Pane visibility
  annotatedOpen: false,
  consoleOpen: false,
  docsOpen: false,

  // File state
  currentFileName: null,
  currentFileHandle: null,
});

export { createStore };
