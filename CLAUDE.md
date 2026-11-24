# SayIt: pronunciation coach

A web app that helps non-native speakers learn how natural speech works (stress, rhythm, linking, intonation) and practise until they sound natural. It started in a claude.ai chat on 2026-11-24; this repo continues that work.

Read these before making changes:
- `docs/CONTEXT.md`: how the project started, decisions made and why, open questions
- `docs/ARCHITECTURE.md`: how `app/index.html` works, platform constraints, the analysis algorithm
- `docs/PRONUNCIATION-BASELINE.md`: the user's own measured baseline and marked-up practice script (the first real test data)
- `docs/ROADMAP.md`: what to build next

## Repo layout
```
app/index.html               The whole app: one self-contained HTML file (CSS + JS inline, ~520 lines)
tools/analyze_recording.py   Offline Python prosody analysis (ffmpeg + numpy + scipy), the original method
tests/analysis_harness.js    Runs the app's JS analyse() in Node on a WAV file, with DOM/audio stubs
docs/                        Context and design docs
```

## The live app
- Published as a claude.ai artifact: https://claude.ai/artifact/N9k4igGqmuXyXuemi7H6TC
  (slug `ab4866b6-854e-475e-92c4-fb1521f596a3`; private to the owner until shared)
- Declared capabilities: `sample` (asks Claude), `dictation` (speech to text), `tts` (Claude voice)
- To update it you need the claude.ai artifact tools (`publish_files` with the slug and the current
  `base_version`, `mode: "patch"`). Plain Claude Code may not have them; if so, edit here and ask the
  user to republish from a claude.ai chat, or see "Hosting outside claude.ai" in docs/ARCHITECTURE.md.

## Commands
```bash
# Test the app's analysis code against a recording (no browser needed)
ffmpeg -i recording.m4a -ac 1 -ar 16000 /tmp/a.wav
node tests/analysis_harness.js app/index.html /tmp/a.wav

# Syntax-check the app's script
node -e "const s=require('fs').readFileSync('app/index.html','utf8');const m=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)];require('fs').writeFileSync('/tmp/app.js',m[m.length-1][1])" && node --check /tmp/app.js

# Original Python analysis
python3 tools/analyze_recording.py recording.m4a
```
Open `app/index.html` directly in a browser for a quick look. Outside claude.ai, `claude.use()` does not
exist, so Claude mark-up, Claude coaching, the Claude voice and dictation are switched off. The browser
voice, recording upload and analysis still work.

## Rules for working on the app
- Keep it **one self-contained HTML file** while it lives as a claude.ai artifact. Scripts may only load from
  cdnjs / jsdelivr / unpkg; fonts only from Google Fonts; no `fetch` to other hosts.
- The artifact frame **blocks `getUserMedia` (microphone)**, alerts, downloads and `window.open`. Live speech
  only works through the `dictation` capability; audio analysis only through an uploaded file.
- Every `claude.use(name)` can resolve to `null`: design for absence (hide the control, keep a fallback).
- Text from Claude, dictation or files is data: render it with `textContent` or `esc()`, never as raw HTML.
- Keep all JS inside the single `{ ... }` block at the end of `<body>`; one runtime error blanks the page.
- After changing `analyse()`, run the harness on a real recording and check the numbers still make sense.
  The baseline recording should give a pitch range of about 5 semitones, not 16 (16 means octave errors).
- Native-speaker target ranges live in `drawMeters()`; they are rough conversational norms for English.

## The user
- Learning **American English**. Their native language was assumed to be **French** (Paris time zone) but
  they never confirmed it; it is the app's default.
- Wants to *understand* the method of natural speech, not just get a score. Explanations matter.
