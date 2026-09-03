import React, { useState } from "react";
import { Check, HandHeart, Loader2, Plus } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

const toDatetimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

export default function VolunteerOpportunityQuickForm({ event, onCreated }) {
  const [form, setForm] = useState({
    title: event ? `Volunteer for ${event.title}` : "",
    description: "",
    role_details: "",
    location: event?.location || "",
    starts_at: toDatetimeLocal(event?.event_date),
    needed_count: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const create = async (submitEvent) => {
    submitEvent.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await appClient.entities.VolunteerOpportunity.create({
        event_id: event?.id || null,
        hub_id: event?.hub_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        role_details: form.role_details.trim() || null,
        location: form.location.trim() || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        needed_count: Number(form.needed_count) || null,
        is_active: true,
      });
      setMsg("Volunteer opportunity created.");
      onCreated?.();
    } catch (err) {
      setMsg(err.message || "Could not create volunteer opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={create} className="rounded-2xl border border-saffron/20 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-navy">
        <HandHeart className="h-5 w-5 text-saffron" />Volunteer Info
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Title (Required)</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required /></div>
        <div><label className={labelCls}>Needed Count (Optional)</label><input type="number" min="0" value={form.needed_count} onChange={(e) => setForm({ ...form, needed_count: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Date & Time (Optional)</label><input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Location (Optional)</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Description (Optional)</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Volunteer Info (Optional)</label><textarea value={form.role_details} onChange={(e) => setForm({ ...form, role_details: e.target.value })} className={inputCls} rows={2} placeholder="Roles, arrival time, what to bring..." /></div>
      </div>
      {msg && <p className="mt-3 flex items-center gap-2 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</p>}
      <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Volunteer Opportunity
      </button>
    </form>
  );
}
