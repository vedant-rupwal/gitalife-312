import React, { useEffect } from "react";

const widgetId = import.meta.env.VITE_ELFSIGHT_INSTAGRAM_WIDGET_ID || "d6f49f95-0352-44a7-88e4-095d180a516a";
const scriptSrc = "https://elfsightcdn.com/platform.js";

export default function ElfsightInstagramFeed() {
  useEffect(() => {
    if (!widgetId || document.querySelector(`script[src="${scriptSrc}"]`)) return;
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!widgetId) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-navy/8 bg-white p-2">
      <div className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
    </div>
  );
}
