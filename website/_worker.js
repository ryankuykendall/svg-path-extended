/**
 * CloudFlare Pages Worker - SPA routing
 *
 * Routes under /svg-path-extended/* that don't match static files
 * are served the SPA index.html for client-side routing.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // SPA routes under /svg-path-extended/ that don't have file extensions
    if (
      path.startsWith('/svg-path-extended/') &&
      path !== '/svg-path-extended/' &&
      !/\.\w+$/.test(path)
    ) {
      // Serve the SPA index.html
      url.pathname = '/svg-path-extended/index.html';
      return env.ASSETS.fetch(url.toString());
    }

    // For everything else, serve normally
    return env.ASSETS.fetch(request);
  }
};
