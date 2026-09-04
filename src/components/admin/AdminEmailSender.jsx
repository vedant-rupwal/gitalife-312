import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Mail, Save, Send, Trash2 } from "lucide-react";
import { appClient } from "@/api/appClient";
import { sortHubsByName } from "@/lib/hubSorting";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none transition-all focus:border-saffron focus:ring-2 focus:ring-saffron/20";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";

const audienceOptions = [
  ["hub_people", "Everyone connected to a hub"],
  ["hub_contacts", "Hub contact form people"],
  ["event_signups", "Specific event signups"],
  ["volunteer_signups", "Specific volunteer signups"],
  ["saved_list", "Saved manual list"],
  ["manual", "Typed manual emails"],
];

const parseEmails = (value = "") => [...new Set(String(value)
  .split(/[\n,;]/)
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email.includes("@")))];

export default function AdminEmailSender({ me, hubId = null }) {
  const [hubs, setHubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [sending, setSending] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [msg, setMsg] = useState("");
  const [listName, setListName] = useState("");
  const [form, setForm] = useState({
    audience_types: hubId ? ["hub_people"] : ["manual"],
    hub_id: hubId || "",
    event_id: "",
    opportunity_id: "",
    saved_list_ids: [],
    manual_emails: "",
    subject: "",
    message: "",
  });

  const assignedHubIds = useMemo(() => [
    me?.assigned_hub_id,
    ...(Array.isArray(me?.assigned_hub_ids) ? me.assigned_hub_ids : []),
    ...(Array.isArray(me?.data?.assigned_hub_ids) ? me.data.assigned_hub_ids : []),
  ].filter(Boolean), [me]);

  const selectedAudiences = new Set(form.audience_types);
  const requiresHub = selectedAudiences.has("hub_people") || selectedAudiences.has("hub_contacts");
  const showHub = requiresHub || selectedAudiences.has("manual") || selectedAudiences.has("saved_list");
  const manualEmailCount = parseEmails(form.manual_emails).length;

  const loadSavedLists = async (visibleHubIds = null) => {
    const rows = await appClient.entities.EmailAudienceList.list("name").catch(() => []);
    const filtered = me?.role === "admin"
      ? rows
      : rows.filter((list) => list.hub_id && visibleHubIds?.has(list.hub_id));
    setSavedLists(hubId ? filtered.filter((list) => list.hub_id === hubId) : filtered);
  };

  useEffect(() => {
    const load = async () => {
      const [hubRows, eventRows, opportunityRows] = await Promise.all([
        appClient.entities.Hub.list("name").catch(() => []),
        appClient.entities.CommunityEvent.list("-event_date", 200).catch(() => []),
        appClient.entities.VolunteerOpportunity.list("-starts_at", 200).catch(() => []),
      ]);
      const visibleHubs = sortHubsByName(me?.role === "admin" ? hubRows : hubRows.filter((hub) => assignedHubIds.includes(hub.id)));
      const visibleHubIds = new Set(visibleHubs.map((hub) => hub.id));
      const visibleEvents = eventRows.filter((event) => !event.hub_id || visibleHubIds.has(event.hub_id));
      const visibleEventIds = new Set(visibleEvents.map((event) => event.id));

      setHubs(visibleHubs);
      setEvents(hubId ? visibleEvents.filter((event) => event.hub_id === hubId) : visibleEvents);
      setOpportunities(opportunityRows.filter((opportunity) => (
        (!opportunity.hub_id || visibleHubIds.has(opportunity.hub_id) || visibleEventIds.has(opportunity.event_id))
        && (!hubId || opportunity.hub_id === hubId || visibleEventIds.has(opportunity.event_id))
      )));
      await loadSavedLists(visibleHubIds);
    };
    load();
  }, [assignedHubIds, hubId, me?.role]);

  useEffect(() => {
    if (hubId) setForm((current) => ({ ...current, hub_id: hubId }));
  }, [hubId]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const toggleAudience = (value) => {
    setForm((current) => {
      const next = new Set(current.audience_types);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...current, audience_types: [...next] };
    });
  };

  const toggleSavedList = (id) => {
    setForm((current) => {
      const next = new Set(current.saved_list_ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...current, saved_list_ids: [...next] };
    });
  };

  const saveManualList = async () => {
    const emails = parseEmails(form.manual_emails);
    if (!listName.trim() || !emails.length) {
      setMsg("Add a list name and at least one valid email.");
      setTimeout(() => setMsg(""), 6000);
      return;
    }

    setSavingList(true);
    setMsg("");
    try {
      const saved = await appClient.entities.EmailAudienceList.create({
        name: listName.trim(),
        emails,
        hub_id: form.hub_id || hubId || null,
      });
      setSavedLists((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({
        ...current,
        audience_types: [...new Set([...current.audience_types, "saved_list"])],
        saved_list_ids: [...new Set([...current.saved_list_ids, saved.id])],
      }));
      setListName("");
      setMsg(`Saved ${emails.length} email${emails.length === 1 ? "" : "s"} as a list.`);
    } catch (error) {
      setMsg(error.message || "Could not save list.");
    } finally {
      setSavingList(false);
      setTimeout(() => setMsg(""), 6000);
    }
  };

  const deleteSavedList = async (id) => {
    try {
      await appClient.entities.EmailAudienceList.delete(id);
      setSavedLists((current) => current.filter((list) => list.id !== id));
      setForm((current) => ({
        ...current,
        saved_list_ids: current.saved_list_ids.filter((listId) => listId !== id),
      }));
    } catch (error) {
      setMsg(error.message || "Could not delete list.");
      setTimeout(() => setMsg(""), 6000);
    }
  };

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

  return (
    <form onSubmit={send} className="rounded-2xl border border-navy/8 bg-white p-6">
      <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-navy">
        <Mail className="h-5 w-5 text-saffron" />Send Email
      </h3>
      {msg && <div className="mb-4 flex items-center gap-2 rounded-xl border border-river/20 bg-river/10 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Audiences</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {audienceOptions.map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 rounded-xl border border-navy/10 px-4 py-3 font-body text-sm text-navy">
                <input
                  type="checkbox"
                  checked={selectedAudiences.has(value)}
                  onChange={() => toggleAudience(value)}
                  className="h-4 w-4 accent-saffron"
                />
                {label}
              </label>
            ))}
          </div>
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

        {selectedAudiences.has("event_signups") && (
          <div>
            <label className={labelCls}>Event (Required)</label>
            <select value={form.event_id} onChange={(event) => update("event_id", event.target.value)} className={inputCls} required>
              <option value="">Choose event</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </div>
        )}

        {selectedAudiences.has("volunteer_signups") && (
          <div>
            <label className={labelCls}>Volunteer Opportunity (Required)</label>
            <select value={form.opportunity_id} onChange={(event) => update("opportunity_id", event.target.value)} className={inputCls} required>
              <option value="">Choose opportunity</option>
              {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}
            </select>
          </div>
        )}

        {selectedAudiences.has("saved_list") && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Saved Lists (Required)</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {savedLists.map((list) => (
                <label key={list.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/10 px-4 py-3 font-body text-sm text-navy">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.saved_list_ids.includes(list.id)}
                      onChange={() => toggleSavedList(list.id)}
                      className="h-4 w-4 accent-saffron"
                    />
                    <span>{list.name} <span className="text-navy/45">({Array.isArray(list.emails) ? list.emails.length : 0})</span></span>
                  </span>
                  <button type="button" onClick={() => deleteSavedList(list.id)} className="rounded-lg p-1 text-navy/45 hover:bg-clay/40 hover:text-saffron" aria-label={`Delete ${list.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </label>
              ))}
              {!savedLists.length && <p className="font-body text-sm text-navy/50">No saved lists yet.</p>}
            </div>
          </div>
        )}

        {selectedAudiences.has("manual") && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Typed Manual Emails (Required)</label>
            <textarea value={form.manual_emails} onChange={(event) => update("manual_emails", event.target.value)} className={inputCls} rows={3} placeholder="one@email.com, two@email.com" required />
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={listName} onChange={(event) => setListName(event.target.value)} className={inputCls} placeholder="List name, for example UIC parents" />
              <button type="button" onClick={saveManualList} disabled={savingList || !manualEmailCount} className="flex items-center justify-center gap-2 rounded-xl border border-saffron/30 bg-saffron/10 px-4 py-3 font-heading text-sm font-semibold text-saffron disabled:opacity-50">
                {savingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save List
              </button>
            </div>
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

      <p className="mt-4 font-body text-xs text-navy/45">Emails send individually and duplicate addresses are removed. Limit: 200 recipients per send.</p>
      <button type="submit" disabled={sending || !form.audience_types.length} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? "Sending..." : "Send Email"}
      </button>
    </form>
  );
}
