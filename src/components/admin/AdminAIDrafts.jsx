import React, { useEffect, useMemo, useState } from "react";
import { Bot, Check, Clipboard, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/20";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

const draftTypes = [
  ["event", "Event Description"],
  ["volunteer", "Volunteer Opportunity"],
  ["instagram", "Instagram Caption"],
  ["whatsapp", "WhatsApp Message"],
  ["email", "Follow-up Email"],
  ["summary", "Signup Summary"],
];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function AdminAIDrafts({ me, hubId = null }) {
  const [hubs, setHubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    title: "",
    draft_type: "event",
    hub_id: hubId || "",
    instructions: "",
  });
  const [applyTargets, setApplyTargets] = useState({});

  const assignedHubIds = useMemo(() => [
    me?.assigned_hub_id,
    ...(Array.isArray(me?.assigned_hub_ids) ? me.assigned_hub_ids : []),
    ...(Array.isArray(me?.data?.assigned_hub_ids) ? me.data.assigned_hub_ids : []),
  ].filter(Boolean), [me]);

  const load = async () => {
    setLoading(true);
    try {
      const [hubRows, draftRows] = await Promise.all([
        appClient.entities.Hub.list("name").catch(() => []),
        hubId
          ? appClient.entities.AiDraft.filter({ hub_id: hubId }, "-created_date", 100).catch(() => [])
          : appClient.entities.AiDraft.list("-created_date", 100).catch(() => []),
      ]);
      const [eventRows, opportunityRows] = await Promise.all([
        appClient.entities.CommunityEvent.list("-event_date", 200).catch(() => []),
        appClient.entities.VolunteerOpportunity.list("-starts_at", 200).catch(() => []),
      ]);
      const visibleHubs = me?.role === "admin"
        ? hubRows
        : hubRows.filter((hub) => assignedHubIds.includes(hub.id));
      const visibleHubIds = new Set(visibleHubs.map((hub) => hub.id));
      const visibleEvents = eventRows.filter((event) => !event.hub_id || visibleHubIds.has(event.hub_id));
      const visibleEventIds = new Set(visibleEvents.map((event) => event.id));
      setHubs(visibleHubs);
      setEvents(hubId ? visibleEvents.filter((event) => event.hub_id === hubId) : visibleEvents);
      setOpportunities(opportunityRows.filter((opportunity) => (
        (!opportunity.hub_id || visibleHubIds.has(opportunity.hub_id) || visibleEventIds.has(opportunity.event_id))
        && (!hubId || opportunity.hub_id === hubId || visibleEventIds.has(opportunity.event_id))
      )));
      setDrafts(draftRows);
      if (hubId) setForm((current) => ({ ...current, hub_id: hubId }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [hubId, assignedHubIds.join(","), me?.role]);

  const generate = async (event) => {
    event.preventDefault();
    setGenerating(true);
    setMsg("");
    try {
      const result = await appClient.ai.generateAdminDraft({
        title: form.title.trim() || `${draftTypes.find(([value]) => value === form.draft_type)?.[1] || "AI"} Draft`,
        draft_type: form.draft_type,
        hub_id: form.hub_id || null,
        instructions: form.instructions.trim(),
      });
      setDrafts((current) => [result.draft, ...current]);
      setForm((current) => ({ ...current, title: "", instructions: "" }));
      setMsg("Draft generated.");
    } catch (error) {
      setMsg(error.message || "Could not generate draft.");
    } finally {
      setGenerating(false);
      setTimeout(() => setMsg(""), 5000);
    }
  };

  const updateStatus = async (draft, status) => {
    const updated = await appClient.entities.AiDraft.update(draft.id, { status });
    setDrafts((current) => current.map((item) => (item.id === draft.id ? updated : item)));
  };

  const copyDraft = async (draft) => {
    await navigator.clipboard.writeText(draft.body || "");
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(""), 1800);
  };

  const setApplyTarget = (draftId, field, value) => {
    setApplyTargets((current) => ({
      ...current,
      [draftId]: {
        ...(current[draftId] || {}),
        [field]: value,
      },
    }));
  };

  const applyDraft = async (draft) => {
    const target = applyTargets[draft.id] || {};
    try {
      if (draft.draft_type === "event") {
        if (!target.event_id) throw new Error("Choose an event first.");
        await appClient.entities.CommunityEvent.update(target.event_id, { description: draft.body });
      } else if (draft.draft_type === "volunteer") {
        if (!target.opportunity_id) throw new Error("Choose a volunteer opportunity first.");
        await appClient.entities.VolunteerOpportunity.update(target.opportunity_id, { description: draft.body });
      } else {
        if (!target.hub_id && !hubId) throw new Error("Choose a hub first.");
        await appClient.entities.Hub.update(target.hub_id || hubId, { description: draft.body });
      }
      await updateStatus(draft, "used");
      setMsg("Draft applied to the website.");
    } catch (error) {
      setMsg(error.message || "Could not apply draft.");
    } finally {
      setTimeout(() => setMsg(""), 5000);
    }
  };

  const applyOptionsFor = (draft) => {
    if (draft.draft_type === "event") {
      return {
        label: "Apply To Event",
        field: "event_id",
        options: events.map((event) => [event.id, event.title]),
      };
    }
    if (draft.draft_type === "volunteer") {
      return {
        label: "Apply To Volunteer Opportunity",
        field: "opportunity_id",
        options: opportunities.map((opportunity) => [opportunity.id, opportunity.title]),
      };
    }
    if (["instagram", "whatsapp", "email", "summary"].includes(draft.draft_type)) {
      return null;
    }
    return {
      label: "Apply To Hub Description",
      field: "hub_id",
      options: hubs.map((hub) => [hub.id, hub.name]),
    };
  };

  return (
    <div className="space-y-8">
      {msg && <div className="flex items-center gap-2 rounded-xl border border-river/20 bg-river/10 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <form onSubmit={generate} className="rounded-2xl border border-navy/8 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-navy"><Sparkles className="h-5 w-5 text-saffron" />Generate AI Draft</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Draft Type</label>
            <select value={form.draft_type} onChange={(event) => setForm({ ...form, draft_type: event.target.value })} className={inputCls}>
              {draftTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Hub Scope {hubId ? "" : "(Optional)"}</label>
            <select value={form.hub_id} onChange={(event) => setForm({ ...form, hub_id: event.target.value })} className={inputCls} disabled={Boolean(hubId)}>
              <option value="">All allowed hubs</option>
              {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Title (Optional)</label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputCls} placeholder="Saturday kirtan announcement" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Instructions (Required)</label>
            <textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} className={inputCls} rows={4} placeholder="Draft a warm WhatsApp message for this week's UIC gathering. Mention prasadam and invite friends." required />
          </div>
        </div>
        <button type="submit" disabled={generating} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          {generating ? "Generating..." : "Generate Draft"}
        </button>
      </form>

      <div className="rounded-2xl border border-navy/8 bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-navy">AI Drafts</h3>
            <p className="font-body text-sm text-navy/50">Review, copy, approve, or mark drafts as used.</p>
          </div>
          <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy hover:bg-navy/10" aria-label="Refresh drafts">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>
        ) : drafts.length === 0 ? (
          <p className="rounded-xl bg-cream p-4 font-body text-sm text-navy/60">No AI drafts yet.</p>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-xl border border-navy/8 p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-bold text-navy">{draft.title}</p>
                    <p className="font-body text-xs text-navy/45">{draft.draft_type} - {draft.status} - {formatDate(draft.created_date)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyDraft(draft)} className="inline-flex items-center gap-1 rounded-lg bg-saffron/10 px-3 py-2 font-heading text-xs font-semibold text-saffron hover:bg-saffron/20"><Clipboard className="h-3.5 w-3.5" />{copiedId === draft.id ? "Copied" : "Copy"}</button>
                    <button onClick={() => updateStatus(draft, "approved")} className="rounded-lg bg-river/10 px-3 py-2 font-heading text-xs font-semibold text-river hover:bg-river/20">Approve</button>
                    <button onClick={() => updateStatus(draft, "used")} className="rounded-lg bg-navy/5 px-3 py-2 font-heading text-xs font-semibold text-navy hover:bg-navy/10">Used</button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap rounded-xl bg-cream p-4 font-body text-sm leading-relaxed text-navy/75">{draft.body}</div>
                {draft.status === "approved" && applyOptionsFor(draft) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={applyTargets[draft.id]?.[applyOptionsFor(draft).field] || ""}
                      onChange={(event) => setApplyTarget(draft.id, applyOptionsFor(draft).field, event.target.value)}
                      className={inputCls}
                    >
                      <option value="">{applyOptionsFor(draft).label}</option>
                      {applyOptionsFor(draft).options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button onClick={() => applyDraft(draft)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 font-heading text-xs font-semibold text-white hover:bg-navy/90">
                      <Send className="h-3.5 w-3.5" />Apply Draft
                    </button>
                  </div>
                )}
                {draft.status === "approved" && ["instagram", "whatsapp", "email", "summary"].includes(draft.draft_type) && (
                  <p className="mt-3 rounded-xl bg-saffron/10 px-4 py-3 font-body text-xs text-saffron">
                    This draft is approved. Copy it for now; direct sending/posting needs that channel integration enabled.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
