import argparse
import html
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://vedabase.io/en/library/bg"
DEFAULT_OUT = Path("src/data/bhagavad-gita-verses.json")
HEADERS = {
    "User-Agent": "GitaLife312 minimal Bhagavad-gita JSON scraper; permission confirmed by site owner"
}
VERSE_PATH_RE = re.compile(r"^/en/library/bg/(?P<chapter>\d+)/(?P<verse>\d+(?:-\d+)?)/?$")


def clean_text(value):
    text = html.unescape(value or "")
    text = text.replace("\u00a0", " ").replace("\r", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def fetch_html(session, url, timeout):
    response = session.get(url, headers=HEADERS, timeout=timeout)
    response.raise_for_status()
    return response.text


def extract_copy_text(soup, selector):
    section = soup.select_one(selector)
    if not section:
        return ""

    clone = BeautifulSoup(str(section), "html.parser")
    for removable in clone.select("button, script, style, svg, noscript, h2"):
        removable.decompose()

    target = clone.select_one(".copy") or clone
    return clean_text(target.get_text("\n", strip=True))


def discover_chapter_verse_urls(session, chapter, timeout):
    index_url = f"{BASE_URL}/{chapter}/"
    soup = BeautifulSoup(fetch_html(session, index_url, timeout), "html.parser")
    urls_by_ref = {}

    for link in soup.select("a[href]"):
        parsed = urlparse(urljoin(index_url, link.get("href")))
        match = VERSE_PATH_RE.match(parsed.path)
        if not match or int(match.group("chapter")) != chapter:
            continue
        verse_ref = match.group("verse")
        urls_by_ref[verse_ref] = f"{BASE_URL}/{chapter}/{verse_ref}/"

    return [
        {"verse_ref": verse_ref, "source_url": urls_by_ref[verse_ref]}
        for verse_ref in sorted(urls_by_ref, key=verse_sort_key)
    ]


def verse_sort_key(verse_ref):
    start, _, end = verse_ref.partition("-")
    return (int(start), int(end or start))


def parse_verse_page(session, chapter, verse_ref, source_url, timeout):
    soup = BeautifulSoup(fetch_html(session, source_url, timeout), "html.parser")
    return {
        "reference": f"BG {chapter}.{verse_ref}",
        "transliteration": extract_copy_text(soup, ".av-verse_text"),
        "translation": extract_copy_text(soup, ".av-translation"),
    }


def parse_chapters(value):
    if not value:
        return list(range(1, 19))

    chapters = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = part.split("-", 1)
            chapters.extend(range(int(start), int(end) + 1))
        else:
            chapters.append(int(part))

    invalid = [chapter for chapter in chapters if chapter < 1 or chapter > 18]
    if invalid:
        raise ValueError(f"Bhagavad-gita chapters must be 1-18, got: {invalid}")

    return chapters


def scrape_verses(chapters, limit, delay, timeout):
    session = requests.Session()
    verses = []

    for chapter in chapters:
        print(f"Discovering Bhagavad-gita chapter {chapter}")
        verse_links = discover_chapter_verse_urls(session, chapter, timeout)

        for verse_link in verse_links:
            if limit is not None and len(verses) >= limit:
                return verses

            verse_ref = verse_link["verse_ref"]
            print(f"Fetching BG {chapter}.{verse_ref}")
            verse = parse_verse_page(
                session,
                chapter,
                verse_ref,
                verse_link["source_url"],
                timeout,
            )
            if not verse["transliteration"] or not verse["translation"]:
                raise RuntimeError(
                    f"Missing transliteration or translation for BG {chapter}.{verse_ref}"
                )
            verses.append(verse)
            time.sleep(delay)

    return verses


def build_arg_parser():
    parser = argparse.ArgumentParser(
        description=(
            "Scrape Bhagavad-gita verses from Vedabase into a minimal JSON file "
            "with transliteration and translation only."
        )
    )
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output JSON path.")
    parser.add_argument(
        "--chapters",
        default="1-18",
        help="Chapter list/range to scrape, for example 1, 1-3, or 1,3,5.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional maximum verse count for testing.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Delay in seconds between verse requests.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30,
        help="HTTP timeout in seconds.",
    )
    return parser


def main():
    args = build_arg_parser().parse_args()
    out_path = Path(args.out)
    chapters = parse_chapters(args.chapters)
    verses = scrape_verses(chapters, args.limit, args.delay, args.timeout)

    payload = {
        "source": "Vedabase",
        "book": "Bhagavad-gita As It Is",
        "fields": [
            "reference",
            "transliteration",
            "translation",
        ],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "verses": verses,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(verses)} verses to {out_path}")


if __name__ == "__main__":
    main()
