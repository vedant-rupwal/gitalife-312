import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { BookOpen } from "lucide-react";

const pickDailyVerse = (verses) => {
  if (!verses.length) return null;

  const today = new Date().toISOString().split("T")[0];
  const featured = verses.find((verse) => verse.is_displayed_today && verse.display_date === today);
  if (featured) return featured;

  const active = verses.filter((verse) => verse.is_active !== false);
  const pool = active.length ? active : verses;
  const seed = today.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool[seed % pool.length];
};

const decodeHtml = (value) => {
  if (typeof document === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const cleanVerseText = (value = "") =>
  decodeHtml(String(value))
    .replace(/class="[^"]*"\s*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const formatDevanagari = (value) =>
  cleanVerseText(value)
    .replace(/\s*।\s*/g, " ।\n")
    .replace(/\s*॥\s*/g, " ॥\n")
    .trim();

export default function VerseOfTheDay({ embedded = false }) {
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const verses = await appClient.entities.Verse.list("-created_date", 1000);
        setVerse(pickDailyVerse(verses));
      } catch {
        setVerse(null);
      } finally {
        setLoading(false);
      }
    })();
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

  const sanskrit = formatDevanagari(verse.sanskrit);
  const transliteration = cleanVerseText(verse.transliteration);
  const translation = cleanVerseText(verse.translation);

  const content = (
    <div className={embedded ? "" : "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-left"}>
      <div className="flex items-center gap-2 mb-8">
        <BookOpen className="h-4 w-4 text-saffron" />
        <span className="font-heading text-sm font-semibold text-saffron tracking-wide uppercase">
          Verse of the Day - BG {verse.chapter}.{verse.verse_number}
        </span>
      </div>

      <div className="verse-blur transition-all duration-500">
        <p className="font-display whitespace-pre-line text-3xl sm:text-4xl lg:text-5xl font-medium text-white/95 leading-tight">
          {sanskrit}
        </p>
        {transliteration && (
          <p className="mt-8 max-w-4xl font-body text-xl sm:text-2xl text-saffron leading-relaxed italic">
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
