import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://vedabase.io/en/library/bg';
const OUT_DIR = path.resolve('supabase');
const CHUNK_DIR = path.join(OUT_DIR, 'seed-verses');
const JSON_OUT = path.join(OUT_DIR, 'vedabase-gita-verses.json');
const SQL_OUT = path.join(OUT_DIR, 'seed-verses.sql');
const SQL_CHUNK_SIZE = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHtml = (value = '') => {
  const named = {
    amp: '&',
    apos: "'",
    copy: '(c)',
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',
    ndash: '-',
    mdash: '-',
  };

  return value
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name] ?? match);
};

const stripTags = (html = '') => decodeHtml(html)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|h\d)>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/\r/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const extractSection = (html, className, nextClassName) => {
  const start = html.indexOf(`class="av-${className}"`);
  if (start === -1) return '';

  const end = nextClassName
    ? html.indexOf(`class="av-${nextClassName}"`, start)
    : html.indexOf('<nav class="em-mt', start);

  return html.slice(start, end === -1 ? undefined : end);
};

const extractInnerText = (html, className, nextClassName) => {
  const section = extractSection(html, className, nextClassName);
  return stripTags(section.replace(/<h2[\s\S]*?<\/h2>/gi, ''));
};

const normalizePurport = (value) => value
  .replace(/^Purport\s*/i, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const sqlString = (value) => {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const discoverChapterVerses = async (chapter) => {
  const sourceUrl = `${BASE_URL}/${chapter}/`;
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'GitaLife importer; contact site owner for permissions',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed ${sourceUrl}: ${response.status}`);
  }

  const html = await response.text();
  const refs = new Set();
  const linkPattern = new RegExp(`href="/en/library/bg/${chapter}/([^"/]+)/"`, 'g');
  let match = linkPattern.exec(html);

  while (match) {
    if (/^\d+(?:-\d+)?$/.test(match[1])) refs.add(match[1]);
    match = linkPattern.exec(html);
  }

  return [...refs].sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]));
};

const fetchVerse = async (chapter, verseRef) => {
  const sourceUrl = `${BASE_URL}/${chapter}/${verseRef}/`;
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'GitaLife importer; contact site owner for permissions',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed ${sourceUrl}: ${response.status}`);
  }

  const html = await response.text();

  return {
    chapter,
    verse_ref: verseRef,
    verse_number: Number(verseRef.split('-')[0]),
    sanskrit: extractInnerText(html, 'devanagari', 'verse_text'),
    transliteration: extractInnerText(html, 'verse_text', 'synonyms'),
    synonyms: extractInnerText(html, 'synonyms', 'translation'),
    translation: extractInnerText(html, 'translation', 'purport').replace(/^Translation\s*/i, '').trim(),
    purport: normalizePurport(extractInnerText(html, 'purport')),
    source_url: sourceUrl,
    is_active: true,
  };
};

const toInsertSql = (verses) => {
  const rows = verses.map((verse) => `(${[
    verse.chapter,
    sqlString(verse.verse_ref),
    verse.verse_number,
    sqlString(verse.sanskrit),
    sqlString(verse.transliteration),
    sqlString(verse.synonyms),
    sqlString(verse.translation),
    sqlString(verse.purport),
    sqlString(verse.source_url),
    verse.is_active,
  ].join(', ')})`);

  return `insert into public.verses (
  chapter,
  verse_ref,
  verse_number,
  sanskrit,
  transliteration,
  synonyms,
  translation,
  purport,
  source_url,
  is_active
) values
${rows.join(',\n')}
on conflict (chapter, verse_ref) do update set
  sanskrit = excluded.sanskrit,
  transliteration = excluded.transliteration,
  synonyms = excluded.synonyms,
  translation = excluded.translation,
  purport = excluded.purport,
  source_url = excluded.source_url,
  is_active = excluded.is_active,
  updated_at = now();
`;
};

const writeOutputs = async (verses) => {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(CHUNK_DIR, { recursive: true, force: true });
  await mkdir(CHUNK_DIR, { recursive: true });

  await writeFile(JSON_OUT, `${JSON.stringify(verses, null, 2)}\n`, 'utf8');
  await writeFile(SQL_OUT, toInsertSql(verses), 'utf8');

  for (let index = 0; index < verses.length; index += SQL_CHUNK_SIZE) {
    const chunkNumber = String(index / SQL_CHUNK_SIZE + 1).padStart(3, '0');
    const chunk = verses.slice(index, index + SQL_CHUNK_SIZE);
    await writeFile(
      path.join(CHUNK_DIR, `${chunkNumber}.sql`),
      toInsertSql(chunk),
      'utf8',
    );
  }
};

const main = async () => {
  if (process.argv.includes('--from-json')) {
    const verses = JSON.parse(await readFile(JSON_OUT, 'utf8'));
    await writeOutputs(verses);
    process.stdout.write(`Rewrote SQL files for ${verses.length} verses from ${JSON_OUT}\n`);
    return;
  }

  const verses = [];
  for (let chapter = 1; chapter <= 18; chapter += 1) {
    process.stdout.write(`Discovering Bhagavad-gita chapter ${chapter}\n`);
    const verseRefs = await discoverChapterVerses(chapter);

    for (const verseRef of verseRefs) {
      process.stdout.write(`Fetching Bhagavad-gita ${chapter}.${verseRef}\n`);
      verses.push(await fetchVerse(chapter, verseRef));
      await sleep(150);
    }
  }

  await writeOutputs(verses);

  process.stdout.write(`Wrote ${verses.length} verses to ${JSON_OUT}\n`);
  process.stdout.write(`Wrote Supabase seed SQL to ${SQL_OUT}\n`);
  process.stdout.write(`Wrote chunked Supabase seed SQL to ${CHUNK_DIR}\n`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
