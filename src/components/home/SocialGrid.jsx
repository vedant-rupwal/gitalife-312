import React from "react";
import { Instagram, Play, Heart } from "lucide-react";

const reels = [
  { url: "https://images.unsplash.com/photo-1545389336-cf0906944357?w=600&q=80", caption: "Sunset kirtan at North Ave Beach", likes: "2.4k" },
  { url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80", caption: "Pilsen seva — 200 meals served", likes: "1.8k" },
  { url: "https://images.unsplash.com/photo-1506126613408-eca97ce0d77?w=600&q=80", caption: "Starved Rock retreat highlights", likes: "3.1k" },
  { url: "https://images.unsplash.com/photo-1531206735572-9c1393062c8e?w=600&q=80", caption: "UIC study circle deep dive", likes: "956" },
  { url: "https://images.unsplash.com/photo-1511671781944-7f1e9b1f9b1a?w=600&q=80", caption: "WindyCity Bhajan Night vibes", likes: "4.2k" },
  { url: "https://images.unsplash.com/photo-1465146344435-9f5f4f1a9c6e?w=600&q=80", caption: "Morning japa at the lakefront", likes: "1.5k" },
];

export default function SocialGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-saffron to-gold text-white">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-base font-bold text-navy">@gitalife312</p>
            <p className="font-body text-xs text-navy/50">Reels & event recaps</p>
          </div>
        </div>
        <a
          href="https://instagram.com/gitalife312"
          target="_blank"
          rel="noopener noreferrer"
          className="font-heading text-sm font-semibold text-saffron hover:underline"
        >
          Follow →
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {reels.map((reel, i) => (
          <div
            key={i}
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-navy cursor-pointer"
          >
            <img
              src={reel.url}
              alt={reel.caption}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
              style={{ filter: "grayscale(0.3)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white">
              <Heart className="h-3 w-3 fill-white" /> {reel.likes}
            </div>
            <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
            <p className="absolute bottom-3 left-3 right-3 font-body text-xs text-white/90 line-clamp-2">{reel.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}