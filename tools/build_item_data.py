#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "lua_chunks"
OUTPUT_PATH = ROOT / "extension" / "data" / "item-names.json"
SEARCH_INDEX_PATH = ROOT / "extension" / "data" / "item-search-index.json"

FILE_PATTERN = "item_names_*.lua"
ENTRY_PATTERN = re.compile(
    r'\["(?P<id>\d+)"\]\s*=\s*\{en\s*=\s*"(?P<en>(?:\\.|[^"])*)",\s*zh\s*=\s*"(?P<zh>(?:\\.|[^"])*)"\}'
)
CJK_PATTERN = re.compile(r"[\u3400-\u9FFF]")
ALIAS_PREFIX_PAIRS = [
    ("Enchant Shoulder - ", "\u9644\u9b54\u62a4\u80a9 - "),
    ("Enchant Shoulders - ", "\u9644\u9b54\u62a4\u80a9 - "),
    ("Enchant Weapon - ", "附魔武器 - "),
    ("Enchant 2H Weapon - ", "附魔双手武器 - "),
    ("Enchant Helm - ", "附魔头盔 - "),
    ("Enchant Ring - ", "附魔戒指 - "),
    ("Enchant Cloak - ", "附魔披风 - "),
    ("Enchant Chest - ", "附魔胸甲 - "),
    ("Enchant Bracers - ", "附魔护腕 - "),
    ("Enchant Boots - ", "附魔靴子 - "),
    ("Enchant Gloves - ", "附魔手套 - "),
    ("Enchant Shield - ", "附魔盾牌 - "),
    ("Enchant Necklace - ", "附魔项链 - "),
]


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


def iter_aliases(en_name: str, zh_name: str) -> list[tuple[str, str]]:
    aliases: list[tuple[str, str]] = []

    for en_prefix, zh_prefix in ALIAS_PREFIX_PAIRS:
        if en_name.startswith(en_prefix) and zh_name.startswith(zh_prefix):
            aliases.append(
                (
                    en_name[len(en_prefix):].strip(),
                    zh_name[len(zh_prefix):].strip(),
                )
            )

    return aliases


def main() -> None:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"Missing source directory: {SOURCE_DIR}")

    by_id: dict[str, str] = {}
    by_name_candidates: dict[str, set[str]] = defaultdict(set)
    alias_candidates: dict[str, set[str]] = defaultdict(set)
    search_entries: set[tuple[str, str]] = set()

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
            for alias_en, alias_zh in iter_aliases(en_name, zh_name):
                if alias_en and alias_zh:
                    alias_candidates[alias_en].add(alias_zh)
                    by_name_candidates[alias_en].add(alias_zh)
            if CJK_PATTERN.search(zh_name):
                search_entries.add((zh_name, en_name))
            total_rows += 1

    # English-name fallback is useful, but ambiguous names should be skipped.
    by_name = {
        en_name: next(iter(zh_names))
        for en_name, zh_names in by_name_candidates.items()
        if len(zh_names) == 1
    }
    by_alias = {
        en_name: next(iter(zh_names))
        for en_name, zh_names in alias_candidates.items()
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
            "uniqueAliasEnglishNames": len(alias_candidates),
            "fallbackAliasEnglishNames": len(by_alias),
            "ambiguousEnglishNames": len(ambiguous_names),
        },
        "byId": dict(sorted(by_id.items(), key=lambda item: int(item[0]))),
        "byName": dict(sorted(by_name.items())),
        "byAlias": dict(sorted(by_alias.items())),
    }

    search_payload = {
        "meta": {
            "entries": len(search_entries),
        },
        "entries": [
            [zh_name, en_name]
            for zh_name, en_name in sorted(search_entries)
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    SEARCH_INDEX_PATH.write_text(
        json.dumps(search_payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"Wrote {OUTPUT_PATH}")
    print(f"Wrote {SEARCH_INDEX_PATH}")
    print(json.dumps(payload["meta"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
