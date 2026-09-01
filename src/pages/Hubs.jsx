import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import ChicagoMap from "@/components/hubs/ChicagoMap";
import { defaultHubs } from "@/data/defaultHubs";

export default function Hubs() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.entities.Hub.list()
      .then((rows) => setHubs(rows.length ? rows : defaultHubs))
      .catch(() => setHubs(defaultHubs))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="WindyCity Hubs"
          title="Find Your University Hub"
          subtitle="Choose a hub below or use the map to explore coordinators, meeting schedules, and upcoming events."
        />

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => <div key={index} className="h-80 bg-white animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hubs.map((hub) => {
              const location = hub.campus || hub.neighborhood || "Details coming soon";
              const meeting = [hub.meeting_day, hub.meeting_time].filter(Boolean).join(" at ");

              return (
                <Link
                  key={hub.id}
                  to={`/hubs/${hub.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-navy/8 bg-white transition-all hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-1"
                >
                  <div className="relative h-40 overflow-hidden">
                    {hub.image_url && (
                      <img src={hub.image_url} alt={hub.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-saffron/90 px-3 py-1 font-heading text-xs font-semibold text-white">
                        <MapPin className="h-3 w-3" />{location}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-bold text-navy mb-1">{hub.name}</h3>
                    <p className="font-body text-sm text-navy/60 mb-3 line-clamp-2">{hub.description || "Hub details coming soon."}</p>
                    {meeting && (
                      <div className="flex items-center gap-1 text-xs text-navy/50 mb-3">
                        <Clock className="h-3.5 w-3.5" />{meeting}
                      </div>
                    )}
                    <span className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-river group-hover:gap-2 transition-all">
                      View Hub <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          {loading ? (
            <div className="h-[480px] bg-white animate-pulse rounded-2xl" />
          ) : (
            <ChicagoMap hubs={hubs} height={480} />
          )}
        </div>
      </div>
    </div>
  );
}
