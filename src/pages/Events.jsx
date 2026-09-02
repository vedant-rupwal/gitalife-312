import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import EventCard from "@/components/events/EventCard";
import EventSignupModal from "@/components/events/EventSignupModal";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";
import { buildEventTypes, formatEventType } from "@/lib/eventTypes";

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signupEvent, setSignupEvent] = useState(null);

  useEffect(() => {
    appClient.entities.CommunityEvent.list("event_date", 50)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const types = buildEventTypes(events);
  const requestedFilter = searchParams.get("type") || "All";
  const filter = requestedFilter === "All" || types.includes(requestedFilter) ? requestedFilter : "All";
  const filtered = filter === "All" ? events : events.filter((e) => e.type === filter);
  const updateFilter = (type) => {
    if (type === "All") {
      setSearchParams({});
    } else {
      setSearchParams({ type });
    }
  };

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="WindyCity Calendar"
          title="Events & Seva"
          subtitle="Kirtans by the lake, bhajan nights in the Loop, food relief in Pilsen, and retreats across the Midwest. Find your next gathering."
        />

        <div className="flex flex-wrap gap-2 mb-10">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => updateFilter(t)}
              className={cn(
                "rounded-full px-4 py-2 font-heading text-sm font-medium transition-all",
                filter === t
                  ? "bg-saffron text-white"
                  : "bg-white text-navy/60 border border-navy/8 hover:bg-navy/5"
              )}
            >
              {t === "All" ? "All Events" : formatEventType(t)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-white animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-body text-navy/50">No events in this category right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ev) => (
              <EventCard key={ev.id} event={ev} onSignup={setSignupEvent} />
            ))}
          </div>
        )}
      </div>

      {signupEvent && <EventSignupModal event={signupEvent} onClose={() => setSignupEvent(null)} />}
    </div>
  );
}
