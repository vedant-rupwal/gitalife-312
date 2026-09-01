import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import Hero from "@/components/home/Hero";
import ImpactCounter from "@/components/home/ImpactCounter";
import SocialGrid from "@/components/home/SocialGrid";
import ChicagoMap from "@/components/hubs/ChicagoMap";
import EventCard from "@/components/events/EventCard";
import EventSignupModal from "@/components/events/EventSignupModal";
import SectionHeading from "@/components/ui/SectionHeading";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { defaultHubs } from "@/data/defaultHubs";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signupEvent, setSignupEvent] = useState(null);

  useEffect(() => {
    Promise.all([
      appClient.entities.CommunityEvent.list("event_date", 3).catch(() => []),
      appClient.entities.Hub.list().catch(() => []),
    ])
      .then(([e, h]) => { setEvents(e); setHubs(h.length ? h : defaultHubs); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Hero />

      {/* Hubs & Initiatives — mini map */}
      <section className="py-20 lg:py-28 bg-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="WindyCity Hubs & Initiatives"
            title="Find Your People, Find Your Practice"
            subtitle="Campus circles, lakefront kirtans, bhajan nights, nature immersions, and food relief seva — all across Chicagoland. Tap a pin to find your hub."
          />
          <ChicagoMap hubs={hubs} height={360} compact />
          <div className="mt-6 text-center">
            <Link
              to="/hubs"
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-7 py-4 font-heading text-base font-semibold text-white transition-all hover:scale-[1.02]"
            >
              Explore All Hubs <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Counter */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Live Impact"
            title="Seva in Action"
            subtitle="Real numbers from real service. This is what collective devotion looks like on the ground."
          />
          <ImpactCounter />
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className="py-20 lg:py-28 bg-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Upcoming Gatherings"
            title="Join Us This Week"
            subtitle="Kirtans, seva, retreats, and study circles — there's always a seat for you."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? [...Array(3)].map((_, i) => <div key={i} className="h-80 bg-white animate-pulse rounded-2xl" />)
              : events.map((ev) => <EventCard key={ev.id} event={ev} onSignup={setSignupEvent} />)}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-navy/15 bg-white px-7 py-4 font-heading text-base font-semibold text-navy transition-all hover:border-saffron hover:text-saffron"
            >
              See All Events <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Social Grid */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Grid"
            title="High-Vibe Moments"
            subtitle="Reels, event recaps, and community moments from @gitalife312."
          />
          <SocialGrid />
        </div>
      </section>

      {signupEvent && <EventSignupModal event={signupEvent} onClose={() => setSignupEvent(null)} />}
    </div>
  );
}
