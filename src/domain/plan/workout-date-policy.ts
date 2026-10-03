/** Device-local wall clock, including DST days of 23/25 hours. */
export function localDateText(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function gymDayToday(now = new Date()): string {
  const date = new Date(now);
  if (date.getHours() < 4) date.setDate(date.getDate() - 1);
  return localDateText(date);
}
export function dayRange(dateText: string): { start: Date; end: Date } {
  const [year, month, day] = dateText.split('-').map(Number);
  return {
    start: new Date(year, month - 1, day, 4),
    end: new Date(year, month - 1, day + 1, 4),
  };
}
export function gymDayRange(now = new Date()) {
  return dayRange(gymDayToday(now));
}
