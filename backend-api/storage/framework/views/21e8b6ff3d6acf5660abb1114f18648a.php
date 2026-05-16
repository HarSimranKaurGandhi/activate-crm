<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo e($quotation['number']); ?></title>
  <style>
    @page { size: A4; margin: 7mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { position: relative; overflow: hidden; width: 100%; background: #fff; }
    .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden; z-index: 1; }
    .watermark span { transform: rotate(-35deg); white-space: nowrap; font-size: 64px; font-weight: 900; letter-spacing: 0.12em; color: rgba(226, 232, 240, 0.5); }
    .content { position: relative; z-index: 2; }
    .letterhead { padding-bottom: 6px; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); }
    .letterhead img, .letterhead embed { display: block; width: 100%; }
    .letterhead img { height: 118px; object-fit: cover; object-position: top; }
    .letterhead embed { height: 165px; }
    .ribbon { position: relative; display: flex; align-items: center; justify-content: space-between; margin: 0 10px; padding: 8px 14px; color: #fff; background: linear-gradient(90deg, #020617 0%, #0f172a 45%, #020617 100%); }
    .ribbon:after { content: ""; position: absolute; left: 62%; top: 0; width: 1px; height: 100%; transform: rotate(28deg); background: #dc2626; }
    .ribbon-brand { max-width: 68%; font-size: 26px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; line-height: 1.15; }
    .ribbon-title { font-size: 15px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; }
    .section { padding: 10px 16px 12px; }
    .top-grid { display: grid; grid-template-columns: 1fr 236px; gap: 14px; margin-bottom: 14px; }
    .to-block { border-left: 4px solid #dc2626; padding-left: 16px; }
    .eyebrow { margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.25em; color: #dc2626; text-transform: uppercase; }
    .customer-title { margin: 6px 0 0; font-size: 17px; font-weight: 900; color: #020617; }
    .customer-subtitle, .customer-address { margin: 4px 0 0; font-size: 12px; color: #475569; }
    .customer-meta { margin-top: 5px; font-size: 9.5px; font-weight: 700; color: #64748b; }
    .customer-meta span { margin-right: 14px; }
    .intro { max-width: 100%; margin-top: 12px; font-size: 11px; line-height: 1.4; color: #334155; }
    .intro p { margin: 0 0 5px; }
    .meta-card { border: 1px solid #e2e8f0; border-radius: 14px; background: rgba(248, 250, 252, 0.85); overflow: hidden; }
    .meta-row { display: grid; grid-template-columns: 30px 1fr 1fr; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .meta-row:last-child { border-bottom: 0; }
    .meta-icon { width: 26px; height: 26px; border-radius: 8px; background: #fff; border: 1px solid #e2e8f0; color: #dc2626; font-size: 8px; font-weight: 900; display: flex; align-items: center; justify-content: center; text-transform: uppercase; }
    .meta-label { font-size: 9px; font-weight: 900; letter-spacing: 0.05em; color: #334155; text-transform: uppercase; }
    .meta-value { text-align: right; font-size: 11px; font-weight: 900; color: #020617; }
    .status-badge { display: inline-block; padding: 4px 9px; border-radius: 999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
    .status-draft { background: #e2e8f0; color: #0f172a; } .status-pending { background: #fef3c7; color: #92400e; } .status-approved { background: #dcfce7; color: #166534; } .status-rejected { background: #fee2e2; color: #991b1b; } .status-revised { background: #dbeafe; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; }
    .items-wrap { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 14px; }
    .items-table thead tr { background: linear-gradient(90deg, #020617 0%, #0f172a 100%); color: #fff; }
    .items-table th { padding: 8px 9px; font-size: 8.5px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; text-align: left; }
    .items-table td { padding: 10px 9px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 10px; color: #334155; }
    .items-table tr:last-child td { border-bottom: 0; }
    .items-table td:last-child, .items-table th:last-child { border-right: 0; }
    .center { text-align: center; } .right { text-align: right; }
    .item-no { font-weight: 900; color: #020617; text-align: center; }
    .product-image { display: block; width: 100%; max-width: 112px; height: 72px; margin: 0 auto 7px; object-fit: contain; }
    .product-image-placeholder { display: flex; align-items: center; justify-content: center; width: 112px; height: 72px; margin: 0 auto 7px; border-radius: 10px; background: #f1f5f9; color: #94a3b8; font-size: 8.5px; font-weight: 700; }
    .product-name { font-size: 11px; font-weight: 900; color: #020617; text-align: center; line-height: 1.2; }
    .product-model { margin-top: 3px; text-align: center; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #475569; }
    .specs { font-size: 9.5px; line-height: 1.35; color: #334155; } .specs ul, .specs ol { margin: 0; padding-left: 15px; } .specs li { margin-bottom: 2px; }
    .amount-strong { font-size: 10.5px; font-weight: 900; color: #020617; }
    .gst-sub { margin-top: 3px; font-size: 9px; color: #64748b; }
    .totals { width: 286px; margin-left: auto; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 14px; }
    .totals-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; font-weight: 800; color: #334155; background: #fff; }
    .totals-row.muted { background: #f8fafc; } .totals-row:last-child { border-bottom: 0; }
    .grand-total { background: #dc2626; color: #fff; } .grand-total .grand-label { font-size: 9px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; } .grand-total .grand-value { font-size: 20px; font-weight: 900; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .card { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; overflow: hidden; }
    .card-header { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; background: #020617; color: #fff; border-top-left-radius: 14px; border-bottom-right-radius: 14px; font-size: 8.5px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
    .card-body { padding: 8px 10px 10px; font-size: 9.5px; color: #334155; }
    .term-row { display: flex; gap: 6px; padding-bottom: 6px; margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; }
    .term-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
    .term-index { width: 15px; height: 15px; border-radius: 999px; border: 1px solid #dc2626; color: #dc2626; font-size: 7.5px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .detail-row { display: grid; grid-template-columns: 92px 8px 1fr; gap: 4px; margin-bottom: 3px; color: #1e293b; font-size: 9px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-label { font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #334155; }
    .detail-colon { font-weight: 700; color: #94a3b8; }
    .detail-value { font-weight: 500; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: grid; grid-template-columns: 1fr 220px; gap: 12px; align-items: end; }
    .footer-left { display: flex; align-items: center; gap: 10px; }
    .footer-avatar { width: 56px; height: 56px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; flex-shrink: 0; }
    .footer-copy { font-size: 10px; line-height: 1.5; color: #334155; }
    .salesperson-name { margin-top: 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #020617; }
    .salesperson-meta { margin-top: 4px; font-size: 10px; color: #475569; } .salesperson-meta span { margin-right: 12px; }
    .signature { text-align: center; } .signature-line { width: 180px; margin: 42px auto 0; padding-top: 8px; border-top: 2px solid #020617; font-size: 10px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; color: #020617; }
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
        <div class="letterhead"><embed src="<?php echo e($company['letterhead_src']); ?>" type="application/pdf"></div>
      <?php endif; ?>
      <div class="ribbon">
        <div class="ribbon-brand"><?php echo e($company['company_name'] ?: 'Quotation'); ?></div>
        <div class="ribbon-title">Quotation</div>
      </div>
      <div class="section">
        <div class="top-grid">
          <div>
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
          </div>
          <div class="meta-card">
            <div class="meta-row"><div class="meta-icon">No</div><div class="meta-label">Quote No.</div><div class="meta-value"><?php echo e($quotation['number']); ?></div></div>
            <div class="meta-row"><div class="meta-icon">Dt</div><div class="meta-label">Date</div><div class="meta-value"><?php echo e($quotation['quote_date_label']); ?></div></div>
            <div class="meta-row"><div class="meta-icon">St</div><div class="meta-label">Status</div><div class="meta-value"><span class="status-badge status-<?php echo e($quotation['status_key']); ?>"><?php echo e($quotation['status_label']); ?></span></div></div>
          </div>
        </div>
        <div class="items-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th class="center" style="width:48px;">No.</th>
                <th class="center" style="width:220px;">Product / Picture</th>
                <th>Specifications</th>
                <th class="right" style="width:90px;">Price</th>
                <th class="center" style="width:56px;">Qty</th>
                <?php if($quotation['show_discount']): ?> <th class="center" style="width:70px;">Disc%</th> <?php endif; ?>
                <th class="right" style="width:90px;">GST</th>
                <th class="right" style="width:108px;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              <?php $__currentLoopData = $quotation['items']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                  <td class="item-no"><?php echo e($index + 1); ?></td>
                  <td class="center">
                    <?php if($item['product_image_src']): ?><img class="product-image" src="<?php echo e($item['product_image_src']); ?>" alt="<?php echo e($item['product_name']); ?>"><?php else: ?><div class="product-image-placeholder">Product Image</div><?php endif; ?>
                    <div class="product-name"><?php echo e($item['product_name']); ?></div>
                    <?php if($item['model_number']): ?><div class="product-model"><?php echo e($item['model_number']); ?></div><?php endif; ?>
                  </td>
                  <td class="specs"><?php echo $item['specifications_html']; ?></td>
                  <td class="right amount-strong"><?php echo e($item['edited_price_label']); ?></td>
                  <td class="center amount-strong"><?php echo e($item['quantity_label']); ?></td>
                  <?php if($quotation['show_discount']): ?> <td class="center"><?php echo e($item['discount_percent_label']); ?></td> <?php endif; ?>
                  <td class="right"><div><?php echo e($item['gst_percent_label']); ?></div><div class="gst-sub"><?php echo e($item['tax_amount_label']); ?></div></td>
                  <td class="right amount-strong"><?php echo e($item['line_total_label']); ?></td>
                </tr>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
          </table>
        </div>
        <div class="totals">
          <div class="totals-row muted"><span>Sub Total</span><span><?php echo e($quotation['subtotal_label']); ?></span></div>
          <?php $__currentLoopData = $quotation['adjustments']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $adjustment): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><div class="totals-row"><span><?php echo e($adjustment['name']); ?></span><span><?php echo e($adjustment['amount_label']); ?></span></div><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
          <?php if(!$quotation['gst_inclusive'] && $quotation['tax_amount'] > 0): ?>
            <div class="totals-row"><span>Total Before Tax</span><span><?php echo e($quotation['before_tax_total_label']); ?></span></div>
            <div class="totals-row"><span>GST</span><span><?php echo e($quotation['tax_amount_label']); ?></span></div>
          <?php endif; ?>
          <div class="totals-row grand-total"><span class="grand-label">Grand Total</span><span class="grand-value"><?php echo e($quotation['grand_total_label']); ?></span></div>
        </div>
        <div class="bottom-grid">
          <?php if(count($quotation['terms']) > 0): ?>
            <div class="card">
              <div class="card-header">Terms and Conditions</div>
              <div class="card-body"><?php $__currentLoopData = $quotation['terms']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $term): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><div class="term-row"><div class="term-index"><?php echo e($index + 1); ?></div><div><?php echo e($term['content']); ?></div></div><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div>
            </div>
          <?php endif; ?>
          <div class="card">
            <div class="card-header">Company Details</div>
            <div class="card-body"><?php $__currentLoopData = $company['details']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $detail): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><div class="detail-row"><div class="detail-label"><?php echo e($detail['label']); ?></div><div class="detail-colon">:</div><div class="detail-value"><?php echo e($detail['value']); ?></div></div><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></div>
          </div>
        </div>
        <div class="footer">
          <div class="footer-left">
            <div class="footer-avatar">SR</div>
            <div class="footer-copy">
              Thank you again for showing your interest with us. Looking forward for a healthy and long term relationship with you.<br>
              Assuring you the best quality and services all the times.
              <div class="salesperson-name"><?php echo e($quotation['salesperson']['name']); ?></div>
              <div class="salesperson-meta"><?php if($quotation['salesperson']['phone']): ?> <span>Phone: <?php echo e($quotation['salesperson']['phone']); ?></span> <?php endif; ?> <?php if($quotation['salesperson']['email']): ?> <span>Email: <?php echo e($quotation['salesperson']['email']); ?></span> <?php endif; ?></div>
            </div>
          </div>
          <div class="signature"><div class="signature-line">Authorized Signature</div></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
<?php /**PATH /Users/harsimrankaur/Downloads/Interactive Quotation Management Prototype/backend-api/resources/views/pdf/quotation.blade.php ENDPATH**/ ?>