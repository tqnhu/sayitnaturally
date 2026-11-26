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
Next.js app with two modes and one Settings panel for language choices (saved on the device):
- **Learn**: pre-marked practice texts (or your own, marked up by Claude), words to drill, live scoring with the
  browser's speech recognition (Chrome, Edge, Safari), coaching.
- **Free practice**: paste a text, record or upload audio, see prosody meters and a pitch line, get coaching.
Audio analysis runs in the browser. Claude mark-up and coaching go through `/api/markup` and `/api/coach` using
the Vercel AI Gateway (no API key in code; set `AI_GATEWAY_API_KEY` locally).
```bash
cd web && npm install
npm run dev     # http://localhost:3000
npm test        # analysis, mark-up parsing and scoring checks
```
Rate limits on the AI routes (`web/lib/ratelimit*.ts`): 8 requests a minute and 40 an hour per client, shared across
`/api/coach` and `/api/markup`, plus 400 an hour overall. Counts are approximate (Vercel Runtime Cache, per region).
Not built yet: server-side speech-to-text, accounts, sound-level scoring.
