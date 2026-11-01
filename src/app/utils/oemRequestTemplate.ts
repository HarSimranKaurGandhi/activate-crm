export const defaultOemRequestTemplate = `Request No. - {{request_number}}

1. Date - {{request_date}}
2. Dealer code - {{dealer_code}}
3. Dealer name - {{dealer_name}}
4. Dealer city - {{dealer_city}}
5. Serial no - {{serial_number}}
6. Model no - {{machine_model}}
7. TI invoice - NA
8. TI invoice date - NA
9. Customer Name - {{customer_name}}
10. Cus mob - {{customer_phone}}
11. Dop - {{purchase_date}}
12. Date of failure - {{request_date}}
13. Part name - {{spare_part_details}}
14. Part Qty - {{quantity}}
15. Complaint - {{complaint}}
16. Use weight - {{use_weight}}
17. Defective part image and video - {{defective_media}}
18. Cus Invoice No. And image - {{invoice_number}} and {{invoice_image}}`;
export const oemTemplateFields = ['request_number', 'request_date', 'dealer_code', 'dealer_name', 'dealer_city', 'serial_number', 'machine_model', 'customer_name', 'customer_phone', 'purchase_date', 'spare_part_details', 'quantity', 'complaint', 'use_weight', 'defective_media', 'invoice_number', 'invoice_image'];
export function renderOemRequest(request: any, oem = request.oem) {
  const customer = request.service_request?.customer || request.customer;
  const date = (value?: string) => value ? value.slice(0, 10).split('-').reverse().join('/') : 'NA';
  const values: Record<string, unknown> = {
    request_number: request.request_number,
    request_date: date(request.request_date), dealer_code: oem?.dealer_code, dealer_name: oem?.dealer_name, dealer_city: oem?.dealer_city,
    serial_number: request.serial_number, machine_model: request.machine_name,
    customer_name: request.customer_name || customer?.name || customer?.company_name || customer?.primary_name || request.service_request?.temporary_customer_name,
    customer_phone: String(customer?.phone || request.service_request?.temporary_customer_phone || '').replace(/\D/g, ''),
    purchase_date: date(request.purchase_date), spare_part_details: request.spare_part_name, quantity: request.quantity, complaint: request.reason,
    use_weight: '[Enter manually]', defective_media: '[Enter manually]', invoice_number: request.invoice_number, invoice_image: request.invoice_image_url || '[Attach invoice image]',
  };
  return (oem?.request_template || defaultOemRequestTemplate).replace(/\{\{\s*(\w+)\s*\}\}/g, (match: string, key: string) => key in values ? String(values[key] ?? '').trim() || 'NA' : match);
}
