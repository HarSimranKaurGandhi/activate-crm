import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CustomerDetailsDialog } from './CustomerDetailsDialog';

export function CustomerDetailsLink({ customerId }: { customerId?: string | number | null }) {
  const [open, setOpen] = useState(false);
  if (!customerId) return null;
  return <>
    <button type="button" aria-label="Open customer details" title="Open customer details" className="ml-1 inline-flex align-middle rounded-md p-1 text-blue-600 hover:bg-blue-50" onClick={event => { event.stopPropagation(); setOpen(true); }}>
      <ArrowUpRight className="h-4 w-4" />
    </button>
    {open && <CustomerDetailsDialog customerId={String(customerId)} open={open} onOpenChange={setOpen} />}
  </>;
}
