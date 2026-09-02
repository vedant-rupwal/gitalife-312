import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import Hero from "@/components/home/Hero";
import SocialGrid from "@/components/home/SocialGrid";
import EventCard from "@/components/events/EventCard";
import EventSignupModal from "@/components/events/EventSignupModal";
import SectionHeading from "@/components/ui/SectionHeading";
import { ArrowRight, Camera, HandHeart, MapPin, Mountain, Music, Trophy } from "lucide-react";

const involvementItems = [
  {
    title: "Volunteering",
    description: "Serve at events, outreach tables, meals, and festivals",
    icon: HandHeart,
    to: "/volunteer",
    color: "bg-gold",
  },
  {
    title: "Kirtan & Harinam",
    description: "Holy names in homes, campuses, and city spaces",
    icon: Music,
    to: "/events?type=kirtan",
    color: "bg-saffron",
  },
  {
    title: "Retreats",
    description: "Weekend immersions for reflection and friendship",
    icon: Mountain,
    to: "/events?type=retreat",
    color: "bg-river",
  },
  {
    title: "Find a Hub",
    description: "Connect with your campus or neighborhood circle",
    icon: MapPin,
    to: "/hubs",
    color: "bg-navy",
  },
  {
    title: "Photo Gallery",
    description: "Moments from the GitaLife community",
    icon: Camera,
    to: "/gallery",
    color: "bg-navy",
  },
  {
    title: "Our Impact",
    description: "Book marathons, festivals, meals, and milestones",
    icon: Trophy,
    to: "/impact",
    color: "bg-gold",
  },
];

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signupEvent, setSignupEvent] = useState(null);

  useEffect(() => {
    appClient.entities.CommunityEvent.list("event_date", 3)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Hero />

      <section className="py-20 lg:py-28 bg-cream grain">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Explore"
            title="How to get involved"
            subtitle="Daily practice, weekly classes, seva opportunities, and more"
            align="center"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {involvementItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.to}
                  className="group rounded-lg border border-navy/10 bg-white/45 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-saffron/30 hover:bg-white/70 hover:shadow-lg"
                >
                  <span className={`mb-5 flex h-14 w-14 items-center justify-center rounded-lg ${item.color} text-white shadow-lg transition-transform group-hover:scale-105`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-navy">{item.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-navy/60">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Upcoming Gatherings"
            title="Join Us This Week"
            subtitle="Kirtans, seva, retreats, and study circles - there's always a seat for you."
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
