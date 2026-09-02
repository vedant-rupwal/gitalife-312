export const defaultEventTypes = [
  "kirtan",
  "bhajan",
  "seva",
  "retreat",
  "study_circle",
  "immersion",
];

export const normalizeEventType = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

export const formatEventType = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Event";

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const buildEventTypes = (events = []) => {
  const types = new Set(defaultEventTypes);
  events.forEach((event) => {
    if (event.type) types.add(event.type);
  });
  return ["All", ...types];
};
