<?php
namespace App\Http\Controllers\Api\Masters;
use App\Http\Controllers\Api\ApiController;
use App\Models\QuickReply;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
class QuickReplyController extends ApiController
{
    public function index() { return $this->ok('Quick replies fetched', \App\Services\QuickReplyCache::all()); }
    private function data(Request $request, ?int $id = null): array {
        if (is_string($request->input('name'))) $request->merge(['name'=>trim($request->input('name'))]);
        return $request->validate(['name'=>['required','string','max:255',Rule::unique('quick_replies','name')->ignore($id)]]);
    }
    public function store(Request $request) { return $this->ok('Quick reply added', QuickReply::create($this->data($request)), [], 201); }
    public function update(Request $request, int $id) {
        $reply=QuickReply::findOrFail($id); $reply->update($this->data($request,$id));
        return $this->ok('Quick reply updated', $reply);
    }
    public function destroy(int $id) { QuickReply::findOrFail($id)->delete(); return $this->ok('Quick reply removed'); }
}
