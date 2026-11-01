import { CustomerDetailsLink } from '../customers/CustomerDetailsLink';

export function OemCustomerDetails({ customer }: { customer: any }) {
  if (!customer) return null;
  const address = customer.address || [customer.address_line_1, customer.address_line_2, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ');
  return <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-1">
    <p className="font-semibold">{customer.name || customer.company_name || customer.primary_name}<CustomerDetailsLink customerId={customer.id} /></p>
    {customer.company_name && customer.primary_name && <p>Contact: {customer.primary_name}</p>}
    <p>Phone: {customer.phone || 'Not provided'}</p>
    <p>Email: {customer.email || 'Not provided'}</p>
    <p className="whitespace-pre-wrap break-words">Address: {address || 'Not provided'}</p>
  </div>;
}
