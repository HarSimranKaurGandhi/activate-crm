<?php
namespace App\Http\Controllers\Api\Settings;
use App\Http\Controllers\Api\ApiController;
use App\Models\Oem;
use Illuminate\Http\Request;
class OemController extends ApiController {
    public function index() {
        return $this->ok('OEMs fetched', Oem::orderBy('name')->get());
    }
    public function store(Request $request) {
        return $this->ok('OEM added', Oem::create($this->validated($request)), [], 201);
    }
    public function update(Request $request, int $id) {
        $oem = Oem::findOrFail($id);
        $oem->update($this->validated($request));
        return $this->ok('OEM updated', $oem);
    }
    private function validated(Request $request): array {
        return $request->validate(['name'=>['required','string','max:255'], 'email'=>['required','email','max:255'], 'dealer_code'=>['nullable','string','max:255'], 'dealer_name'=>['nullable','string','max:255'], 'dealer_city'=>['nullable','string','max:255'], 'request_template'=>['nullable','string','max:20000']]);
    }
}
