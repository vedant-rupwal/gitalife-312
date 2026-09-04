import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function GalleryAlbum() {
  const { albumId } = useParams();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.entities.GalleryPhoto.filter({ album_id: albumId }, "sort_order", 200)
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [albumId]);

  const cover = useMemo(() => photos.find((photo) => photo.is_cover) || photos[0], [photos]);
  const albumPhotos = useMemo(() => photos.filter((photo) => photo.id !== cover?.id), [cover?.id, photos]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-saffron" /></div>;
  }

  if (!cover) {
    return (
      <div className="min-h-screen bg-cream px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-dashed border-navy/15 bg-white p-10 text-center">
          <Camera className="mx-auto mb-3 h-10 w-10 text-navy/25" />
          <p className="font-heading text-xl font-bold text-navy">Album not found</p>
          <Link to="/gallery" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 font-heading text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-cream py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/gallery" className="mb-6 inline-flex items-center gap-2 font-heading text-sm font-semibold text-navy/60 hover:text-saffron">
            <ArrowLeft className="h-4 w-4" />All Gallery
          </Link>
          <div className="max-w-3xl">
            <p className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-saffron">Gallery Album</p>
            <h1 className="font-heading text-4xl font-bold text-navy lg:text-5xl">{cover.title}</h1>
            {cover.caption && <p className="mt-4 font-body text-lg leading-relaxed text-navy/65">{cover.caption}</p>}
            <p className="mt-4 font-body text-sm text-navy/45">{albumPhotos.length} additional photo{albumPhotos.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {albumPhotos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/15 bg-cream p-10 text-center">
              <Camera className="mx-auto mb-3 h-10 w-10 text-navy/25" />
              <p className="font-heading text-lg font-bold text-navy">No additional photos yet</p>
              <p className="mt-2 font-body text-sm text-navy/55">Add more photos to this album from the admin gallery tab.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albumPhotos.map((photo) => (
                <article key={photo.id} className="overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-sm">
                  <img src={photo.image_url} alt={photo.title} className="aspect-[4/5] w-full object-cover" />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
