// SVG Preview pane with zoom/pan controls and navigator

import { store } from '../state/store.js';
import './layers-panel.js';

export class SvgPreviewPane extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Zoom/pan constants
    this.MIN_ZOOM = 0.25;
    this.MAX_ZOOM = 10;
    this.ZOOM_STEP = 1.5;

    // Pan state
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Navigator drag state
    this.isNavigatorDragging = false;
    this.navDragStartX = 0;
    this.navDragStartY = 0;
    this.navDragStartPanX = 0;
    this.navDragStartPanY = 0;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.subscribeToStore();
    this.updateSvgStyles();
  }

  subscribeToStore() {
    store.subscribe(['width', 'height', 'stroke', 'strokeWidth', 'fillEnabled', 'fill', 'background', 'gridEnabled', 'gridColor', 'gridSize', 'zoomLevel', 'panX', 'panY', 'pathData'], () => {
      this.updateSvgStyles();
    });
    store.subscribe('layerVisibility', () => {
      this.applyLayerVisibility();
      this.updateNavigatorContent();
    });
  }

  get preview() {
    return this.shadowRoot.querySelector('#preview');
  }

  get previewPath() {
    return this.shadowRoot.querySelector('#preview-path');
  }

  get previewContainer() {
    return this.shadowRoot.querySelector('#preview-container');
  }

  set pathData(value) {
    store.set('pathData', value || '');
    this.previewPath.setAttribute('d', value || '');
    this.updateNavigatorContent();
  }

  /**
   * Set path data and measure rendering time using forced layout calculation.
   * @param {string} value - The path data to set
   * @returns {number} The rendering time in milliseconds
   */
  setPathDataWithTiming(value) {
    store.set('pathData', value || '');

    const start = performance.now();
    this.previewPath.setAttribute('d', value || '');

    // Force synchronous layout calculation
    // getBBox() requires the browser to calculate the path geometry
    try {
      this.previewPath.getBBox();
    } catch (e) {
      // getBBox can throw if path is empty or invalid
    }

    const renderTime = performance.now() - start;

    this.updateNavigatorContent();

    return renderTime;
  }

  /**
   * Set layers and measure rendering time.
   * Renders multiple <path> elements for multi-layer output.
   * @param {Array<{name: string, type: string, data: string, styles: Record<string, string>, isDefault: boolean}>} layers
   * @returns {number} The rendering time in milliseconds
   */
  setLayersWithTiming(layers) {
    const defaultData = layers[0]?.data || '';
    store.set('pathData', defaultData);

    const start = performance.now();

    // Get the layers container
    const layersGroup = this.shadowRoot.querySelector('#preview-layers');
    if (layersGroup) {
      // Clear existing layer paths
      layersGroup.innerHTML = '';

      const SVG_NS = 'http://www.w3.org/2000/svg';
      for (const layer of layers) {
        if (layer.type === 'text' && layer.textElements) {
          for (const te of layer.textElements) {
            const textEl = document.createElementNS(SVG_NS, 'text');
            textEl.dataset.layerName = layer.name;
            textEl.setAttribute('x', String(te.x));
            textEl.setAttribute('y', String(te.y));
            if (te.rotation != null) {
              const deg = te.rotation * 180 / Math.PI;
              textEl.setAttribute('transform', `rotate(${deg}, ${te.x}, ${te.y})`);
            }
            for (const [key, value] of Object.entries(layer.styles)) {
              textEl.setAttribute(key, value);
            }
            for (const child of te.children) {
              if (child.type === 'run') {
                textEl.appendChild(document.createTextNode(child.text));
              } else {
                const tspan = document.createElementNS(SVG_NS, 'tspan');
                tspan.textContent = child.text;
                if (child.dx != null) tspan.setAttribute('dx', String(child.dx));
                if (child.dy != null) tspan.setAttribute('dy', String(child.dy));
                if (child.rotation != null) tspan.setAttribute('rotate', String(child.rotation * 180 / Math.PI));
                textEl.appendChild(tspan);
              }
            }
            layersGroup.appendChild(textEl);
          }
          continue;
        }
        const path = document.createElementNS(SVG_NS, 'path');
        path.dataset.layerName = layer.name;
        path.setAttribute('d', layer.data || '');
        path.setAttribute('fill', 'none');

        // Apply per-layer styles, fall back to store defaults
        const state = store.getAll();
        const hasCustomStroke = !!layer.styles['stroke'];
        const hasCustomStrokeWidth = !!layer.styles['stroke-width'];
        path.setAttribute('stroke', layer.styles['stroke'] || state.stroke);
        path.setAttribute('stroke-width', layer.styles['stroke-width'] || state.strokeWidth);
        // Mark per-layer styles so updateSvgStyles() won't overwrite them
        if (hasCustomStroke) path.dataset.hasLayerStroke = 'true';
        if (hasCustomStrokeWidth) path.dataset.hasLayerStrokeWidth = 'true';
        if (layer.styles['fill']) {
          path.setAttribute('fill', layer.styles['fill']);
        } else {
          path.setAttribute('fill', state.fillEnabled ? state.fill : 'none');
        }
        // Apply any additional style attributes
        for (const [key, value] of Object.entries(layer.styles)) {
          if (key !== 'stroke' && key !== 'stroke-width' && key !== 'fill') {
            path.setAttribute(key, value);
          }
        }
        layersGroup.appendChild(path);
      }

      // Hide the single preview-path when using layers group
      this.previewPath.setAttribute('d', '');
    } else {
      // Fallback: single path
      this.previewPath.setAttribute('d', defaultData);
    }

    // Force synchronous layout calculation
    try {
      const paths = layersGroup?.querySelectorAll('path') || [this.previewPath];
      for (const p of paths) {
        p.getBBox();
      }
    } catch (e) {
      // getBBox can throw if path is empty or invalid
    }

    const renderTime = performance.now() - start;

    this.applyLayerVisibility();
    this.updateNavigatorContent();

    return renderTime;
  }

  applyLayerVisibility() {
    const layersGroup = this.shadowRoot.querySelector('#preview-layers');
    if (!layersGroup) return;
    const visibility = store.get('layerVisibility');

    for (const el of layersGroup.children) {
      const name = el.dataset.layerName;
      if (name && visibility[name] === false) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    }
  }

  clear() {
    this.previewPath.setAttribute('d', '');
    const layersGroup = this.shadowRoot.querySelector('#preview-layers');
    if (layersGroup) layersGroup.innerHTML = '';
    store.set('pathData', '');
    this.shadowRoot.querySelector('#navigator-path').setAttribute('d', '');
    store.update({ zoomLevel: 1, panX: 0, panY: 0 });
    this.updateViewBox();
  }

  showLoading() {
    this.shadowRoot.querySelector('#loading-overlay').style.display = 'flex';
  }

  hideLoading() {
    this.shadowRoot.querySelector('#loading-overlay').style.display = 'none';
  }

  // Zoom/Pan methods
  updateViewBox() {
    const width = store.get('width');
    const height = store.get('height');
    let zoomLevel = store.get('zoomLevel');
    let panX = store.get('panX');
    let panY = store.get('panY');

    const viewWidth = width / zoomLevel;
    const viewHeight = height / zoomLevel;

    // Clamp pan values
    const maxPanX = Math.max(0, width - viewWidth);
    const maxPanY = Math.max(0, height - viewHeight);
    panX = Math.max(0, Math.min(panX, maxPanX));
    panY = Math.max(0, Math.min(panY, maxPanY));

    // Update store with clamped values
    store.update({ panX, panY });

    this.preview.setAttribute('viewBox', `${panX} ${panY} ${viewWidth} ${viewHeight}`);

    // Update zoom level display
    const zoomDisplay = this.shadowRoot.querySelector('#zoom-level');
    if (zoomDisplay) {
      zoomDisplay.value = `${Math.round(zoomLevel * 100)}%`;
    }

    this.updateNavigatorViewport();
    this.previewContainer.classList.toggle('can-pan', zoomLevel > 1);
  }

  adjustPanForZoom(oldZoom, newZoom) {
    const width = store.get('width');
    const height = store.get('height');
    let panX = store.get('panX');
    let panY = store.get('panY');

    const oldViewWidth = width / oldZoom;
    const oldViewHeight = height / oldZoom;
    const centerX = panX + oldViewWidth / 2;
    const centerY = panY + oldViewHeight / 2;

    const newViewWidth = width / newZoom;
    const newViewHeight = height / newZoom;

    store.update({
      panX: centerX - newViewWidth / 2,
      panY: centerY - newViewHeight / 2
    });
  }

  zoomIn() {
    const oldZoom = store.get('zoomLevel');
    const newZoom = Math.min(this.MAX_ZOOM, oldZoom * this.ZOOM_STEP);
    this.adjustPanForZoom(oldZoom, newZoom);
    store.set('zoomLevel', newZoom);
    this.updateViewBox();
  }

  zoomOut() {
    const oldZoom = store.get('zoomLevel');
    const newZoom = Math.max(this.MIN_ZOOM, oldZoom / this.ZOOM_STEP);
    this.adjustPanForZoom(oldZoom, newZoom);
    store.set('zoomLevel', newZoom);
    this.updateViewBox();
  }

  zoomFit() {
    store.update({ zoomLevel: 1, panX: 0, panY: 0 });
    this.updateViewBox();
  }

  // Pan handling
  startPan(e) {
    if (store.get('zoomLevel') <= 1) return;
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.previewContainer.classList.add('panning');
    e.preventDefault();
  }

  doPan(e) {
    if (!this.isPanning) return;

    const width = store.get('width');
    const height = store.get('height');
    const zoomLevel = store.get('zoomLevel');
    const rect = this.preview.getBoundingClientRect();

    const scaleX = (width / zoomLevel) / rect.width;
    const scaleY = (height / zoomLevel) / rect.height;

    const dx = (this.panStartX - e.clientX) * scaleX;
    const dy = (this.panStartY - e.clientY) * scaleY;

    store.update({
      panX: store.get('panX') + dx,
      panY: store.get('panY') + dy
    });

    this.panStartX = e.clientX;
    this.panStartY = e.clientY;

    this.updateViewBox();
  }

  endPan() {
    this.isPanning = false;
    this.previewContainer.classList.remove('panning');
  }

  // Navigator methods
  updateNavigatorViewport() {
    const width = store.get('width');
    const height = store.get('height');
    const zoomLevel = store.get('zoomLevel');
    const panX = store.get('panX');
    const panY = store.get('panY');

    const viewWidth = width / zoomLevel;
    const viewHeight = height / zoomLevel;

    const viewport = this.shadowRoot.querySelector('#navigator-viewport');
    viewport.setAttribute('x', panX);
    viewport.setAttribute('y', panY);
    viewport.setAttribute('width', viewWidth);
    viewport.setAttribute('height', viewHeight);
  }

  updateNavigatorContent() {
    const navPath = this.shadowRoot.querySelector('#navigator-path');
    const navBg = this.shadowRoot.querySelector('#navigator-bg');
    const navSvg = this.shadowRoot.querySelector('#navigator-svg');

    // Combine all visible layer paths for navigator display (skip text elements and hidden layers)
    const layersGroup = this.shadowRoot.querySelector('#preview-layers');
    const layerPaths = layersGroup
      ? Array.from(layersGroup.querySelectorAll('path')).filter(p => p.style.display !== 'none')
      : [];
    if (layerPaths.length > 0) {
      const combined = layerPaths.map(p => p.getAttribute('d') || '').filter(Boolean).join(' ');
      navPath.setAttribute('d', combined);
    } else {
      navPath.setAttribute('d', this.previewPath.getAttribute('d') || '');
    }
    navPath.setAttribute('stroke', store.get('stroke'));
    navPath.setAttribute('stroke-width', 1);

    const width = store.get('width');
    const height = store.get('height');

    const navWidth = 120;
    const navHeight = 120;
    const scale = Math.min(navWidth / width, navHeight / height) * 0.9;
    const offsetX = (navWidth - width * scale) / 2;
    const offsetY = (navHeight - height * scale) / 2;

    navSvg.setAttribute('viewBox', `${-offsetX / scale} ${-offsetY / scale} ${navWidth / scale} ${navHeight / scale}`);
    navBg.setAttribute('fill', store.get('background'));
    navBg.setAttribute('x', 0);
    navBg.setAttribute('y', 0);
    navBg.setAttribute('width', width);
    navBg.setAttribute('height', height);

    this.updateNavigatorViewport();
  }

  screenToNavigatorSVG(clientX, clientY) {
    const navSvg = this.shadowRoot.querySelector('#navigator-svg');
    const pt = navSvg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(navSvg.getScreenCTM().inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  navigatorMouseDown(e) {
    e.preventDefault();
    const { x: svgX, y: svgY } = this.screenToNavigatorSVG(e.clientX, e.clientY);
    const width = store.get('width');
    const height = store.get('height');
    const zoomLevel = store.get('zoomLevel');
    const panX = store.get('panX');
    const panY = store.get('panY');

    const viewWidth = width / zoomLevel;
    const viewHeight = height / zoomLevel;
    const inViewport = svgX >= panX && svgX <= panX + viewWidth &&
                       svgY >= panY && svgY <= panY + viewHeight;

    if (inViewport) {
      this.isNavigatorDragging = true;
      this.navDragStartX = svgX;
      this.navDragStartY = svgY;
      this.navDragStartPanX = panX;
      this.navDragStartPanY = panY;
    } else {
      store.update({
        panX: svgX - viewWidth / 2,
        panY: svgY - viewHeight / 2
      });
      this.updateViewBox();
    }
  }

  navigatorMouseMove(e) {
    if (!this.isNavigatorDragging) return;

    const { x: svgX, y: svgY } = this.screenToNavigatorSVG(e.clientX, e.clientY);

    store.update({
      panX: this.navDragStartPanX + (svgX - this.navDragStartX),
      panY: this.navDragStartPanY + (svgY - this.navDragStartY)
    });

    this.updateViewBox();
  }

  navigatorMouseUp() {
    this.isNavigatorDragging = false;
  }

  navigatorDoubleClick(e) {
    e.preventDefault();
    const { x: svgX, y: svgY } = this.screenToNavigatorSVG(e.clientX, e.clientY);
    const width = store.get('width');
    const height = store.get('height');
    const zoomLevel = store.get('zoomLevel');

    const viewWidth = width / zoomLevel;
    const viewHeight = height / zoomLevel;

    store.update({
      panX: svgX - viewWidth / 2,
      panY: svgY - viewHeight / 2
    });

    this.updateViewBox();
  }

  updateSvgStyles() {
    const state = store.getAll();

    this.preview.setAttribute('width', state.width);
    this.preview.setAttribute('height', state.height);

    this.updateViewBox();

    this.previewPath.setAttribute('stroke', state.stroke);
    this.previewPath.setAttribute('stroke-width', state.strokeWidth);
    this.previewPath.setAttribute('fill', state.fillEnabled ? state.fill : 'none');

    // Update layer paths that don't have per-layer styles
    const layersGroup = this.shadowRoot.querySelector('#preview-layers');
    if (layersGroup) {
      for (const path of layersGroup.querySelectorAll('path')) {
        // Only update defaults — per-layer styles are set in setLayersWithTiming
        if (!path.dataset.hasLayerStroke) {
          path.setAttribute('stroke', state.stroke);
        }
        if (!path.dataset.hasLayerStrokeWidth) {
          path.setAttribute('stroke-width', state.strokeWidth);
        }
      }
    }

    const previewBg = this.shadowRoot.querySelector('#preview-bg');
    previewBg.setAttribute('fill', state.background);
    previewBg.setAttribute('x', 0);
    previewBg.setAttribute('y', 0);
    previewBg.setAttribute('width', state.width);
    previewBg.setAttribute('height', state.height);

    // Grid
    const gridPattern = this.shadowRoot.querySelector('#grid-pattern');
    const gridPath = this.shadowRoot.querySelector('#grid-path');
    const previewGrid = this.shadowRoot.querySelector('#preview-grid');

    gridPattern.setAttribute('width', state.gridSize);
    gridPattern.setAttribute('height', state.gridSize);
    gridPath.setAttribute('d', `M ${state.gridSize} 0 L 0 0 0 ${state.gridSize}`);
    gridPath.setAttribute('stroke', state.gridColor);
    previewGrid.style.display = state.gridEnabled ? 'block' : 'none';
    previewGrid.setAttribute('x', 0);
    previewGrid.setAttribute('y', 0);
    previewGrid.setAttribute('width', state.width);
    previewGrid.setAttribute('height', state.height);

    this.updateNavigatorContent();
  }

  setupEventListeners() {

    // Zoom controls
    this.shadowRoot.querySelector('#zoom-in').addEventListener('click', () => this.zoomIn());
    this.shadowRoot.querySelector('#zoom-out').addEventListener('click', () => this.zoomOut());
    this.shadowRoot.querySelector('#zoom-fit').addEventListener('click', () => this.zoomFit());

    // Zoom level input
    const zoomInput = this.shadowRoot.querySelector('#zoom-level');
    zoomInput.addEventListener('change', (e) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value) && value >= this.MIN_ZOOM * 100 && value <= this.MAX_ZOOM * 100) {
        const oldZoom = store.get('zoomLevel');
        const newZoom = value / 100;
        this.adjustPanForZoom(oldZoom, newZoom);
        store.set('zoomLevel', newZoom);
        this.updateViewBox();
      } else {
        e.target.value = `${Math.round(store.get('zoomLevel') * 100)}%`;
      }
    });

    zoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 0.25 : 0.05;
        const direction = e.key === 'ArrowUp' ? 1 : -1;

        const oldZoom = store.get('zoomLevel');
        const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, oldZoom + (step * direction)));
        this.adjustPanForZoom(oldZoom, newZoom);
        store.set('zoomLevel', newZoom);
        this.updateViewBox();
      }
    });

    // Mouse wheel zoom
    this.previewContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dampening = 0.002;
      const delta = -e.deltaY * dampening;

      const oldZoom = store.get('zoomLevel');
      const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, oldZoom * (1 + delta)));

      this.adjustPanForZoom(oldZoom, newZoom);
      store.set('zoomLevel', newZoom);
      this.updateViewBox();
    }, { passive: false });

    // Pan via drag
    this.previewContainer.addEventListener('mousedown', (e) => this.startPan(e));
    document.addEventListener('mousemove', (e) => this.doPan(e));
    document.addEventListener('mouseup', () => this.endPan());

    // Navigator
    const navSvg = this.shadowRoot.querySelector('#navigator-svg');
    navSvg.addEventListener('mousedown', (e) => this.navigatorMouseDown(e));
    navSvg.addEventListener('dblclick', (e) => this.navigatorDoubleClick(e));
    document.addEventListener('mousemove', (e) => this.navigatorMouseMove(e));
    document.addEventListener('mouseup', () => this.navigatorMouseUp());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: var(--bg-primary, #f8f9fa);
          min-width: 0;
          overflow: auto;
          position: relative;
        }

        @media (max-width: 800px) {
          :host {
            min-height: 250px;
            padding: 1rem;
          }
        }

        layers-panel {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 10;
        }

        #preview-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        #preview {
          display: block;
          max-width: 100%;
          max-height: 100%;
        }

        #preview-container.can-pan {
          cursor: grab;
        }

        #preview-container.panning {
          cursor: grabbing;
        }

        /* Navigator */
        #zoom-navigator {
          position: absolute;
          top: 1rem;
          left: 1rem;
          width: 120px;
          height: 120px;
          background: var(--bg-elevated, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          z-index: 10;
        }

        #navigator-svg {
          width: 100%;
          height: 100%;
        }

        #navigator-viewport {
          cursor: move;
          fill: var(--accent-subtle, rgba(16, 185, 129, 0.15));
        }

        /* Zoom controls */
        #zoom-controls {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-elevated, #ffffff);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-lg, 12px);
          border: 1px solid var(--border-color, #e2e8f0);
          box-shadow: var(--shadow-lg);
          z-index: 10;
        }

        #zoom-controls button {
          width: 32px;
          height: 32px;
          padding: 0;
          display: grid;
          place-items: center;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-md, 8px);
          background: var(--bg-secondary, #ffffff);
          color: var(--text-primary, #1a1a2e);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          transition: all var(--transition-base, 0.15s ease);
        }

        #zoom-controls button:hover {
          background: var(--hover-bg, rgba(0, 0, 0, 0.04));
          border-color: var(--accent-color, #10b981);
          color: var(--accent-color, #10b981);
        }

        #zoom-in,
        #zoom-out {
          font-size: 1.25rem;
          font-weight: 400;
          line-height: 0;
        }

        #zoom-fit {
          font-size: 0.8125rem;
          font-weight: 500;
        }

        #zoom-level {
          width: 56px;
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-md, 8px);
          font-size: 0.75rem;
          font-family: var(--font-mono, 'Inconsolata', monospace);
          font-weight: 500;
          text-align: center;
          background: var(--bg-secondary, #ffffff);
          color: var(--text-primary, #1a1a2e);
          transition: all var(--transition-base, 0.15s ease);
        }

        #zoom-level:focus {
          outline: none;
          border-color: var(--accent-color, #10b981);
          box-shadow: 0 0 0 3px var(--focus-ring, rgba(16, 185, 129, 0.4));
        }

        #loading-overlay {
          display: none;
          position: absolute;
          inset: 0;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #f8f9fa);
          border-radius: var(--radius-lg, 12px);
          z-index: 5;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color, #e2e8f0);
          border-top-color: var(--accent-color, #10b981);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <layers-panel></layers-panel>

      <div id="zoom-navigator">
        <svg id="navigator-svg">
          <rect id="navigator-bg" width="100%" height="100%"></rect>
          <path id="navigator-path" fill="none"></path>
          <rect id="navigator-viewport" fill="none" stroke="var(--accent-color, #10b981)" stroke-width="1" vector-effect="non-scaling-stroke"></rect>
        </svg>
      </div>

      <div id="zoom-controls">
        <button id="zoom-out" title="Zoom out">&#x2212;</button>
        <button id="zoom-fit" title="Fit to view">Fit</button>
        <button id="zoom-in" title="Zoom in">&#x002B;</button>
        <input type="text" id="zoom-level" value="100%" title="Enter zoom percentage">
      </div>

      <div id="preview-container">
        <svg id="preview" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" patternUnits="userSpaceOnUse">
              <path id="grid-path" fill="none" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect id="preview-bg" width="100%" height="100%"></rect>
          <rect id="preview-grid" width="100%" height="100%" fill="url(#grid-pattern)"></rect>
          <g id="preview-layers"></g>
          <path id="preview-path" fill="none"></path>
        </svg>
        <div id="loading-overlay">
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;
  }
}

customElements.define('svg-preview-pane', SvgPreviewPane);
