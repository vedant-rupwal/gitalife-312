import React from "react";
import ImpactCounter from "@/components/home/ImpactCounter";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Impact() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-cream py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Live Impact"
            title="Seva in Action"
            subtitle="Real numbers from real service. This is what collective devotion looks like on the ground."
          />
        </div>
      </section>
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ImpactCounter />
        </div>
      </section>
    </div>
  );
}
