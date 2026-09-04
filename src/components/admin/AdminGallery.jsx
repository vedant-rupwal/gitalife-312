import React, { useEffect, useMemo, useState } from "react";
import { Camera, Check, Images, Loader2, Trash2, Upload } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/20";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const blank = {
  title: "",
  caption: "",
  hub_id: "",
  event_id: "",
  sort_order: 0,
  is_featured: false,
};

const createId = () => (
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export default function AdminGallery({ me, hubId = null }) {
  const [photos, setPhotos] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [extraFiles, setExtraFiles] = useState([]);
  const [form, setForm] = useState({ ...blank, hub_id: hubId || "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const assignedHubIds = useMemo(() => [
    me?.assigned_hub_id,
    ...(Array.isArray(me?.assigned_hub_ids) ? me.assigned_hub_ids : []),
    ...(Array.isArray(me?.data?.assigned_hub_ids) ? me.data.assigned_hub_ids : []),
  ].filter(Boolean), [me]);

  const load = async () => {
    setLoading(true);
    try {
      const [photoRows, hubRows, eventRows] = await Promise.all([
        appClient.entities.GalleryPhoto.list("sort_order", 300),
        appClient.entities.Hub.list("name"),
        appClient.entities.CommunityEvent.list("-event_date", 300),
      ]);
      const visibleHubs = me?.role === "admin" ? hubRows : hubRows.filter((hub) => assignedHubIds.includes(hub.id));
      const visibleHubIds = new Set(visibleHubs.map((hub) => hub.id));
      const visibleEvents = eventRows.filter((event) => !event.hub_id || visibleHubIds.has(event.hub_id));
      setHubs(visibleHubs);
      setEvents(hubId ? visibleEvents.filter((event) => event.hub_id === hubId) : visibleEvents);
      setPhotos(hubId
        ? photoRows.filter((photo) => photo.hub_id === hubId)
        : me?.role === "admin"
          ? photoRows
          : photoRows.filter((photo) => photo.hub_id && visibleHubIds.has(photo.hub_id)));
    } catch {
      setPhotos([]);
      setHubs([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [assignedHubIds, hubId, me?.role]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      if (!coverFile) throw new Error("Choose a main photo for the album.");
      const albumId = createId();
      const baseSortOrder = Number(form.sort_order) || 0;
      const albumFields = {
        album_id: albumId,
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        hub_id: form.hub_id || hubId || null,
        event_id: form.event_id || null,
        is_featured: Boolean(form.is_featured),
      };
      const uploadedPhotos = await Promise.all([
        appClient.storage.uploadGalleryImage(coverFile),
        ...extraFiles.map((file) => appClient.storage.uploadGalleryImage(file)),
      ]);
      await appClient.entities.GalleryPhoto.createMany(uploadedPhotos.map((imageUrl, index) => ({
        ...albumFields,
        image_url: imageUrl,
        is_cover: index === 0,
        sort_order: baseSortOrder + index,
      })));
      setForm({ ...blank, hub_id: hubId || "" });
      setCoverFile(null);
      setExtraFiles([]);
      setMsg(`Gallery album uploaded with ${uploadedPhotos.length} photo${uploadedPhotos.length === 1 ? "" : "s"}.`);
      await load();
    } catch (error) {
      setMsg(error.message || "Could not upload photo.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 5000);
    }
  };

  const albums = useMemo(() => {
    const grouped = new Map();
    photos.forEach((photo) => {
      const key = photo.album_id || photo.id;
      if (!grouped.has(key)) grouped.set(key, { id: key, photos: [], cover: photo });
      const group = grouped.get(key);
      group.photos.push(photo);
      if (photo.is_cover || !group.cover) group.cover = photo;
    });
    return [...grouped.values()].sort((a, b) => {
      const aOrder = Number(a.cover?.sort_order) || 0;
      const bOrder = Number(b.cover?.sort_order) || 0;
      return aOrder - bOrder;
    });
  }, [photos]);

  const removeAlbum = async (album) => {
    if (!confirm("Delete this gallery album?")) return;
    await Promise.all(album.photos.map((photo) => appClient.entities.GalleryPhoto.delete(photo.id)));
    await load();
  };

  const eventOptions = events.filter((event) => !form.hub_id || event.hub_id === form.hub_id);

  return (
    <div className="space-y-8">
      {msg && <div className="flex items-center gap-2 rounded-xl border border-river/20 bg-river/10 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <form onSubmit={create} className="rounded-2xl border border-navy/8 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-navy">
          <Camera className="h-5 w-5 text-saffron" />Upload Gallery Photo
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Title (Required)</label>
            <input value={form.title} onChange={(event) => update("title", event.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Hub (Optional)</label>
            <select value={form.hub_id} onChange={(event) => update("hub_id", event.target.value)} className={inputCls} disabled={Boolean(hubId)}>
              <option value="">General gallery</option>
              {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Linked Event (Optional)</label>
            <select value={form.event_id} onChange={(event) => update("event_id", event.target.value)} className={inputCls}>
              <option value="">No linked event</option>
              {eventOptions.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Main Photo (Required)</label>
            <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
              <Upload className="h-4 w-4 text-saffron" />
              <span className="truncate">{coverFile?.name || "Upload main photo"}</span>
              <input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} className="sr-only" required />
            </label>
          </div>
          <div>
            <label className={labelCls}>More Photos (Optional)</label>
            <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
              <Images className="h-4 w-4 text-saffron" />
              <span className="truncate">{extraFiles.length ? `${extraFiles.length} photo${extraFiles.length === 1 ? "" : "s"} selected` : "Upload album photos"}</span>
              <input type="file" accept="image/*" multiple onChange={(event) => setExtraFiles([...event.target.files])} className="sr-only" />
            </label>
          </div>
          <div>
            <label className={labelCls}>Sort Order (Optional)</label>
            <input type="number" value={form.sort_order} onChange={(event) => update("sort_order", event.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 self-end rounded-xl border border-navy/10 px-4 py-3 font-heading text-sm font-semibold text-navy">
            <input type="checkbox" checked={form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} />
            Featured
          </label>
          <div className="sm:col-span-2">
            <label className={labelCls}>Caption (Optional)</label>
            <textarea value={form.caption} onChange={(event) => update("caption", event.target.value)} className={inputCls} rows={3} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {saving ? "Uploading..." : "Upload Photo"}
        </button>
      </form>

      <div className="rounded-2xl border border-navy/8 bg-white p-6">
        <h3 className="mb-4 font-heading text-lg font-bold text-navy">Gallery Albums ({albums.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>
        ) : albums.length === 0 ? (
          <p className="rounded-xl bg-cream p-4 font-body text-sm text-navy/60">No gallery albums uploaded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <article key={album.id} className="overflow-hidden rounded-xl border border-navy/8">
                <img src={album.cover.image_url} alt={album.cover.title} className="h-48 w-full object-cover" />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-heading text-sm font-bold text-navy">{album.cover.title}</h4>
                      <p className="mt-1 font-body text-xs text-saffron">{album.photos.length} photo{album.photos.length === 1 ? "" : "s"}</p>
                      {album.cover.caption && <p className="mt-1 line-clamp-2 font-body text-xs text-navy/55">{album.cover.caption}</p>}
                    </div>
                    <button type="button" onClick={() => removeAlbum(album)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20" aria-label={`Delete ${album.cover.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {album.cover.is_featured && <span className="rounded-full bg-saffron/10 px-2 py-1 font-heading text-[11px] font-semibold text-saffron">Featured</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
