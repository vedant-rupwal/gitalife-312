import React, { useEffect, useState } from "react";
import { Loader2, Mail, Phone, RefreshCw, UserRound } from "lucide-react";
import { appClient } from "@/api/appClient";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function HubContactsManager({ hubId }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await appClient.entities.HubContact.filter({ hub_id: hubId }, "-created_date", 200);
      setContacts(rows);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [hubId]);

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-bold text-navy">Hub Contacts</h3>
          <p className="font-body text-sm text-navy/50">{contacts.length} people have filled out the hub contact form.</p>
        </div>
        <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/5 text-navy hover:bg-navy/10" aria-label="Refresh contacts">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>
      ) : contacts.length === 0 ? (
        <p className="rounded-xl bg-cream p-4 font-body text-sm text-navy/60">No hub contact submissions yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-navy/8 p-4">
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
      )}
    </div>
  );
}
