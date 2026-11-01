<?php
namespace App\Services;
use App\Models\{ActivityLog, SparePartRequest};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Arr;

class OemRequestTimeline
{
    public function snapshot(SparePartRequest $row): array
    {
        $row->load('oem','customer','serviceRequest');
        return [
            'request_date'=>$row->created_at?->toDateString(), 'status'=>$row->status,
            'request_name'=>$row->spare_part_name, 'machine'=>$row->machine_name, 'quantity'=>$row->quantity,
            'description'=>$row->reason, 'request_category'=>$row->request_category, 'claim_amount'=>$row->claim_amount,
            'coverage'=>$row->request_type, 'oem'=>$row->oem?->name ?: 'Unassigned',
            'customer'=>$row->customer_name, 'service_request'=>$row->serviceRequest?->service_number,
            'serial_number'=>$row->serial_number, 'invoice_number'=>$row->invoice_number, 'invoice_image'=>$row->invoice_image_path,
            'purchase_date'=>$row->purchase_date, 'image'=>$row->imagePaths(), 'video'=>$row->video_path, 'estimated_completion_date'=>$row->estimated_completion_date,
        ];
    }
    public function record(SparePartRequest $row, Request $request, string $action, array $before = [], ?string $comment = null): void
    {
        $after = $action === 'commented' ? [] : $this->snapshot($row);
        if ($action === 'updated') {
            $after = array_filter($after, fn ($value,$key) => ($before[$key] ?? null) != $value, ARRAY_FILTER_USE_BOTH);
            if (!$after) return;
            $before = Arr::only($before,array_keys($after));
        }
        $description = $comment ?? ($action === 'created' ? 'OEM request created.' : 'Updated '.implode(', ',array_map(fn($key)=>str_replace('_',' ',$key),array_keys($after))).'.');
        $actor=$request->user();
        if ($actor) $after['_actor']=['id'=>$actor->id,'name'=>$actor->name,'email'=>$actor->email];
        $after['_description']=$description;
        $columns=Schema::getColumnListing('activity_logs');
        $log=new ActivityLog(Arr::only(['module'=>'services','entity_type'=>'oem_request','entity_id'=>$row->id,
            'action'=>$action,'description'=>$description,'old_values'=>$before,'new_values'=>$after,
            'user_id'=>$actor?->id,'created_by'=>$actor?->id,'ip_address'=>$request->ip()],$columns));
        $log->timestamps=in_array('created_at',$columns) && in_array('updated_at',$columns);
        $log->save();
    }
    public function entries(SparePartRequest $row)
    {
        $entries=ActivityLog::where('module','services')->where('entity_type','oem_request')->where('entity_id',$row->id)
            ->latest('created_at')->latest('id')->get()->map(function($log) {
                $new=$log->new_values ?? []; $actor=$new['_actor'] ?? null;
                $description=$log->description ?: ($new['_description'] ?? '');
                unset($new['_actor'],$new['_description']);
                return ['id'=>$log->id,'action'=>$log->action,'description'=>$description,'old_values'=>$log->old_values ?? [],'new_values'=>$new,'actor'=>$actor,'occurred_at'=>$log->created_at?->toISOString()];
            });
        if (!$entries->contains('action','created')) $entries->push(['id'=>'created','action'=>'created','description'=>'OEM request created.','old_values'=>[],'new_values'=>[],'actor'=>null,'occurred_at'=>$row->created_at?->toISOString()]);
        return $entries;
    }
}
