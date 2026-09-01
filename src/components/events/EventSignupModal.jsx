import React, { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function EventSignupModal({ event, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setError("Name, email, and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await appClient.entities.EventSignup.create({
        event_id: event.id,
        event_title: event.title,
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      setDone(true);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-navy/5 text-navy hover:bg-navy/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-river/10">
              <Check className="h-8 w-8 text-river" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-navy mb-2">You're in!</h3>
            <p className="font-body text-sm text-navy/60 mb-6">
              We've saved your spot for <strong className="text-navy">{event.title}</strong>. Check your email for details.
            </p>
            <button
              onClick={onClose}
              className="rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <h3 className="font-heading text-xl font-bold text-navy mb-1">Sign Up</h3>
            <p className="font-body text-sm text-navy/60 mb-6">{event.title}</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5">Phone <span className="text-saffron normal-case">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all"
                  placeholder="(312) 555-0123"
                  required
                />
              </div>

              {error && <p className="font-body text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-saffron px-6 py-3.5 font-heading text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Confirm Signup"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
