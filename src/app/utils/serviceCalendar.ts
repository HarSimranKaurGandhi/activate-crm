export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
export const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
export function calendarDays(anchor: Date, mode: 'month' | 'week') {
  const start = startOfWeek(mode === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth(), 1) : anchor);
  const end = mode === 'month' ? addDays(startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)), 6) : addDays(start, 6);
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}
