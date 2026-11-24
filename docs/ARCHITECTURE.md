# Architecture: `app/index.html`

One file: `<style>`, markup, then one script block wrapped in `{ ... }`. No libraries, no build step.

## UI layout
- **Header** (cobalt band): title, the language you're learning (`#tl`: en-US, en-GB, fr-FR, es-ES, de-DE,
  it-IT, pt-BR), your native language (`#l1`), model voice (`#vsel`: Claude or browser).
- **Left column**
  - *Your script* card with two tabs: **Edit text** (textarea, 3 preset texts, "Mark up with Claude",
    "Use without mark-up") and **Marked-up script** (paragraphs with Listen / Slow / Practise buttons and
    the marked words; clicking a word speaks it at 0.75× speed).
  - *Words to drill* table (from Claude's mark-up).
- **Right column**
  - *Speak it*: the target paragraph, a large mic button (dictation), live transcript, then a score: % of
    words understood, words per minute, approximate pause count, and the text marked ok / heard as a
    different word / not heard.
  - *Analyse a recording*: file drop → 6 meters against native ranges, plus an SVG pitch line.
  - *Coaching*: "Get corrections" → Claude's JSON feedback (headline, strengths, fixes with drills, words).
  - *Your progress*: history table from `localStorage`.

## State
`state` = `{text, coach, sel, tl, l1, voice}`, saved to `localStorage['sayit-state']`.
History: `localStorage['sayit-hist']` (last 40 attempts).
`lastRun` (the last live attempt) and `lastAudio` (the last recording's measures) feed the coaching prompt.

## Mark-up format (what `coach()` asks Claude for)
```json
{"paras":[{"phrases":[{"w":[["Company","Com",0,0],["of","",0,0],["One","One",1,0]],"tone":"fall"}]}],
 "tricky":[{"word":"entrepreneur","say":"ahn-truh-pruh-NUR","tip":"..."}],
 "focus":["3-4 rules"]}
```
`w` entries are `[word, stressedSyllableLetters, isMainStress, linksToNext]`. Without Claude,
`plainModel()` splits phrases at punctuation and guesses the tone from the final punctuation mark.

## Live scoring (`evaluate()`)
- `norm()` lowercases text and strips punctuation (keeping letters, digits and apostrophes).
- `align(target, said)` runs a word-level Levenshtein alignment and backtraces it to ok / sub / miss.
  Inserted extra words are ignored.
- Speaking time runs from the first to the last dictation event. Pauses are counted as gaps of more than
  700 ms between dictation events, which is a rough approximation.

## Recording analysis (`analyse(file)`)
1. Decode with `OfflineAudioContext.decodeAudioData`, then re-render at 8 kHz mono (this resamples properly),
   plus a second render through a 1 kHz bandpass filter (Q 0.6) for syllable detection.
2. Frames: 10 ms hop, 25 ms window → loudness in dB. Speech = above floor + 0.2 × (p95 − p10).
   Gaps under 150 ms are filled and runs under 80 ms dropped.
3. Breath groups are split at gaps of 300 ms or more. "Pauses" are gaps of at least 0.3 s; "long" ones at least 1 s.
4. Syllables: local maxima (±4 frames) of the smoothed bandpass loudness, at least 2.5 dB above the minimum
   within ±12 frames, at least 80 ms apart.
5. Pitch: normalised autocorrelation on 40 ms frames every 20 ms, lags 20–115 (70–400 Hz), kept if r > 0.5,
   5-point median filter, then **octave folding** to within ±9 semitones of the median.
6. Measures: rate (syllables / active time), articulation (syllables / speaking time), words per breath
   group (syllables ÷ groups ÷ 1.4), % of time speaking, pitch range p10–p90 in semitones, and the share of
   phrases (≥ 0.8 s) whose last ~120 ms is more than 1 semitone below the first half (counted as falling).
7. Native target ranges (in `drawMeters`): rate 3.8–5.5, articulation 5–6.5, words per group 4–8,
   speaking 75–90%, pitch 6–12 semitones, falling endings 55–90%.
It runs in about 0.5 s for 93 s of audio in Node.

## Claude prompts
Both prompts ask for **JSON only** and are sent through `sample.json()`. If that fails with anything other
than `not_granted` or `rate_limited`, the code falls back to `sample()` and slices the text from the first
`{` to the last `}`. `not_granted` → `sample = null` and Claude features are hidden; `rate_limited` → ask
the user to wait.

## Platform constraints (claude.ai artifact runtime, contract 0.2.99)
- CSP: inline scripts, plus cdnjs / jsdelivr / unpkg; Google Fonts; no external fetch; images only as data: or blob:.
- Blocked in the frame: microphone, camera, alert/confirm/prompt, downloads, window.open, clipboard reads.
- `claude.use('sample' | 'dictation' | 'tts')` → a namespace or `null` (resolves later, never during the first run).
  - dictation: Chromium browsers or the Claude desktop app's main window only. `start()` must be called
    directly from a click. Events: `onPartial`, `onFinal`, `onState`. No language parameter.
  - tts: `speak(text, {rate 0.7–1.5, language, voice})`, up to 2,000 characters; not available on Safari or
    the mobile apps. The app falls back to `speechSynthesis` with the matching `lang`.
- Capabilities must be **declared** after publishing (`declare_capabilities`), or `use()` returns null.

## Hosting outside claude.ai
Outside claude.ai, `window.claude` does not exist. To ship it as a normal web app:
- Mic: `getUserMedia` + `MediaRecorder` → this also allows **live** prosody analysis (reuse `analyse()` on the blob).
- Speech-to-text: the Web Speech API (Chrome), or a server-side STT such as Whisper.
- Claude mark-up and coaching: a backend route calling the Anthropic API (never put the API key in the page).
- TTS: `speechSynthesis` (already the fallback).
The Vercel and Supabase connectors were available in the original session if the user wants that route.
