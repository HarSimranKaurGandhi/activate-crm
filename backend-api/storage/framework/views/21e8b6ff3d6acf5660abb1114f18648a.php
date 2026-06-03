<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo e($quotation['number']); ?></title>
  <style>
    @page { size: A4; margin: 6mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; line-height: 1.4; }
    .page { position: relative; width: 100%; background: #fff; }
    .watermark { position: fixed; top: 44%; left: 8%; width: 84%; text-align: center; z-index: 1; }
    .watermark span { display: inline-block; transform: rotate(-35deg); white-space: nowrap; font-size: 60px; font-weight: 900; letter-spacing: 0.16em; color: #e2e8f0; }
    .content { position: relative; z-index: 2; }
    .letterhead { margin: 0 10px 6px; background: #f8fafc; }
    .letterhead img { display: block; width: 100%; height: 92px; object-fit: cover; object-position: top; }
    .brand-header { width: calc(100% - 20px); margin: 0 10px 8px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    .brand-header td { padding: 10px 10px; vertical-align: middle; }
    .brand-logo-cell { width: 22%; }
    .brand-info-cell { width: 48%; border-left: 1px solid #cbd5e1; }
    .brand-contact-cell { width: 30%; border-left: 1px solid #cbd5e1; text-align: left; }
    .brand-logo { display: block; max-width: 132px; max-height: 64px; object-fit: contain; }
    .brand-logo-fallback { width: 124px; height: 60px; border: 1px solid #e2e8f0; color: #0f172a; font-size: 30px; font-weight: 900; text-align: center; line-height: 60px; letter-spacing: 0.1em; }
    .brand-name { font-size: 20px; font-weight: 900; line-height: 1.05; color: #020617; text-transform: uppercase; }
    .brand-address { margin-top: 3px; font-size: 10px; font-weight: 700; line-height: 1.35; color: #1e293b; }
    .brand-contact { font-size: 10px; font-weight: 700; line-height: 1.55; color: #111827; }
    .brand-contact strong { font-weight: 900; }
    .letterhead-fallback { padding: 18px 20px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; font-size: 10px; text-align: center; }
    .ribbon { width: calc(100% - 20px); border-collapse: collapse; margin: 0 10px 10px; background: #020617; color: #fff; }
    .ribbon td { padding: 8px 12px; vertical-align: middle; }
    .ribbon-brand-cell { width: 70%; border-right: 2px solid #dc2626; }
    .ribbon-brand { font-size: 20px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; line-height: 1.05; }
    .ribbon-title { text-align: right; font-size: 16px; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase; }
    .section { padding: 0 10px 4px; }
    .top-table, .bottom-table, .footer-table, .detail-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .top-table { margin-bottom: 8px; }
    .top-table > tbody > tr > td { vertical-align: top; }
    .top-left { width: 69%; padding-right: 14px; }
    .top-right { width: 31%; }
    .to-block { border-left: 4px solid #dc2626; padding: 2px 0 2px 14px; background: transparent; }
    .eyebrow { margin: 0; font-size: 10px; font-weight: 900; letter-spacing: 0.24em; color: #dc2626; text-transform: uppercase; }
    .customer-title { margin: 6px 0 0; font-size: 18px; font-weight: 900; color: #020617; line-height: 1.08; }
    .customer-subtitle, .customer-address { margin: 4px 0 0; font-size: 10px; color: #475569; line-height: 1.4; }
    .customer-meta { margin-top: 7px; font-size: 8.5px; font-weight: 700; color: #64748b; }
    .customer-meta span { margin-right: 14px; }
    .intro { margin-top: 9px; font-size: 10.5px; line-height: 1.35; color: #334155; }
    .intro p { margin: 0 0 3px; }
    .meta-card { width: 100%; border: 1px solid #e2e8f0; border-radius: 16px; background: #f8fafc; }
    .meta-card table { width: 100%; border-collapse: collapse; }
    .meta-row td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .meta-row:last-child td { border-bottom: 0; }
    .meta-icon-wrap { width: 42px; }
    .meta-icon { width: 28px; height: 28px; border-radius: 8px; background: #fff; border: 1px solid #dbe4f0; color: #dc2626; font-size: 8px; font-weight: 900; text-align: center; line-height: 1; padding-top: 10px; text-transform: uppercase; }
    .meta-label { font-size: 9px; font-weight: 900; letter-spacing: 0.06em; color: #334155; text-transform: uppercase; }
    .meta-value { text-align: right; font-size: 11px; font-weight: 900; color: #020617; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
    .status-draft { background: #e2e8f0; color: #0f172a; } .status-pending { background: #fef3c7; color: #92400e; } .status-approved { background: #dcfce7; color: #166534; } .status-rejected { background: #fee2e2; color: #991b1b; } .status-revised { background: #dbeafe; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; }
    .items-wrap { border: 1px solid #dbe4f0; border-radius: 14px; overflow: hidden; margin-bottom: 10px; }
    .items-table { table-layout: fixed; }
    .items-table thead tr { background: #020617; color: #fff; }
    .items-table th { padding: 7px 3px; font-size: 8px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; text-align: left; }
    .items-table td { padding: 7px 3px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 9.5px; color: #334155; }
    .items-table tr:last-child td { border-bottom: 0; }
    .items-table td:last-child, .items-table th:last-child { border-right: 0; }
    .items-table tbody tr { page-break-inside: avoid; }
    .col-no { width: 3%; }
    .col-product { width: 27%; }
    .col-specs { width: 25%; }
    .col-price { width: 11%; }
    .col-qty { width: 4%; }
    .col-discount { width: 6%; }
    .col-gst { width: 8%; }
    .col-total { width: 16%; }
    .items-table td.col-no, .items-table th.col-no,
    .items-table td.col-qty, .items-table th.col-qty,
    .items-table td.col-discount, .items-table th.col-discount { padding-left: 1px; padding-right: 1px; }
    .center { text-align: center; } .right { text-align: right; }
    .item-no { width: 20px; font-weight: 900; color: #020617; text-align: center; }
    .product-image { display: block; width: 100%; max-width: 90px; height: 56px; margin: 0 auto 6px; object-fit: contain; }
    .product-image-placeholder { width: 90px; height: 56px; margin: 0 auto 6px; border-radius: 8px; background: #f1f5f9; color: #94a3b8; font-size: 8px; font-weight: 700; text-align: center; line-height: 56px; }
    .product-name { font-size: 10px; font-weight: 900; color: #020617; text-align: center; line-height: 1.2; }
    .product-model { margin-top: 2px; text-align: center; font-size: 8px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #475569; }
    .specs { font-size: 8.5px; line-height: 1.28; color: #334155; word-wrap: break-word; }
    .specs p { margin: 0 0 2px; }
    .specs ul, .specs ol { margin: 0; padding-left: 16px; }
    .specs li { margin-bottom: 2px; }
    .amount-strong { font-size: 9.5px; font-weight: 900; color: #020617; }
    .gst-sub { margin-top: 2px; font-size: 8px; color: #64748b; }
    .totals { width: 360px; margin-left: auto; border: 1px solid #dbe4f0; border-radius: 14px; overflow: hidden; margin-bottom: 10px; }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals-row td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; font-weight: 800; color: #334155; background: #fff; }
    .totals-row.muted td { background: #f8fafc; }
    .totals-row:last-child td { border-bottom: 0; }
    .grand-total td { background: #dc2626; color: #fff; }
    .grand-total .grand-label { font-size: 9px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
    .grand-total .grand-value { font-size: 17px; font-weight: 900; }
    .bottom-table { margin-bottom: 10px; }
    .bottom-table > tbody > tr > td { width: 50%; vertical-align: top; }
    .bottom-left { padding-right: 6px; }
    .bottom-right { padding-left: 6px; }
    .card { border: 1px solid #dbe4f0; border-radius: 14px; background: #fff; overflow: hidden; }
    .card-header { display: inline-block; padding: 5px 8px; background: #020617; color: #fff; border-top-left-radius: 14px; border-bottom-right-radius: 14px; font-size: 7.5px; font-weight: 900; letter-spacing: 0.03em; text-transform: uppercase; }
    .card-body { padding: 2px 7px 3px; font-size: 8.4px; color: #334155; }
    .term-row { width: 100%; padding-top: 0; padding-bottom: 0; margin-top: 0; margin-bottom: 0; border-bottom: 1px dashed #e2e8f0; }
    .term-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
    .term-index { display: block; width: 16px; height: 16px; border-radius: 999px; border: 1px solid #dc2626; color: #dc2626; font-size: 6.5px; font-weight: 900; text-align: center; line-height: 1; padding-top: 4px; }
    .term-text { padding: 1px 0 1px 4px; line-height: 1.05; }
    .detail-table td { padding: 1px 0; color: #1e293b; font-size: 8.5px; vertical-align: top; }
    .detail-label-cell { width: 96px; }
    .detail-colon-cell { width: 10px; }
    .detail-label { font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #334155; }
    .detail-colon { font-weight: 700; color: #94a3b8; }
    .detail-value { font-weight: 500; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .footer-left { width: 70%; padding-right: 12px; }
    .footer-right { width: 30%; text-align: center; vertical-align: bottom; }
    .footer-avatar { width: 48px; height: 48px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f1f5f9; color: #475569; text-align: center; font-size: 15px; font-weight: 900; line-height: 1; padding-top: 17px; }
    .footer-copy { font-size: 9px; line-height: 1.38; color: #334155; }
    .salesperson-name { margin-top: 7px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #020617; }
    .salesperson-meta { margin-top: 3px; font-size: 9px; color: #475569; }
    .salesperson-meta span { margin-right: 12px; }
    .signature-line { width: 160px; margin: 34px auto 0; padding-top: 6px; border-top: 2px solid #020617; font-size: 9px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; color: #020617; }
  </style>
</head>
<body>
  <div class="page">
    <?php if($quotation['requires_watermark']): ?>
      <div class="watermark"><span>PENDING APPROVAL</span></div>
    <?php endif; ?>
    <div class="content">
      <?php if($company['letterhead_type'] === 'image' && $company['letterhead_src']): ?>
        <div class="letterhead"><img src="<?php echo e($company['letterhead_src']); ?>" alt="Letterhead"></div>
      <?php elseif($company['letterhead_type'] === 'pdf' && $company['letterhead_src']): ?>
        <div class="letterhead-fallback">A print-safe branded header is used below for PDF rendering.</div>
      <?php endif; ?>
      <?php if(!$company['letterhead_src']): ?>
      <table class="brand-header">
        <tr>
          <td class="brand-logo-cell">
            <?php if($company['logo_src']): ?>
              <img class="brand-logo" src="<?php echo e($company['logo_src']); ?>" alt="<?php echo e($company['company_name']); ?>">
            <?php else: ?>
              <div class="brand-logo-fallback"><?php echo e(strtoupper(substr($company['company_name'] ?: 'CO', 0, 2))); ?></div>
            <?php endif; ?>
          </td>
          <td class="brand-info-cell">
            <div class="brand-name"><?php echo e($company['company_name']); ?></div>
            <div class="brand-address">
              <?php $__currentLoopData = $company['address_lines']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $line): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div><?php echo e($line); ?></div>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </div>
          </td>
          <td class="brand-contact-cell">
            <div class="brand-contact">
              <?php if($company['email']): ?><div><strong>Email:</strong> <?php echo e($company['email']); ?></div><?php endif; ?>
              <?php if($company['phone']): ?><div><strong>Mobile:</strong> <?php echo e($company['phone']); ?></div><?php endif; ?>
              <?php if($company['gst_number']): ?><div><strong>GST:</strong> <?php echo e($company['gst_number']); ?></div><?php endif; ?>
            </div>
          </td>
        </tr>
      </table>
      <?php endif; ?>
      <table class="ribbon">
        <tr>
          <td class="ribbon-brand-cell"><div class="ribbon-brand"><?php echo e($company['company_name'] ?: 'Quotation'); ?></div></td>
          <td><div class="ribbon-title">Quotation</div></td>
        </tr>
      </table>
      <div class="section">
        <table class="top-table">
          <tr>
            <td class="top-left">
            <div class="to-block">
              <p class="eyebrow">To</p>
              <p class="customer-title"><?php echo e($quotation['customer']['company_name'] ?: $quotation['customer']['primary_name']); ?></p>
              <?php if($quotation['customer']['company_name']): ?><p class="customer-subtitle"><?php echo e($quotation['customer']['primary_name']); ?></p><?php endif; ?>
              <p class="customer-address"><?php echo e($quotation['customer']['address']); ?></p>
              <div class="customer-meta">
                <?php if($quotation['customer']['phone']): ?> <span>Phone: <?php echo e($quotation['customer']['phone']); ?></span> <?php endif; ?>
                <?php if($quotation['customer']['email']): ?> <span>Email: <?php echo e($quotation['customer']['email']); ?></span> <?php endif; ?>
                <?php if($quotation['customer']['gst_number']): ?> <span>GSTIN: <?php echo e($quotation['customer']['gst_number']); ?></span> <?php endif; ?>
              </div>
            </div>
            <div class="intro">
              <p><strong>Dear Sir,</strong></p>
              <p>We are indeed thankful to you for showing interest in our products.</p>
              <p>As per the discussion, please find here our most technically viable offer for your consideration.</p>
            </div>
            </td>
            <td class="top-right">
              <div class="meta-card">
                <table>
                  <tr class="meta-row">
                    <td class="meta-icon-wrap"><div class="meta-icon">Dt</div></td>
                    <td class="meta-label">Date</td>
                    <td class="meta-value"><?php echo e($quotation['quote_date_label']); ?></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
        <div class="items-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th class="center col-no">No.</th>
                <th class="center col-product">Product / Picture</th>
                <th class="col-specs">Specifications</th>
                <th class="right col-price">Price</th>
                <th class="center col-qty">Qty</th>
                <?php if($quotation['show_discount']): ?> <th class="center col-discount">Disc%</th> <?php endif; ?>
                <th class="right col-gst">GST</th>
                <th class="right col-total">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              <?php $__currentLoopData = $quotation['items']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                  <td class="item-no col-no"><?php echo e($index + 1); ?></td>
                  <td class="center col-product">
                    <?php if($item['product_image_src']): ?><img class="product-image" src="<?php echo e($item['product_image_src']); ?>" alt="<?php echo e($item['product_name']); ?>"><?php else: ?><div class="product-image-placeholder">Product Image</div><?php endif; ?>
                    <div class="product-name"><?php echo e($item['product_name']); ?></div>
                    <?php if($item['model_number']): ?><div class="product-model"><?php echo e($item['model_number']); ?></div><?php endif; ?>
                  </td>
                  <td class="specs col-specs"><?php echo $item['specifications_html']; ?></td>
                  <td class="right amount-strong col-price"><?php echo e($item['edited_price_label']); ?></td>
                  <td class="center amount-strong col-qty" style="white-space: nowrap;"><?php echo e($item['quantity_label']); ?></td>
                  <?php if($quotation['show_discount']): ?> <td class="center col-discount" style="white-space: nowrap;"><?php echo e($item['discount_percent_label']); ?></td> <?php endif; ?>
                  <td class="right col-gst"><div><?php echo e($item['gst_percent_label']); ?></div><div class="gst-sub"><?php echo e($item['tax_amount_label']); ?></div></td>
                  <td class="right amount-strong col-total"><?php echo e($item['line_total_label']); ?></td>
                </tr>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
          </table>
        </div>
        <div class="totals">
          <table>
            <tr class="totals-row muted"><td>Sub Total</td><td class="right"><?php echo e($quotation['subtotal_label']); ?></td></tr>
            <?php $__currentLoopData = $quotation['adjustments']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $adjustment): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><tr class="totals-row"><td><?php echo e($adjustment['name']); ?></td><td class="right"><?php echo e($adjustment['amount_label']); ?></td></tr><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php if(!$quotation['gst_inclusive'] && $quotation['tax_amount'] > 0): ?>
              <tr class="totals-row"><td>Total Before Tax</td><td class="right"><?php echo e($quotation['before_tax_total_label']); ?></td></tr>
              <tr class="totals-row"><td>GST</td><td class="right"><?php echo e($quotation['tax_amount_label']); ?></td></tr>
            <?php endif; ?>
            <tr class="totals-row grand-total"><td><span class="grand-label">Grand Total</span></td><td class="right"><span class="grand-value"><?php echo e($quotation['grand_total_label']); ?></span></td></tr>
          </table>
        </div>
        <table class="bottom-table">
          <tr>
          <?php if(count($quotation['terms']) > 0): ?>
            <td class="bottom-left">
            <div class="card">
              <div class="card-header">Terms and Conditions</div>
              <div class="card-body">
                <?php $__currentLoopData = $quotation['terms']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $term): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                  <table class="term-row">
                    <tr>
                      <td style="width:22px; vertical-align: top;"><div class="term-index"><?php echo e($index + 1); ?></div></td>
                      <td class="term-text"><?php echo e($term['content']); ?></td>
                    </tr>
                  </table>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </div>
            </div>
            </td>
          <?php else: ?>
            <td class="bottom-left"></td>
          <?php endif; ?>
          <td class="bottom-right">
          <div class="card">
            <div class="card-header">Company Details</div>
            <div class="card-body">
              <table class="detail-table">
                <?php $__currentLoopData = $company['details']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $detail): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                  <tr>
                    <td class="detail-label-cell"><div class="detail-label"><?php echo e($detail['label']); ?></div></td>
                    <td class="detail-colon-cell"><div class="detail-colon">:</div></td>
                    <td><div class="detail-value"><?php echo e($detail['value']); ?></div></td>
                  </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </table>
            </div>
          </div>
          </td>
          </tr>
        </table>
        <div class="footer">
          <table class="footer-table">
            <tr>
              <td class="footer-left">
                <table style="width:100%; border-collapse: collapse;">
                  <tr>
                    <td class="footer-copy">
                      Thank you again for showing your interest with us. Looking forward for a healthy and long term relationship with you.<br>
                      Assuring you the best quality and services all the times.
                      <div class="salesperson-name"><?php echo e($quotation['salesperson']['name']); ?></div>
                      <div class="salesperson-meta"><?php if($quotation['salesperson']['phone']): ?> <span>Phone: <?php echo e($quotation['salesperson']['phone']); ?></span> <?php endif; ?> <?php if($quotation['salesperson']['email']): ?> <span>Email: <?php echo e($quotation['salesperson']['email']); ?></span> <?php endif; ?></div>
                    </td>
                  </tr>
                </table>
              </td>
              <td class="footer-right"><div class="signature-line">Authorized Signature</div></td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
<?php /**PATH /Users/harsimrankaur/Downloads/Interactive Quotation Management Prototype/backend-api/resources/views/pdf/quotation.blade.php ENDPATH**/ ?>