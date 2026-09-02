import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Trash2, Loader2, Plus, Check, Upload, ExternalLink, Pencil, X } from "lucide-react";
import { buildRecurringEventDates, createRecurrenceId, recurrenceOptions } from "@/lib/recurringEvents";
import EventTagsInput from "@/components/admin/EventTagsInput";
import EventSignupsPanel from "@/components/admin/EventSignupsPanel";
import VolunteerOpportunityQuickForm from "@/components/admin/VolunteerOpportunityQuickForm";
import { defaultEventTypes, formatEventType, normalizeEventType } from "@/lib/eventTypes";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const required = (label) => `${label} (Required)`;
const optional = (label) => `${label} (Optional)`;
const draftKey = "gitalife.root.eventDraft";
const blankEvent = {
  title: "",
  description: "",
  type: "kirtan",
  location: "",
  hub_id: "",
  event_date: "",
  coordinator: "",
  whatsapp_link: "",
  capacity: "",
  tags: [],
  needs_volunteers: false,
  recurrence_frequency: "none",
  recurrence_until: "",
};

const toDatetimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const eventToForm = (event) => ({
  title: event.title || "",
  description: event.description || "",
  type: event.type || "kirtan",
  location: event.location || "",
  hub_id: event.hub_id || "",
  event_date: toDatetimeLocal(event.event_date),
  coordinator: event.coordinator || "",
  whatsapp_link: event.whatsapp_link || "",
  capacity: event.capacity || "",
  tags: Array.isArray(event.tags) ? event.tags : [],
  needs_volunteers: Boolean(event.needs_volunteers),
  recurrence_frequency: "none",
  recurrence_until: "",
});

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => {
    try {
      return { ...blankEvent, ...JSON.parse(sessionStorage.getItem(draftKey) || "{}") };
    } catch {
      return blankEvent;
    }
  });
  const [eventImageFile, setEventImageFile] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [selectedSignupEvent, setSelectedSignupEvent] = useState(null);
  const [pendingVolunteerEvent, setPendingVolunteerEvent] = useState(null);
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
  useEffect(() => { sessionStorage.setItem(draftKey, JSON.stringify(form)); }, [form]);

  const resetForm = () => {
    setForm(blankEvent);
    setEventImageFile(null);
    setEditingEventId(null);
    sessionStorage.removeItem(draftKey);
  };

  const edit = (event) => {
    setForm(eventToForm(event));
    setEventImageFile(null);
    setEditingEventId(event.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const hub = hubs.find((item) => item.id === form.hub_id);
    const editingEvent = events.find((event) => event.id === editingEventId);

    try {
      const optionalText = (value = "") => String(value).trim() || null;
      const uploadedImageUrl = eventImageFile
        ? await appClient.storage.uploadEventImage(eventImageFile)
        : null;

      const eventValues = {
        title: form.title.trim(),
        description: optionalText(form.description),
        type: normalizeEventType(form.type) || "event",
        location: optionalText(form.location),
        hub_id: form.hub_id || null,
        campus: hub?.campus || null,
        event_date: new Date(form.event_date).toISOString(),
        image_url: uploadedImageUrl || editingEvent?.image_url || null,
        coordinator: optionalText(form.coordinator),
        whatsapp_link: optionalText(form.whatsapp_link),
        capacity: Number(form.capacity) || 0,
        tags: form.tags || [],
        needs_volunteers: Boolean(form.needs_volunteers),
      };

      if (editingEventId) {
        await appClient.entities.CommunityEvent.update(editingEventId, eventValues);
        resetForm();
        setMsg("Event updated.");
        await load();
        return;
      }

      const eventDates = buildRecurringEventDates(
        form.event_date,
        form.recurrence_frequency,
        form.recurrence_until,
      );
      const recurrenceId = eventDates.length > 1 ? createRecurrenceId() : null;

      let firstCreatedEvent = null;
      for (const eventDate of eventDates) {
        const createdEvent = await appClient.entities.CommunityEvent.create({
          ...eventValues,
          event_date: eventDate.toISOString(),
          signup_count: 0,
          recurrence_id: recurrenceId,
        });
        firstCreatedEvent = firstCreatedEvent || createdEvent;
      }
      resetForm();
      setMsg(eventDates.length > 1 ? `${eventDates.length} events created.` : "Event created.");
      if (form.needs_volunteers) setPendingVolunteerEvent(firstCreatedEvent);
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

      <form onSubmit={save} className="rounded-2xl bg-white border border-navy/8 p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
            {editingEventId ? <Pencil className="h-5 w-5 text-saffron" /> : <Plus className="h-5 w-5 text-saffron" />}
            {editingEventId ? "Edit Event" : "Create Event"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {editingEventId && (
              <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-lg bg-navy/5 px-3 py-2 font-heading text-xs font-semibold text-navy hover:bg-navy/10">
                <X className="h-3.5 w-3.5" />Cancel Edit
              </button>
            )}
            <Link to="/events" target="_blank" className="inline-flex items-center gap-2 rounded-lg bg-navy/5 px-3 py-2 font-heading text-xs font-semibold text-navy hover:bg-navy/10">
              <ExternalLink className="h-3.5 w-3.5" />View Public Events
            </Link>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>{required("Title")}</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>{optional("Hub")}</label><select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })} className={inputCls}><option value="">No hub</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></div>
          <div>
            <label className={labelCls}>{required("Type")}</label>
            <input
              list="root-event-type-options"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              onBlur={(e) => setForm({ ...form, type: normalizeEventType(e.target.value) || "event" })}
              className={inputCls}
              placeholder="kirtan, yoga, college_night"
              required
            />
            <datalist id="root-event-type-options">
              {defaultEventTypes.map((type) => <option key={type} value={type}>{formatEventType(type)}</option>)}
            </datalist>
          </div>
          <div><label className={labelCls}>{required("Date & Time")}</label><input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={inputCls} required /></div>
          {!editingEventId && (
            <>
              <div><label className={labelCls}>{optional("Repeat")}</label><select value={form.recurrence_frequency} onChange={(e) => setForm({ ...form, recurrence_frequency: e.target.value })} className={inputCls}>{recurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              {form.recurrence_frequency !== "none" && (
                <div><label className={labelCls}>{required("Repeat Until")}</label><input type="datetime-local" value={form.recurrence_until} onChange={(e) => setForm({ ...form, recurrence_until: e.target.value })} className={inputCls} required /></div>
              )}
            </>
          )}
          <div><label className={labelCls}>{optional("Location")}</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>{optional("Capacity")}</label><input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputCls} /></div>
          <label className="flex items-center gap-2 self-end rounded-xl border border-navy/10 px-4 py-3 font-heading text-sm font-semibold text-navy">
            <input type="checkbox" checked={form.needs_volunteers} onChange={(e) => setForm({ ...form, needs_volunteers: e.target.checked })} />
            Needs volunteers?
          </label>
          <div><label className={labelCls}>{optional("Coordinator")}</label><input value={form.coordinator} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>{optional("WhatsApp Link")}</label><input value={form.whatsapp_link} onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <EventTagsInput tags={form.tags || []} onChange={(tags) => setForm({ ...form, tags })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{optional("Event Image")}</label>
            <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
              <Upload className="h-4 w-4 text-saffron" />
              <span className="truncate">{eventImageFile?.name || (editingEventId ? "Upload replacement image" : "Upload image")}</span>
              <input type="file" accept="image/*" onChange={(e) => setEventImageFile(e.target.files?.[0] || null)} className="sr-only" />
            </label>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>{optional("Description")}</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} /></div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEventId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingEventId ? "Update Event" : "Create Event"}
        </button>
      </form>

      {pendingVolunteerEvent && (
        <div className="rounded-2xl border border-saffron/20 bg-saffron/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-heading text-sm font-bold text-navy">Add volunteer info for {pendingVolunteerEvent.title}</p>
            <button onClick={() => setPendingVolunteerEvent(null)} className="rounded-lg bg-white px-3 py-2 font-heading text-xs font-semibold text-navy">Skip</button>
          </div>
          <VolunteerOpportunityQuickForm event={pendingVolunteerEvent} onCreated={() => setPendingVolunteerEvent(null)} />
        </div>
      )}

      {selectedSignupEvent && <EventSignupsPanel event={selectedSignupEvent} onClose={() => setSelectedSignupEvent(null)} />}

      <div className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4">All Events ({events.length})</h3>
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold text-navy">{ev.title}</p>
                <p className="font-body text-xs text-navy/50">{ev.location || "Location coming soon"} - {new Date(ev.event_date).toLocaleDateString()}{ev.recurrence_id ? " - Recurring" : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => setSelectedSignupEvent(ev)} className="rounded-lg bg-saffron/10 px-3 py-2 font-heading text-xs font-semibold text-saffron hover:bg-saffron/20">Signups</button>
                <button onClick={() => edit(ev)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy hover:bg-navy/10" aria-label={`Edit ${ev.title}`}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(ev.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" aria-label={`Delete ${ev.title}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="font-body text-sm text-navy/50">No events yet.</p>}
        </div>
      </div>
    </div>
  );
}
