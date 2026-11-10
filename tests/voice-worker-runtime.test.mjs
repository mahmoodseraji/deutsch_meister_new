import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workerSource = await readFile(new URL('../js/voice-worker.js', import.meta.url), 'utf8');
const coreSource = await readFile(new URL('../js/piper-core.js', import.meta.url), 'utf8');

function makeOpfs() {
  const directories = new Map();
  class FileHandle {
    constructor(directory, name) { this.directory = directory; this.name = name; }
    async getFile() {
      if (!this.directory.files.has(this.name)) throw new Error('File not found');
      return this.directory.files.get(this.name);
    }
    async createWritable() {
      const chunks = [];
      let closed = false;
      return {
        write: async value => {
          if (value instanceof Blob) chunks.push(await value.arrayBuffer());
          else if (typeof value === 'string') chunks.push(new TextEncoder().encode(value));
          else if (value instanceof ArrayBuffer) chunks.push(value.slice(0));
          else chunks.push(new Uint8Array(value.buffer || value, value.byteOffset || 0, value.byteLength || value.length).slice());
        },
        close: async () => {
          if (closed) return;
          closed = true;
          this.directory.files.set(this.name, new Blob(chunks));
        },
        abort: async () => { closed = true; chunks.length = 0; }
      };
    }
  }
  class DirectoryHandle {
    constructor(name) { this.name = name; this.files = new Map(); }
    async getFileHandle(name, options = {}) {
      if (!this.files.has(name) && !options.create) throw new Error('File not found');
      if (!this.files.has(name)) this.files.set(name, new Blob([]));
      return new FileHandle(this, name);
    }
    async getDirectoryHandle(name, options = {}) {
      if (!directories.has(name) && !options.create) throw new Error('Directory not found');
      if (!directories.has(name)) directories.set(name, new DirectoryHandle(name));
      return directories.get(name);
    }
    async removeEntry(name) { if (!this.files.delete(name)) throw new Error('Entry not found'); }
  }
  const root = new DirectoryHandle('root');
  return { root, directories };
}

function makeResponse(body, contentType = 'application/octet-stream') {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return new Response(bytes, { status: 200, headers: { 'Content-Type': contentType, 'Content-Length': String(bytes.byteLength) } });
}

async function makeWorkerHarness() {
  const opfs = makeOpfs();
  const messages = [];
  const runtimeCache = new Map();
  const counts = { ortImports: 0, phonemizerImports: 0, phonemizerFactories: 0, phonemizerCalls: 0, sessionsCreated: 0, sessionsReleased: 0, sessionRuns: 0, runtimeDownloads: 0 };
  let messageHandler;
  let blobSequence = 0;
  const NativeURL = URL;
  class TestURL extends NativeURL {}
  TestURL.createObjectURL = () => `blob:test-${++blobSequence}`;
  TestURL.revokeObjectURL = () => {};

  const config = {
    audio: { sample_rate: 22050 },
    espeak: { voice: 'de' },
    phoneme_type: 'espeak', num_symbols: 256, num_speakers: 1,
    inference: { noise_scale: 0.667, length_scale: 1, noise_w: 0.8 },
    phoneme_id_map: { a: [1] },
    speaker_id_map: {}
  };
  const fakeOrt = {
    env: { wasm: {} },
    Tensor: class Tensor { constructor(type, data, dims) { this.type = type; this.data = data; this.dims = dims; } },
    InferenceSession: {
      create: async (_bytes, options) => {
        counts.sessionsCreated++;
        assert.deepEqual(Array.from(options.executionProviders), ['wasm']);
        return {
          run: async feeds => {
            counts.sessionRuns++;
            assert.equal(feeds.input.type, 'int64');
            return { output: { data: new Float32Array([0, 0.5, -0.5]) } };
          },
          release: async () => { counts.sessionsReleased++; }
        };
      }
    }
  };

  const navigator = {
    storage: {
      getDirectory: async () => opfs.root,
      estimate: async () => ({ quota: 2_000_000_000, usage: 0 })
    }
  };
  const sandbox = {
    console,
    navigator,
    URL: TestURL,
    Blob,
    Response,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    DataView,
    BigInt64Array,
    Float32Array,
    JSON,
    Map,
    Set,
    Promise,
    Date,
    Math,
    Number,
    String,
    Object,
    Error,
    setTimeout,
    clearTimeout,
    caches: { open: async () => ({ match: async url => runtimeCache.get(String(url))?.clone() || null }) },
    fetch: async url => {
      const value = String(url);
      if (value.includes('/runtime/')) {
        counts.runtimeDownloads++;
        const response = makeResponse(new Uint8Array([1, 2, 3]));
        runtimeCache.set(value, response.clone());
        return response;
      }
      if (value.includes('config.json') || value.includes('.onnx.json')) return makeResponse(JSON.stringify(config), 'application/json');
      if ((value.includes('.onnx') && !value.includes('.onnx.json'))) return makeResponse(new Uint8Array(1_000_001));
      if (value.endsWith('.js')) return makeResponse('/* mock runtime script */', 'text/javascript');
      return makeResponse(new Uint8Array([1, 2, 3]));
    },
    postMessage: message => messages.push(message),
    addEventListener: (type, handler) => { if (type === 'message') messageHandler = handler; },
    importScripts: url => {
      if (url === './piper-core.js') {
        vm.runInContext(coreSource, context);
        return;
      }
      if (String(url).includes('/runtime/ort.wasm.min.js')) {
        if (!sandbox.ort) { sandbox.ort = fakeOrt; counts.ortImports++; }
        return;
      }
      if (String(url).includes('/runtime/piper_phonemize.js')) {
        if (!sandbox.createPiperPhonemize) {
          counts.phonemizerImports++;
          sandbox.createPiperPhonemize = async options => {
            counts.phonemizerFactories++;
            return {
              callMain: args => {
                counts.phonemizerCalls++;
                assert.equal(args[0], '-l');
                options.print(JSON.stringify({ phoneme_ids: [1, 2, 3] }));
              }
            };
          };
        }
        return;
      }
      throw new Error(`Unexpected importScripts URL: ${url}`);
    }
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = { href: 'https://example.test/app/js/voice-worker.js' };
  sandbox.self.location = sandbox.location;
  const context = vm.createContext(sandbox);
  vm.runInContext(workerSource, context, { filename: 'voice-worker.js' });

  let requestId = 0;
  async function request(action, payload = {}) {
    const id = ++requestId;
    messageHandler({ data: { requestId: id, action, ...payload } });
    for (let attempt = 0; attempt < 300; attempt++) {
      const result = messages.find(message => message.requestId === id && ['result', 'error', 'audio'].includes(message.type));
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    throw new Error(`Worker request ${action} did not finish.`);
  }
  return { request, messages, counts, opfs, sandbox };
}

test('worker downloads, verifies, and synthesizes both voices with persistent runtime instances', async () => {
  const harness = await makeWorkerHarness();
  const statusBefore = await harness.request('status');
  assert.equal(statusBefore.type, 'result');
  assert.deepEqual(Array.from(statusBefore.stored), []);

  const runtime = await harness.request('runtime');
  assert.equal(runtime.type, 'result');
  assert.equal(runtime.ready, true);
  assert.equal(harness.counts.runtimeDownloads, 6);
  await harness.request('runtime');
  assert.equal(harness.counts.runtimeDownloads, 6, 'cached runtime assets are not read and downloaded again on app startup');

  for (const voice of ['jarvis', 'amy']) {
    const downloaded = await harness.request('download', { voice });
    assert.equal(downloaded.type, 'result');
    assert.equal(downloaded.complete[voice], true);
  }

  const first = await harness.request('speak', { voice: 'jarvis', text: 'Guten Tag' });
  const second = await harness.request('speak', { voice: 'jarvis', text: 'Guten Morgen' });
  assert.equal(first.type, 'audio');
  assert.equal(second.type, 'audio');
  assert.equal(new DataView(first.buffer).getUint32(0, false), 0x52494646);
  assert.equal(harness.counts.phonemizerFactories, 1, 'phonemizer should be initialized once for repeated utterances');
  assert.equal(harness.counts.sessionsCreated, 1, 'ONNX model session should be reused for repeated utterances');
  assert.equal(harness.counts.phonemizerCalls, 2);
  assert.equal(harness.counts.sessionRuns, 2);

  const english = await harness.request('speak', { voice: 'amy', text: 'Hello there' });
  assert.equal(english.type, 'audio');
  assert.equal(harness.counts.phonemizerFactories, 1, 'phonemizer remains shared when switching between the two languages');
  assert.equal(harness.counts.sessionsCreated, 2, 'only the newly selected voice model should be loaded');
  assert.equal(harness.counts.sessionsReleased, 1, 'the previous model session should be released before loading the next');
  assert.equal(harness.counts.sessionRuns, 3);
});
