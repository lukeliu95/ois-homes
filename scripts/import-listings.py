#!/usr/bin/env python3
"""Import reviewed public listings without hard-coding property IDs or prices."""
import argparse
import json
from pathlib import Path
from datetime import date, datetime
from zoneinfo import ZoneInfo
from listing_catalog import export_catalog


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--curation', type=Path)
    parser.add_argument('--as-of', help='Japan calendar date supplied by the active task, YYYY-MM-DD')
    parser.add_argument('--provenance-script', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    curation = args.curation or root / 'content/curation.json'
    reviewed = json.loads(curation.read_text())['homes']
    today = date.fromisoformat(args.as_of) if args.as_of else datetime.now(ZoneInfo('Asia/Tokyo')).date()
    result = export_catalog(root, args.source.resolve(), reviewed, today, args.provenance_script)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
