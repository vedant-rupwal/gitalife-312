import React, { useState, useEffect } from "react";
import { X, Users, Loader2 } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function EventAttendees({ event, onClose }) {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.entities.EventSignup.filter({ event_id: event.id })
      .then(setSignups)
      .finally(() => setLoading(false));
  }, [event.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy/8">
          <div>
            <h3 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <Users className="h-5 w-5 text-saffron" /> Attendees
            </h3>
            <p className="font-body text-sm text-navy/60">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/5 text-navy hover:bg-navy/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-saffron" />
            </div>
          ) : signups.length === 0 ? (
            <p className="font-body text-sm text-navy/50 text-center py-10">No signups yet for this event.</p>
          ) : (
            <>
              <p className="font-heading text-sm font-semibold text-navy/70 mb-3">
                {signups.length} signed up{event.capacity ? ` / ${event.capacity} capacity` : ""}
              </p>
              <div className="overflow-hidden rounded-xl border border-navy/8">
                <table className="w-full text-left">
                  <thead className="bg-cream">
                    <tr>
                      <th className="px-4 py-3 font-heading text-xs font-semibold text-navy/70 uppercase">Name</th>
                      <th className="px-4 py-3 font-heading text-xs font-semibold text-navy/70 uppercase">Email</th>
                      <th className="px-4 py-3 font-heading text-xs font-semibold text-navy/70 uppercase">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/8">
                    {signups.map((s) => (
                      <tr key={s.id} className="hover:bg-cream/50">
                        <td className="px-4 py-3 font-body text-sm font-medium text-navy">{s.name}</td>
                        <td className="px-4 py-3 font-body text-sm text-navy/70">{s.email}</td>
                        <td className="px-4 py-3 font-body text-sm text-navy/70">{s.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}