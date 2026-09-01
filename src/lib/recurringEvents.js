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

export const buildRecurringEventDates = (startDateValue, frequency, countValue) => {
  const startDate = new Date(startDateValue);
  const count = frequency === "none" ? 1 : Math.min(Math.max(Number(countValue) || 1, 1), 52);

  return Array.from({ length: count }, (_, index) => {
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
  });
};
