#!/usr/bin/env node
/**
 * Updates version fields in .claude-plugin/plugin.json and
 * .claude-plugin/marketplace.json to match the given version.
 * Called by @semantic-release/exec during the prepare step.
 *
 * Usage: node scripts/sync-plugin-versions.mjs <version>
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const version = process.argv[2];
if (!version) {
  console.error('Usage: sync-plugin-versions.mjs <version>');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function updateJson(relPath, updater) {
  const abs = resolve(root, relPath);
  const data = JSON.parse(readFileSync(abs, 'utf8'));
  updater(data);
  writeFileSync(abs, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${relPath} → ${version}`);
}

updateJson('.claude-plugin/plugin.json', (d) => {
  d.version = version;
});

updateJson('.claude-plugin/marketplace.json', (d) => {
  d.metadata.version = version;
  for (const plugin of d.plugins) {
    plugin.version = version;
  }
});
