#!/usr/bin/env node

/**
 * Bootstrap a new blog post with frontmatter
 *
 * Usage: npm run new:blog
 *        npm run new:blog -- --title="My Post Title"
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '..', 'website', 'blog');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || true;
    }
  }
  return args;
}

async function prompt(rl, question, defaultValue = '') {
  return new Promise(resolve => {
    const defaultHint = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`${question}${defaultHint}: `, answer => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  const args = parseArgs();

  // Ensure blog directory exists
  await fs.mkdir(BLOG_DIR, { recursive: true });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Check if running non-interactively (all required args provided)
    const nonInteractive = args.title && args.slug;

    // Get title
    const title = args.title || await prompt(rl, 'Title');
    if (!title) {
      console.error('Error: Title is required');
      process.exit(1);
    }

    // Generate defaults
    const defaultSlug = slugify(title);
    const defaultDate = getToday();

    // Get other fields
    const slug = args.slug || await prompt(rl, 'Slug', defaultSlug);
    const date = args.date || (nonInteractive ? defaultDate : await prompt(rl, 'Date', defaultDate));
    const description = args.description || (nonInteractive ? '' : await prompt(rl, 'Description (optional)'));

    // Generate frontmatter
    const frontmatter = `---
title: "${title}"
date: "${date}"
slug: "${slug}"
description: "${description}"
---

# ${title}

`;

    // Write file
    const filename = `${slug}.md`;
    const filepath = join(BLOG_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filepath);
      console.error(`Error: ${filename} already exists`);
      process.exit(1);
    } catch {
      // File doesn't exist, good to proceed
    }

    await fs.writeFile(filepath, frontmatter);

    console.log(`\nCreated: website/blog/${filename}`);
    console.log('\nNext steps:');
    console.log(`  1. Edit website/blog/${filename}`);
    console.log('  2. Run: npm run build:blog');
    console.log('  3. Run: npm run dev:website');

  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
