<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title><?php echo e($invoice['document_title'] ?? 'Tax Invoice'); ?> <?php echo e($invoice['invoice_number']); ?></title>
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
<?php
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
?>
<table><tr><td style="width:55%"><h2><?php echo e($seller['company_name']); ?></h2><p><?php echo e($address($seller)); ?></p><p><b>GSTIN: <?php echo e($seller['gst_number']); ?></b></p><?php if(!empty($seller['pan_number'])): ?><p>PAN: <?php echo e($seller['pan_number']); ?></p><?php endif; ?><p><?php echo e($seller['phone'] ?? ''); ?> <?php echo e($seller['email'] ?? ''); ?></p></td><td class="right"><h1><?php echo e($invoice['document_title'] ?? 'TAX INVOICE'); ?></h1><h2><?php echo e($invoice['invoice_number']); ?></h2><p><?php echo e($invoice['date_label'] ?? 'Invoice Date'); ?>: <?php echo e($invoice['invoice_date']); ?></p><?php if($invoice['due_date']): ?><p>Due Date: <?php echo e($invoice['due_date']); ?></p><?php endif; ?>
<?php if($invoice['dispatch_number']): ?><p>Dispatch: <?php echo e($invoice['dispatch_number']); ?></p><p>Dispatch Date: <?php echo e($invoice['dispatch_date']); ?></p><?php endif; ?></td></tr></table>
<table class="parties"><tr><td><b>BILL TO / SHIP TO</b><p><b><?php echo e($customer['company_name'] ?: $customer['primary_name']); ?></b></p><?php if(!empty($customer['company_name'])): ?><p><?php echo e($customer['primary_name']); ?></p><?php endif; ?><p><?php echo e($address($customer)); ?></p><p>GSTIN: <?php echo e($customer['gst_number'] ?: 'Unregistered'); ?></p><p><?php echo e($customer['phone'] ?? ''); ?> <?php echo e($customer['email'] ?? ''); ?></p></td><td><p><b>Place of Supply:</b> <?php echo e($invoice['place_of_supply']); ?></p><p><b>Tax:</b> <?php echo e($igst ? 'IGST' : 'CGST + '.$localTaxLabel); ?></p><p>Reverse Charge: No</p><p>All amounts in INR</p></td></tr></table>
<table class="ruled" style="font-size:8px;table-layout:fixed"><thead><tr><th style="width:3%">#</th><th style="width:<?php echo e($showDiscount ? 23 : 29); ?>%">Description</th><th style="width:9%">HSN/SAC</th><th style="width:8%">Qty / Unit</th><th style="width:10%">Rate</th><?php if($showDiscount): ?><th style="width:6%">Disc. %</th><?php endif; ?><th style="width:12%">Taxable Value</th><th style="width:6%">GST %</th><th style="width:10%">Tax</th><th style="width:13%">Total</th></tr></thead><tbody>
<?php $__currentLoopData = $invoice['items']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
<tr><td><?php echo e($index + 1); ?></td><td><b><?php echo e($item['description']); ?></b><?php if($item['description'] !== $item['requirement']): ?><p><?php echo e($item['requirement']); ?></p><?php endif; ?><p class="muted"><?php echo e($item['brand']); ?> <?php echo e($item['model_number']); ?></p></td><td><?php echo e($item['hsn_code']); ?></td><td class="right"><?php echo e($item['quantity']); ?> <?php echo e($item['unit']); ?></td><td class="right"><?php echo e($money($item['price'])); ?></td><?php if($showDiscount): ?><td class="right"><?php echo e($item['discount_percent']); ?>%</td><?php endif; ?><td class="right"><?php echo e($money($item['taxable_value'])); ?></td><td class="right"><?php echo e($item['gst_percent']); ?>%</td><td class="right"><?php echo e($money($item['tax_amount'])); ?></td><td class="right"><?php echo e($money($item['total'])); ?></td></tr>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</tbody></table>
<table class="totals"><tr><td>Taxable Total</td><td class="num"><?php echo e($money($totals['taxable_value'])); ?></td></tr><?php if($igst): ?><tr><td>IGST</td><td class="num"><?php echo e($money($totals['igst_amount'])); ?></td></tr><?php else: ?><tr><td>CGST</td><td class="num"><?php echo e($money($totals['cgst_amount'])); ?></td></tr><tr><td><?php echo e($localTaxLabel); ?></td><td class="num"><?php echo e($money($totals['sgst_amount'])); ?></td></tr><?php endif; ?>
<?php if(!empty($invoice['other_adjustments'])): ?><tr><td>Other Adjustments / Rounding</td><td class="num"><?php echo e($money($invoice['other_adjustments'])); ?></td></tr><?php endif; ?><tr class="grand"><td>Grand Total</td><td class="num">₹<?php echo e($money($totals['grand_total'])); ?></td></tr></table>
<h3>GST Breakup by HSN/SAC</h3>
<table class="ruled hsn"><thead><tr><th rowspan="2" style="text-align:left">HSN/SAC</th><th rowspan="2">Taxable<br>Value</th><?php if($igst): ?><th colspan="2">IGST</th><?php else: ?><th colspan="2">CGST</th><th colspan="2"><?php echo e($localTaxLabel); ?></th><?php endif; ?><th rowspan="2">Total<br>Tax Amount</th></tr><tr><th>Rate</th><th>Amount</th><?php if (! ($igst)): ?><th>Rate</th><th>Amount</th><?php endif; ?></tr></thead><tbody>
<?php $__currentLoopData = $invoice['hsn_summary']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $row): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
<tr><td><?php echo e($row['hsn_code']); ?></td><td class="num"><?php echo e($money($row['taxable_value'])); ?></td><?php if($igst): ?><td class="num"><?php echo e($row['gst_percent']); ?>%</td><td class="num"><?php echo e($money($row['igst_amount'])); ?></td><?php else: ?><td class="num"><?php echo e($row['gst_percent'] / 2); ?>%</td><td class="num"><?php echo e($money($row['cgst_amount'])); ?></td><td class="num"><?php echo e($row['gst_percent'] / 2); ?>%</td><td class="num"><?php echo e($money($row['sgst_amount'])); ?></td><?php endif; ?><td class="num"><?php echo e($money($row['tax_amount'])); ?></td></tr>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
<tr style="font-weight:bold"><td class="right">Total</td><td class="num"><?php echo e($money($totals['taxable_value'])); ?></td><?php if($igst): ?><td></td><td class="num"><?php echo e($money($totals['igst_amount'])); ?></td><?php else: ?><td></td><td class="num"><?php echo e($money($totals['cgst_amount'])); ?></td><td></td><td class="num"><?php echo e($money($totals['sgst_amount'])); ?></td><?php endif; ?><td class="num"><?php echo e($money($totals['tax_amount'])); ?></td></tr>
</tbody></table>
<?php if(!empty($invoice['terms'])): ?>
<h3>Terms and Conditions</h3>
<ol style="padding-left:18px">
<?php $__currentLoopData = $invoice['terms']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $term): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
<li style="white-space:pre-line;margin-bottom:6px"><?php echo e($term['content']); ?></li>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</ol>
<?php endif; ?>
<table class="footer"><tr><td><?php if($bank): ?><b>Payment Details</b><p><?php echo e($bank['bank_name']); ?> — <?php echo e($bank['branch_name']); ?></p><p>Account Name: <?php echo e($bank['account_name']); ?></p><p>Account No.: <?php echo e($bank['account_number']); ?></p><p>IFSC: <?php echo e($bank['ifsc_code']); ?></p><?php if($bank['upi_id']): ?><p>UPI: <?php echo e($bank['upi_id']); ?></p><?php endif; ?> <?php endif; ?> <?php if($invoice['notes']): ?><h3>Notes</h3><div style="white-space:pre-line"><?php echo e($invoice['notes']); ?></div><?php endif; ?></td><td class="right"><p>For <?php echo e($seller['company_name']); ?></p><p style="margin-top:70px">Authorised Signatory</p></td></tr></table>
</body></html>
<?php /**PATH /Users/manavarora/ActivateCRm/activate-crm/backend-api/resources/views/pdf/tax-invoice.blade.php ENDPATH**/ ?>