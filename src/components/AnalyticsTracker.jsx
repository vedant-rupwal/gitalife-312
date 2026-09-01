import { useEffect } from "react";
import { track } from "@vercel/analytics";

const getClickLabel = (element) => {
  const rawLabel = element.getAttribute("aria-label") || element.innerText || element.textContent || element.href || element.type;
  return rawLabel?.replace(/\s+/g, " ").trim().slice(0, 120) || "Unlabeled click";
};

export default function AnalyticsTracker() {
  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("a,button")
        : null;
      if (!target) return;

      track("click", {
        label: getClickLabel(target),
        tag: target.tagName.toLowerCase(),
        path: window.location.pathname,
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
