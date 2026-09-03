import React, { useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-2xl border border-navy/10 bg-white/90 px-5 py-4 font-body text-sm text-navy outline-none transition-all placeholder:text-navy/35 focus:border-saffron focus:ring-2 focus:ring-saffron/20";
const labelCls = "block font-heading text-xs font-semibold uppercase tracking-[0.22em] text-navy/45 mb-2";

const formatMeeting = (hub) => {
  const day = hub.meeting_day?.trim();
  const time = hub.meeting_time?.trim();
  if (day && time) return `${day}, ${time}`;
  return day || time || "Schedule coming soon";
};

const mapsUrl = (hub) => {
  if (hub.lat && hub.lng) return `https://www.google.com/maps/search/?api=1&query=${hub.lat},${hub.lng}`;
  const query = [hub.name, hub.campus, hub.neighborhood, "Chicago IL"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export default function HubContactCard({ hub }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    how_found: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await appClient.entities.HubContact.create({
        hub_id: hub.id,
        hub_name: hub.name,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        how_found: form.how_found || null,
        note: form.note.trim() || null,
      });
      setSaved(true);
      setForm({ name: "", email: "", phone: "", how_found: "", note: "" });
    } catch {
      setError("We could not save this yet. Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy/10 bg-[#d8c7a3]/55 p-6 shadow-sm sm:p-8">
      <div className="mb-8">
        <p className="mb-3 font-heading text-xs font-bold uppercase tracking-[0.32em] text-saffron">Save Your Seat - Free</p>
        <h2 className="font-heading text-3xl font-bold text-navy">Join {hub.name}</h2>
      </div>

      <div className="mb-8 divide-y divide-navy/10 border-y border-navy/10">
        <div className="grid grid-cols-[120px_1fr] gap-4 py-4">
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-navy/45">Next Class</span>
          <span className="text-right font-heading text-sm font-bold text-navy">{hub.meeting_day || "Weekly gathering"}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-4 py-4">
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-navy/45">Time</span>
          <span className="text-right font-heading text-sm font-bold text-navy">{formatMeeting(hub)}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-4 py-4">
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-navy/45">Venue</span>
          <span className="text-right font-heading text-sm font-bold text-navy">{[hub.campus, hub.neighborhood].filter(Boolean).join(" - ") || "Details coming soon"}</span>
        </div>
        <a href={mapsUrl(hub)} target="_blank" rel="noopener noreferrer" className="grid grid-cols-[120px_1fr] gap-4 py-4">
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-navy/45">Getting There</span>
          <span className="inline-flex justify-end gap-2 text-right font-heading text-sm font-bold text-navy hover:text-saffron"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Open in Maps</span>
        </a>
      </div>

      {saved ? (
        <div className="rounded-2xl bg-white/80 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-river" />
          <p className="font-heading text-lg font-bold text-navy">You are on the list.</p>
          <p className="mt-1 font-body text-sm text-navy/60">We saved your contact info for this hub.</p>
          <button onClick={() => setSaved(false)} className="mt-4 rounded-xl bg-navy px-5 py-3 font-heading text-sm font-semibold text-white">Add another person</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className={labelCls}>Full Name (Required)</label>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} className={inputCls} placeholder="Arjuna Das" required />
          </div>
          <div>
            <label className={labelCls}>Email (Required)</label>
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={inputCls} placeholder="you@example.com" required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mobile (Optional)</label>
              <input value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputCls} placeholder="(201) 555-0134" />
            </div>
            <div>
              <label className={labelCls}>How Did You Find Us? (Optional)</label>
              <select value={form.how_found} onChange={(event) => update("how_found", event.target.value)} className={inputCls}>
                <option value="">Select...</option>
                <option value="Friend">Friend</option>
                <option value="Campus">Campus</option>
                <option value="Instagram">Instagram</option>
                <option value="Website">Website</option>
                <option value="Flyer">Flyer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Message (Optional)</label>
            <textarea value={form.note} onChange={(event) => update("note", event.target.value)} className={inputCls} rows={3} placeholder="Anything you want the hub team to know..." />
          </div>
          {error && <p className="font-body text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron px-6 py-4 font-heading text-base font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Register once - come every week
          </button>
          <p className="text-center font-body text-xs text-navy/45">Free, always. The local hub team will use this to follow up with you.</p>
        </form>
      )}
    </div>
  );
}
