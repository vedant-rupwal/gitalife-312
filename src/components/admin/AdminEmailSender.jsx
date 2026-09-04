import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Mail, Send } from "lucide-react";
import { appClient } from "@/api/appClient";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/20";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

const audienceOptions = [
  ["hub_people", "Everyone connected to a hub"],
  ["hub_contacts", "Hub contact form people"],
  ["event_signups", "Specific event signups"],
  ["volunteer_signups", "Specific volunteer signups"],
  ["manual", "Manual email list"],
];

export default function AdminEmailSender({ me, hubId = null }) {
  const [hubs, setHubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    audience_type: hubId ? "hub_people" : "manual",
    hub_id: hubId || "",
    event_id: "",
    opportunity_id: "",
    manual_emails: "",
    subject: "",
    message: "",
  });

  const assignedHubIds = useMemo(() => [
    me?.assigned_hub_id,
    ...(Array.isArray(me?.assigned_hub_ids) ? me.assigned_hub_ids : []),
    ...(Array.isArray(me?.data?.assigned_hub_ids) ? me.data.assigned_hub_ids : []),
  ].filter(Boolean), [me]);

  useEffect(() => {
    const load = async () => {
      const [hubRows, eventRows, opportunityRows] = await Promise.all([
        appClient.entities.Hub.list("name").catch(() => []),
        appClient.entities.CommunityEvent.list("-event_date", 200).catch(() => []),
        appClient.entities.VolunteerOpportunity.list("-starts_at", 200).catch(() => []),
      ]);
      const visibleHubs = me?.role === "admin" ? hubRows : hubRows.filter((hub) => assignedHubIds.includes(hub.id));
      const visibleHubIds = new Set(visibleHubs.map((hub) => hub.id));
      const visibleEvents = eventRows.filter((event) => !event.hub_id || visibleHubIds.has(event.hub_id));
      const visibleEventIds = new Set(visibleEvents.map((event) => event.id));

      setHubs(visibleHubs);
      setEvents(hubId ? visibleEvents.filter((event) => event.hub_id === hubId) : visibleEvents);
      setOpportunities(opportunityRows.filter((opportunity) => (
        (!opportunity.hub_id || visibleHubIds.has(opportunity.hub_id) || visibleEventIds.has(opportunity.event_id))
        && (!hubId || opportunity.hub_id === hubId || visibleEventIds.has(opportunity.event_id))
      )));
    };
    load();
  }, [assignedHubIds, hubId, me?.role]);

  useEffect(() => {
    if (hubId) setForm((current) => ({ ...current, hub_id: hubId }));
  }, [hubId]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setMsg("");
    try {
      const result = await appClient.notifications.sendAdminEmail(form);
      setMsg(`Sent ${result.sent_count} email${result.sent_count === 1 ? "" : "s"}.`);
      setForm((current) => ({ ...current, subject: "", message: "" }));
    } catch (error) {
      setMsg(error.message || "Email failed.");
    } finally {
      setSending(false);
      setTimeout(() => setMsg(""), 6000);
    }
  };

  const requiresHub = ["hub_people", "hub_contacts"].includes(form.audience_type);
  const showHub = requiresHub || form.audience_type === "manual";

  return (
    <form onSubmit={send} className="rounded-2xl border border-navy/8 bg-white p-6">
      <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-navy">
        <Mail className="h-5 w-5 text-saffron" />Send Email
      </h3>
      {msg && <div className="mb-4 flex items-center gap-2 rounded-xl border border-river/20 bg-river/10 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Audience</label>
          <select value={form.audience_type} onChange={(event) => update("audience_type", event.target.value)} className={inputCls}>
            {audienceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {showHub && (
          <div>
            <label className={labelCls}>Hub {requiresHub ? "(Required)" : "(Optional)"}</label>
            <select value={form.hub_id} onChange={(event) => update("hub_id", event.target.value)} className={inputCls} disabled={Boolean(hubId)} required={requiresHub}>
              <option value="">Choose hub</option>
              {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
            </select>
          </div>
        )}
        {form.audience_type === "event_signups" && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Event (Required)</label>
            <select value={form.event_id} onChange={(event) => update("event_id", event.target.value)} className={inputCls} required>
              <option value="">Choose event</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </div>
        )}
        {form.audience_type === "volunteer_signups" && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Volunteer Opportunity (Required)</label>
            <select value={form.opportunity_id} onChange={(event) => update("opportunity_id", event.target.value)} className={inputCls} required>
              <option value="">Choose opportunity</option>
              {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}
            </select>
          </div>
        )}
        {form.audience_type === "manual" && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Manual Emails (Required)</label>
            <textarea value={form.manual_emails} onChange={(event) => update("manual_emails", event.target.value)} className={inputCls} rows={3} placeholder="one@email.com, two@email.com" required />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelCls}>Subject (Required)</label>
          <input value={form.subject} onChange={(event) => update("subject", event.target.value)} className={inputCls} required />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Message (Required)</label>
          <textarea value={form.message} onChange={(event) => update("message", event.target.value)} className={inputCls} rows={7} required />
        </div>
      </div>
      <p className="mt-4 font-body text-xs text-navy/45">Emails send individually so recipients do not see each other. Limit: 200 recipients per send.</p>
      <button type="submit" disabled={sending} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? "Sending..." : "Send Email"}
      </button>
    </form>
  );
}
