#!/usr/bin/env node
/**
 * Download the gated Phonon 40M multilingual checkpoint and the four selected
 * public voice embeddings / audition samples. Requires Node 20+ and a Hugging
 * Face read token that has accepted the model's CC BY-NC 4.0 terms.
 *
 * Usage (PowerShell):
 *   $env:HF_TOKEN="hf_..."
 *   node scripts/download-phonon-assets.mjs
 *
 * The script never writes the token to disk or to project files.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.HF_TOKEN;
if (!TOKEN) {
  console.error('HF_TOKEN is missing. Set a Hugging Face read token in your terminal first.');
  process.exit(1);
}

const MODEL = 'https://huggingface.co/gradium/phonon-40m-multilingual/resolve/main';
const VOICES = 'https://huggingface.co/gradium/phonon-voices/resolve/main';
const assets = [
  { path: 'models/phonon/model.q8.gguf', url: `${MODEL}/model.q8.gguf`, gated: true },
  { path: 'models/phonon/config.json', url: `${MODEL}/config.json`, gated: true },
  { path: 'models/phonon/tokenizer.json', url: `${MODEL}/tokenizer.json`, gated: true },
  { path: 'models/phonon/voices/nele.safetensors', url: `${VOICES}/voices/2A2fFf8SkDEJ8nzx.safetensors` },
  { path: 'models/phonon/voices/anton.safetensors', url: `${VOICES}/voices/3ZKKapPOvuWFcw9f.safetensors` },
  { path: 'models/phonon/voices/zoey.safetensors', url: `${VOICES}/voices/NbpkqMVS3CJeq2j8.safetensors` },
  { path: 'models/phonon/voices/easton.safetensors', url: `${VOICES}/voices/LMDIYE0Oa377Qh6Z.safetensors` },
  { path: 'assets/voice-samples/nele.ogg', url: `${VOICES}/samples/de/de-de/female/1_nele_2A2fFf8SkDEJ8nzx.ogg` },
  { path: 'assets/voice-samples/anton.ogg', url: `${VOICES}/samples/de/de-de/male/1_anton_3ZKKapPOvuWFcw9f.ogg` },
  { path: 'assets/voice-samples/zoey.ogg', url: `${VOICES}/samples/en/en-us/female/1_zoey_NbpkqMVS3CJeq2j8.ogg` },
  { path: 'assets/voice-samples/easton.ogg', url: `${VOICES}/samples/en/en-us/male/1_easton_LMDIYE0Oa377Qh6Z.ogg` },
];

async function download(asset) {
  const destination = join(ROOT, asset.path);
  try {
    const existing = await stat(destination);
    if (existing.size > 0) {
      console.log(`Already present: ${asset.path} (${existing.size.toLocaleString()} bytes)`);
      return;
    }
  } catch { /* download missing file */ }

  await mkdir(dirname(destination), { recursive: true });
  const headers = asset.gated ? { Authorization: `Bearer ${TOKEN}` } : {};
  console.log(`Downloading ${asset.path} …`);
  const response = await fetch(asset.url, { headers, redirect: 'follow' });
  if (!response.ok) {
    const hint = response.status === 401 || response.status === 403
      ? ' Check that you accepted the model terms on Hugging Face and that HF_TOKEN has read access.'
      : '';
    throw new Error(`${asset.path}: HTTP ${response.status}.${hint}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) throw new Error(`${asset.path}: server returned an empty file.`);
  await writeFile(destination, bytes);
  console.log(`Saved ${asset.path} (${bytes.byteLength.toLocaleString()} bytes)`);
}

for (const asset of assets) await download(asset);
console.log('\nAll Phonon assets are present. Review PHONON-LICENSE-NOTICE.md before committing them.');
