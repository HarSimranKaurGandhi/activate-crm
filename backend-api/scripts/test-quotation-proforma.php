<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
$db=Illuminate\Support\Facades\DB::connection();
$db->statement('CREATE TABLE company_settings (id INTEGER PRIMARY KEY, company_name TEXT, gst_number TEXT)');
$db->statement('CREATE TABLE company_bank_details (id INTEGER PRIMARY KEY, company_setting_id INTEGER, is_default INTEGER)');
$db->table('company_settings')->insert(['id'=>1,'company_name'=>'Test Seller','gst_number'=>'TEST']);
$q=new App\Models\Quotation(['status'=>'locked','quotation_number'=>'Q/2026/123','quote_date'=>'2026-10-14','subtotal_after_discount'=>100,'grand_total'=>106.2,'pricing_mode'=>'exclusive_gst']);
$q->setRelation('customer',new App\Models\Customer(['primary_name'=>'Buyer','state'=>'']));
$q->setRelation('lead',null);
$item=new App\Models\QuotationItem(['product_name'=>'Machine','quantity'=>1,'edited_price'=>125,'price_after_discount'=>100,'discount_percent'=>20,'taxable_amount'=>100,'tax_amount'=>16.2,'gst_percent'=>18,'unit'=>'nos']);
$item->setRelation('product',new App\Models\Product(['hsn_code'=>'1234']));
$q->setRelation('items',new Illuminate\Database\Eloquent\Collection([$item]));
$q->setRelation('adjustments',new Illuminate\Database\Eloquent\Collection([new App\Models\QuotationAdjustment(['amount'=>-10,'is_taxable'=>true])]));
$q->setRelation('terms', new Illuminate\Database\Eloquent\Collection([
    new App\Models\QuotationTerm(['content'=>'Delivery within 30 days.', 'display_order'=>2]),
    new App\Models\QuotationTerm(['content'=>"Payment in advance.\nSubject to confirmation.", 'display_order'=>1]),
]));
$service=app(App\Services\QuotationProformaService::class);
foreach (['approved', 'locked'] as $allowedStatus) {
$q->status = $allowedStatus;
foreach(['cgst_sgst','cgst_utgst','igst'] as $mode) {
    $data=$service->data($q,$mode);
    if($data['invoice_number']!=='Q/2026/123' || abs($data['totals']['grand_total']-106.2)>0.001 || abs($data['totals']['taxable_value']-90)>0.001) throw new RuntimeException('Wrong number or totals');
    if(abs($data['totals']['cgst_amount']+$data['totals']['sgst_amount']+$data['totals']['igst_amount']-16.2)>0.001) throw new RuntimeException('Wrong tax split');
    if ($data['items'][0]['price'] !== 100.0) throw new RuntimeException('Rate must show discounted unit price.');
    $html=view('pdf.tax-invoice',['invoice'=>$data])->render();
    if (!str_contains($html, 'Terms and Conditions') || !str_contains($html, 'Subject to confirmation.') || strpos($html, 'Payment in advance.') >= strpos($html, 'Delivery within 30 days.')) throw new RuntimeException('Quotation terms missing or out of order.');
    if (!str_contains($html, '100.00') || str_contains($html, '125.00')) throw new RuntimeException('PDF rate shows the original price.');
    if(!str_contains($html,'PROFORMA INVOICE') || !str_contains($html,'Q/2026/123')) throw new RuntimeException('Wrong document heading');
    $pdf=app('dompdf.wrapper')->loadHTML($html)->setPaper('a4')->output();
    if(!str_starts_with($pdf,'%PDF-')) throw new RuntimeException('PDF generation failed');
}
}
foreach ([false, true] as $showDiscount) {
    $q->show_discount_to_customer = $showDiscount;
    $data = $service->data($q, 'igst');
    $html = view('pdf.tax-invoice', ['invoice' => $data])->render();
    if (str_contains($html, 'Disc. %') !== $showDiscount) {
        throw new RuntimeException('Discount column does not follow quotation settings.');
    }
    if (abs($data['totals']['grand_total'] - 106.2) > 0.001) {
        throw new RuntimeException('Display setting changed invoice totals.');
    }
    $pdf = app('dompdf.wrapper')->loadHTML($html)->setPaper('a4')->output();
    if (!str_starts_with($pdf, '%PDF-')) throw new RuntimeException('Conditional column PDF failed.');
}
unset($data['show_discount_to_customer']);
if (!str_contains(view('pdf.tax-invoice', ['invoice' => $data])->render(), 'Disc. %')) {
    throw new RuntimeException('Standard tax invoice discount column changed.');
}
foreach ([' Chandigarh '=>'cgst_utgst', 'Punjab'=>'igst', '04'=>'cgst_utgst', ''=>'cgst_sgst'] as $state=>$expectedMode) {
    $q->customer->state=$state;
    $automatic=$service->data($q,'cgst_sgst');
    if ($automatic['tax_mode']!==$expectedMode) throw new RuntimeException('Proforma state selection failed');
    $html=view('pdf.tax-invoice',['invoice'=>$automatic])->render();
    if ($expectedMode==='cgst_utgst' && (!str_contains($html,'UTGST') || str_contains($html,'SGST'))) throw new RuntimeException('Incorrect UTGST label');
}
foreach(['draft','pending_approval','rejected','executed'] as $status) {
    $q->status=$status;
    try { $service->data($q,'igst'); throw new RuntimeException('Ineligible quote allowed'); }
    catch(Illuminate\Validation\ValidationException $expected) {}
}
$q->setRelation('terms', new Illuminate\Database\Eloquent\Collection());
$q->status = 'approved';
$withoutTerms = $service->data($q, 'igst');
if (str_contains(view('pdf.tax-invoice', ['invoice'=>$withoutTerms])->render(), 'Terms and Conditions')) {
    throw new RuntimeException('Empty terms section should be hidden.');
}
echo "PASS: quotation number, adjustments, both tax modes, PDF generation and approved and locked access; other statuses rejected.\n";
