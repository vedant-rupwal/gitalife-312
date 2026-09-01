import React from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

const saffronIcon = L.divIcon({
  className: "saffron-pin-marker",
  html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z" fill="#E8742B" stroke="#ffffff" stroke-width="1.8"/><circle cx="12" cy="10" r="3.2" fill="#ffffff"/></svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  tooltipAnchor: [0, -30],
});

export default function ChicagoMap({ hubs, height = 480, compact = false, onPinClick }) {
  const navigate = useNavigate();
  const pins = hubs.filter((h) => Number.isFinite(Number(h.lat)) && Number.isFinite(Number(h.lng)));

  return (
    <div style={{ height }} className="relative rounded-2xl overflow-hidden border border-navy/10 shadow-sm">
      <MapContainer
        center={[41.8781, -87.6298]}
        zoom={compact ? 10 : 11}
        scrollWheelZoom={!compact}
        dragging={!compact}
        doubleClickZoom={!compact}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {pins.map((h) => (
          <Marker
            key={h.id}
            position={[Number(h.lat), Number(h.lng)]}
            icon={saffronIcon}
            eventHandlers={{
              click: () => (onPinClick ? onPinClick(h) : navigate(`/hubs/${h.id}`)),
            }}
          >
            <Tooltip direction="top" offset={[0, -30]} className="hub-tooltip">
              {h.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      {pins.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl border border-navy/10 bg-white/95 px-4 py-3 text-sm text-navy shadow-sm">
          Add latitude and longitude to your hub rows in Supabase to show pins on this map.
        </div>
      )}
    </div>
  );
}
