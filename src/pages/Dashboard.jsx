import React from "react";
import VerseOfTheDay from "@/components/home/VerseOfTheDay";
import JapaCounter from "@/components/home/JapaCounter";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Dashboard() {
  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Dharma Dashboard"
          title="Today's Practice"
          subtitle="Your personal sanctuary for daily habits. Log your rounds, reflect on the verse, and keep your streak alive."
        />

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Japa Counter — the centerpiece */}
          <div className="lg:col-span-1 rounded-2xl bg-white border border-navy/8 p-8 lg:p-10 flex flex-col items-center">
            <span className="font-heading text-xs font-semibold text-saffron uppercase tracking-wider mb-2">Habit Ring</span>
            <h3 className="font-heading text-xl font-bold text-navy mb-8">16-Round Japa Counter</h3>
            <JapaCounter />
          </div>

          {/* Verse of the Day */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-navy overflow-hidden">
              <div className="p-6 sm:p-8">
                <VerseOfTheDay embedded />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}