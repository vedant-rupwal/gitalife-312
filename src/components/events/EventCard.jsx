import React, { useState } from "react";
import { MapPin, Clock, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEventType } from "@/lib/eventTypes";

const typeColors = {
  kirtan: "bg-saffron/10 text-saffron",
  bhajan: "bg-gold/10 text-gold",
  seva: "bg-river/10 text-river",
  retreat: "bg-navy/10 text-navy",
  study_circle: "bg-saffron/10 text-saffron",
  immersion: "bg-river/10 text-river",
};

export default function EventCard({ event, onSignup }) {
  const [imageError, setImageError] = useState(false);
  const date = new Date(event.event_date);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const time = date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const full = event.capacity && event.signup_count >= event.capacity;
  const tags = Array.isArray(event.tags) ? event.tags.filter(Boolean) : [];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-navy/8 bg-white transition-all hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        {event.image_url && !imageError ? (
          <img
            src={event.image_url}
            alt={event.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-saffron/20 to-navy/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-col items-center rounded-xl bg-white/95 backdrop-blur px-3 py-2 shadow-lg">
          <span className="font-heading text-xs font-bold text-saffron">{month}</span>
          <span className="font-heading text-xl font-bold text-navy leading-none">{day}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={cn("rounded-full px-3 py-1 font-heading text-xs font-semibold", typeColors[event.type] || "bg-navy/10 text-navy")}>
            {formatEventType(event.type)}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-heading text-lg font-bold text-navy mb-2">{event.title}</h3>
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-saffron/10 px-2.5 py-1 font-heading text-[11px] font-semibold text-saffron">
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="font-body text-sm text-navy/60 mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-navy/60">
            <MapPin className="h-3.5 w-3.5 text-saffron" /> {event.location}
          </div>
          <div className="flex items-center gap-2 text-xs text-navy/60">
            <Clock className="h-3.5 w-3.5 text-saffron" /> {time}
          </div>
          {event.capacity && (
            <div className="flex items-center gap-2 text-xs text-navy/60">
              <Users className="h-3.5 w-3.5 text-saffron" /> {event.signup_count}/{event.capacity} signed up
            </div>
          )}
        </div>

        <button
          onClick={() => onSignup(event)}
          disabled={full}
          className={cn(
            "flex items-center justify-center gap-2 w-full rounded-xl px-5 py-3 font-heading text-sm font-semibold transition-all",
            full
              ? "bg-navy/5 text-navy/40 cursor-not-allowed"
              : "bg-navy text-white hover:scale-[1.02] active:scale-95"
          )}
        >
          {full ? "At Capacity" : "Sign Up"}
          {!full && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
