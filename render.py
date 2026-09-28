#!/usr/bin/env python3
"""Regenerate the Trophy Hunt leaderboard site's data block.

Reads ../ledger/leaderboard.json and replaces the <script id="th-data">
JSON block in index.html with the current snapshot. The page renders
ONLY what this block contains — never invent players.

Usage: python3 render.py   (run from the site/ directory)
"""
import json
import re
import sys
from pathlib import Path

SITE_DIR = Path(__file__).resolve().parent
LEDGER = SITE_DIR.parent / "ledger" / "leaderboard.json"
INDEX = SITE_DIR / "index.html"

PATTERN = re.compile(
    r'(<script id="th-data" type="application/json">\s*).*?(\s*</script>)',
    re.DOTALL,
)


def main() -> int:
    if not LEDGER.exists():
        print(f"ERROR: ledger not found: {LEDGER}", file=sys.stderr)
        return 1
    if not INDEX.exists():
        print(f"ERROR: index.html not found: {INDEX}", file=sys.stderr)
        return 1

    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    html = INDEX.read_text(encoding="utf-8")

    if "</script>" in json.dumps(ledger):
        print("ERROR: ledger data contains '</script>' — refusing to embed.", file=sys.stderr)
        return 1

    block = json.dumps(ledger, indent=1, ensure_ascii=False)
    new_html, n = PATTERN.subn(lambda m: m.group(1) + block + m.group(2), html, count=1)
    if n != 1:
        print("ERROR: could not find exactly one #th-data block in index.html", file=sys.stderr)
        return 1

    INDEX.write_text(new_html, encoding="utf-8")

    players = sorted(
        ledger.get("all_time", {}).items(), key=lambda kv: kv[1], reverse=True
    )
    print(f"rendered {len(players)} players into #th-data (updated_at={ledger.get('updated_at')})")
    for handle, pts in players:
        print(f"  {handle}: {pts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
