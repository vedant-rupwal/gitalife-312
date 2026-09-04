import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, RefreshCw, UserRound, Users } from "lucide-react";
import { appClient } from "@/api/appClient";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function AdminHubContacts() {
  const [contacts, setContacts] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [contactRows, hubRows] = await Promise.all([
        appClient.entities.HubContact.list("-created_date", 1000),
        appClient.entities.Hub.list("name"),
      ]);
      setContacts(contactRows);
      setHubs(hubRows);
    } catch {
      setContacts([]);
      setHubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const hubById = new Map(hubs.map((hub) => [hub.id, hub]));
    const grouped = new Map();

    contacts.forEach((contact) => {
      const hub = hubById.get(contact.hub_id);
      const key = contact.hub_id || "unknown";
      const label = hub?.name || contact.hub_name || "Unknown Hub";
      if (!grouped.has(key)) grouped.set(key, { id: key, label, contacts: [] });
      grouped.get(key).contacts.push(contact);
    });

    return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [contacts, hubs]);

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-heading text-xl font-bold text-navy">
            <Users className="h-5 w-5 text-saffron" />Hub Contacts
          </h3>
          <p className="font-body text-sm text-navy/50">{contacts.length} total contact form response{contacts.length === 1 ? "" : "s"} across {groups.length} hub{groups.length === 1 ? "" : "s"}.</p>
        </div>
        <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy hover:bg-navy/10" aria-label="Refresh contacts">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>
      ) : contacts.length === 0 ? (
        <p className="rounded-xl bg-cream p-4 font-body text-sm text-navy/60">No hub contact submissions yet.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.id} className="rounded-2xl border border-navy/8 bg-cream/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-heading text-lg font-bold text-navy">{group.label}</h4>
                <span className="rounded-full bg-saffron/10 px-3 py-1 font-heading text-xs font-semibold text-saffron">
                  {group.contacts.length} response{group.contacts.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-xl border border-navy/8 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="flex items-center gap-2 font-heading text-sm font-bold text-navy">
                        <UserRound className="h-4 w-4 text-saffron" />{contact.name}
                      </p>
                      <p className="font-body text-xs text-navy/40">{formatDate(contact.created_date)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 font-body text-xs text-navy/60">
                      <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-saffron"><Mail className="h-3.5 w-3.5 text-saffron" />{contact.email}</a>
                      {contact.phone && <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-saffron"><Phone className="h-3.5 w-3.5 text-saffron" />{contact.phone}</a>}
                      {contact.how_found && <span>Found us: {contact.how_found}</span>}
                    </div>
                    {contact.note && <p className="mt-3 rounded-lg bg-cream px-3 py-2 font-body text-xs text-navy/60">{contact.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
