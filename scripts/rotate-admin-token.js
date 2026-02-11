#!/usr/bin/env node

/**
 * Generate and set a new ADMIN_TOKEN for the Cloudflare Pages project.
 *
 * Usage: npm run website:admin-token
 *
 * 1. Generates a cryptographically random token (48 URL-safe chars)
 * 2. Sets it via `wrangler pages secret put ADMIN_TOKEN`
 * 3. Redeploys the Pages project so the new secret takes effect
 * 4. Prints the full admin backfill URL to stdout
 */

import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

const PROJECT_NAME = 'svg-path-extended';
const ADMIN_PATH = '/pathogen/admin/thumbnails';
const PRODUCTION_ORIGIN = 'https://pedestal.design';

// Generate a URL-safe random token
const token = randomBytes(36).toString('base64url');

console.log('Setting ADMIN_TOKEN via wrangler...\n');

try {
  execSync(
    `printf '%s' "${token}" | npx wrangler pages secret put ADMIN_TOKEN --project-name ${PROJECT_NAME}`,
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
} catch (err) {
  console.error('\nFailed to set secret. Is wrangler authenticated?');
  process.exit(1);
}

console.log('\nRedeploying to pick up new secret...\n');

try {
  execSync(
    `npx wrangler pages deploy public --project-name ${PROJECT_NAME}`,
    { stdio: 'inherit' }
  );
} catch (err) {
  console.error('\nDeploy failed. The secret was set — redeploy manually or push a commit.');
  process.exit(1);
}

const url = `${PRODUCTION_ORIGIN}${ADMIN_PATH}?token=${encodeURIComponent(token)}`;

console.log('\n---');
console.log(url);
