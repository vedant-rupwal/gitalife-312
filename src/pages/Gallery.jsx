import React from "react";
import SocialGrid from "@/components/home/SocialGrid";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Gallery() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-cream py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Gallery"
            title="Community Moments"
            subtitle="Photos, reels, and event recaps from the GitaLife community."
          />
        </div>
      </section>
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SocialGrid />
        </div>
      </section>
    </div>
  );
}
