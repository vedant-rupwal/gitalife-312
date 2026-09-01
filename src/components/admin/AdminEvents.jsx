import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Trash2, Loader2 } from "lucide-react";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => appClient.entities.CommunityEvent.list("event_date", 50).then(setEvents).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (!confirm("Delete event?")) return; await appClient.entities.CommunityEvent.delete(id); load(); };
  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  return (
    <div className="rounded-2xl bg-white border border-navy/8 p-6">
      <h3 className="font-heading text-lg font-bold text-navy mb-4">All Events ({events.length})</h3>
      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
            <div className="min-w-0">
              <p className="font-heading text-sm font-bold text-navy">{ev.title}</p>
              <p className="font-body text-xs text-navy/50">{ev.location} · {new Date(ev.event_date).toLocaleDateString()}</p>
            </div>
            <button onClick={() => del(ev.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {events.length === 0 && <p className="font-body text-sm text-navy/50">No events yet.</p>}
      </div>
    </div>
  );
}