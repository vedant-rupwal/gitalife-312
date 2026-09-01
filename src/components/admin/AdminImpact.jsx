import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Loader2 } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

export default function AdminImpact() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { appClient.entities.ImpactStat.list("sort_order", 10).then(setStats).finally(() => setLoading(false)); }, []);
  const update = async (id, value) => { await appClient.entities.ImpactStat.update(id, { value: Number(value) }); };
  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  return (
    <div className="rounded-2xl bg-white border border-navy/8 p-6">
      <h3 className="font-heading text-lg font-bold text-navy mb-4">Impact Stats</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.id} className="rounded-xl border border-navy/8 p-4">
            <label className={labelCls}>{s.label}</label>
            <div className="flex items-center gap-2">
              <input type="number" defaultValue={s.value} onBlur={(e) => update(s.id, e.target.value)} className={inputCls} />
              <span className="font-body text-sm text-navy/50 whitespace-nowrap">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 font-body text-xs text-navy/40">Values auto-save when you click away.</p>
    </div>
  );
}