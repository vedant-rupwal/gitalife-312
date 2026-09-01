import React from "react";
import { Instagram, Heart, MessageCircle } from "lucide-react";

export default function InstagramWidget({ handle, events = [] }) {
  const cleanHandle = (handle || "").replace(/^@/, "");
  const tiles = events.filter((e) => e.image_url).slice(0, 6);

  return (
    <div className="rounded-2xl border border-navy/8 bg-white overflow-hidden">
      <div className="p-5 flex items-center gap-3 bg-gradient-to-r from-saffron/10 to-river/10">
        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-saffron via-gold to-river flex items-center justify-center text-white shrink-0">
          <Instagram className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm font-bold text-navy truncate">@{cleanHandle || "gitalife312"}</p>
          <p className="font-body text-xs text-navy/50">Hub moments & gatherings</p>
        </div>
        {cleanHandle && (
          <a
            href={`https://instagram.com/${cleanHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-navy px-4 py-2 font-heading text-xs font-semibold text-white hover:bg-navy/90 transition-colors"
          >
            Follow
          </a>
        )}
      </div>
      <div className="grid grid-cols-3 gap-0.5 p-0.5">
        {tiles.length > 0
          ? tiles.map((e, i) => (
              <div key={e.id || i} className="relative aspect-square overflow-hidden group">
                <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <span className="flex items-center gap-1 text-white text-xs font-heading">
                    <Heart className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex items-center gap-1 text-white text-xs font-heading">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))
          : [...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-saffron/20 to-river/20 flex items-center justify-center">
                <Instagram className="h-5 w-5 text-navy/30" />
              </div>
            ))}
      </div>
    </div>
  );
}