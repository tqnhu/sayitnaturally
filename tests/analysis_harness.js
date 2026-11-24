// Runs the web app's audio analysis (analyse() in app/index.html) in Node, with no browser.
// Stubs the DOM and OfflineAudioContext, feeds in a 16 kHz mono 16-bit WAV, and prints the meters.
//
//   ffmpeg -i recording.m4a -ac 1 -ar 16000 /tmp/a.wav
//   node tests/analysis_harness.js app/index.html /tmp/a.wav
//
// Limitation: the stub downsamples 16k -> 8k by dropping every second sample (no anti-alias filter)
// and passes audio straight through in place of the 1 kHz bandpass. Results are close to a real
// browser's, but not identical.
const fs = require('fs');
const [htmlPath, wavPath] = process.argv.slice(2);
if (!htmlPath || !wavPath) { console.error('usage: node tests/analysis_harness.js app/index.html file.wav'); process.exit(1); }

const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const appJs = scripts[scripts.length - 1];

const els = {};
function mk(id) {
  return els[id] || (els[id] = {
    id, innerHTML: '', textContent: '', value: '', disabled: false, dataset: {}, style: {}, clientWidth: 600, clientHeight: 190,
    classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, addEventListener() {}, scrollIntoView() {},
    selectedOptions: [{ textContent: 'English (American)' }]
  });
}
global.document = { getElementById: mk, addEventListener() {}, querySelectorAll: () => [] };
global.window = global; global.innerWidth = 1200;
global.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = v; } };
global.ResizeObserver = class { observe() {} };

const wav = fs.readFileSync(wavPath);
const pcm = new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) / 2);
const f32 = Float32Array.from(pcm, v => v / 32768);
global.OfflineAudioContext = class {
  constructor(c, n, sr) { this.n = n; this.sr = sr; }
  decodeAudioData() { return Promise.resolve({ duration: f32.length / 16000, d: f32 }); }
  createBufferSource() { const me = this; return { set buffer(b) { me.b = b; }, connect() {}, start() {} }; }
  createBiquadFilter() { return { type: '', frequency: {}, Q: {}, connect() {} }; }
  get destination() { return {}; }
  startRendering() { const out = new Float32Array(this.n); for (let i = 0; i < this.n; i++) out[i] = this.b.d[i * 2] || 0; return Promise.resolve({ getChannelData: () => out }); }
};

eval(appJs);
const t = Date.now();
els.file.onchange({ target: { files: [{ name: wavPath, arrayBuffer: async () => new ArrayBuffer(0) }], value: '' } });
(function wait() {
  const done = els.aStatus.textContent.includes('analysed') || els.aStatus.innerHTML.includes('err');
  if (!done) return setTimeout(wait, 50);
  console.log('time', Date.now() - t, 'ms');
  console.log(els.aStatus.textContent || els.aStatus.innerHTML);
  console.log(els.meters.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
})();
