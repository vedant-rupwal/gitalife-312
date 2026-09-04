export const sortHubsByName = (hubs = []) =>
  [...hubs].sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || "")));
