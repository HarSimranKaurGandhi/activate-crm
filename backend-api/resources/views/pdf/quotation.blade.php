<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $quotation['number'] }}</title>
  <style>
    @page { size: A4; margin: 18mm 6mm 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; line-height: 1.4; }
    .page { position: relative; width: 100%; background: #fff; }
    .watermark { position: fixed; top: 44%; left: 8%; width: 84%; text-align: center; z-index: 1; }
    .watermark span { display: inline-block; transform: rotate(-35deg); white-space: nowrap; font-size: 60px; font-weight: 900; letter-spacing: 0.16em; color: #e2e8f0; }
    .content { position: relative; z-index: 2; }
    .letterhead { margin: 0 0 6px; padding: 0; background: #f8fafc; text-align: left; }
    .letterhead img { display: block; width: 100%; height: auto; object-fit: cover; object-position: top; }
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
    .ribbon-brand-cell { width: 64%; border-right: 2px solid #dc2626; background: #020617; }
    .ribbon-brand { font-size: 20px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; line-height: 1.05; }
    .ribbon-title-cell { background: #dc2626; }
    .ribbon-title { text-align: center; font-size: 16px; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase; }
    .section { padding: 0 10px 4px; }
    .top-table, .bottom-table, .footer-table, .detail-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .top-table { margin-bottom: 8px; }
    .top-table > tbody > tr > td { vertical-align: top; }
    .top-left { width: 58%; padding-right: 18px; }
    .top-right { width: 42%; }
    .detail-heading { margin: 0 0 10px; padding-bottom: 8px; border-bottom: 1px solid #f2b2b2; font-size: 11px; font-weight: 900; letter-spacing: 0.04em; color: #111827; text-transform: uppercase; }
    .detail-heading .accent { display: block; width: 110px; height: 2px; margin-top: 8px; background: #dc2626; }
    .to-block { padding: 0; background: transparent; }
    .eyebrow { display: none; }
    .customer-title { margin: 0; font-size: 18px; font-weight: 900; color: #020617; line-height: 1.08; }
    .customer-subtitle, .customer-address { margin: 4px 0 0; font-size: 10px; color: #475569; line-height: 1.4; }
    .customer-meta { margin-top: 7px; font-size: 8.5px; font-weight: 700; color: #64748b; }
    .customer-meta span { margin-right: 14px; }
    .intro { margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10.5px; line-height: 1.4; color: #334155; }
    .intro p { margin: 0 0 3px; }
    .meta-card { width: 100%; border: 1px solid #e2e8f0; background: #fff; }
    .meta-card table { width: 100%; border-collapse: collapse; }
    .meta-row td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .meta-row:last-child td { border-bottom: 0; }
    .meta-label { width: 34%; font-size: 9px; font-weight: 900; color: #111827; }
    .meta-value { text-align: left; font-size: 9px; font-weight: 500; color: #111827; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
    .status-draft { background: #e2e8f0; color: #0f172a; } .status-pending { background: #fef3c7; color: #92400e; } .status-approved { background: #dcfce7; color: #166534; } .status-rejected { background: #fee2e2; color: #991b1b; } .status-revised { background: #dbeafe; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; }
    .items-wrap { border: 1px solid #d1d5db; overflow: hidden; margin-bottom: 14px; }
    .items-table { table-layout: fixed; }
    .items-table thead tr { background: #000; color: #fff; border-top: 2px solid #dc2626; }
    .items-table th { padding: 7px 3px; font-size: 8px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; text-align: center; }
    .items-table td { padding: 7px 3px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 9.5px; color: #334155; }
    .items-table tr:last-child td { border-bottom: 0; }
    .items-table td:last-child, .items-table th:last-child { border-right: 0; }
    .items-table tbody tr { page-break-inside: avoid; }
    .col-no { width: 3%; }
    .col-product { width: 21%; }
    .col-specs { width: 38%; }
    .col-price { width: 10%; }
    .col-qty { width: 4%; }
    .col-discount { width: 6%; }
    .col-gst { width: 8%; }
    .col-total { width: 10%; }
    .items-table td.col-no, .items-table th.col-no,
    .items-table td.col-qty, .items-table th.col-qty,
    .items-table td.col-discount, .items-table th.col-discount { padding-left: 1px; padding-right: 1px; }
    .center { text-align: center; } .right { text-align: right; }
    .item-no { width: 20px; font-weight: 900; color: #020617; text-align: center; }
    .product-image { display: block; width: 100%; max-width: 138px; height: 88px; margin: 0 auto 6px; object-fit: contain; }
    .product-image-placeholder { width: 138px; height: 88px; margin: 0 auto 6px; border-radius: 8px; background: #f1f5f9; color: #94a3b8; font-size: 8px; font-weight: 700; text-align: center; line-height: 88px; }
    .product-name { font-size: 10px; font-weight: 900; color: #020617; text-align: center; line-height: 1.2; }
    .product-model { margin-top: 2px; text-align: center; font-size: 8px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #475569; }
    .specs { max-width: 100%; min-width: 0; overflow: hidden; font-size: 8.5px; line-height: 1.24; color: #334155; word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal; }
    .specs p { margin: 0 0 2px; }
    .specs ul, .specs ol { margin: 0; padding-left: 14px; }
    .specs li { margin-bottom: 2px; }
    .specs * { max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; white-space: normal !important; word-break: break-word !important; overflow-wrap: anywhere !important; font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; color: inherit !important; }
    .specs img, .specs svg, .specs video, .specs canvas, .specs iframe, .specs embed, .specs object { display: block; max-width: 100% !important; width: auto !important; height: auto !important; }
    .specs table { width: 100% !important; max-width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
    .specs th, .specs td, .specs pre, .specs code { white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: anywhere !important; }
    .amount-strong { font-size: 9.5px; font-weight: 900; color: #020617; }
    .gst-sub { margin-top: 2px; font-size: 8px; color: #64748b; }
    .totals { width: 420px; margin-left: auto; border: 1px solid #d1d5db; overflow: hidden; margin-bottom: 10px; }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals-row td { padding: 10px 16px; border-bottom: 1px solid #d1d5db; font-size: 10px; color: #111827; background: #fff; }
    .totals-row td + td { border-left: 1px solid #d1d5db; text-align: right; }
    .totals-row.muted td { background: #fff; }
    .totals-row:last-child td { border-bottom: 0; }
    .grand-total td { background: #000; color: #fff; }
    .grand-total .grand-label { font-size: 11px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
    .grand-total .grand-value { font-size: 15px; font-weight: 900; }
    .bottom-table { margin-top: 4px; margin-bottom: 8px; }
    .bottom-table > tbody > tr > td { width: 50%; vertical-align: top; }
    .bottom-left { padding-right: 6px; }
    .bottom-right { padding-left: 6px; }
    .card { border: 1px solid #d1d5db; background: #fff; overflow: hidden; }
    .card-header { display: block; padding: 9px 10px 0; background: #fff; color: #111827; font-size: 10px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; }
    .card-header-line { width: 118px; height: 2px; margin-top: 6px; background: #dc2626; }
    .card-body { padding: 5px 10px 6px; font-size: 8.6px; color: #334155; }
    .term-row { width: 100%; padding-top: 0; padding-bottom: 0; margin-top: 0; margin-bottom: 0; border-bottom: 0; }
    .term-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
    .term-bullet { width: 5px; height: 5px; background: #dc2626; margin-top: 6px; }
    .term-text { padding: 0 0 3px 0; line-height: 1.22; }
    .detail-table td { padding: 3px 0; color: #1e293b; font-size: 8.5px; vertical-align: top; border-top: 1px solid #e5e7eb; }
    .detail-table tr:first-child td { border-top: 0; }
    .detail-label-cell { width: 128px; }
    .detail-colon-cell { display:none; }
    .detail-label { font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #334155; }
    .detail-value { font-weight: 500; }
    .footer { padding-top: 10px; page-break-inside: avoid; }
    .footer-left { width: 62%; padding-right: 12px; vertical-align: top; }
    .footer-right { width: 38%; padding-left: 18px; text-align: center; vertical-align: top; }
    .footer-copy { font-size: 10px; line-height: 1.8; color: #334155; }
    .footer-signatures { width: 100%; margin-top: 28px; border-collapse: collapse; }
    .footer-signatures td { vertical-align: top; }
    .footer-signatures-left { width: 62%; padding-right: 12px; }
    .footer-signatures-right { width: 38%; padding-left: 18px; }
    .salesperson-block { text-align: left; }
    .salesperson-signature-wrap { width: 220px; margin-top: 12px; }
    .salesperson-line { width: 220px; margin: 0; border-top: 2px solid #dc2626; }
    .salesperson-name { margin-top: 12px; display: block; width: 220px; white-space: nowrap; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #dc2626; text-align: left; }
    .salesperson-meta { margin-top: 6px; font-size: 9px; color: #475569; }
    .salesperson-meta span { margin-right: 12px; }
    .signature-wrap { width: 220px; margin-top: 12px; margin-left: auto; }
    .signature-line { width: 220px; margin: 0 0 12px auto; border-top: 2px solid #dc2626; }
    .signature-label { width: 220px; font-size: 10px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; color: #020617; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    @if($quotation['requires_watermark'])
      <div class="watermark"><span>PENDING APPROVAL</span></div>
    @endif
    <div class="content">
      @if($company['letterhead_type'] === 'image' && $company['letterhead_src'])
        <div class="letterhead"><img src="{{ $company['letterhead_src'] }}" alt="Letterhead"></div>
      @elseif($company['letterhead_type'] === 'pdf' && $company['letterhead_src'])
        <div class="letterhead-fallback">A print-safe branded header is used below for PDF rendering.</div>
      @endif
      @if(!$company['letterhead_src'])
      <table class="brand-header">
        <tr>
          <td class="brand-logo-cell">
            @if($company['logo_src'])
              <img class="brand-logo" src="{{ $company['logo_src'] }}" alt="{{ $company['company_name'] }}">
            @else
              <div class="brand-logo-fallback">{{ strtoupper(substr($company['company_name'] ?: 'CO', 0, 2)) }}</div>
            @endif
          </td>
          <td class="brand-info-cell">
            <div class="brand-name">{{ $company['company_name'] }}</div>
            <div class="brand-address">
              @foreach($company['address_lines'] as $line)
                <div>{{ $line }}</div>
              @endforeach
            </div>
          </td>
          <td class="brand-contact-cell">
            <div class="brand-contact">
              @if($company['email'])<div><strong>Email:</strong> {{ $company['email'] }}</div>@endif
              @if($company['phone'])<div><strong>Mobile:</strong> {{ $company['phone'] }}</div>@endif
              @if($company['gst_number'])<div><strong>GST:</strong> {{ $company['gst_number'] }}</div>@endif
            </div>
          </td>
        </tr>
      </table>
      @endif
      <table class="ribbon">
        <tr>
          <td class="ribbon-brand-cell"><div class="ribbon-brand">{{ $company['company_name'] ?: 'Quotation' }}</div></td>
          <td class="ribbon-title-cell"><div class="ribbon-title">Quotation</div></td>
        </tr>
      </table>
      <div class="section">
        <table class="top-table">
          <tr>
            <td class="top-left">
            <div class="detail-heading">Client Details<div class="accent"></div></div>
            <div class="to-block">
              <p class="customer-title">{{ $quotation['customer']['company_name'] ?: $quotation['customer']['primary_name'] }}</p>
              @if($quotation['customer']['company_name'])<p class="customer-subtitle">{{ $quotation['customer']['primary_name'] }}</p>@endif
              <p class="customer-address">{{ $quotation['customer']['address'] }}</p>
              <div class="customer-meta">
                @if($quotation['customer']['phone']) <span>Phone: {{ $quotation['customer']['phone'] }}</span> @endif
                @if($quotation['customer']['email']) <span>Email: {{ $quotation['customer']['email'] }}</span> @endif
                @if($quotation['customer']['gst_number']) <span>GSTIN: {{ $quotation['customer']['gst_number'] }}</span> @endif
              </div>
            </div>
            </td>
            <td class="top-right">
              <div class="detail-heading">Quotation Details<div class="accent"></div></div>
              <div class="meta-card">
                <table>
                  <tr class="meta-row">
                    <td class="meta-label">Date</td>
                    <td class="meta-value">{{ $quotation['quote_date_label'] }}</td>
                  </tr>
                  <tr class="meta-row">
                    <td class="meta-label">Quote No</td>
                    <td class="meta-value">{{ $quotation['number'] }}</td>
                  </tr>
                  <tr class="meta-row">
                    <td class="meta-label">Validity</td>
                    <td class="meta-value">{{ $quotation['validity_label'] }}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
        <div class="intro">
          <p><strong>Dear Sir,</strong></p>
          <p>We are indeed thankful to you for showing interest in our products.</p>
          <p>As per the discussion, please find here our most technically viable offer for your consideration.</p>
        </div>
        <div class="items-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th class="center col-no">SNo</th>
                <th class="center col-product">Product / Picture</th>
                <th class="col-specs">Specifications</th>
                <th class="right col-price">Price</th>
                <th class="center col-qty">Qty</th>
                @if($quotation['show_discount']) <th class="center col-discount">Disc%</th> @endif
                @if($quotation['show_item_wise_gst']) <th class="right col-gst">GST</th> @endif
                <th class="right col-total">{{ $quotation['gst_inclusive'] ? 'Amount' : 'Net Amount' }}</th>
              </tr>
            </thead>
            <tbody>
              @foreach($quotation['items'] as $index => $item)
                <tr>
                  <td class="item-no col-no">{{ $index + 1 }}</td>
                  <td class="center col-product">
                    @if($item['product_image_src'])<img class="product-image" src="{{ $item['product_image_src'] }}" alt="{{ $item['product_name'] }}">@else<div class="product-image-placeholder">Product Image</div>@endif
                    <div class="product-name">{{ $item['product_name'] }}</div>
                    @if($item['model_number'])<div class="product-model">{{ $item['model_number'] }}</div>@endif
                  </td>
                  <td class="specs col-specs">{!! $item['specifications_html'] !!}</td>
                  <td class="right amount-strong col-price">{{ $quotation['show_mrp'] ? $item['edited_price_label'] : $item['discounted_price_label'] }}</td>
                  <td class="center amount-strong col-qty" style="white-space: nowrap;">{{ $item['quantity_label'] }}</td>
                  @if($quotation['show_discount']) <td class="center col-discount" style="white-space: nowrap;">{{ $item['discount_percent_label'] }}</td> @endif
                  @if($quotation['show_item_wise_gst']) <td class="right col-gst"><div>{{ $item['gst_percent_label'] }}</div><div class="gst-sub">{{ $item['tax_amount_label'] }}</div></td> @endif
                  <td class="right amount-strong col-total">{{ $quotation['gst_inclusive'] ? $item['line_total_label'] : $item['net_amount_label'] }}</td>
                </tr>
              @endforeach
            </tbody>
          </table>
        </div>
        <div class="totals">
          <table>
            <tr class="totals-row muted"><td>Sub Total</td><td>{{ $quotation['subtotal_label'] }}</td></tr>
            @foreach($quotation['adjustments'] as $adjustment)<tr class="totals-row"><td>{{ $adjustment['name'] }}</td><td>{{ $adjustment['amount_label'] }}</td></tr>@endforeach
            @if(!$quotation['gst_inclusive'] && $quotation['tax_amount'] > 0)
              <tr class="totals-row"><td>GST</td><td>{{ $quotation['tax_amount_label'] }}</td></tr>
            @endif
            <tr class="totals-row grand-total"><td><span class="grand-label">Grand Total</span></td><td><span class="grand-value">{{ $quotation['grand_total_label'] }}</span></td></tr>
          </table>
        </div>
        <table class="bottom-table">
          <tr>
          @if(count($quotation['terms']) > 0)
            <td class="bottom-left">
            <div class="card">
              <div class="card-header">Terms and Conditions<div class="card-header-line"></div></div>
              <div class="card-body">
                @foreach($quotation['terms'] as $index => $term)
                  <table class="term-row">
                    <tr>
                      <td style="width:16px; vertical-align: top;"><div class="term-bullet"></div></td>
                      <td class="term-text">{{ $term['content'] }}</td>
                    </tr>
                  </table>
                @endforeach
              </div>
            </div>
            </td>
          @else
            <td class="bottom-left"></td>
          @endif
          <td class="bottom-right">
          <div class="card">
            <div class="card-header">Company Details<div class="card-header-line"></div></div>
            <div class="card-body">
              <table class="detail-table">
                @foreach($company['details'] as $detail)
                  <tr>
                    <td class="detail-label-cell"><div class="detail-label">{{ $detail['label'] }}</div></td>
                    <td><div class="detail-value">{{ $detail['value'] }}</div></td>
                  </tr>
                @endforeach
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
                <div class="footer-copy" style="text-align:left;">
                  Thank you again for showing your interest with us. Looking forward for a healthy and long term relationship with you.<br>
                  Assuring you the best quality and services all the times.
                </div>
              </td>
              <td class="footer-right"></td>
            </tr>
          </table>
          <table class="footer-signatures">
            <tr>
              <td class="footer-signatures-left">
                <div class="salesperson-block">
                  <div class="salesperson-signature-wrap">
                    <div class="salesperson-line"></div>
                    <div class="salesperson-name">{{ $quotation['salesperson']['name'] }}</div>
                  </div>
                  <div class="salesperson-meta">@if($quotation['salesperson']['phone']) <span>Phone: {{ $quotation['salesperson']['phone'] }}</span> @endif @if($quotation['salesperson']['email']) <span>Email: {{ $quotation['salesperson']['email'] }}</span> @endif</div>
                </div>
              </td>
              <td class="footer-signatures-right">
                <div class="signature-wrap">
                  <div class="signature-line"></div>
                  <div class="signature-label">Authorized Signature</div>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
