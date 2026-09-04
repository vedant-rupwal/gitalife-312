import React, { useEffect } from "react";

const widgetId = import.meta.env.VITE_ELFSIGHT_INSTAGRAM_WIDGET_ID;

export default function ElfsightInstagramFeed() {
  useEffect(() => {
    if (!widgetId || document.querySelector('script[src="https://static.elfsight.com/platform/platform.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://static.elfsight.com/platform/platform.js";
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
