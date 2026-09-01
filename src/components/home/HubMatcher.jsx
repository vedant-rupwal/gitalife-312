import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { MapPin, ArrowRight, MessageCircle, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HubMatcher() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    appClient.entities.Hub.list()
      .then(setHubs)
      .finally(() => setLoading(false));
  }, []);

  const match = hubs.find((h) => h.id === selected);

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <div>
        <p className="font-heading text-sm font-semibold text-saffron uppercase tracking-wider mb-4">Where do you stand?</p>
        <div className="flex flex-wrap gap-3">
          {loading
            ? [...Array(5)].map((_, i) => <div key={i} className="h-14 w-36 bg-cream animate-pulse rounded-xl" />)
            : hubs.map((hub) => (
              <button
                key={hub.id}
                onClick={() => setSelected(hub.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-5 py-3.5 font-heading text-sm font-semibold transition-all active:scale-95",
                  selected === hub.id
                    ? "bg-saffron text-white shadow-lg shadow-saffron/30"
                    : "bg-cream text-navy hover:bg-navy/5"
                )}
              >
                <MapPin className="h-4 w-4" />
                {hub.campus}
              </button>
            ))}
        </div>
      </div>

      <div className="min-h-[280px]">
        {match ? (
          <div className="rounded-2xl border-2 border-saffron/20 bg-cream p-6 float-up">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading text-xs font-semibold text-saffron uppercase tracking-wider">Coordinator Dossier</span>
            </div>
            <h3 className="font-heading text-2xl font-bold text-navy mb-1">{match.name}</h3>
            <p className="font-body text-sm text-navy/60 mb-5">{match.neighborhood} · {match.meeting_day} at {match.meeting_time}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron/10 text-saffron">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-body text-navy/80">{match.coordinator_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-river/10 text-river">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="font-body text-navy/80">{match.coordinator_contact}</span>
              </div>
            </div>

            <a
              href={match.whatsapp_link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 w-full rounded-xl bg-river px-6 py-4 font-heading text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-river/30"
            >
              <MessageCircle className="h-5 w-5" />
              Join the WhatsApp Sanctuary
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border-2 border-dashed border-navy/10 bg-cream/50">
            <div className="text-center px-6">
              <MapPin className="h-10 w-10 text-navy/20 mx-auto mb-3" />
              <p className="font-body text-sm text-navy/40">Select your campus or neighborhood to connect with your local coordinator</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}