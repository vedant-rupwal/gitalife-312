import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { MapPin, Clock, MessageCircle, ArrowLeft, User, Phone, Loader2, CalendarClock } from "lucide-react";
import EventCard from "@/components/events/EventCard";
import EventSignupModal from "@/components/events/EventSignupModal";
import InstagramWidget from "@/components/hubs/InstagramWidget";
import HubContactCard from "@/components/hubs/HubContactCard";
import SectionHeading from "@/components/ui/SectionHeading";
import { defaultHubs } from "@/data/defaultHubs";

export default function HubDetail() {
  const { hubId } = useParams();
  const [hub, setHub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signupEvent, setSignupEvent] = useState(null);

  useEffect(() => {
    Promise.all([
      appClient.entities.Hub.get(hubId).catch(() => defaultHubs.find((item) => item.id === hubId) || null),
      appClient.entities.CommunityEvent.filter({ hub_id: hubId }, "event_date", 50).catch(() => []),
    ]).then(([h, e]) => { setHub(h); setEvents(e); }).finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-saffron" /></div>;
  if (!hub) return <div className="min-h-screen flex items-center justify-center bg-cream"><p className="font-body text-navy/50">Hub not found.</p></div>;

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.event_date) >= now);
  const recent = events.filter((e) => new Date(e.event_date) < now).reverse();
  const locationLabel = [hub.campus, hub.neighborhood].filter(Boolean).join(" - ");
  const meetingLabel = [hub.meeting_day, hub.meeting_time].filter(Boolean).join(" at ");

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/hubs" className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-navy/60 hover:text-saffron mb-6"><ArrowLeft className="h-4 w-4" />All Hubs</Link>
        {hub.image_url && (
          <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden mb-8">
            <img src={hub.image_url} alt={hub.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {locationLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron/10 px-3 py-1 font-heading text-xs font-semibold text-saffron mb-3"><MapPin className="h-3 w-3" />{locationLabel}</span>
            )}
            <h1 className="font-heading text-3xl font-bold text-navy mb-3">{hub.name}</h1>
            <p className="font-body text-base text-navy/70 mb-6">{hub.description || "Hub details coming soon."}</p>
            <div className="space-y-3 mb-6">
              {meetingLabel && (
                <div className="flex items-center gap-3 text-sm text-navy/80"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron/10 text-saffron"><Clock className="h-4 w-4" /></div>{meetingLabel}</div>
              )}
              {hub.coordinator_name && (
                <div className="flex items-center gap-3 text-sm text-navy/80"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron/10 text-saffron"><User className="h-4 w-4" /></div>{hub.coordinator_name}</div>
              )}
              {hub.coordinator_contact && (
                <div className="flex items-center gap-3 text-sm text-navy/80"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-river/10 text-river"><Phone className="h-4 w-4" /></div>{hub.coordinator_contact}</div>
              )}
            </div>
            {hub.whatsapp_link && (
              <a href={hub.whatsapp_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl bg-river px-6 py-3.5 font-heading text-sm font-semibold text-white transition-all hover:scale-[1.02]">
                <MessageCircle className="h-5 w-5" />Join WhatsApp
              </a>
            )}
            {hub.instagram_handle && (
              <div className="mt-6">
                <InstagramWidget handle={hub.instagram_handle} events={events} />
              </div>
            )}
            <div className="mt-8">
              <SectionHeading eyebrow="Gatherings" title="Upcoming Events" />
              <div className="space-y-4">
                {upcoming.map((ev) => <EventCard key={ev.id} event={ev} onSignup={setSignupEvent} />)}
                {upcoming.length === 0 && <p className="font-body text-sm text-navy/50">No upcoming events for this hub yet.</p>}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-10">
            <HubContactCard hub={hub} />
            {recent.length > 0 && (
              <div>
                <SectionHeading eyebrow="Recent Activity" title="Past Gatherings" />
                <div className="grid sm:grid-cols-2 gap-6">
                  {recent.slice(0, 4).map((ev) => (
                    <div key={ev.id} className="rounded-2xl border border-navy/8 bg-white p-4 opacity-80">
                      <div className="flex items-center gap-2 text-xs text-navy/50 mb-2"><CalendarClock className="h-3.5 w-3.5" />{new Date(ev.event_date).toLocaleDateString()}</div>
                      <h4 className="font-heading text-sm font-bold text-navy">{ev.title}</h4>
                      <p className="font-body text-xs text-navy/60 line-clamp-2">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {signupEvent && <EventSignupModal event={signupEvent} onClose={() => setSignupEvent(null)} />}
    </div>
  );
}
