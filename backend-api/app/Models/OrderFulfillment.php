<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderFulfillment extends Model
{
    public const STATUSES = ['stock_ready', 'ordered', 'received', 'packed', 'dispatched'];
    public const READY_STATUSES = ['stock_ready', 'packed', 'dispatched'];

    protected $fillable = ['quotation_item_id', 'stock_status', 'stock_comment'];
}
