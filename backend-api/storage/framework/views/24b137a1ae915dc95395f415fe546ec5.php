<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title><?php echo e($amc['document_title']); ?> - <?php echo e($amc['number']); ?></title>
  <style>
    @page { size: A4; margin: 14mm 12mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; }
    .company-header { margin-bottom: 14px; border-bottom: 3px solid #047857; }
    .company-header td { padding: 0 0 10px; vertical-align: top; }
    .logo-cell { width: 18%; padding-right: 12px !important; }
    .logo { display: block; max-width: 105px; max-height: 62px; }
    .company-name { margin: 0 0 4px; color: #064e3b; font-size: 24px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
    .registered-address, .company-contact { color: #334155; font-size: 9.5px; }
    .company-contact { width: 31%; padding-left: 14px !important; text-align: right; }
    .company-contact div { margin-bottom: 3px; }
    .document-band { margin-bottom: 14px; background: #064e3b; color: #fff; }
    .document-band td { padding: 10px 12px; }
    .document-title { font-size: 18px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .document-number { text-align: right; font-size: 10px; font-weight: 700; }
    .two-column { margin-bottom: 14px; }
    .two-column > tbody > tr > td { width: 50%; vertical-align: top; }
    .left-column { padding-right: 6px; }
    .right-column { padding-left: 6px; }
    .card { border: 1px solid #cbd5e1; }
    .card-title { padding: 7px 9px; background: #ecfdf5; color: #065f46; font-size: 9px; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; }
    .card-body { min-height: 92px; padding: 10px; }
    .customer-name { margin-bottom: 3px; color: #0f172a; font-size: 15px; font-weight: 900; }
    .muted { color: #64748b; }
    .meta-table td { padding: 4px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .meta-table tr:last-child td { border-bottom: 0; }
    .meta-label { width: 42%; color: #64748b; font-size: 8.5px; font-weight: 800; text-transform: uppercase; }
    .meta-value { color: #0f172a; font-weight: 700; text-align: right; }
    .section-title { margin: 15px 0 7px; padding-bottom: 5px; border-bottom: 2px solid #047857; color: #064e3b; font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    .data-table { table-layout: fixed; border: 1px solid #cbd5e1; }
    .data-table thead { display: table-header-group; }
    .data-table th { padding: 7px 6px; background: #0f172a; color: #fff; font-size: 8px; font-weight: 900; text-align: left; text-transform: uppercase; }
    .data-table td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .data-table tbody tr { page-break-inside: avoid; }
    .data-table tbody tr:last-child td { border-bottom: 0; }
    .right { text-align: right !important; }
    .center { text-align: center !important; }
    .machine-name { font-weight: 800; }
    .summary { width: 47%; margin: 10px 0 0 auto; border: 1px solid #cbd5e1; }
    .summary td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; }
    .summary tr:last-child td { border-bottom: 0; background: #064e3b; color: #fff; font-size: 12px; font-weight: 900; }
    .summary td:last-child { text-align: right; font-weight: 800; }
    .note { padding: 10px 12px; border-left: 4px solid #10b981; background: #f0fdf4; white-space: pre-wrap; }
    .scope { margin-top: 14px; padding: 10px 12px; border: 1px solid #d1fae5; background: #f8fafc; color: #334155; }
    .scope strong { color: #064e3b; }
    .footer { margin-top: 24px; padding-top: 9px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 8px; text-align: center; }
  </style>
</head>
<body>
  <table class="company-header">
    <tr>
      <?php if($company['logo_src']): ?>
        <td class="logo-cell"><img class="logo" src="<?php echo e($company['logo_src']); ?>" alt="<?php echo e($company['name']); ?>"></td>
      <?php endif; ?>
      <td>
        <div class="company-name"><?php echo e($company['name']); ?></div>
        <div class="registered-address"><strong>Registered Address:</strong> <?php echo e($company['registered_address'] ?: 'Not configured'); ?></div>
      </td>
      <td class="company-contact">
        <div><strong>GSTIN:</strong> <?php echo e($company['gstin'] ?: 'Not configured'); ?></div>
        <?php if($company['phone']): ?><div><strong>Phone:</strong> <?php echo e($company['phone']); ?></div><?php endif; ?>
        <?php if($company['email']): ?><div><strong>Email:</strong> <?php echo e($company['email']); ?></div><?php endif; ?>
      </td>
    </tr>
  </table>

  <table class="document-band">
    <tr>
      <td class="document-title"><?php echo e($amc['document_title']); ?></td>
      <td class="document-number"><?php echo e($amc['number']); ?></td>
    </tr>
  </table>

  <table class="two-column">
    <tr>
      <td class="left-column">
        <div class="card">
          <div class="card-title">Customer Details</div>
          <div class="card-body">
            <div class="customer-name"><?php echo e($amc['customer']['name']); ?></div>
            <?php if($amc['customer']['contact_name']): ?><div><?php echo e($amc['customer']['contact_name']); ?></div><?php endif; ?>
            <?php if($amc['customer']['address']): ?><div class="muted"><?php echo e($amc['customer']['address']); ?></div><?php endif; ?>
            <?php if($amc['customer']['phone']): ?><div class="muted">Phone: <?php echo e($amc['customer']['phone']); ?></div><?php endif; ?>
            <?php if($amc['customer']['email']): ?><div class="muted">Email: <?php echo e($amc['customer']['email']); ?></div><?php endif; ?>
          </div>
        </div>
      </td>
      <td class="right-column">
        <div class="card">
          <div class="card-title">Contract Summary</div>
          <div class="card-body">
            <table class="meta-table">
              <tr><td class="meta-label">AMC Type</td><td class="meta-value"><?php echo e($amc['type']); ?></td></tr>
              <tr><td class="meta-label">Status</td><td class="meta-value"><?php echo e($amc['document_type'] === 'proposal' ? 'Proposed' : $amc['status']); ?></td></tr>
              <tr><td class="meta-label">Period</td><td class="meta-value"><?php echo e($amc['start_date']); ?> to <?php echo e($amc['end_date']); ?></td></tr>
              <tr><td class="meta-label">Yearly Visits</td><td class="meta-value"><?php echo e($amc['yearly_visits']); ?></td></tr>
              <?php if($amc['document_type'] === 'details'): ?>
                <tr><td class="meta-label">Visits Completed</td><td class="meta-value"><?php echo e($amc['visits_done']); ?> of <?php echo e($amc['yearly_visits']); ?></td></tr>
              <?php endif; ?>
            </table>
          </div>
        </div>
      </td>
    </tr>
  </table>

  <div class="section-title">Covered Machines and Charges</div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="center" style="width: 7%">#</th>
        <th style="width: 39%">Machine</th>
        <th style="width: 21%">Brand</th>
        <th style="width: 18%">Model</th>
        <th class="right" style="width: 15%">Charges</th>
      </tr>
    </thead>
    <tbody>
      <?php $__currentLoopData = $amc['items']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <tr>
          <td class="center"><?php echo e($item['number']); ?></td>
          <td class="machine-name"><?php echo e($item['machine_name']); ?></td>
          <td><?php echo e($item['brand']); ?></td>
          <td><?php echo e($item['model_number']); ?></td>
          <td class="right"><?php echo e($item['charges']); ?></td>
        </tr>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tbody>
  </table>

  <table class="summary">
    <tr><td>Additional Charges</td><td><?php echo e($amc['additional_charges']); ?></td></tr>
    <tr><td>Total AMC Charges</td><td><?php echo e($amc['total_charges']); ?></td></tr>
  </table>

  <div class="section-title"><?php echo e($amc['document_type'] === 'proposal' ? 'Proposed Visit Schedule' : 'Visit Schedule'); ?></div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="center" style="width: 16%">Visit</th>
        <th style="width: 38%">Scheduled Date</th>
        <th style="width: 23%">Status</th>
        <?php if($amc['document_type'] === 'details'): ?><th style="width: 23%">Completed On</th><?php endif; ?>
      </tr>
    </thead>
    <tbody>
      <?php $__currentLoopData = $amc['visits']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $visit): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <tr>
          <td class="center"><?php echo e($visit['number']); ?></td>
          <td><?php echo e($visit['scheduled_date']); ?></td>
          <td><?php echo e($amc['document_type'] === 'proposal' ? 'Proposed' : $visit['status']); ?></td>
          <?php if($amc['document_type'] === 'details'): ?><td><?php echo e($visit['completed_at']); ?></td><?php endif; ?>
        </tr>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tbody>
  </table>

  <?php if($amc['additional_comments']): ?>
    <div class="section-title">Additional Notes</div>
    <div class="note"><?php echo e($amc['additional_comments']); ?></div>
  <?php endif; ?>

  <div class="scope">
    <strong><?php echo e($amc['type']); ?> Service Coverage:</strong>
    This document covers the machines, visit schedule and charges listed above. Service delivery and any parts or work outside the recorded AMC scope remain subject to the agreed AMC terms.
  </div>

  <div class="footer">
    Generated by <?php echo e($company['name']); ?> on <?php echo e(now()->format('d M Y')); ?> · <?php echo e($amc['number']); ?>

  </div>
</body>
</html>
<?php /**PATH /Users/manavarora/ActivateCRm/activate-crm/backend-api/resources/views/pdf/amc-document.blade.php ENDPATH**/ ?>