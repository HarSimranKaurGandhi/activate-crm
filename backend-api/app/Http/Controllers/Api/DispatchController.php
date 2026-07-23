<?php
namespace App\Http\Controllers\Api;
use App\Http\Requests\DispatchRequest;
use App\Http\Requests\DispatchInvoiceRequest;
use App\Models\Dispatch;
use App\Services\DispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Support\PublicAsset;
use Illuminate\Validation\ValidationException;
class DispatchController extends ApiController
{
    public function __construct(private DispatchService $dispatches){}
    private function data(Dispatch $dispatch):array{return [
        'id'=>$dispatch->id,'dispatch_number'=>$dispatch->dispatch_number,'dispatch_date'=>optional($dispatch->dispatch_date)->format('Y-m-d'),'planned_dispatch_date'=>optional($dispatch->planned_dispatch_date)->format('Y-m-d'),'status'=>$dispatch->status,
        'invoice_url'=>$dispatch->invoice_path?request()->getSchemeAndHttpHost().'/'.ltrim($dispatch->invoice_path,'/'):null,
        'customer'=>$dispatch->customer?->only(['id','primary_name','company_name','phone','email','address_line_1','address_line_2','city','state','pincode','country']),
        'created_by'=>$dispatch->creator?->only(['id','name','email']),'created_at'=>$dispatch->created_at?->toISOString(),
        'items'=>$dispatch->relationLoaded('items')?$dispatch->items->map(fn($item)=>['id'=>$item->id,'requirement'=>$item->requirement,'product_id'=>$item->product_id,'product'=>$item->product?->product_name,'model_number'=>$item->product?->model_number,'brand'=>$item->product?->brand?->name,'quantity'=>(float)$item->quantity,'hsn_code'=>$item->hsn_code,'gst_percent'=>(float)$item->gst_percent,'price'=>(float)$item->price,'discount_percent'=>(float)$item->discount_percent,'discounted_price'=>(float)$item->discounted_price])->values():[],
    ];}
    public function index(Request $request):JsonResponse{$p=$this->dispatches->paginate($request);$p->getCollection()->transform(fn($d)=>$this->data($d));return $this->paginated('Dispatches fetched successfully',$p);}
    public function store(DispatchRequest $request):JsonResponse{return $this->ok('Dispatch created successfully',$this->data($this->dispatches->create($request->validated(),$request->user())),[],201);}
    public function show(int|string $id):JsonResponse{return $this->ok('Dispatch fetched successfully',$this->data($this->dispatches->find($id)));}
    public function update(DispatchRequest $request,int|string $id):JsonResponse{$dispatch=$this->dispatches->find($id);return $this->ok('Dispatch updated successfully',$this->data($this->dispatches->update($dispatch,$request->validated())));}
    public function uploadInvoice(DispatchInvoiceRequest $request,int|string $id):JsonResponse
    {
        $dispatch=$this->dispatches->find($id);
        if($dispatch->status==='dispatched'||$dispatch->invoice_path)throw ValidationException::withMessages(['invoice'=>['An invoice cannot be replaced after it is uploaded or dispatched.']]);
        PublicAsset::delete($dispatch->invoice_path);
        $dispatch->update(['invoice_path'=>PublicAsset::store($request->file('invoice'),'uploads/dispatches/invoices'),'status'=>'invoiced']);
        return $this->ok('Invoice uploaded and dispatch marked as invoiced',$this->data($this->dispatches->find($id)));
    }

    public function reopen(int|string $id):JsonResponse
    {
        $dispatch=$this->dispatches->find($id);
        if($dispatch->status!=='invoiced')throw ValidationException::withMessages(['status'=>['Only an invoiced dispatch can be changed back to NEW.']]);
        PublicAsset::delete($dispatch->invoice_path);
        $dispatch->update(['status'=>'new','invoice_path'=>null]);
        return $this->ok('Dispatch changed back to NEW',$this->data($this->dispatches->find($id)));
    }
}
