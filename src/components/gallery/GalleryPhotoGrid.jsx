import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  const albums = [...photos.reduce((grouped, photo) => {
    const key = photo.album_id || photo.id;
    if (!grouped.has(key)) grouped.set(key, { id: key, photos: [], cover: photo });
    const album = grouped.get(key);
    album.photos.push(photo);
    if (photo.is_cover) album.cover = photo;
    return grouped;
  }, new Map()).values()];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album) => (
        <Link key={album.id} to={`/gallery/${album.id}`} className="group overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/5">
          <div className="aspect-[4/5] overflow-hidden bg-cream">
            <img
              src={album.cover.image_url}
              alt={album.cover.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-bold text-navy">{album.cover.title}</h3>
              <span className="shrink-0 rounded-full bg-saffron/10 px-2.5 py-1 font-heading text-xs font-semibold text-saffron">
                {album.photos.length} photo{album.photos.length === 1 ? "" : "s"}
              </span>
            </div>
            {album.cover.caption && <p className="font-body text-sm leading-relaxed text-navy/60">{album.cover.caption}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
