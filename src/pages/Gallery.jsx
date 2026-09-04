import React from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import GalleryPhotoGrid from "@/components/gallery/GalleryPhotoGrid";
import ElfsightInstagramFeed from "@/components/gallery/ElfsightInstagramFeed";

export default function Gallery() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-cream py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Gallery"
            title="Community Moments"
            subtitle="Photos, reels, and event recaps from the GitaLife 312 community."
          />
        </div>
      </section>
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GalleryPhotoGrid />
          <div className="mt-12">
            <ElfsightInstagramFeed />
          </div>
        </div>
      </section>
    </div>
  );
}
