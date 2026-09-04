import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortHubsByName } from "@/lib/hubSorting";

export default function HubsGrid() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    appClient.entities.Hub.list()
      .then(setHubs)
      .finally(() => setLoading(false));
  }, []);

  const campuses = ["All", ...new Set(hubs.map((h) => h.campus).filter(Boolean))];
  const sortedHubs = sortHubsByName(hubs);
  const filtered = filter === "All" ? sortedHubs : sortedHubs.filter((h) => h.campus === filter);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-cream animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {campuses.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {campuses.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "rounded-full px-4 py-2 font-heading text-sm font-medium transition-all",
                filter === c
                  ? "bg-saffron text-white"
                  : "bg-cream text-navy/60 hover:bg-navy/5"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((hub) => {
          const location = hub.campus || hub.neighborhood || "Details coming soon";
          const meeting = [hub.meeting_day, hub.meeting_time].filter(Boolean).join(" at ");

          return (
            <div
              key={hub.id}
              className="group relative overflow-hidden rounded-2xl border border-navy/8 bg-white transition-all hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-1"
            >
              <div className="relative h-40 overflow-hidden">
                {hub.image_url && (
                  <img
                    src={hub.image_url}
                    alt={hub.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-saffron/90 px-3 py-1 font-heading text-xs font-semibold text-white">
                    <MapPin className="h-3 w-3" /> {location}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-heading text-lg font-bold text-navy mb-1">{hub.name}</h3>
                <p className="font-body text-sm text-navy/60 mb-3 line-clamp-2">{hub.description || "Hub details coming soon."}</p>
                {meeting && (
                  <div className="flex items-center gap-3 text-xs text-navy/50 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {meeting}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-navy/8">
                  <span className="font-body text-sm text-navy/70">{hub.coordinator_name || "Coordinator TBD"}</span>
                  {hub.whatsapp_link && (
                    <a
                      href={hub.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-heading text-sm font-semibold text-river hover:gap-2 transition-all"
                    >
                      Join <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
