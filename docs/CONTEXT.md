# Project context: how SayIt started

Taken from a claude.ai chat on 2026-11-24.

## Timeline
1. **Recording analysis.** The user uploaded a 93-second `.m4a` of themselves reading the *Company of One*
   book blurb and asked for an analysis against American (General American) English with improvement advice.
   - The chat sandbox had no speech-to-text (no Whisper or Vosk) and package installs were blocked, so
     **only prosody was measured** (timing, pauses, pitch). Individual sounds were never assessed.
   - Results and advice: see `PRONUNCIATION-BASELINE.md`.
2. **Marked-up script.** The user supplied the text. Claude produced a stress / breath / linking / intonation
   marked version plus a table of words to drill (see `PRONUNCIATION-BASELINE.md`).
3. **App request.** "Create an app to allow practicing, evaluation and correction of foreign language
   pronunciation. The goal is to let non native speaker understand the natural speaking methodology and can
   practice to perfectionate his speaking." This produced `app/index.html`, published as a claude.ai artifact.
4. **Hand-off.** The user asked for this repo so they can continue in Claude Code.

## Decisions and why
| Decision | Reason |
|---|---|
| A single HTML file, published as a claude.ai artifact | Shareable link, runs on any device, no backend; it can ask Claude and use dictation and TTS through platform capabilities |
| Live speech through the `dictation` capability, not the Web Speech API or `getUserMedia` | The artifact's sandboxed frame blocks microphone access |
| Audio analysis only from an **uploaded file** | Dictation gives text, not audio; file inputs are allowed in the frame |
| Word-level scoring by aligning the recognised words with the target text (Levenshtein on words) | No phoneme recogniser is available; "understood by a recogniser" is a fair proxy for intelligibility. The UI says so |
| Claude (`sample`) does the mark-up **and** the corrections | Stress, phrasing and L1-specific advice need language knowledge, not signal processing. Misheard words let Claude infer the sound error (heard "sink" for "think" → TH became S) |
| Mark-up JSON stores each word as `[word, stressedSyllableLetters, isMainStress, linksToNext]` | Keeps the original spelling and case; the stressed part is highlighted by substring match |
| History in `localStorage` only | A per-viewer convenience; nothing needs sharing yet |
| Native-language selector (default French), target-language selector (7 languages) | The user asked for "foreign language" in general; their own case is French → American English |
| Octave-error folding in the pitch tracker (±9 semitones → shift by 12) | Without it the app reported 16 semitones for the user's recording, against 5 from the Python analysis |

## Correction made during the chat
The first analysis said the user's runs of speech were only "2–3 words" between pauses. That counted every
tiny gap. Counting only pauses of 0.3 s or more, the user averages **about 7 words per breath group**, which
is normal. The real priorities are speed while talking, pitch range and falling statement endings.

## Open questions (ask the user)
- Is their native language really French?
- Should the app stay a claude.ai artifact, or become a hosted app (Vercel and Supabase connectors were
  available in the session)? See ROADMAP.md.
- Does dictation recognise non-English target languages? It takes no language parameter; this is untested.
- Has the user tried the app yet? No feedback has been received.
