import React, { useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function GalleryPhotoGrid() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.entities.GalleryPhoto.list("sort_order", 200)
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  }

  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-navy/15 bg-cream p-10 text-center">
        <Camera className="mx-auto mb-3 h-10 w-10 text-navy/25" />
        <p className="font-heading text-lg font-bold text-navy">Gallery coming soon</p>
        <p className="mt-2 font-body text-sm text-navy/55">Community photos will appear here after admins upload them.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <article key={photo.id} className="group overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-sm">
          <div className="aspect-[4/5] overflow-hidden bg-cream">
            <img
              src={photo.image_url}
              alt={photo.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <h3 className="font-heading text-base font-bold text-navy">{photo.title}</h3>
            {photo.caption && <p className="mt-2 font-body text-sm leading-relaxed text-navy/60">{photo.caption}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
