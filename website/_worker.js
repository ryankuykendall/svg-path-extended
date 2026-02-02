/**
 * CloudFlare Pages Worker - SPA routing + API endpoints
 *
 * Routes under /svg-path-extended/* that don't match static files
 * are served the SPA index.html for client-side routing.
 *
 * API routes under /svg-path-extended/api/* are handled by the worker.
 */

// Nano ID implementation (URL-safe, 21 chars)
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
function generateNanoId(size = 21) {
  let id = '';
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] & 63];
  }
  return id;
}

// Simple content hash using Web Crypto API
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create URL-friendly slug from name
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
  'Access-Control-Max-Age': '86400',
};

// JSON response helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Error response helper
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Extract user ID from request headers
function getUserId(request) {
  return request.headers.get('X-User-Id') || null;
}

// API route handlers
const apiHandlers = {
  // GET /api/workspaces - List user's workspaces
  async listWorkspaces(request, env) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    // Check if KV binding exists
    if (!env.WORKSPACES) {
      return errorResponse('KV namespace WORKSPACES not bound. Check Cloudflare Pages settings.', 500);
    }

    try {
      // Get user's workspace IDs
      const workspaceIdsJson = await env.WORKSPACES.get(`user:${userId}:workspaces`);
      const workspaceIds = workspaceIdsJson ? JSON.parse(workspaceIdsJson) : [];

      // Fetch all workspace metadata
      const workspaces = await Promise.all(
        workspaceIds.map(async (id) => {
          const wsJson = await env.WORKSPACES.get(`workspace:${id}`);
          if (!wsJson) return null;
          const ws = JSON.parse(wsJson);
          // Return minimal data for listing
          return {
            id: ws.id,
            slug: ws.slug,
            name: ws.name,
            description: ws.description,
            isPublic: ws.isPublic,
            createdAt: ws.createdAt,
            updatedAt: ws.updatedAt,
          };
        })
      );

      // Filter out null values (deleted workspaces)
      return jsonResponse(workspaces.filter(Boolean));
    } catch (err) {
      return errorResponse('Failed to list workspaces: ' + err.message, 500);
    }
  },

  // POST /api/workspace - Create new workspace
  async createWorkspace(request, env) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    try {
      const body = await request.json();
      const { name, description, code, isPublic, preferences } = body;

      if (!name?.trim()) {
        return errorResponse('Workspace name is required');
      }

      const id = generateNanoId();
      const slug = slugify(name);
      const now = new Date().toISOString();
      const contentHash = await hashContent(code || '');

      const workspace = {
        id,
        slug,
        userId,
        name: name.trim(),
        description: description?.trim() || '',
        code: code || '',
        isPublic: Boolean(isPublic),
        preferences: preferences || {},
        createdAt: now,
        updatedAt: now,
        contentHash,
      };

      // Save workspace
      await env.WORKSPACES.put(`workspace:${id}`, JSON.stringify(workspace));

      // Update user's workspace list
      const workspaceIdsJson = await env.WORKSPACES.get(`user:${userId}:workspaces`);
      const workspaceIds = workspaceIdsJson ? JSON.parse(workspaceIdsJson) : [];
      workspaceIds.unshift(id); // Add to beginning
      await env.WORKSPACES.put(`user:${userId}:workspaces`, JSON.stringify(workspaceIds));

      return jsonResponse(workspace, 201);
    } catch (err) {
      return errorResponse('Failed to create workspace: ' + err.message, 500);
    }
  },

  // GET /api/workspace/:id - Load workspace
  async getWorkspace(request, env, id) {
    try {
      const wsJson = await env.WORKSPACES.get(`workspace:${id}`);
      if (!wsJson) {
        return errorResponse('Workspace not found', 404);
      }

      const workspace = JSON.parse(wsJson);
      const userId = getUserId(request);

      // Check access - allow if public or owned by user
      if (!workspace.isPublic && workspace.userId !== userId) {
        return errorResponse('Access denied', 403);
      }

      return jsonResponse(workspace);
    } catch (err) {
      return errorResponse('Failed to load workspace: ' + err.message, 500);
    }
  },

  // PUT /api/workspace/:id - Update workspace (autosave)
  async updateWorkspace(request, env, id) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    try {
      const wsJson = await env.WORKSPACES.get(`workspace:${id}`);
      if (!wsJson) {
        return errorResponse('Workspace not found', 404);
      }

      const workspace = JSON.parse(wsJson);

      // Check ownership
      if (workspace.userId !== userId) {
        return errorResponse('Access denied', 403);
      }

      const body = await request.json();
      const { name, description, code, isPublic, preferences, contentHash: clientHash } = body;

      // Check if content actually changed (dirty checking)
      if (code !== undefined) {
        const newHash = await hashContent(code);
        if (newHash === workspace.contentHash) {
          // Content unchanged, skip update
          return jsonResponse({ ...workspace, skipped: true });
        }
        workspace.code = code;
        workspace.contentHash = newHash;
      }

      // Update other fields if provided
      if (name !== undefined) {
        workspace.name = name.trim();
        workspace.slug = slugify(name);
      }
      if (description !== undefined) workspace.description = description.trim();
      if (isPublic !== undefined) workspace.isPublic = Boolean(isPublic);
      if (preferences !== undefined) workspace.preferences = preferences;

      workspace.updatedAt = new Date().toISOString();

      // Save updated workspace
      await env.WORKSPACES.put(`workspace:${id}`, JSON.stringify(workspace));

      return jsonResponse(workspace);
    } catch (err) {
      return errorResponse('Failed to update workspace: ' + err.message, 500);
    }
  },

  // DELETE /api/workspace/:id - Delete workspace
  async deleteWorkspace(request, env, id) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    try {
      const wsJson = await env.WORKSPACES.get(`workspace:${id}`);
      if (!wsJson) {
        return errorResponse('Workspace not found', 404);
      }

      const workspace = JSON.parse(wsJson);

      // Check ownership
      if (workspace.userId !== userId) {
        return errorResponse('Access denied', 403);
      }

      // Delete workspace
      await env.WORKSPACES.delete(`workspace:${id}`);

      // Remove from user's workspace list
      const workspaceIdsJson = await env.WORKSPACES.get(`user:${userId}:workspaces`);
      const workspaceIds = workspaceIdsJson ? JSON.parse(workspaceIdsJson) : [];
      const updatedIds = workspaceIds.filter(wsId => wsId !== id);
      await env.WORKSPACES.put(`user:${userId}:workspaces`, JSON.stringify(updatedIds));

      return jsonResponse({ success: true });
    } catch (err) {
      return errorResponse('Failed to delete workspace: ' + err.message, 500);
    }
  },

  // POST /api/workspace/:id/copy - Duplicate workspace
  async copyWorkspace(request, env, id) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    try {
      const wsJson = await env.WORKSPACES.get(`workspace:${id}`);
      if (!wsJson) {
        return errorResponse('Workspace not found', 404);
      }

      const original = JSON.parse(wsJson);

      // Check access - allow if public or owned by user
      if (!original.isPublic && original.userId !== userId) {
        return errorResponse('Access denied', 403);
      }

      const body = await request.json().catch(() => ({}));
      const newName = body.name || `${original.name} (Copy)`;

      const newId = generateNanoId();
      const now = new Date().toISOString();

      const newWorkspace = {
        ...original,
        id: newId,
        slug: slugify(newName),
        userId, // New owner
        name: newName,
        isPublic: false, // Copies are private by default
        createdAt: now,
        updatedAt: now,
      };

      // Save new workspace
      await env.WORKSPACES.put(`workspace:${newId}`, JSON.stringify(newWorkspace));

      // Update user's workspace list
      const workspaceIdsJson = await env.WORKSPACES.get(`user:${userId}:workspaces`);
      const workspaceIds = workspaceIdsJson ? JSON.parse(workspaceIdsJson) : [];
      workspaceIds.unshift(newId);
      await env.WORKSPACES.put(`user:${userId}:workspaces`, JSON.stringify(workspaceIds));

      return jsonResponse(newWorkspace, 201);
    } catch (err) {
      return errorResponse('Failed to copy workspace: ' + err.message, 500);
    }
  },

  // GET /api/preferences - Get user preferences
  async getPreferences(request, env) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    try {
      const prefsJson = await env.WORKSPACES.get(`user:${userId}:preferences`);
      const preferences = prefsJson ? JSON.parse(prefsJson) : null;
      return jsonResponse(preferences || {});
    } catch (err) {
      return errorResponse('Failed to get preferences: ' + err.message, 500);
    }
  },

  // PUT /api/preferences - Save user preferences
  async savePreferences(request, env) {
    const userId = getUserId(request);
    if (!userId) {
      return errorResponse('User ID required', 401);
    }

    try {
      const preferences = await request.json();
      await env.WORKSPACES.put(`user:${userId}:preferences`, JSON.stringify(preferences));
      return jsonResponse(preferences);
    } catch (err) {
      return errorResponse('Failed to save preferences: ' + err.message, 500);
    }
  },
};

// Route API requests
async function handleApiRequest(request, env, apiPath) {
  const url = new URL(request.url);
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Route matching
  // GET /api/workspaces
  if (apiPath === '/workspaces' && method === 'GET') {
    return apiHandlers.listWorkspaces(request, env);
  }

  // POST /api/workspace
  if (apiPath === '/workspace' && method === 'POST') {
    return apiHandlers.createWorkspace(request, env);
  }

  // GET /api/preferences
  if (apiPath === '/preferences' && method === 'GET') {
    return apiHandlers.getPreferences(request, env);
  }

  // PUT /api/preferences
  if (apiPath === '/preferences' && method === 'PUT') {
    return apiHandlers.savePreferences(request, env);
  }

  // Match /api/workspace/:id routes
  const workspaceMatch = apiPath.match(/^\/workspace\/([^\/]+)$/);
  if (workspaceMatch) {
    const id = workspaceMatch[1];
    switch (method) {
      case 'GET':
        return apiHandlers.getWorkspace(request, env, id);
      case 'PUT':
        return apiHandlers.updateWorkspace(request, env, id);
      case 'DELETE':
        return apiHandlers.deleteWorkspace(request, env, id);
    }
  }

  // Match /api/workspace/:id/copy
  const copyMatch = apiPath.match(/^\/workspace\/([^\/]+)\/copy$/);
  if (copyMatch && method === 'POST') {
    return apiHandlers.copyWorkspace(request, env, copyMatch[1]);
  }

  return errorResponse('Not found', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API routes under /svg-path-extended/api/
    if (path.startsWith('/svg-path-extended/api/')) {
      const apiPath = path.replace('/svg-path-extended/api', '');
      return handleApiRequest(request, env, apiPath);
    }

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
