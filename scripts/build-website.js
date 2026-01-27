#!/usr/bin/env node

/**
 * Build script for website deployment to CloudFlare Pages
 *
 * Output structure (dist/website/):
 * ├── index.html                    # Root landing page
 * ├── _redirects                    # CloudFlare SPA routing
 * └── svg-path-extended/
 *     ├── index.html                # Playground SPA entry
 *     ├── styles/
 *     ├── components/
 *     ├── state/
 *     ├── utils/
 *     └── dist/                     # Library build (for global script)
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// Output to 'public' - standard CloudFlare Pages output directory
const DIST = join(ROOT, 'public');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function copyFile(src, dest) {
  await fs.mkdir(dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function build() {
  console.log('Building website to public/...\n');

  // Clean dist/website
  try {
    await fs.rm(DIST, { recursive: true });
  } catch (e) {
    // Directory doesn't exist, that's fine
  }
  await fs.mkdir(DIST, { recursive: true });

  // Copy website root files
  console.log('Copying website root...');
  await copyFile(join(ROOT, 'website', 'index.html'), join(DIST, 'index.html'));
  await copyFile(join(ROOT, 'website', '_redirects'), join(DIST, '_redirects'));

  // Copy playground to svg-path-extended/
  const playgroundDest = join(DIST, 'svg-path-extended');
  console.log('Copying playground...');

  // Copy and modify playground index.html (fix library path)
  let indexHtml = await fs.readFile(join(ROOT, 'playground', 'index.html'), 'utf-8');
  // Update library path from ../dist/ to dist/ (production structure)
  indexHtml = indexHtml.replace('../dist/index.global.js', 'dist/index.global.js');
  await fs.mkdir(playgroundDest, { recursive: true });
  await fs.writeFile(join(playgroundDest, 'index.html'), indexHtml);

  // Copy playground directories
  const playgroundDirs = ['styles', 'components', 'state', 'utils'];
  for (const dir of playgroundDirs) {
    console.log(`  Copying ${dir}/...`);
    await copyDir(
      join(ROOT, 'playground', dir),
      join(playgroundDest, dir)
    );
  }

  // Copy library dist (for global script tag)
  console.log('Copying library dist...');
  await fs.mkdir(join(playgroundDest, 'dist'), { recursive: true });
  await copyFile(
    join(ROOT, 'dist', 'index.global.js'),
    join(playgroundDest, 'dist', 'index.global.js')
  );
  // Also copy source map if it exists
  try {
    await copyFile(
      join(ROOT, 'dist', 'index.global.js.map'),
      join(playgroundDest, 'dist', 'index.global.js.map')
    );
  } catch (e) {
    // Map file doesn't exist, that's fine
  }

  console.log('\nBuild complete!');
  console.log(`Output: ${DIST}`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
