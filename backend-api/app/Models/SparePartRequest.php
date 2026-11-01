<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SparePartRequest extends Model {
    public function imagePaths(): array { return $this->image_paths ?? ($this->image_path ? [$this->image_path] : []); }
    public function oem() { return $this->belongsTo(Oem::class); }
    protected $casts = ['claim_amount' => 'decimal:2', 'image_paths' => 'array'];
    protected $guarded = ['id'];
    public function serviceRequest() { return $this->belongsTo(ServiceRequest::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
}
