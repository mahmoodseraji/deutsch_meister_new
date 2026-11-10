#!/usr/bin/env node
/**
 * Copy the exact pinned phonon-tts package and its WebAssembly assets into the
 * static GitHub Pages application. This makes the runtime available offline
 * after the service worker has cached the shell.
 */
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageFile = join(root, 'node_modules', 'phonon-tts', 'package.json');
const destination = join(root, 'vendor', 'phonon-tts');
const pkg = JSON.parse(await readFile(packageFile, 'utf8'));
if (pkg.version !== '0.4.2') {
  throw new Error(`Expected phonon-tts 0.4.2, found ${pkg.version || 'unknown'}.`);
}
await mkdir(join(root, 'vendor'), { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(join(root, 'node_modules', 'phonon-tts'), destination, {
  recursive: true,
  filter: source => !source.includes('/node_modules/') && !source.endsWith('.map')
});
console.log(`Vendored phonon-tts ${pkg.version} into vendor/phonon-tts.`);
