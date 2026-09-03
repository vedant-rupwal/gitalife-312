import React, { useEffect, useState } from "react";
import { Check, Eye, HandHeart, Loader2, Plus, Trash2, Users } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const blankOpportunity = {
  event_id: "",
  title: "",
  description: "",
  role_details: "",
  location: "",
  starts_at: "",
  needed_count: "",
  is_active: true,
};

const toDatetimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

export default function AdminVolunteerOpportunities({ hubId = null, initialEvent = null, onCreated }) {
  const [events, setEvents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [signupsByOpportunity, setSignupsByOpportunity] = useState({});
  const [openSignupsId, setOpenSignupsId] = useState(null);
  const [form, setForm] = useState(blankOpportunity);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [eventRows, opportunityRows] = await Promise.all([
      appClient.entities.CommunityEvent.list("event_date", 100).catch(() => []),
      appClient.entities.VolunteerOpportunity.list("starts_at", 100).catch(() => []),
    ]);
    const scopedEvents = hubId ? eventRows.filter((event) => event.hub_id === hubId) : eventRows;
    const scopedEventIds = new Set(scopedEvents.map((event) => event.id));
    setEvents(scopedEvents);
    setOpportunities(hubId
      ? opportunityRows.filter((opportunity) => opportunity.hub_id === hubId || scopedEventIds.has(opportunity.event_id))
      : opportunityRows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hubId]);

  useEffect(() => {
    if (!initialEvent) return;
    setForm({
      ...blankOpportunity,
      event_id: initialEvent.id,
      title: `Volunteer for ${initialEvent.title}`,
      location: initialEvent.location || "",
      starts_at: toDatetimeLocal(initialEvent.event_date),
    });
  }, [initialEvent]);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const linkedEvent = events.find((eventItem) => eventItem.id === form.event_id);
      await appClient.entities.VolunteerOpportunity.create({
        event_id: form.event_id || null,
        hub_id: hubId || linkedEvent?.hub_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        role_details: form.role_details.trim() || null,
        location: form.location.trim() || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        needed_count: Number(form.needed_count) || null,
        is_active: form.is_active,
      });
      setForm(blankOpportunity);
      setMsg("Volunteer opportunity created.");
      onCreated?.();
      await load();
    } catch (err) {
      setMsg(err.message || "Could not create volunteer opportunity.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const del = async (id) => {
    if (!confirm("Delete volunteer opportunity?")) return;
    await appClient.entities.VolunteerOpportunity.delete(id);
    load();
  };

  const loadSignups = async (opportunityId) => {
    if (openSignupsId === opportunityId) {
      setOpenSignupsId(null);
      return;
    }
    setOpenSignupsId(opportunityId);
    if (signupsByOpportunity[opportunityId]) return;
    const rows = await appClient.entities.VolunteerSignup.filter({ opportunity_id: opportunityId }, "-created_date", 100).catch(() => []);
    setSignupsByOpportunity((current) => ({ ...current, [opportunityId]: rows }));
  };

  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;

  return (
    <div className="space-y-8">
      {msg && <div className="flex items-center gap-2 rounded-xl bg-river/10 border border-river/20 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <form onSubmit={create} className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-navy"><HandHeart className="h-5 w-5 text-saffron" />Create Volunteer Opportunity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Title (Required)</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Linked Event (Optional)</label><select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })} className={inputCls}><option value="">No linked event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></div>
          <div><label className={labelCls}>Date & Time (Optional)</label><input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Needed Count (Optional)</label><input type="number" min="0" value={form.needed_count} onChange={(e) => setForm({ ...form, needed_count: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Location (Optional)</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></div>
          <label className="flex items-center gap-2 self-end rounded-xl border border-navy/10 px-4 py-3 font-heading text-sm font-semibold text-navy"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Active</label>
          <div className="sm:col-span-2"><label className={labelCls}>Description (Optional)</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Volunteer Info (Optional)</label><textarea value={form.role_details} onChange={(e) => setForm({ ...form, role_details: e.target.value })} className={inputCls} rows={3} placeholder="Roles, arrival time, what to bring, coordinator contact..." /></div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Opportunity</button>
      </form>

      <div className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="mb-4 font-heading text-lg font-bold text-navy">Volunteer Opportunities ({opportunities.length})</h3>
        <div className="space-y-3">
          {opportunities.map((opportunity) => {
            const signups = signupsByOpportunity[opportunity.id] || [];
            return (
              <div key={opportunity.id} className="rounded-xl border border-navy/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold text-navy">{opportunity.title}</p>
                    <p className="font-body text-xs text-navy/50">{opportunity.location || "Location coming soon"} - {opportunity.starts_at ? new Date(opportunity.starts_at).toLocaleDateString() : "Flexible"}</p>
                    {!opportunity.event_id && <p className="mt-1 font-body text-xs text-navy/40">Standalone opportunity</p>}
                    <p className="mt-1 font-body text-xs text-saffron">{opportunity.signup_count || 0}{opportunity.needed_count ? `/${opportunity.needed_count}` : ""} volunteers signed up</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => loadSignups(opportunity.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy hover:bg-navy/10" aria-label="View volunteer signups"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => del(opportunity.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" aria-label="Delete volunteer opportunity"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {openSignupsId === opportunity.id && (
                  <div className="mt-4 rounded-xl bg-cream p-4">
                    {signups.length === 0 ? <p className="font-body text-sm text-navy/60">No volunteer signups yet.</p> : signups.map((signup) => (
                      <div key={signup.id} className="border-b border-navy/8 py-2 last:border-0">
                        <p className="flex items-center gap-2 font-heading text-sm font-bold text-navy"><Users className="h-4 w-4 text-saffron" />{signup.name}</p>
                        <p className="font-body text-xs text-navy/60">{signup.email} - {signup.phone}</p>
                        {signup.note && <p className="mt-1 font-body text-xs text-navy/50">{signup.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {opportunities.length === 0 && <p className="font-body text-sm text-navy/50">No volunteer opportunities yet.</p>}
        </div>
      </div>
    </div>
  );
}
