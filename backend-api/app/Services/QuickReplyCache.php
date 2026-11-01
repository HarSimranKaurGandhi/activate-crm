<?php
namespace App\Services;

use App\Models\QuickReply;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class QuickReplyCache
{
    private const VERSION_KEY = 'quick_replies:version';

    public static function all(): array
    {
        $version = Cache::get(self::VERSION_KEY, 'initial');
        return Cache::remember('quick_replies:list:'.$version, now()->addHours(4),
            fn () => QuickReply::orderBy('id')->get()->toArray());
    }

    public static function invalidate(): void
    {
        // A new key prevents an older in-flight read from restoring stale results.
        Cache::forever(self::VERSION_KEY, (string) Str::uuid());
    }
}
