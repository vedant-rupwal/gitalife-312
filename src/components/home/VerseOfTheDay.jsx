import React, { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import gitaVerseData from "@/data/bhagavad-gita-verses.json";
import { cleanVerseBlockText, cleanVerseText } from "@/lib/verseText";

const pickDailyVerse = (verses) => {
  if (!verses.length) return null;

  const today = new Date().toISOString().split("T")[0];
  const seed = today.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return verses[seed % verses.length];
};

export default function VerseOfTheDay({ embedded = false }) {
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verses = Array.isArray(gitaVerseData?.verses) ? gitaVerseData.verses : [];
    setVerse(pickDailyVerse(verses));
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className={embedded ? "py-8" : "bg-navy py-20 px-4"}>
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="h-6 w-32 bg-white/10 rounded mb-8" />
          <div className="h-24 bg-white/10 rounded mb-6" />
          <div className="h-16 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  if (!verse) return null;

  const transliteration = cleanVerseBlockText(verse.transliteration);
  const translation = cleanVerseText(verse.translation);
  const reference = verse.reference || "BG";

  const content = (
    <div className={embedded ? "" : "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-left"}>
      <div className="flex items-center gap-2 mb-8">
        <BookOpen className="h-4 w-4 text-saffron" />
        <span className="font-heading text-sm font-semibold text-saffron tracking-wide uppercase">
          Verse of the Day - {reference}
        </span>
      </div>

      <div className="verse-blur transition-all duration-500">
        {transliteration && (
          <p className="max-w-4xl font-display whitespace-pre-line text-3xl sm:text-4xl lg:text-5xl font-medium text-white/95 leading-tight italic">
            {transliteration}
          </p>
        )}
        <div className="my-10 flex items-center gap-3">
          <div className="h-px w-12 bg-saffron/40" />
          <div className="h-2 w-2 rounded-full bg-saffron" />
          <div className="h-px w-12 bg-saffron/40" />
        </div>
        <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-5">
          Translation
        </h3>
        <p className="max-w-4xl font-display text-xl sm:text-2xl text-white/90 leading-relaxed">
          {translation}
        </p>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <section className="verse-portal relative bg-navy text-white py-20 lg:py-28 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px saffron-thread" />
      {content}
      <div className="absolute bottom-0 left-0 right-0 h-px saffron-thread" />
    </section>
  );
}
