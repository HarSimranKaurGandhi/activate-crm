<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class QuickReply extends Model
{
    protected static function booted(): void
    {
        static::saved(fn () => \App\Services\QuickReplyCache::invalidate());
        static::deleted(fn () => \App\Services\QuickReplyCache::invalidate());
    }

    protected $fillable = ['name'];
}
