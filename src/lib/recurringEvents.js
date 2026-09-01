const addMonths = (date, months) => {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setMonth(next.getMonth() + months);

  if (next.getDate() !== originalDay) {
    next.setDate(0);
  }

  return next;
};

export const recurrenceOptions = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export const createRecurrenceId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getNextDate = (startDate, frequency, index) => {
  const nextDate = new Date(startDate);

  if (frequency === "weekly") {
    nextDate.setDate(startDate.getDate() + index * 7);
  }

  if (frequency === "biweekly") {
    nextDate.setDate(startDate.getDate() + index * 14);
  }

  if (frequency === "monthly") {
    return addMonths(startDate, index);
  }

  return nextDate;
};

export const buildRecurringEventDates = (startDateValue, frequency, endDateValue) => {
  const startDate = new Date(startDateValue);
  if (frequency === "none") return [startDate];

  const endDate = new Date(endDateValue);
  if (!endDateValue || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    throw new Error("Repeat until date must be after the first event date.");
  }

  const dates = [];
  for (let index = 0; index < 52; index += 1) {
    const nextDate = getNextDate(startDate, frequency, index);
    if (nextDate > endDate) break;
    dates.push(nextDate);
  }

  return dates.length ? dates : [startDate];
};
