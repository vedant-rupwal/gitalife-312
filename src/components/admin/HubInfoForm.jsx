import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Loader2, Check } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

export default function HubInfoForm({ hubId }) {
  const [hub, setHub] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { appClient.entities.Hub.get(hubId).then(setHub).finally(() => setLoading(false)); }, [hubId]);
  const update = (k, v) => setHub({ ...hub, [k]: v });
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await appClient.entities.Hub.update(hubId, { ...hub }); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  if (!hub) return null;
  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-navy/8 p-6 space-y-4">
      <h3 className="font-heading text-lg font-bold text-navy">Hub Info</h3>
      <div><label className={labelCls}>Name</label><input value={hub.name || ""} onChange={(e) => update("name", e.target.value)} className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Campus</label><input value={hub.campus || ""} onChange={(e) => update("campus", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Neighborhood</label><input value={hub.neighborhood || ""} onChange={(e) => update("neighborhood", e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Description</label><textarea value={hub.description || ""} onChange={(e) => update("description", e.target.value)} className={inputCls} rows={3} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Coordinator</label><input value={hub.coordinator_name || ""} onChange={(e) => update("coordinator_name", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Contact</label><input value={hub.coordinator_contact || ""} onChange={(e) => update("coordinator_contact", e.target.value)} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Meeting Day</label><input value={hub.meeting_day || ""} onChange={(e) => update("meeting_day", e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Meeting Time</label><input value={hub.meeting_time || ""} onChange={(e) => update("meeting_time", e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>WhatsApp Link</label><input value={hub.whatsapp_link || ""} onChange={(e) => update("whatsapp_link", e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Image URL</label><input value={hub.image_url || ""} onChange={(e) => update("image_url", e.target.value)} className={inputCls} /></div>
      <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 w-full rounded-xl bg-saffron px-6 py-3.5 font-heading text-sm font-semibold text-white disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? "Saved!" : "Save Hub Info"}
      </button>
    </form>
  );
}