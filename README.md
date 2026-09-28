# Trophy Hunt Daily — Leaderboard site

Static GitHub Pages site for the Gone To The Dogs Trophy Hunt leaderboard.

## Files

- `index.html` — page shell + the single `<script id="th-data" type="application/json">` data block.
  All four boards (Daily / Weekly / Monthly / All-Time) render from this block only.
- `styles.css` — dark sporty theme, mobile-friendly.
- `app.js` — renders the tables from `#th-data`. **Never invents players**: it renders
  exactly what the data block contains, nothing else.
- `render.py` — refreshes the `#th-data` block from `../ledger/leaderboard.json`.
  Run from this directory: `python3 render.py`

## Updating standings (for the claim-watcher cron)

```sh
cd site && python3 render.py && git add -A && git commit -m "standings <date>" && git push
```

GitHub Pages republishes automatically on push. Never commit secrets, API keys,
tokens, or anything private here — only these public site files. Player handles
and points are already public on the live board.
