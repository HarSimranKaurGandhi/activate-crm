import type { SortDirection } from '../components/common/SortableHeader';

const normalizeValue = (value: unknown): string | number => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'boolean') return value ? 1 : 0;

  const stringValue = String(value).trim();
  const time = Date.parse(stringValue);
  if (!Number.isNaN(time) && /^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return time;
  }

  return stringValue.toLowerCase();
};

export const sortItems = <T>(
  items: T[] | null | undefined,
  accessor: (item: T) => unknown,
  direction: SortDirection,
): T[] =>
  [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const aValue = normalizeValue(accessor(a));
    const bValue = normalizeValue(accessor(b));

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
