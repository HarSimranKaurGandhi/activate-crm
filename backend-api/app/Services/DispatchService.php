<?php
namespace App\Services;
use App\Models\Dispatch;
use App\Models\User;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class DispatchService
{
    private array $relations=['customer','creator:id,name,email','items.product.brand'];
    public function paginate(Request $request):LengthAwarePaginator{return Dispatch::query()->with(['customer','creator:id,name,email'])->when($request->filled('status'),fn($q)=>$request->string('status')->toString()==='active'?$q->whereIn('status',['new','invoiced']):$q->where('status',$request->string('status')->toString()))->latest('dispatch_date')->latest('id')->paginate((int)$request->integer('per_page',15));}
    public function find(int|string $id):Dispatch{return Dispatch::with($this->relations)->findOrFail($id);}
    public function create(array $data,?User $user):Dispatch{return DB::transaction(function()use($data,$user){$items=$this->withTaxSnapshots($data['items']);unset($data['items']);$data['dispatch_date']=today()->format('Y-m-d');$data['status']='new';$data['created_by']=$user?->id;$data['dispatch_number']=$this->nextNumber();$dispatch=Dispatch::create($data);$dispatch->items()->createMany($items);return $this->find($dispatch->id);});}
    public function update(Dispatch $dispatch,array $data):Dispatch{return DB::transaction(function()use($dispatch,$data){$items=$this->withTaxSnapshots($data['items']);unset($data['items']);$data['dispatch_date']=today()->format('Y-m-d');$dispatch->update($data);$dispatch->items()->delete();$dispatch->items()->createMany($items);return $this->find($dispatch->id);});}
    private function withTaxSnapshots(array $items):array{$products=Product::whereIn('id',collect($items)->pluck('product_id')->filter())->get(['id','hsn_code','gst_percent'])->keyBy('id');return array_map(function(array $item)use($products):array{$product=isset($item['product_id'])?$products->get($item['product_id']):null;$item['product_id']=$item['product_id']??null;$item['hsn_code']=$product?->hsn_code;$item['gst_percent']=(float)($product?->gst_percent??0);return $item;},$items);}
    private function nextNumber():string{$year=now()->format('Y');$last=Dispatch::where('dispatch_number','like',"DSP-{$year}-%")->lockForUpdate()->max('dispatch_number');$sequence=$last?(int)substr($last,-5)+1:1;return sprintf('DSP-%s-%05d',$year,$sequence);}
}
