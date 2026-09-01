import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Loader2, Check, Upload, Trash2 } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

export default function HubInfoForm({ hubId }) {
  const [hub, setHub] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.entities.Hub.get(hubId).then(setHub).finally(() => setLoading(false));
  }, [hubId]);

  const update = (k, v) => setHub({ ...hub, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const optionalText = (value) => value?.trim() || null;
      if (!hub.name?.trim()) {
        throw new Error("Hub name is required.");
      }
      if (!hub.campus?.trim() && !hub.neighborhood?.trim()) {
        throw new Error("Add either a campus or a neighborhood.");
      }

      const uploadedImageUrl = imageFile
        ? await appClient.storage.uploadHubImage(imageFile)
        : hub.image_url || null;

      const updatedHub = await appClient.entities.Hub.update(hubId, {
        name: hub.name.trim(),
        campus: optionalText(hub.campus),
        neighborhood: optionalText(hub.neighborhood),
        description: optionalText(hub.description),
        coordinator_name: optionalText(hub.coordinator_name),
        coordinator_contact: optionalText(hub.coordinator_contact),
        meeting_day: optionalText(hub.meeting_day),
        meeting_time: optionalText(hub.meeting_time),
        whatsapp_link: optionalText(hub.whatsapp_link),
        image_url: uploadedImageUrl,
        lat: hub.lat ?? null,
        lng: hub.lng ?? null,
        instagram_handle: optionalText(hub.instagram_handle),
      });

      setHub(updatedHub);
      setImageFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setMsg(err.message || "Hub update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  if (!hub) return null;

  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-navy/8 p-6 space-y-4">
      <h3 className="font-heading text-lg font-bold text-navy">Hub Info</h3>
      {msg && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 font-heading text-sm font-semibold text-destructive">{msg}</div>}
      <div><label className={labelCls}>Name</label><input value={hub.name || ""} onChange={(e) => update("name", e.target.value)} className={inputCls} required /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Campus</label><input value={hub.campus || ""} onChange={(e) => update("campus", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Neighborhood</label><input value={hub.neighborhood || ""} onChange={(e) => update("neighborhood", e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Description</label><textarea value={hub.description || ""} onChange={(e) => update("description", e.target.value)} className={inputCls} rows={3} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Coordinator</label><input value={hub.coordinator_name || ""} onChange={(e) => update("coordinator_name", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Contact</label><input value={hub.coordinator_contact || ""} onChange={(e) => update("coordinator_contact", e.target.value)} className={inputCls} /></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Meeting Day</label><input value={hub.meeting_day || ""} onChange={(e) => update("meeting_day", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Meeting Time</label><input value={hub.meeting_time || ""} onChange={(e) => update("meeting_time", e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>WhatsApp Link</label><input value={hub.whatsapp_link || ""} onChange={(e) => update("whatsapp_link", e.target.value)} className={inputCls} /></div>
      <div className="space-y-3">
        <label className={labelCls}>Hub Image</label>
        {hub.image_url && (
          <div className="overflow-hidden rounded-xl border border-navy/10">
            <img src={hub.image_url} alt={hub.name} className="h-40 w-full object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
            <Upload className="h-4 w-4 text-saffron" />
            <span className="truncate">{imageFile?.name || "Upload image"}</span>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="sr-only" />
          </label>
          {hub.image_url && (
            <button type="button" onClick={() => update("image_url", "")} className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 px-4 py-3 font-heading text-sm font-semibold text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />Remove
            </button>
          )}
        </div>
      </div>
      <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 w-full rounded-xl bg-saffron px-6 py-3.5 font-heading text-sm font-semibold text-white disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Saved!" : "Save Hub Info"}
      </button>
    </form>
  );
}
