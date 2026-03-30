function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTimeLocal(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateTimeLocalValue(value?: string): string {
  if (!value) {
    return formatDateTimeLocal(new Date());
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return formatDateTimeLocal(new Date());
  }

  return formatDateTimeLocal(parsed);
}

export function toStorageDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const offsetMinutes = parsed.getTimezoneOffset();
  const sign = offsetMinutes <= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absoluteOffset / 60));
  const offsetRemainderMinutes = pad(absoluteOffset % 60);

  return (
    [
      parsed.getFullYear(),
      pad(parsed.getMonth() + 1),
      pad(parsed.getDate())
    ].join("-") +
    `T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:00${sign}${offsetHours}:${offsetRemainderMinutes}`
  );
}
