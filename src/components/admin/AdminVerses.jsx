import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Trash2, Loader2 } from "lucide-react";
import { formatDevanagari } from "@/lib/verseText";

export default function AdminVerses() {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => appClient.entities.Verse.list("-created_date", 20).then(setVerses).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (!confirm("Delete verse?")) return; await appClient.entities.Verse.delete(id); load(); };
  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  return (
    <div className="rounded-2xl bg-white border border-navy/8 p-6">
      <h3 className="font-heading text-lg font-bold text-navy mb-1">Recent Verses</h3>
      <p className="font-body text-xs text-navy/50 mb-4">701 verses preloaded · daily rotation runs automatically</p>
      <div className="space-y-2">
        {verses.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
            <div className="min-w-0 flex-1">
              <span className="font-heading text-xs font-semibold text-saffron">BG {v.chapter}.{v.verse_number}{v.is_displayed_today ? " · Today" : ""}</span>
              <p className="font-display text-sm text-navy/80 italic mt-1 line-clamp-2">{formatDevanagari(v.sanskrit)}</p>
            </div>
            <button onClick={() => del(v.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
