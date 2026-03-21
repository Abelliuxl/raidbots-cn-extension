#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "lua_chunks"
OUTPUT_PATH = ROOT / "extension" / "data" / "item-names.json"

FILE_PATTERN = "item_names_*.lua"
ENTRY_PATTERN = re.compile(
    r'\["(?P<id>\d+)"\]\s*=\s*\{en\s*=\s*"(?P<en>(?:\\.|[^"])*)",\s*zh\s*=\s*"(?P<zh>(?:\\.|[^"])*)"\}'
)


def unescape_lua_string(value: str) -> str:
    replacements = {
        r"\\": "\\",
        r"\"": '"',
        r"\n": "\n",
        r"\r": "\r",
        r"\t": "\t",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    return value


def iter_source_files() -> list[Path]:
    return sorted(
        SOURCE_DIR.glob(FILE_PATTERN),
        key=lambda path: int(path.stem.rsplit("_", 1)[-1]),
    )


def main() -> None:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"Missing source directory: {SOURCE_DIR}")

    by_id: dict[str, str] = {}
    by_name_candidates: dict[str, set[str]] = defaultdict(set)

    source_files = iter_source_files()
    if not source_files:
        raise SystemExit(f"No source files found under {SOURCE_DIR}")

    total_rows = 0
    for path in source_files:
        text = path.read_text(encoding="utf-8")
        matches = list(ENTRY_PATTERN.finditer(text))
        if not matches:
            raise SystemExit(f"No entries matched in {path}")

        for match in matches:
            item_id = match.group("id")
            en_name = unescape_lua_string(match.group("en"))
            zh_name = unescape_lua_string(match.group("zh"))

            by_id[item_id] = zh_name
            by_name_candidates[en_name].add(zh_name)
            total_rows += 1

    # English-name fallback is useful, but ambiguous names should be skipped.
    by_name = {
        en_name: next(iter(zh_names))
        for en_name, zh_names in by_name_candidates.items()
        if len(zh_names) == 1
    }

    ambiguous_names = {
        en_name: sorted(zh_names)
        for en_name, zh_names in by_name_candidates.items()
        if len(zh_names) > 1
    }

    payload = {
        "meta": {
            "sourceFiles": len(source_files),
            "totalRows": total_rows,
            "uniqueItemIds": len(by_id),
            "uniqueEnglishNames": len(by_name_candidates),
            "fallbackEnglishNames": len(by_name),
            "ambiguousEnglishNames": len(ambiguous_names),
        },
        "byId": dict(sorted(by_id.items(), key=lambda item: int(item[0]))),
        "byName": dict(sorted(by_name.items())),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"Wrote {OUTPUT_PATH}")
    print(json.dumps(payload["meta"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
