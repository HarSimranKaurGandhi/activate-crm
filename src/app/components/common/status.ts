export const quotationStatusLabel = (status: string) => {
  if (status === 'pending') return 'Pending Approval';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const quotationStatusClass = (status: string) => {
  if (status === 'approved') return 'bg-green-50 text-green-700';
  if (status === 'pending') return 'bg-amber-50 text-amber-700';
  if (status === 'rejected') return 'bg-red-50 text-red-700';
  if (status === 'revised') return 'bg-purple-50 text-purple-700';
  return 'bg-gray-50 text-gray-700';
};

