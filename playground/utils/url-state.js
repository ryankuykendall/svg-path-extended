// URL state encoding/decoding for shareable playground links

export function encodeState(state) {
  const urlState = {
    code: state.code,
    w: state.width,
    h: state.height,
    s: state.stroke,
    f: state.fillEnabled ? state.fill : null,
    bg: state.background,
    sw: state.strokeWidth,
    ge: state.gridEnabled,
    gc: state.gridColor,
    gs: state.gridSize,
    ao: state.annotatedOpen,
    co: state.consoleOpen,
    zoom: state.zoomLevel,
    panX: state.panX,
    panY: state.panY,
  };
  return btoa(encodeURIComponent(JSON.stringify(urlState)));
}

export function decodeState(hash) {
  try {
    const json = decodeURIComponent(atob(hash));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function loadFromURL() {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  return decodeState(hash);
}

export function applyURLState(urlState, store) {
  if (!urlState) return null;

  const updates = {};

  if (urlState.w) updates.width = urlState.w;
  if (urlState.h) updates.height = urlState.h;
  if (urlState.s) updates.stroke = urlState.s;
  if (urlState.f) {
    updates.fillEnabled = true;
    updates.fill = urlState.f;
  }
  if (urlState.bg) updates.background = urlState.bg;
  if (urlState.sw) updates.strokeWidth = urlState.sw;
  if (urlState.ge !== undefined) updates.gridEnabled = urlState.ge;
  if (urlState.gc) updates.gridColor = urlState.gc;
  if (urlState.gs) updates.gridSize = urlState.gs;
  if (urlState.ao) updates.annotatedOpen = urlState.ao;
  if (urlState.co) updates.consoleOpen = urlState.co;
  if (urlState.zoom) updates.zoomLevel = urlState.zoom;
  if (urlState.panX) updates.panX = urlState.panX;
  if (urlState.panY) updates.panY = urlState.panY;

  store.update(updates);

  return urlState.code || null;
}

export function copyURL(store) {
  const state = store.getAll();
  const url = location.origin + location.pathname + '#' + encodeState(state);
  return navigator.clipboard.writeText(url);
}
