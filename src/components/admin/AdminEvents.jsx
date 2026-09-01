import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Trash2, Loader2, Plus, Check } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const blankEvent = {
  title: "",
  description: "",
  type: "kirtan",
  location: "",
  hub_id: "",
  event_date: "",
  image_url: "",
  coordinator: "",
  whatsapp_link: "",
  capacity: "",
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankEvent);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [eventRows, hubRows] = await Promise.all([
      appClient.entities.CommunityEvent.list("event_date", 50),
      appClient.entities.Hub.list(),
    ]);
    setEvents(eventRows);
    setHubs(hubRows);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const hub = hubs.find((item) => item.id === form.hub_id);

    try {
      await appClient.entities.CommunityEvent.create({
        ...form,
        hub_id: form.hub_id || null,
        campus: hub?.campus || "",
        event_date: new Date(form.event_date).toISOString(),
        capacity: Number(form.capacity) || 0,
        signup_count: 0,
      });
      setForm(blankEvent);
      setMsg("Event created.");
      await load();
    } catch (err) {
      setMsg(err.message || "Event create failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const del = async (id) => {
    if (!confirm("Delete event?")) return;
    await appClient.entities.CommunityEvent.delete(id);
    load();
  };

  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;

  return (
    <div className="space-y-8">
      {msg && <div className="flex items-center gap-2 rounded-xl bg-river/10 border border-river/20 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <form onSubmit={create} className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-saffron" />Create Event</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Hub</label><select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })} className={inputCls}><option value="">No hub</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></div>
          <div><label className={labelCls}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="kirtan">Kirtan</option><option value="bhajan">Bhajan</option><option value="seva">Seva</option><option value="retreat">Retreat</option><option value="study_circle">Study Circle</option><option value="immersion">Immersion</option></select></div>
          <div><label className={labelCls}>Date & Time</label><input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Capacity</label><input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Coordinator</label><input value={form.coordinator} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>WhatsApp Link</label><input value={form.whatsapp_link} onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Image URL</label><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} /></div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Event
        </button>
      </form>

      <div className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4">All Events ({events.length})</h3>
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold text-navy">{ev.title}</p>
                <p className="font-body text-xs text-navy/50">{ev.location} - {new Date(ev.event_date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => del(ev.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {events.length === 0 && <p className="font-body text-sm text-navy/50">No events yet.</p>}
        </div>
      </div>
    </div>
  );
}
