// Anonymous user ID service
// Generates and persists a unique user ID in localStorage

const STORAGE_KEY = 'svg-path-extended:userId';
const ID_LENGTH = 21;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

// Generate a nanoid-compatible random ID
function generateId() {
  let id = '';
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[bytes[i] & 63];
  }
  return id;
}

// Validate ID format (21 chars, URL-safe)
function isValidId(id) {
  if (!id || typeof id !== 'string') return false;
  if (id.length !== ID_LENGTH) return false;
  return /^[0-9A-Za-z_-]+$/.test(id);
}

// Get or create user ID
export function getUserId() {
  try {
    let userId = localStorage.getItem(STORAGE_KEY);

    if (!isValidId(userId)) {
      userId = generateId();
      localStorage.setItem(STORAGE_KEY, userId);
    }

    return userId;
  } catch (e) {
    // localStorage may be unavailable (private browsing, etc.)
    // Generate an ephemeral ID for this session
    console.warn('localStorage unavailable, using ephemeral user ID');
    return generateId();
  }
}

// Clear user ID (for testing/debugging)
export function clearUserId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore errors
  }
}

// Check if user has a stored ID
export function hasUserId() {
  try {
    return isValidId(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return false;
  }
}

export default {
  getUserId,
  clearUserId,
  hasUserId,
};
