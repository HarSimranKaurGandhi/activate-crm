import { ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

type SortableHeaderProps<T extends string> = {
  label: string;
  sortKey: T;
  currentKey: T;
  direction: SortDirection;
  onToggle: (key: T) => void;
  align?: 'left' | 'right';
};

export const SortableHeader = <T extends string>({
  label,
  sortKey,
  currentKey,
  direction,
  onToggle,
  align = 'left',
}: SortableHeaderProps<T>) => (
  <button
    type="button"
    onClick={() => onToggle(sortKey)}
    className={`inline-flex items-center gap-1 ${align === 'right' ? 'ml-auto' : ''}`}
  >
    <span>{label}</span>
    <ArrowUpDown className={`h-3.5 w-3.5 ${currentKey === sortKey ? 'text-slate-800' : 'text-gray-400'}`} />
  </button>
);
