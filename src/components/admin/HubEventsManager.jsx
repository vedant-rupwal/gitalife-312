import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Loader2, Upload, ExternalLink } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const required = (label) => `${label} (Required)`;
const optional = (label) => `${label} (Optional)`;
const blank = { title: "", description: "", type: "kirtan", location: "", event_date: "", capacity: 0 };

export default function HubEventsManager({ hubId }) {
  const draftKey = `gitalife.hub.${hubId}.eventDraft`;
  const [events, setEvents] = useState([]);
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      return { ...blank, ...JSON.parse(sessionStorage.getItem(draftKey) || "{}") };
    } catch {
      return blank;
    }
  });
  const [eventImageFile, setEventImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [e, h] = await Promise.all([
      appClient.entities.CommunityEvent.filter({ hub_id: hubId }, "event_date", 50),
      appClient.entities.Hub.get(hubId),
    ]);
    setEvents(e);
    setHub(h);
    setLoading(false);
  };
  useEffect(() => { load().catch(() => setLoading(false)); }, [hubId]);
  useEffect(() => { sessionStorage.setItem(draftKey, JSON.stringify(form)); }, [draftKey, form]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const optionalText = (value) => value.trim() || null;
      const uploadedImageUrl = eventImageFile
        ? await appClient.storage.uploadEventImage(eventImageFile)
        : null;

      await appClient.entities.CommunityEvent.create({
        title: form.title.trim(),
        description: optionalText(form.description),
        type: form.type,
        location: optionalText(form.location),
        event_date: new Date(form.event_date).toISOString(),
        image_url: uploadedImageUrl,
        capacity: Number(form.capacity) || 0,
        hub_id: hubId,
        campus: hub?.campus || null,
        signup_count: 0,
      });
      setForm(blank);
      setEventImageFile(null);
      sessionStorage.removeItem(draftKey);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };
  const del = async (id) => { if (!confirm("Delete event?")) return; await appClient.entities.CommunityEvent.delete(id); load(); };

  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  return (
    <div className="rounded-2xl bg-white border border-navy/8 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-navy">Your Events</h3>
        <div className="flex items-center gap-2">
          <Link to="/events" target="_blank" className="flex items-center gap-1 rounded-lg bg-navy/5 px-3 py-2 font-heading text-xs font-semibold text-navy hover:bg-navy/10"><ExternalLink className="h-3.5 w-3.5" />Preview</Link>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 rounded-lg bg-saffron px-3 py-2 font-heading text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />New</button>
        </div>
      </div>
      {showForm && (
        <form onSubmit={create} className="space-y-3 mb-4 rounded-xl bg-cream p-4">
          <div><label className={labelCls}>{required("Title")}</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>{optional("Description")}</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>{required("Type")}</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="kirtan">Kirtan</option><option value="bhajan">Bhajan</option><option value="seva">Seva</option><option value="retreat">Retreat</option><option value="study_circle">Study Circle</option><option value="immersion">Immersion</option></select></div>
            <div><label className={labelCls}>{required("Date & Time")}</label><input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={inputCls} required /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>{optional("Location")}</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>{optional("Capacity")}</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputCls} min="0" /></div>
          </div>
          <div>
            <label className={labelCls}>{optional("Event Image")}</label>
            <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
              <Upload className="h-4 w-4 text-saffron" />
              <span className="truncate">{eventImageFile?.name || "Upload image"}</span>
              <input type="file" accept="image/*" onChange={(e) => setEventImageFile(e.target.files?.[0] || null)} className="sr-only" />
            </label>
          </div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-navy px-5 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Event</button>
        </form>
      )}
      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
            <div className="min-w-0">
              <p className="font-heading text-sm font-bold text-navy">{ev.title}</p>
              <p className="font-body text-xs text-navy/50">{ev.location || "Location coming soon"} - {new Date(ev.event_date).toLocaleDateString()}</p>
            </div>
            <button onClick={() => del(ev.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {events.length === 0 && !showForm && <p className="font-body text-sm text-navy/50">No events yet. Create one!</p>}
      </div>
    </div>
  );
}
