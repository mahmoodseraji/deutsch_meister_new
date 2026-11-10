import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/piper-core.js';

const core = globalThis.PiperCore;

 test('parses valid Piper phoneme output and normalizes numeric IDs', () => {
  assert.deepEqual(core.parsePhonemizerOutput('{"phoneme_ids":[1,"2",3]}'), [1, 2, 3]);
});

test('rejects empty, malformed, or unsafe phoneme output', () => {
  assert.throws(() => core.parsePhonemizerOutput(''), /no output/i);
  assert.throws(() => core.parsePhonemizerOutput('not json'), /invalid json/i);
  assert.throws(() => core.parsePhonemizerOutput('{"phoneme_ids":[]}'), /no phoneme IDs/i);
  assert.throws(() => core.parsePhonemizerOutput('{"phoneme_ids":[-1]}'), /invalid phoneme ID/i);
});

test('builds correctly typed ONNX inputs and inference scales', () => {
  class Tensor { constructor(type, data, dims) { this.type = type; this.data = data; this.dims = dims; } }
  const feeds = core.buildFeeds({ Tensor }, [1, 2, 3], {
    inference: { noise_scale: 0.5, length_scale: 1.1, noise_w: 0.7 },
    num_symbols: 256, num_speakers: 2, speaker_id_map: { default: 0 }
  });
  assert.equal(feeds.input.type, 'int64');
  assert.deepEqual([...feeds.input.data], [1n, 2n, 3n]);
  assert.deepEqual(feeds.input.dims, [1, 3]);
  assert.deepEqual([...feeds.input_lengths.data], [3n]);
  assert.ok(Math.abs(feeds.scales.data[0] - 0.5) < 1e-6);
  assert.ok(Math.abs(feeds.scales.data[1] - 1.1) < 1e-6);
  assert.ok(Math.abs(feeds.scales.data[2] - 0.7) < 1e-6);
  assert.deepEqual(feeds.input_lengths.dims, [1]);
  assert.deepEqual(feeds.scales.dims, [3]);
  assert.deepEqual([...feeds.sid.data], [0n]);
});

test('encodes mono Float32 PCM as a valid 16-bit WAV file', () => {
  const buffer = core.pcmToWav(new Float32Array([0, 0.5, -0.5, 1, -1]), 22050);
  const view = new DataView(buffer);
  const text = offset => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  assert.equal(text(0), 'RIFF');
  assert.equal(text(8), 'WAVE');
  assert.equal(text(36), 'data');
  assert.equal(view.getUint32(24, true), 22050);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 10);
  assert.equal(view.getInt16(46, true), 16383);
  assert.equal(view.getInt16(48, true), -16384);
});
