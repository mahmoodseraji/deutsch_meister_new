// Phonon 40M multilingual voice manager.
// The runtime is vendored locally at ../vendor/phonon-tts; model bytes and selected
// voice embeddings are cached by phonon-tts in the dedicated Cache API cache.
const CACHE_NAME = 'phonon-tts-v1';
const MODEL_ROOT = new URL('../models/phonon/', import.meta.url);
const MODEL_URLS = Object.freeze({
  weights: new URL('model.q8.gguf', MODEL_ROOT).href,
  tokenizer: new URL('tokenizer.json', MODEL_ROOT).href,
  config: new URL('config.json', MODEL_ROOT).href
});

export const VOICE_CATALOG = Object.freeze({
  nele:   { name: 'Nele',   language: 'de', sample: '../assets/voice-samples/nele.ogg', label: 'Nele · German · female' },
  anton:  { name: 'Anton',  language: 'de', sample: '../assets/voice-samples/anton.ogg', label: 'Anton · German · male' },
  zoey:   { name: 'Zoey',   language: 'en', sample: '../assets/voice-samples/zoey.ogg', label: 'Zoey · English · female' },
  easton: { name: 'Easton', language: 'en', sample: '../assets/voice-samples/easton.ogg', label: 'Easton · English · male' }
});

const VOICE_URLS = Object.freeze({
  Nele: new URL('voices/nele.safetensors', MODEL_ROOT).href,
  Anton: new URL('voices/anton.safetensors', MODEL_ROOT).href,
  Zoey: new URL('voices/zoey.safetensors', MODEL_ROOT).href,
  Easton: new URL('voices/easton.safetensors', MODEL_ROOT).href
});

function modelSpec(defaultVoice) {
  return {
    weights: { q8: MODEL_URLS.weights },
    tokenizer: MODEL_URLS.tokenizer,
    config: MODEL_URLS.config,
    voices: VOICE_URLS,
    defaultVoice
  };
}

let phononModulePromise = null;
let activeTts = null;
let activeKey = null;
let audioContext = null;
let activeSource = null;
let activeAudio = null;
let activeAudioCancel = null;
let speechSequence = 0;

async function loadPhononModule() {
  if (!phononModulePromise) {
    phononModulePromise = import('../vendor/phonon-tts/index.js').catch(error => {
      phononModulePromise = null;
      throw new Error(
        'The local Phonon runtime is not installed. Run npm install and npm run vendor:phonon, then commit vendor/phonon-tts. ' +
        (error?.message || String(error))
      );
    });
  }
  return phononModulePromise;
}

async function openPhononCache() {
  if (typeof caches === 'undefined') return null;
  try { return await caches.open(CACHE_NAME); } catch { return null; }
}

async function cacheHas(cache, url) {
  if (!cache) return false;
  try { return !!(await cache.match(url)); } catch { return false; }
}

export async function getVoiceStorageStatus() {
  const cache = await openPhononCache();
  const modelChecks = await Promise.all(Object.values(MODEL_URLS).map(url => cacheHas(cache, url)));
  const modelReady = modelChecks.every(Boolean);
  const voices = {};
  for (const [id, voice] of Object.entries(VOICE_CATALOG)) {
    voices[id] = modelReady && await cacheHas(cache, VOICE_URLS[voice.name]);
  }
  return { modelReady, voices, anyDownloaded: Object.values(voices).some(Boolean) };
}

function assertVoice(voiceId, language) {
  const voice = VOICE_CATALOG[voiceId];
  if (!voice) throw new Error(`Unknown Phonon voice: ${voiceId}`);
  if (language && voice.language !== language) {
    throw new Error(`${voice.name} is not a ${language === 'de' ? 'German' : 'English'} voice.`);
  }
  return voice;
}

async function loadTts(voiceId, onProgress = () => {}) {
  const voice = assertVoice(voiceId);
  const status = await getVoiceStorageStatus();
  if (!status.voices[voiceId]) {
    throw new Error(`${voice.name} is not downloaded. Open Settings and download the selected voice first.`);
  }
  const key = `${voice.language}:${voiceId}`;
  if (activeTts && activeKey === key) return activeTts;
  disposeEngine();
  const { PhononTTS } = await loadPhononModule();
  const tts = await PhononTTS.load({
    lang: voice.language,
    model: modelSpec(voice.name),
    voices: [voice.name],
    quant: 'q8',
    device: 'cpu',
    threads: 1,
    cache: true,
    onProgress
  });
  activeTts = tts;
  activeKey = key;
  return tts;
}

async function waitForVoiceCache(voiceId, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let status = await getVoiceStorageStatus();
  while (!status.voices[voiceId] && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 200));
    status = await getVoiceStorageStatus();
  }
  return status;
}

export async function downloadNeuralVoice(voiceId, onProgress = () => {}) {
  const voice = assertVoice(voiceId);
  const before = await getVoiceStorageStatus();
  if (before.voices[voiceId]) return before;
  if (typeof caches === 'undefined') {
    throw new Error('This browser does not provide persistent Cache Storage. Use HTTPS or localhost, then try again.');
  }
  disposeEngine();
  const { PhononTTS } = await loadPhononModule();
  const tts = await PhononTTS.load({
    lang: voice.language,
    model: modelSpec(voice.name),
    voices: [voice.name],
    quant: 'q8',
    device: 'cpu',
    threads: 1,
    cache: true,
    onProgress
  });
  tts.dispose();
  // The package persists worker-fetched bytes asynchronously on the page thread.
  // Wait for its Cache API writes before reporting the selected voice as installed.
  const after = await waitForVoiceCache(voiceId);
  if (!after.voices[voiceId]) {
    throw new Error('Phonon finished loading, but the browser did not retain the model and voice in its cache. Check available device storage.');
  }
  return after;
}

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }
  return audioContext;
}

function stopCurrentAudio() {
  if (activeSource) {
    try { activeSource.stop(); } catch { /* already stopped */ }
    activeSource = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudioCancel?.();
    activeAudio = null;
    activeAudioCancel = null;
  }
}

function disposeEngine() {
  if (activeTts) {
    try { activeTts.dispose(); } catch { /* worker may already have stopped */ }
    activeTts = null;
    activeKey = null;
  }
}

export async function speakNeural(voiceId, text, rate = 0.88, onStage = () => {}) {
  const voice = assertVoice(voiceId);
  const sourceText = String(text || '').trim();
  if (!sourceText) throw new Error('There is no text to pronounce.');
  if (sourceText.length > 2000) throw new Error('Please keep a pronunciation request below 2,000 characters.');

  const token = ++speechSequence;
  stopCurrentAudio();

  // Start/resume audio synchronously in the original tap gesture before model inference.
  const context = getAudioContext();
  const resumePromise = context && context.state === 'suspended' ? context.resume() : Promise.resolve();

  onStage('Loading the selected Phonon voice');
  const tts = await loadTts(voiceId, progress => {
    const file = progress?.file || 'voice files';
    const amount = progress?.total ? ` · ${Math.round(progress.loaded / progress.total * 100)}%` : '';
    onStage(`Loading ${file}${amount}`);
  });
  if (token !== speechSequence) return;
  onStage('Generating speech');
  const wav = await tts.synthWav(sourceText, { voice: voice.name });
  if (token !== speechSequence) return;
  onStage('Preparing audio playback');

  if (context) {
    await resumePromise;
    if (context.state !== 'running') throw new Error(`iOS audio context is ${context.state}; playback could not start.`);
    if (token !== speechSequence) return;
    const audioBuffer = await context.decodeAudioData(await wav.arrayBuffer());
    if (token !== speechSequence) return;
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = Math.max(0.65, Math.min(1.25, Number(rate) || 0.88));
    source.connect(context.destination);
    activeSource = source;
    onStage('Playing Phonon audio');
    await new Promise((resolve, reject) => {
      source.onended = () => {
        source.buffer = null;
        if (activeSource === source) activeSource = null;
        resolve();
      };
      try { source.start(0); } catch (error) { reject(error); }
    });
    return;
  }

  // Fallback for browsers without Web Audio. The system voice remains the app-level fallback
  // if the browser blocks this delayed audio-element playback.
  const url = URL.createObjectURL(wav);
  const audio = new Audio(url);
  activeAudio = audio;
  audio.playbackRate = Math.max(0.65, Math.min(1.25, Number(rate) || 0.88));
  try {
    const finished = new Promise(resolve => {
      activeAudioCancel = resolve;
      audio.addEventListener('ended', resolve, { once: true });
      audio.addEventListener('error', resolve, { once: true });
    });
    await audio.play();
    onStage('Playing Phonon audio');
    await finished;
  } finally {
    if (activeAudio === audio) activeAudio = null;
    activeAudioCancel = null;
    URL.revokeObjectURL(url);
  }
}

export async function deleteAllNeuralVoices() {
  terminateNeuralWorker();
  const cache = await openPhononCache();
  if (!cache) return false;
  let removed = false;
  for (const url of [...Object.values(VOICE_URLS), ...Object.values(MODEL_URLS)]) {
    removed = (await cache.delete(url)) || removed;
  }
  return removed;
}

export function stopNeuralSpeech() {
  speechSequence++;
  stopCurrentAudio();
}

export function terminateNeuralWorker() {
  stopNeuralSpeech();
  disposeEngine();
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {});
  }
  audioContext = null;
}

export const neuralVoiceModelIds = Object.freeze({
  nele: 'Nele', anton: 'Anton', zoey: 'Zoey', easton: 'Easton'
});
