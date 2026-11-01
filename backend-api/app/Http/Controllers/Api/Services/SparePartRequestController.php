<?php
namespace App\Http\Controllers\Api\Services;
use App\Http\Controllers\Api\ApiController;
use App\Models\SparePartRequest;
use App\Models\ServiceRequest;
use App\Models\Customer;
use App\Support\PublicAsset;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Services\OemRequestTimeline;

class SparePartRequestController extends ApiController {
    public function index(Request $request) {
        $data = $request->validate([
            'service_request_id' => ['nullable','integer','exists:service_requests,id'],
            'include_closed' => ['sometimes','boolean'],
            'oem_id' => ['nullable','integer','exists:oems,id'],
            'unassigned' => ['sometimes','boolean'],
            'search' => ['nullable','string','max:255'],
            'page' => ['sometimes','integer','min:1'],
            'per_page' => ['sometimes','integer','min:1','max:100'],
        ]);
        $query = SparePartRequest::with(['oem:id,name,email', 'serviceRequest:id,service_number', 'customer:id,primary_name,company_name'])
            ->when($data['oem_id'] ?? null, fn($q, $id) => $q->where('oem_id', $id))
            ->when($request->boolean('unassigned'), fn($q) => $q->whereNull('oem_id'))
            ->when(!$request->boolean('include_closed'), fn($q) => $q->where('status','pending'))
            ->when($data['service_request_id'] ?? null, fn($q,$id) => $q->where('service_request_id',$id))
            ->when($data['search'] ?? null, fn($q,$search) => $q->where(function($q) use ($search) {
                $q->where('spare_part_name','like',"%{$search}%")->orWhere('machine_name','like',"%{$search}%")
                  ->orWhere('customer_name','like',"%{$search}%")
                  ->orWhereHas('serviceRequest',fn($q)=>$q->where('service_number','like',"%{$search}%"));
            }))->latest('id');
        $query->addSelect(['last_comment_values' => \App\Models\ActivityLog::select('new_values')
            ->whereColumn('entity_id', 'spare_part_requests.id')->where('module', 'services')
            ->where('entity_type', 'oem_request')->where('action', 'commented')
            ->orderByDesc('created_at')->orderByDesc('id')->limit(1)]);
        $rows = $query->paginate($data['per_page'] ?? 20);
        $rows->getCollection()->transform(fn($row) => $this->serialize($row));
        return $this->paginated('OEM requests fetched', $rows);
    }
    public function show(int $id) {
        return $this->ok('OEM request fetched', $this->serialize(SparePartRequest::with(['oem', 'customer', 'serviceRequest.customer'])->findOrFail($id)));
    }
    public function activity(int $id) {
        return $this->ok('OEM timeline fetched', app(OemRequestTimeline::class)->entries(SparePartRequest::findOrFail($id)));
    }
    public function comment(Request $request, int $id) {
        $request->merge(['comment'=>is_string($request->input('comment')) ? trim($request->input('comment')) : $request->input('comment')]);
        $data=$request->validate(['comment'=>['required','string','max:5000']]);
        DB::transaction(function () use ($request,$id,$data) {
            $row=SparePartRequest::lockForUpdate()->findOrFail($id);
            app(OemRequestTimeline::class)->record($row,$request,'commented',[],$data['comment']);
        });
        return $this->ok('Comment added');
    }
    public function store(Request $request) {
        return $this->saveRequest($request);
    }
    public function update(Request $request, int $id) {
        return $this->saveRequest($request, SparePartRequest::findOrFail($id));
    }
    private function saveRequest(Request $request, ?SparePartRequest $existing = null) {
        if ($existing) {
            $request->mergeIfMissing($existing->only(['service_request_id', 'customer_id', 'oem_id', 'request_category', 'claim_amount', 'customer_owned_product_id', 'purchase_date']));
        }
        $data = $request->validate([
            'service_request_id' => ['nullable','integer','exists:service_requests,id'],
            'customer_id' => ['nullable','integer','exists:customers,id'],
            'oem_id' => ['nullable','integer','exists:oems,id'],
            'status' => ['sometimes','required',Rule::in(['pending','closed'])],
            'request_date' => ['sometimes','required','date_format:Y-m-d','before_or_equal:today'],
            'spare_part_name' => ['required','string','max:255'],
            'customer_owned_product_id' => ['nullable','integer','exists:customer_owned_products,id'],
            'purchase_date' => ['nullable','date_format:Y-m-d','before_or_equal:today'],
            'serial_number' => ['nullable','string','max:255'],
            'invoice_number' => ['nullable','string','max:255'],
            'invoice_image' => ['nullable','image','mimes:jpg,jpeg,png,webp','extensions:jpg,jpeg,png,webp','max:5120'],
            'remove_invoice_image' => ['sometimes','boolean'],
            'machine_name' => ['required','string','max:255'],
            'quantity' => ['required','integer','min:1','max:1000000'],
            'reason' => ['required','string','max:5000'],
            'request_category' => ['sometimes','required',Rule::in(['spare_part','claim'])],
            'claim_amount' => ['exclude_unless:request_category,claim','required','numeric','decimal:0,2','gt:0','max:9999999999.99'],
            'request_type' => ['required',Rule::in(['in_warranty','chargeable'])],
            'estimated_completion_date' => ['sometimes','nullable','date_format:Y-m-d'],
            'video' => ['nullable','file','mimetypes:video/mp4,video/webm,video/quicktime','extensions:mp4,webm,mov','max:5119'],
            'remove_video' => ['sometimes','boolean'],
            'images' => ['sometimes','array','max:4'],
            'images.*' => ['required','image','mimes:jpg,jpeg,png,webp','extensions:jpg,jpeg,png,webp','max:5120'],
            'remove_images' => ['sometimes','array','max:4'],
            'remove_images.*' => ['required','string','distinct'],
            'image' => ['nullable','image','mimes:jpg,jpeg,png,webp','extensions:jpg,jpeg,png,webp','max:5120'],
        ]);
        unset($data['invoice_image'], $data['remove_invoice_image'], $data['image'], $data['images'], $data['remove_images'], $data['video'], $data['remove_video']);
        if (isset($data['request_date'])) {
            $data['created_at'] = \Illuminate\Support\Carbon::parse($data['request_date'], config('app.timezone'))
                ->setTimeFrom($existing?->created_at ?? now());
            unset($data['request_date']);
        }
        if (!$existing) $data['status'] = $data['status'] ?? 'pending';
        $data['request_category'] = $data['request_category'] ?? 'spare_part';
        if ($data['request_category'] !== 'claim') $data['claim_amount'] = null;
        $service = !empty($data['service_request_id']) ? ServiceRequest::with('customer')->findOrFail($data['service_request_id']) : null;
        $customer = $service ? $service->customer : (!empty($data['customer_id']) ? Customer::findOrFail($data['customer_id']) : null);
        if ($service) $data['customer_id'] = $service->customer_id;
        $data['customer_name'] = $customer ? ($customer->company_name ?: $customer->primary_name) : $service?->temporary_customer_name;
        if (!empty($data['customer_owned_product_id'])) {
            $owned=\App\Models\CustomerOwnedProduct::with('product')->findOrFail($data['customer_owned_product_id']);
            if (!$customer || (int)$owned->customer_id !== (int)$customer->id) {
                throw \Illuminate\Validation\ValidationException::withMessages(['customer_owned_product_id'=>'Choose a product owned by the selected customer.']);
            }
            $data['machine_name']=$owned->product?->model_number ?: ($owned->product?->product_name ?: $owned->product_description);
        }
        if (!$existing) $data['created_by'] = $request->user()->id;
        $uploaded = []; $removed = [];
        try {
            $row = DB::transaction(function () use ($existing,$data,$request,&$uploaded,&$removed) {
                $timeline=app(OemRequestTimeline::class);
                $row=$existing ? SparePartRequest::lockForUpdate()->findOrFail($existing->id) : null;
                $before=$row ? $timeline->snapshot($row) : [];
                $paths=$row?->imagePaths() ?? [];
                $removed=$request->input('remove_images', []);
                if (array_diff($removed,$paths)) throw \Illuminate\Validation\ValidationException::withMessages(['remove_images'=>'Select only images belonging to this request.']);
                $files=$request->file('images', []);
                if ($request->hasFile('image')) { $removed=$paths; $files[]=$request->file('image'); }
                $paths=array_values(array_diff($paths,$removed));
                if (count($paths)+count($files)>4) throw \Illuminate\Validation\ValidationException::withMessages(['images'=>'A maximum of four images is allowed. Remove an image before adding another.']);
                foreach ($files as $file) {
                    $path=PublicAsset::store($file,'uploads/spare-part-requests');
                    $uploaded[]=$path; $paths[]=$path;
                }
                if ($request->boolean('remove_video') || $request->hasFile('video')) {
                    if ($row?->video_path) $removed[]=$row->video_path;
                    $data['video_path']=null;
                }
                if ($request->hasFile('video')) {
                    $data['video_path']=PublicAsset::store($request->file('video'),'uploads/spare-part-requests');
                    $uploaded[]=$data['video_path'];
                }
                if ($request->boolean('remove_invoice_image') || $request->hasFile('invoice_image')) {
                    if ($row?->invoice_image_path) $removed[]=$row->invoice_image_path;
                    $data['invoice_image_path']=null;
                }
                if ($request->hasFile('invoice_image')) {
                    $data['invoice_image_path']=PublicAsset::store($request->file('invoice_image'),'uploads/spare-part-requests');
                    $uploaded[]=$data['invoice_image_path'];
                }
                $data['image_paths']=$paths; $data['image_path']=$paths[0] ?? null;
                if ($row) $row->update($data); else $row=SparePartRequest::create($data);
                $timeline->record($row,$request,$existing ? 'updated' : 'created',$before);
                return $row;
            });
        } catch (\Throwable $error) {
            foreach ($uploaded as $path) PublicAsset::delete($path);
            throw $error;
        }
        foreach ($removed as $path) PublicAsset::delete($path);
        return $this->ok($existing ? 'OEM request updated' : 'OEM request created', $this->serialize($row->load('serviceRequest.customer','customer','oem')), [], $existing ? 200 : 201);
    }
    public function assign(Request $request, int $id) {
        $data = $request->validate(['oem_id'=>['present','nullable','integer','exists:oems,id']]);
        $row = DB::transaction(function () use ($id,$data,$request) {
            $row=SparePartRequest::lockForUpdate()->findOrFail($id);
            $timeline=app(OemRequestTimeline::class); $before=$timeline->snapshot($row);
            $row->update($data); $timeline->record($row,$request,'updated',$before);
            return $row;
        });
        return $this->ok('OEM assignment updated', $this->serialize($row->load('serviceRequest','customer','oem')));
    }
    public function destroy(int $id) {
        $row = SparePartRequest::findOrFail($id);
        $imagePaths = $row->imagePaths();
        if ($row->video_path) $imagePaths[]=$row->video_path;
        if ($row->invoice_image_path) $imagePaths[]=$row->invoice_image_path;
        $row->delete();
        foreach ($imagePaths as $path) PublicAsset::delete($path);

        return $this->ok('OEM request deleted successfully');
    }
    private function serialize(SparePartRequest $row): array {
        $commentValues = json_decode($row->getAttribute('last_comment_values') ?? 'null', true);
        $row->makeHidden('last_comment_values');
        $logDate = $row->created_at?->copy()->timezone(config('app.timezone'))->startOfDay();
        return [
            ...$row->toArray(),
            'customer_owned_product_id' => $row->customer_owned_product_id,
            'purchase_date' => $row->purchase_date,
            'last_comment' => $commentValues['_description'] ?? null,
            'request_date' => $logDate?->toDateString(),
            'days_overdue' => $logDate ? max(0, (int) $logDate->diffInDays(now()->startOfDay(), false)) : 0,
            'request_number' => 'SPR-'.str_pad((string)$row->id,6,'0',STR_PAD_LEFT),
            'invoice_image_url' => $row->invoice_image_path ? url($row->invoice_image_path) : null,
            'video_url' => $row->video_path ? url($row->video_path) : null,
            'images' => array_map(fn ($path) => ['path'=>$path, 'url'=>url($path)], $row->imagePaths()),
            'image_url' => $row->image_path ? url($row->image_path) : null,
        ];
    }
}
