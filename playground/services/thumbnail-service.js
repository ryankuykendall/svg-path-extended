// Thumbnail Service - Orchestrates SVG rasterization and upload
// Rasterizes SVG → Web Worker (OffscreenCanvas) → PNG blobs → API upload

import { thumbnailApi } from './api.js';

const SIZES = [1024, 512, 256];
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MIN_AUTO_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes between auto-generations

let worker = null;
let workerReady = false;

// Auto-generation state
let _workspaceId = null;
let _thumbnailContentHash = null; // Last known thumbnail content hash
let _latestContentHash = null; // Current content hash
let _idleTimer = null;
let _lastAutoGenTime = 0;
let _generating = false;

function initWorker() {
  if (worker) return;

  try {
    // Detect path based on environment
    const isDevServer = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const workerPath = isDevServer
      ? '../workers/thumbnail.worker.js'
      : 'workers/thumbnail.worker.js';

    worker = new Worker(new URL(workerPath, import.meta.url), { type: 'module' });
    workerReady = true;

    worker.onerror = (e) => {
      console.warn('Thumbnail worker error:', e.message);
      workerReady = false;
      worker = null;
    };
  } catch (err) {
    console.warn('Failed to create thumbnail worker:', err);
    workerReady = false;
  }
}

/**
 * Process an ImageBitmap through the worker to get PNG blobs at multiple sizes.
 * Falls back to main-thread OffscreenCanvas if worker unavailable.
 */
async function processInWorker(bitmap) {
  initWorker();

  if (worker && workerReady) {
    return new Promise((resolve, reject) => {
      const handler = (e) => {
        worker.removeEventListener('message', handler);
        if (e.data.success) {
          resolve(e.data.results);
        } else {
          reject(new Error(e.data.error || 'Worker processing failed'));
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage({ bitmap, sizes: SIZES }, [bitmap]);
    });
  }

  // Fallback: main-thread OffscreenCanvas
  return processOnMainThread(bitmap);
}

/**
 * Fallback: process on main thread using OffscreenCanvas (or regular canvas).
 */
async function processOnMainThread(bitmap) {
  const results = {};

  for (const size of SIZES) {
    let blob;

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(bitmap, 0, 0, size, size);
      blob = await canvas.convertToBlob({ type: 'image/png' });
    } else {
      // Final fallback: regular canvas
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(bitmap, 0, 0, size, size);
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    results[size] = blob;
  }

  bitmap.close();
  return results;
}

/**
 * Clone an SVG element and remove grid elements (thumbnails always exclude grid).
 */
function cloneSvgWithoutGrid(svgElement) {
  const clone = svgElement.cloneNode(true);

  // Remove grid pattern defs and grid rect
  const defs = clone.querySelector('defs');
  if (defs) {
    const gridPattern = defs.querySelector('pattern[id*="grid"]');
    if (gridPattern) gridPattern.remove();
    // Remove defs if empty
    if (defs.children.length === 0) defs.remove();
  }

  // Remove grid rect (filled with url(#...-grid))
  clone.querySelectorAll('rect[fill^="url(#"]').forEach(rect => {
    const fill = rect.getAttribute('fill');
    if (fill && fill.includes('grid')) {
      rect.remove();
    }
  });

  return clone;
}

/**
 * Generate a thumbnail for a workspace.
 *
 * @param {string} workspaceId - Workspace ID
 * @param {SVGElement} svgElement - The live SVG element to rasterize
 * @param {Object} storeState - Current store state (for canvas dimensions)
 * @param {Object} [cropRegion] - Optional crop region { x, y, size } in SVG coordinates
 * @returns {Promise<{thumbnailAt: string}>}
 */
async function generateThumbnail(workspaceId, svgElement, storeState, cropRegion) {
  if (_generating) {
    console.warn('Thumbnail generation already in progress');
    return null;
  }

  _generating = true;

  try {
    // 1. Clone SVG and remove grid
    const clone = cloneSvgWithoutGrid(svgElement);

    // 2. Determine crop viewBox
    const canvasWidth = storeState.width || 200;
    const canvasHeight = storeState.height || 200;

    if (cropRegion) {
      // User-defined crop
      clone.setAttribute('viewBox', `${cropRegion.x} ${cropRegion.y} ${cropRegion.size} ${cropRegion.size}`);
    } else {
      // Auto center-crop: square crop = min(width, height), centered
      const cropSize = Math.min(canvasWidth, canvasHeight);
      const cropX = (canvasWidth - cropSize) / 2;
      const cropY = (canvasHeight - cropSize) / 2;
      clone.setAttribute('viewBox', `${cropX} ${cropY} ${cropSize} ${cropSize}`);
    }

    // 3. Set size to 1024 for best rasterization quality
    clone.setAttribute('width', '1024');
    clone.setAttribute('height', '1024');

    // 4. Serialize SVG → Blob → object URL
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      // 5. Load Image from URL
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load SVG image'));
        image.src = url;
      });

      // 6. Create ImageBitmap
      const bitmap = await createImageBitmap(img);

      // 7. Process through worker to get PNG blobs
      const blobs = await processInWorker(bitmap);

      // 8. Upload via API
      const result = await thumbnailApi.upload(workspaceId, blobs);

      // 9. Update tracking
      _thumbnailContentHash = _latestContentHash;

      return result;
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    _generating = false;
  }
}

/**
 * Start auto-generation tracking for a workspace.
 */
function startAutoGeneration(workspaceId) {
  stopAutoGeneration();
  _workspaceId = workspaceId;
  _latestContentHash = null;
}

/**
 * Stop auto-generation tracking.
 */
function stopAutoGeneration() {
  _workspaceId = null;
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }
}

/**
 * Set the content hash of the current thumbnail (from workspace metadata).
 */
function setThumbnailContentHash(hash) {
  _thumbnailContentHash = hash;
}

/**
 * Record that content has changed. Resets idle timer.
 */
function onContentChanged(contentHash) {
  _latestContentHash = contentHash;

  // Reset idle timer
  if (_idleTimer) {
    clearTimeout(_idleTimer);
  }

  _idleTimer = setTimeout(() => {
    _idleTimer = null;
    _tryAutoGenerate();
  }, IDLE_TIMEOUT_MS);
}

/**
 * Internal: attempt auto-generation if content is dirty and enough time has passed.
 */
async function _tryAutoGenerate() {
  if (!_workspaceId) return;
  if (_generating) return;
  if (!_isDirty()) return;

  // Rate limit: minimum interval between auto-generations
  const now = Date.now();
  if (now - _lastAutoGenTime < MIN_AUTO_INTERVAL_MS) return;

  // We need an SVG element - dispatch a custom event to request it
  document.dispatchEvent(new CustomEvent('thumbnail-auto-generate', {
    bubbles: true,
    composed: true,
    detail: { workspaceId: _workspaceId },
  }));
}

/**
 * Check if content has changed since last thumbnail.
 */
function _isDirty() {
  if (!_latestContentHash) return false;
  return _latestContentHash !== _thumbnailContentHash;
}

/**
 * Generate thumbnail if content is dirty (called on navigate-away or auto-trigger).
 * Accepts a getter function for the SVG element to avoid stale references.
 *
 * @param {string} workspaceId
 * @param {Function} getSvgElement - () => SVGElement
 * @param {Object} storeState
 * @returns {Promise<void>}
 */
async function generateIfDirty(workspaceId, getSvgElement, storeState) {
  if (!_isDirty()) return;
  if (_generating) return;

  const svgElement = getSvgElement();
  if (!svgElement) return;

  try {
    _lastAutoGenTime = Date.now();
    await generateThumbnail(workspaceId, svgElement, storeState);
  } catch (err) {
    console.warn('Auto thumbnail generation failed:', err);
  }
}

/**
 * Whether a generation is currently in progress.
 */
function isGenerating() {
  return _generating;
}

export default {
  generateThumbnail,
  startAutoGeneration,
  stopAutoGeneration,
  setThumbnailContentHash,
  onContentChanged,
  generateIfDirty,
  isGenerating,
};
