<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{ $invoice['document_title'] ?? 'Tax Invoice' }} {{ $invoice['invoice_number'] }}</title>
  <style>
    @page { margin: 25px 25px 35px; }
    body { font-family: 'DejaVu Sans', sans-serif; color: #111; font-size: 9px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    h2 { font-size: 14px; margin: 0 0 7px; }
    h3 { font-size: 11px; margin: 18px 0 8px; }
    p { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { padding: 5px; vertical-align: top; overflow-wrap: break-word; }
    .ruled th, .ruled td { border: 1px solid #555; }
    .ruled th { background: #f5f5f5; vertical-align: middle; }
    .right { text-align: right; }
    .num { text-align: right; white-space: nowrap; }
    .muted { color: #555; font-size: 8px; }
    .parties { margin: 14px 0; border-top: 1px solid #aaa; border-bottom: 1px solid #aaa; }
    .parties td { width: 50%; padding: 10px 5px; }
    .totals { margin: 10px 0 0 auto; width: 42%; page-break-inside: avoid; }
    .grand { font-size: 12px; font-weight: bold; border-top: 1px solid #555; }
    .hsn { margin-top: 6px; font-size: 10px; }
    .footer { margin-top: 22px; border-top: 1px solid #aaa; }
    .footer td { padding-top: 12px; width: 50%; }
  </style>
</head>
<body>
@php
  $localTaxLabel = ($invoice['tax_mode'] ?? '') === 'cgst_utgst' ? 'UTGST' : 'SGST';
  $showDiscount = $invoice['show_discount_to_customer'] ?? true;
  $seller = $invoice['seller']; $customer = $invoice['customer']; $totals = $invoice['totals'];
  $igst = $invoice['tax_mode'] === 'igst'; $bank = $invoice['bank'] ?? null;
  $address = fn($party) => implode(', ', array_filter(array_map(fn($key) => $party[$key] ?? '', ['address_line_1','address_line_2','city','state','pincode','country'])));
  $money = function ($value) {
      [$integer, $decimal] = explode('.', number_format((float) $value, 2, '.', ''));
      if (strlen($integer) > 3) $integer = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', substr($integer, 0, -3)).','.substr($integer, -3);
      return $integer.'.'.$decimal;
  };
@endphp
<table><tr><td style="width:55%"><h2>{{ $seller['company_name'] }}</h2><p>{{ $address($seller) }}</p><p><b>GSTIN: {{ $seller['gst_number'] }}</b></p>@if(!empty($seller['pan_number']))<p>PAN: {{ $seller['pan_number'] }}</p>@endif<p>{{ $seller['phone'] ?? '' }} {{ $seller['email'] ?? '' }}</p></td><td class="right"><h1>{{ $invoice['document_title'] ?? 'TAX INVOICE' }}</h1><h2>{{ $invoice['invoice_number'] }}</h2><p>{{ $invoice['date_label'] ?? 'Invoice Date' }}: {{ $invoice['invoice_date'] }}</p>@if($invoice['due_date'])<p>Due Date: {{ $invoice['due_date'] }}</p>@endif
@if($invoice['dispatch_number'])<p>Dispatch: {{ $invoice['dispatch_number'] }}</p><p>Dispatch Date: {{ $invoice['dispatch_date'] }}</p>@endif</td></tr></table>
<table class="parties"><tr><td><b>BILL TO / SHIP TO</b><p><b>{{ $customer['company_name'] ?: $customer['primary_name'] }}</b></p>@if(!empty($customer['company_name']))<p>{{ $customer['primary_name'] }}</p>@endif<p>{{ $address($customer) }}</p><p>GSTIN: {{ $customer['gst_number'] ?: 'Unregistered' }}</p><p>{{ $customer['phone'] ?? '' }} {{ $customer['email'] ?? '' }}</p></td><td><p><b>Place of Supply:</b> {{ $invoice['place_of_supply'] }}</p><p><b>Tax:</b> {{ $igst ? 'IGST' : 'CGST + '.$localTaxLabel }}</p><p>Reverse Charge: No</p><p>All amounts in INR</p></td></tr></table>
<table class="ruled" style="font-size:8px;table-layout:fixed"><thead><tr><th style="width:3%">#</th><th style="width:{{ $showDiscount ? 23 : 29 }}%">Description</th><th style="width:9%">HSN/SAC</th><th style="width:8%">Qty / Unit</th><th style="width:10%">Rate</th>@if($showDiscount)<th style="width:6%">Disc. %</th>@endif<th style="width:12%">Taxable Value</th><th style="width:6%">GST %</th><th style="width:10%">Tax</th><th style="width:13%">Total</th></tr></thead><tbody>
@foreach($invoice['items'] as $index => $item)
<tr><td>{{ $index + 1 }}</td><td><b>{{ $item['description'] }}</b>@if($item['description'] !== $item['requirement'])<p>{{ $item['requirement'] }}</p>@endif<p class="muted">{{ $item['brand'] }} {{ $item['model_number'] }}</p></td><td>{{ $item['hsn_code'] }}</td><td class="right">{{ $item['quantity'] }} {{ $item['unit'] }}</td><td class="right">{{ $money($item['price']) }}</td>@if($showDiscount)<td class="right">{{ $item['discount_percent'] }}%</td>@endif<td class="right">{{ $money($item['taxable_value']) }}</td><td class="right">{{ $item['gst_percent'] }}%</td><td class="right">{{ $money($item['tax_amount']) }}</td><td class="right">{{ $money($item['total']) }}</td></tr>
@endforeach
</tbody></table>
<table class="totals"><tr><td>Taxable Total</td><td class="num">{{ $money($totals['taxable_value']) }}</td></tr>@if($igst)<tr><td>IGST</td><td class="num">{{ $money($totals['igst_amount']) }}</td></tr>@else<tr><td>CGST</td><td class="num">{{ $money($totals['cgst_amount']) }}</td></tr><tr><td>{{ $localTaxLabel }}</td><td class="num">{{ $money($totals['sgst_amount']) }}</td></tr>@endif
@if(!empty($invoice['other_adjustments']))<tr><td>Other Adjustments / Rounding</td><td class="num">{{ $money($invoice['other_adjustments']) }}</td></tr>@endif<tr class="grand"><td>Grand Total</td><td class="num">₹{{ $money($totals['grand_total']) }}</td></tr></table>
<h3>GST Breakup by HSN/SAC</h3>
<table class="ruled hsn"><thead><tr><th rowspan="2" style="text-align:left">HSN/SAC</th><th rowspan="2">Taxable<br>Value</th>@if($igst)<th colspan="2">IGST</th>@else<th colspan="2">CGST</th><th colspan="2">{{ $localTaxLabel }}</th>@endif<th rowspan="2">Total<br>Tax Amount</th></tr><tr><th>Rate</th><th>Amount</th>@unless($igst)<th>Rate</th><th>Amount</th>@endunless</tr></thead><tbody>
@foreach($invoice['hsn_summary'] as $row)
<tr><td>{{ $row['hsn_code'] }}</td><td class="num">{{ $money($row['taxable_value']) }}</td>@if($igst)<td class="num">{{ $row['gst_percent'] }}%</td><td class="num">{{ $money($row['igst_amount']) }}</td>@else<td class="num">{{ $row['gst_percent'] / 2 }}%</td><td class="num">{{ $money($row['cgst_amount']) }}</td><td class="num">{{ $row['gst_percent'] / 2 }}%</td><td class="num">{{ $money($row['sgst_amount']) }}</td>@endif<td class="num">{{ $money($row['tax_amount']) }}</td></tr>
@endforeach
<tr style="font-weight:bold"><td class="right">Total</td><td class="num">{{ $money($totals['taxable_value']) }}</td>@if($igst)<td></td><td class="num">{{ $money($totals['igst_amount']) }}</td>@else<td></td><td class="num">{{ $money($totals['cgst_amount']) }}</td><td></td><td class="num">{{ $money($totals['sgst_amount']) }}</td>@endif<td class="num">{{ $money($totals['tax_amount']) }}</td></tr>
</tbody></table>
@if(!empty($invoice['terms']))
<h3>Terms and Conditions</h3>
<ol style="padding-left:18px">
@foreach($invoice['terms'] as $term)
<li style="white-space:pre-line;margin-bottom:6px">{{ $term['content'] }}</li>
@endforeach
</ol>
@endif
<table class="footer"><tr><td>@if($bank)<b>Payment Details</b><p>{{ $bank['bank_name'] }} — {{ $bank['branch_name'] }}</p><p>Account Name: {{ $bank['account_name'] }}</p><p>Account No.: {{ $bank['account_number'] }}</p><p>IFSC: {{ $bank['ifsc_code'] }}</p>@if($bank['upi_id'])<p>UPI: {{ $bank['upi_id'] }}</p>@endif @endif @if($invoice['notes'])<h3>Notes</h3><div style="white-space:pre-line">{{ $invoice['notes'] }}</div>@endif</td><td class="right"><p>For {{ $seller['company_name'] }}</p><p style="margin-top:70px">Authorised Signatory</p></td></tr></table>
</body></html>
