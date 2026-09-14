import type { EventItem } from "@/lib/types";

function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function eventToIcs(event: EventItem): string {
  const now = stamp(new Date());
  const summary = event.title.replace(/\n/g, " ");
  const description = event.when.replace(/\n/g, " ");
  const location = event.where?.replace(/\n/g, " ") ?? "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sorted//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@sorted.local`,
    `DTSTAMP:${now}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadIcs(event: EventItem): void {
  const blob = new Blob([eventToIcs(event)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.replace(/[^\w]+/g, "-").slice(0, 40)}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
