import React, { useEffect, useMemo, useState } from "react";
import { Camera, Check, Loader2, Trash2, Upload } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/20";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const blank = {
  title: "",
  caption: "",
  hub_id: "",
  sort_order: 0,
  is_featured: false,
};

export default function AdminGallery({ me, hubId = null }) {
  const [photos, setPhotos] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [imageFile, setImageFile] = useState(null);
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
      const [photoRows, hubRows] = await Promise.all([
        appClient.entities.GalleryPhoto.list("sort_order", 300),
        appClient.entities.Hub.list("name"),
      ]);
      const visibleHubs = me?.role === "admin" ? hubRows : hubRows.filter((hub) => assignedHubIds.includes(hub.id));
      const visibleHubIds = new Set(visibleHubs.map((hub) => hub.id));
      setHubs(visibleHubs);
      setPhotos(hubId
        ? photoRows.filter((photo) => photo.hub_id === hubId)
        : me?.role === "admin"
          ? photoRows
          : photoRows.filter((photo) => photo.hub_id && visibleHubIds.has(photo.hub_id)));
    } catch {
      setPhotos([]);
      setHubs([]);
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
      if (!imageFile) throw new Error("Choose a photo to upload.");
      const imageUrl = await appClient.storage.uploadGalleryImage(imageFile);
      await appClient.entities.GalleryPhoto.create({
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        image_url: imageUrl,
        hub_id: form.hub_id || hubId || null,
        sort_order: Number(form.sort_order) || 0,
        is_featured: Boolean(form.is_featured),
      });
      setForm({ ...blank, hub_id: hubId || "" });
      setImageFile(null);
      setMsg("Gallery photo uploaded.");
      await load();
    } catch (error) {
      setMsg(error.message || "Could not upload photo.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 5000);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this gallery photo?")) return;
    await appClient.entities.GalleryPhoto.delete(id);
    await load();
  };

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
            <label className={labelCls}>Photo (Required)</label>
            <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
              <Upload className="h-4 w-4 text-saffron" />
              <span className="truncate">{imageFile?.name || "Upload photo"}</span>
              <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="sr-only" required />
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
        <h3 className="mb-4 font-heading text-lg font-bold text-navy">Gallery Photos ({photos.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>
        ) : photos.length === 0 ? (
          <p className="rounded-xl bg-cream p-4 font-body text-sm text-navy/60">No gallery photos uploaded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <article key={photo.id} className="overflow-hidden rounded-xl border border-navy/8">
                <img src={photo.image_url} alt={photo.title} className="h-48 w-full object-cover" />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-heading text-sm font-bold text-navy">{photo.title}</h4>
                      {photo.caption && <p className="mt-1 line-clamp-2 font-body text-xs text-navy/55">{photo.caption}</p>}
                    </div>
                    <button type="button" onClick={() => remove(photo.id)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20" aria-label={`Delete ${photo.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {photo.is_featured && <span className="rounded-full bg-saffron/10 px-2 py-1 font-heading text-[11px] font-semibold text-saffron">Featured</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
