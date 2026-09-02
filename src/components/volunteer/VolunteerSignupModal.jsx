import React, { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function VolunteerSignupModal({ opportunity, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setError("Name, email, and phone are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await appClient.entities.VolunteerSignup.create({
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        note: form.note.trim() || null,
      });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-navy/5 text-navy hover:bg-navy/10" aria-label="Close volunteer signup">
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-river/10">
              <Check className="h-8 w-8 text-river" />
            </div>
            <h3 className="mb-2 font-heading text-2xl font-bold text-navy">You're on the list!</h3>
            <p className="mb-6 font-body text-sm text-navy/60">We saved your volunteer signup for <strong className="text-navy">{opportunity.title}</strong>.</p>
            <button onClick={onClose} className="rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
            <div>
              <h3 className="font-heading text-xl font-bold text-navy">Volunteer Signup</h3>
              <p className="mt-1 font-body text-sm text-navy/60">{opportunity.title}</p>
            </div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20" placeholder="Your name" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20" placeholder="you@email.com" />
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20" placeholder="Phone number" />
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20" placeholder="Availability or notes" rows={3} />
            {error && <p className="font-body text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-saffron px-6 py-3.5 font-heading text-sm font-semibold text-white disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Sign Up to Volunteer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
