import React, { useEffect, useState } from "react";
import { Loader2, Mail, Phone, Users, X } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function EventSignupsPanel({ event, onClose }) {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!event?.id) return;
    appClient.entities.EventSignup.filter({ event_id: event.id }, "-created_date", 100)
      .then(setSignups)
      .catch(() => setSignups([]))
      .finally(() => setLoading(false));
  }, [event?.id]);

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-navy">Event Signups</h3>
          <p className="font-body text-sm text-navy/50">{event.title}</p>
        </div>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy hover:bg-navy/10" aria-label="Close signups">
          <X className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>
      ) : signups.length === 0 ? (
        <p className="rounded-xl bg-cream p-4 font-body text-sm text-navy/60">No one has signed up for this event yet.</p>
      ) : (
        <div className="space-y-2">
          {signups.map((signup) => (
            <div key={signup.id} className="rounded-xl border border-navy/8 p-4">
              <div className="flex items-center gap-2 font-heading text-sm font-bold text-navy">
                <Users className="h-4 w-4 text-saffron" />{signup.name}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 font-body text-xs text-navy/60">
                <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-saffron" />{signup.email}</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-saffron" />{signup.phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
