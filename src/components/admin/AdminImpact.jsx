import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const blankStat = { label: "", value: "", unit: "", icon: "BookOpen", sort_order: "" };
const iconOptions = ["BookOpen", "UtensilsCrossed", "Users", "Mountain"];

export default function AdminImpact() {
  const [stats, setStats] = useState([]);
  const [form, setForm] = useState(blankStat);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => appClient.entities.ImpactStat.list("sort_order", 50).then(setStats).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (id, values) => {
    await appClient.entities.ImpactStat.update(id, values);
    await load();
  };

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await appClient.entities.ImpactStat.create({
        label: form.label.trim(),
        value: Number(form.value) || 0,
        unit: form.unit.trim() || null,
        icon: form.icon,
        sort_order: Number(form.sort_order) || stats.length + 1,
      });
      setForm(blankStat);
      setMsg("Impact stat created.");
      await load();
    } catch (err) {
      setMsg(err.message || "Impact stat create failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const del = async (id) => {
    if (!confirm("Delete impact stat?")) return;
    await appClient.entities.ImpactStat.delete(id);
    load();
  };

  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;
  return (
    <div className="space-y-8">
      {msg && <div className="flex items-center gap-2 rounded-xl bg-river/10 border border-river/20 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <form onSubmit={create} className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-saffron" />Create Impact Stat</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2"><label className={labelCls}>Label (Required)</label><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Value (Required)</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Unit (Optional)</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls} placeholder="/week" /></div>
          <div><label className={labelCls}>Order (Optional)</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} /></div>
          <div className="lg:col-span-2"><label className={labelCls}>Icon (Required)</label><select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputCls}>{iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Stat
        </button>
      </form>

      <div className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4">Impact Stats</h3>
        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.id} className="grid gap-3 rounded-xl border border-navy/8 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <div><label className={labelCls}>Label</label><input defaultValue={s.label} onBlur={(e) => update(s.id, { label: e.target.value.trim() })} className={inputCls} /></div>
              <div><label className={labelCls}>Value</label><input type="number" defaultValue={s.value} onBlur={(e) => update(s.id, { value: Number(e.target.value) || 0 })} className={inputCls} /></div>
              <div><label className={labelCls}>Unit</label><input defaultValue={s.unit || ""} onBlur={(e) => update(s.id, { unit: e.target.value.trim() || null })} className={inputCls} /></div>
              <div><label className={labelCls}>Icon</label><select defaultValue={s.icon || "BookOpen"} onBlur={(e) => update(s.id, { icon: e.target.value })} className={inputCls}>{iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></div>
              <div><label className={labelCls}>Order</label><input type="number" defaultValue={s.sort_order} onBlur={(e) => update(s.id, { sort_order: Number(e.target.value) || 0 })} className={inputCls} /></div>
              <div className="flex items-end"><button onClick={() => del(s.id)} className="flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
          {stats.length === 0 && <p className="font-body text-sm text-navy/50">No impact stats yet.</p>}
        </div>
      </div>
    </div>
  );
}
