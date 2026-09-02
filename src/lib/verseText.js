const htmlEntities = {
  amp: "&",
  apos: "'",
  copy: "(c)",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "-",
  mdash: "-",
};

export const decodeHtml = (value = "") => {
  const decoded = String(value)
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => htmlEntities[name] ?? match);

  if (typeof document === "undefined") return decoded;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = decoded;
  return textarea.value;
};

export const cleanVerseText = (value = "") =>
  decodeHtml(value)
    .replace(/class=(?:"|')?av-(?:devanagari|verse_text|translation|synonyms|purport)(?:"|')?\s*>?/gi, "")
    .replace(/<\s*\/?\s*div[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

export const formatDevanagari = (value = "") =>
  cleanVerseText(value)
    .replace(/\s*\u0964\s*/g, " \u0964\n")
    .replace(/\s*\u0965\s*/g, " \u0965\n")
    .trim();
