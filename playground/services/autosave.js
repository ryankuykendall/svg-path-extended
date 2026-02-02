// Autosave service for workspace persistence
// Cost-conscious: debounce + minimum interval + content hashing

import { workspaceApi } from './api.js';
import { store } from '../state/store.js';

// Autosave configuration
const DEBOUNCE_MS = 5000;       // 5 seconds after last change
const MIN_INTERVAL_MS = 30000;  // 30 seconds minimum between saves

// Save status enum
export const SaveStatus = {
  IDLE: 'idle',
  MODIFIED: 'modified',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
};

// Simple content hash for dirty checking
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Autosave manager class
class AutosaveManager {
  constructor() {
    this._workspaceId = null;
    this._debounceTimer = null;
    this._lastSaveTime = 0;
    this._lastSavedHash = null;
    this._pendingCode = null;
    this._isEnabled = false;
  }

  // Initialize autosave for a workspace
  init(workspaceId, initialHash = null) {
    this.stop(); // Clean up any previous instance
    this._workspaceId = workspaceId;
    this._lastSavedHash = initialHash;
    this._lastSaveTime = Date.now();
    this._isEnabled = true;

    store.update({
      saveStatus: SaveStatus.IDLE,
      saveError: null,
    });
  }

  // Stop autosave
  stop() {
    this._isEnabled = false;
    this._workspaceId = null;
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    this._pendingCode = null;
  }

  // Called when code changes - triggers debounced save
  onChange(code) {
    if (!this._isEnabled || !this._workspaceId) {
      return;
    }

    this._pendingCode = code;
    store.set('saveStatus', SaveStatus.MODIFIED);

    // Clear existing timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    // Set new debounce timer
    this._debounceTimer = setTimeout(() => {
      this._attemptSave();
    }, DEBOUNCE_MS);
  }

  // Attempt to save (respects minimum interval)
  async _attemptSave() {
    if (!this._isEnabled || !this._workspaceId || this._pendingCode === null) {
      return;
    }

    const now = Date.now();
    const timeSinceLastSave = now - this._lastSaveTime;

    // Check minimum interval
    if (timeSinceLastSave < MIN_INTERVAL_MS) {
      // Reschedule for later
      const delay = MIN_INTERVAL_MS - timeSinceLastSave + 100;
      this._debounceTimer = setTimeout(() => {
        this._attemptSave();
      }, delay);
      return;
    }

    // Check if content actually changed (hash comparison)
    const code = this._pendingCode;
    const newHash = await hashContent(code);

    if (newHash === this._lastSavedHash) {
      // Content unchanged, skip save
      store.set('saveStatus', SaveStatus.SAVED);
      return;
    }

    // Perform save
    await this._doSave(code, newHash);
  }

  // Actually perform the save
  async _doSave(code, hash) {
    if (!this._isEnabled || !this._workspaceId) {
      return;
    }

    store.update({
      saveStatus: SaveStatus.SAVING,
      saveError: null,
    });

    try {
      const result = await workspaceApi.update(this._workspaceId, { code });

      if (result.skipped) {
        // Server said content unchanged
        store.set('saveStatus', SaveStatus.SAVED);
      } else {
        // Save successful
        this._lastSaveTime = Date.now();
        this._lastSavedHash = hash;
        this._pendingCode = null;

        store.update({
          saveStatus: SaveStatus.SAVED,
          workspaceUpdatedAt: result.updatedAt,
        });
      }
    } catch (err) {
      console.error('Autosave failed:', err);
      store.update({
        saveStatus: SaveStatus.ERROR,
        saveError: err.message,
      });

      // Retry after interval
      this._debounceTimer = setTimeout(() => {
        this._pendingCode = code; // Restore pending code
        this._attemptSave();
      }, MIN_INTERVAL_MS);
    }
  }

  // Force immediate save (e.g., before navigation)
  async saveNow() {
    if (!this._isEnabled || !this._workspaceId) {
      return false;
    }

    // Clear debounce timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    const code = this._pendingCode ?? store.get('code');
    if (!code) {
      return true;
    }

    const hash = await hashContent(code);
    if (hash === this._lastSavedHash) {
      return true; // No changes to save
    }

    // Force save regardless of interval
    this._lastSaveTime = 0;
    await this._doSave(code, hash);
    return store.get('saveStatus') !== SaveStatus.ERROR;
  }

  // Get current status
  get isEnabled() {
    return this._isEnabled;
  }

  get workspaceId() {
    return this._workspaceId;
  }
}

// Singleton instance
export const autosave = new AutosaveManager();

export default autosave;
