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

  const content = (
    <div className={embedded ? "" : "mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center"}>
      <div className={embedded ? "flex items-center gap-2 mb-6" : "inline-flex items-center gap-2 rounded-full border border-saffron/30 bg-saffron/10 px-4 py-1.5 mb-10"}>
        <BookOpen className="h-4 w-4 text-saffron" />
        <span className="font-heading text-xs font-semibold text-saffron tracking-wide uppercase">Verse of the Day - BG {verse.chapter}.{verse.verse_number}</span>
      </div>

      <div className="verse-blur transition-all duration-500">
        <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium text-white/95 leading-relaxed italic">
          {verse.sanskrit}
        </p>
        <div className="my-8 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-saffron/40" />
          <div className="h-2 w-2 rounded-full bg-saffron" />
          <div className="h-px w-12 bg-saffron/40" />
        </div>
        <p className="font-display text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
          {verse.translation}
        </p>
      </div>

      {verse.purport && (
        <div className="verse-blur mt-10 max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-500">
          <p className="font-body text-sm text-saffron font-semibold uppercase tracking-wider mb-2">City-Life Application</p>
          <p className="font-body text-base text-white/70 leading-relaxed">{verse.purport}</p>
        </div>
      )}
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
