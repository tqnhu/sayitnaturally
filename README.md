# SayIt: pronunciation coach

Learn how native speakers stress, link, breathe and use pitch, then practise and get scored and corrected.

- Live app (claude.ai artifact): https://claude.ai/artifact/N9k4igGqmuXyXuemi7H6TC
- Source: `app/index.html` (open it in a browser; Claude features only work inside claude.ai)
- Start with `CLAUDE.md`, then `docs/`.

```bash
python3 tools/analyze_recording.py my_recording.m4a        # offline prosody report
node tests/analysis_harness.js app/index.html my.wav       # run the app's analysis in Node
```

## Hosted web app (`web/`)
The hosted version of SayIt: Next.js with real microphone recording and the same prosody analysis, ported to
TypeScript (`web/lib/analysis.ts`). Analysis runs in the browser; nothing is uploaded.
```bash
cd web && npm install
npm run dev     # http://localhost:3000
npm test        # synthetic-signal check of the analysis
```
Not built yet: Claude mark-up and coaching (needs a server route), speech-to-text scoring, accounts and history.
