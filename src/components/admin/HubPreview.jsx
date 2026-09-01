import React from "react";
import { X, MapPin, Clock, User, Phone, MessageCircle, Eye } from "lucide-react";

export default function HubPreview({ hub, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl bg-cream shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-4 bg-white/90 backdrop-blur border-b border-navy/8 z-10">
          <span className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-saffron">
            <Eye className="h-4 w-4" /> Live Preview
          </span>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/5 text-navy hover:bg-navy/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {hub.image_url && (
            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-6">
              <img src={hub.image_url} alt={hub.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
            </div>
          )}
          <div className="grid lg:grid-cols-3 gap-6">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron/10 px-3 py-1 font-heading text-xs font-semibold text-saffron mb-3">
                <MapPin className="h-3 w-3" />{hub.campus} · {hub.neighborhood}
              </span>
              <h1 className="font-heading text-2xl font-bold text-navy mb-2">{hub.name || "Hub name"}</h1>
              <p className="font-body text-sm text-navy/70 mb-4">{hub.description || "No description yet."}</p>
              <div className="space-y-2 mb-4 text-sm text-navy/80">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-saffron" />{hub.meeting_day} at {hub.meeting_time}</div>
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-saffron" />{hub.coordinator_name || "—"}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-river" />{hub.coordinator_contact || "—"}</div>
              </div>
              {hub.whatsapp_link && (
                <span className="flex items-center justify-center gap-2 w-full rounded-xl bg-river px-5 py-3 font-heading text-sm font-semibold text-white">
                  <MessageCircle className="h-5 w-5" />Join WhatsApp
                </span>
              )}
            </div>
            <div className="lg:col-span-2">
              <h3 className="font-heading text-lg font-bold text-navy mb-3">Upcoming Events</h3>
              <div className="rounded-xl border border-dashed border-navy/20 p-8 text-center">
                <p className="font-body text-sm text-navy/50">Events will appear here once published.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}