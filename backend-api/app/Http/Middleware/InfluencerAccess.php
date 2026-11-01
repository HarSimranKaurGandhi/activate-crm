<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Influencer;
use App\Models\User;
use App\Support\ApiResponse;

class InfluencerAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user=$request->user();
        if (!$user?->hasAnyRole(['influencer'])) return $next($request);
        $influencer=Influencer::query()->where('user_id',$user->id)->where('is_active',true)->first();
        abort_unless($user->is_active && $influencer,403,'Influencer account is inactive or not linked.');
        $request->attributes->set('influencer', $influencer);
        $path=trim($request->path(),'/');
        $method=$request->method();
        if ($method==='GET' && $path==='api/users/dropdown') {
            $manager=User::query()->whereKey($influencer->assigned_to)->first(['id','name','email','phone']);
            return ApiResponse::success('Sales contact fetched', $manager ? [$manager] : []);
        }
        $reads=[
            '#^api/tags$#',
            '#^api/leads(?:/\\d+(?:/(?:activity|quotations))?)?$#',
            '#^api/quotations(?:/defaults|/\\d+(?:/(?:preview|pdf|items/\d+/image))?)?$#',
            '#^api/(?:categories|brands|terms|adjustments)(?:/dropdown)?$#',
            '#^api/products/selectable$#',
            '#^api/settings/(?:company|bank-details|quotation-numbering)$#',
        ];
        $allowed=$method==='GET' && collect($reads)->contains(fn ($pattern)=>preg_match($pattern,$path)===1);
        $allowed=$allowed || ($method==='POST' && ($path==='api/influencer/leads' || $path==='api/quotations' || preg_match('#^api/leads/\\d+/comments$#',$path)));
        abort_unless($allowed,403,'Influencers may only view their leads, add updates, and generate quotations for their leads.');
        return $next($request);
    }
}
