# SayIt: pronunciation coach

Learn how native speakers stress, link, breathe and use pitch, then practise and get scored and corrected.

- Live app (claude.ai artifact): https://claude.ai/artifact/N9k4igGqmuXyXuemi7H6TC
- Source: `app/index.html` (open it in a browser; Claude features only work inside claude.ai)
- Start with `CLAUDE.md`, then `docs/`.

```bash
python3 tools/analyze_recording.py my_recording.m4a        # offline prosody report
node tests/analysis_harness.js app/index.html my.wav       # run the app's analysis in Node
```
