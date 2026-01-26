// SVG Preview pane with zoom/pan controls and navigator

import { store } from '../state/store.js';

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

    navPath.setAttribute('d', this.previewPath.getAttribute('d') || '');
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

  async copySvg() {
    const width = this.preview.getAttribute('width');
    const height = this.preview.getAttribute('height');
    const viewBox = this.preview.getAttribute('viewBox');
    const pathD = this.previewPath.getAttribute('d') || '';

    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <path d="${pathD}"/>
</svg>`;

    try {
      await navigator.clipboard.writeText(cleanSvg);
      const btn = this.shadowRoot.querySelector('#copy-svg');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy SVG';
        btn.classList.remove('copied');
      }, 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  setupEventListeners() {
    // Copy button
    this.shadowRoot.querySelector('#copy-svg').addEventListener('click', () => this.copySvg());

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
          padding: 20px;
          background: var(--bg-primary, #ffffff);
          min-width: 0;
          overflow: auto;
          position: relative;
        }

        @media (max-width: 800px) {
          :host {
            min-height: 250px;
          }
        }

        #preview-container {
          display: flex;
          align-items: center;
          justify-content: center;
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

        .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-family: inherit;
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s;
        }

        .copy-btn:hover {
          opacity: 1;
          background: var(--bg-secondary, #f5f5f5);
        }

        .copy-btn.copied {
          background: var(--success-color, #28a745);
          border-color: var(--success-color, #28a745);
          color: white;
          opacity: 1;
        }

        /* Navigator */
        #zoom-navigator {
          position: absolute;
          top: 8px;
          left: 8px;
          width: 120px;
          height: 120px;
          background: var(--bg-secondary, #f5f5f5);
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          z-index: 10;
        }

        #navigator-svg {
          width: 100%;
          height: 100%;
        }

        #navigator-viewport {
          cursor: move;
          fill: rgba(0, 102, 204, 0.1);
        }

        /* Zoom controls */
        #zoom-controls {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-primary, #ffffff);
          padding: 6px 12px;
          border-radius: 4px;
          border: 1px solid var(--border-color, #ddd);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }

        #zoom-controls button {
          width: 28px;
          height: 28px;
          padding: 0;
          display: grid;
          place-items: center;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          background: var(--bg-primary, #ffffff);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          transition: background 0.15s;
        }

        #zoom-controls button:hover {
          background: var(--bg-secondary, #f5f5f5);
        }

        #zoom-in,
        #zoom-out {
          font-size: 1.4rem;
          font-weight: 300;
          line-height: 0;
        }

        #zoom-fit {
          font-size: 0.96rem;
        }

        #zoom-level {
          width: 50px;
          padding: 2px 4px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 3px;
          font-size: 0.75rem;
          font-family: inherit;
          text-align: center;
        }

        #zoom-level:focus {
          outline: none;
          border-color: var(--accent-color, #0066cc);
        }
      </style>

      <button id="copy-svg" class="copy-btn">Copy SVG</button>

      <div id="zoom-navigator">
        <svg id="navigator-svg">
          <rect id="navigator-bg" width="100%" height="100%"></rect>
          <path id="navigator-path" fill="none"></path>
          <rect id="navigator-viewport" fill="none" stroke="#0066cc" stroke-width="2"></rect>
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
          <path id="preview-path" fill="none"></path>
        </svg>
      </div>
    `;
  }
}

customElements.define('svg-preview-pane', SvgPreviewPane);
