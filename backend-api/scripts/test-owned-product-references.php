<?php
require __DIR__.'/test-executed-quotation-crm.php';
(require __DIR__.'/../database/migrations/2026_10_30_000002_create_owned_product_references.php')->up();
$customer=App\Models\Customer::first();
$customers=app(App\Services\CustomerService::class);
$base=['product_id'=>1,'quantity'=>1,'purchase_date'=>now()->toDateString()];
$owned=$customers->addOwnedProduct($customer,[...$base,'serial_number'=>' SN-001 ','reference_image_path'=>'uploads/reference.png'],$user);
$customers->addOwnedProduct($customer,[...$base,'serial_number'=>'SN-002'],$user);
$refs=$owned->references()->orderBy('id')->get();
verifyCrm($refs->count()===2 && $refs[0]->serial_number==='SN-001' && $refs[1]->serial_number==='SN-002','Serial numbers overwritten or not trimmed');
verifyCrm($refs[0]->image_path==='uploads/reference.png' && $refs[1]->image_path===null,'Optional images not stored');
$customers->addOwnedProduct($customer,$base,$user);
verifyCrm($owned->references()->count()===2,'Blank reference created');
$custom=$customers->addOwnedProduct($customer,['product_description'=>'Custom machine',...array_diff_key($base,['product_id'=>true]),'serial_number'=>'CUSTOM'],$user);
verifyCrm($custom->references()->first()->serial_number==='CUSTOM','Custom product reference missing');
echo "PASS: serial numbers, optional image references, repeated additions preserve history, custom products and blank metadata.\n";
