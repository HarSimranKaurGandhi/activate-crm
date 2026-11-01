<?php
namespace App\Http\Controllers\Api;

use App\Models\{Quotation, QuotePayment};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Storage};
use Illuminate\Validation\Rule;

class QuotePaymentController extends ApiController
{
    public function __construct()
    {
        $this->middleware(function (Request $request, \Closure $next) {
            $user = $request->user();
            $permission = $user?->modulePermissions()->where('module', 'billing')->where('can_view', true);
            if (! $request->isMethod('GET')) $permission?->where('can_edit', true);
            abort_unless($user && ($user->hasAnyRole(['admin']) || $permission?->exists()), 403, 'You do not have permission for this billing action.');
            return $next($request);
        });
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'search'=>['nullable','string','max:100'], 'payment_status'=>['nullable',Rule::in(['pending','received'])],
            'per_page'=>['sometimes','integer','min:1','max:100'], 'page'=>['sometimes','integer','min:1'],
        ]);
        $quotes = DB::table('quotations as q')->leftJoin('quote_payments as p','p.quotation_id','=','q.id')
            ->where('q.status','executed')
            ->selectRaw("q.id, 'quotation' as source, q.quotation_number as quote_number, q.grand_total as amount, COALESCE(p.payment_status, 'pending') as payment_status, q.created_at");
        $custom = DB::table('quote_payments')->whereNull('quotation_id')
            ->selectRaw("id, 'custom' as source, quote_number, amount, payment_status, created_at");
        $query = DB::query()->fromSub($quotes->unionAll($custom), 'payments');
        if (!empty($data['search'])) $query->where('quote_number','like','%'.$data['search'].'%');
        if (!empty($data['payment_status'])) $query->where('payment_status',$data['payment_status']);
        $page = $query->orderByRaw("CASE WHEN payment_status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')->orderBy('source')->orderByDesc('id')->paginate($data['per_page'] ?? 20);
        $page->getCollection()->transform(fn ($row) => (array) $row);
        return $this->paginated('Quote payments fetched', $page);
    }

    public function status(Request $request, string $source, int $id)
    {
        abort_unless(in_array($source,['quotation','custom'],true),404);
        $data = $request->validate(['payment_status'=>['required',Rule::in(['pending','received'])]]);
        $payment = DB::transaction(function () use ($request,$source,$id,$data) {
            if ($source === 'quotation') {
                Quotation::where('status','executed')->lockForUpdate()->findOrFail($id);
                return QuotePayment::updateOrCreate(['quotation_id'=>$id], $data + ['updated_by'=>$request->user()->id]);
            }
            $payment = QuotePayment::whereNull('quotation_id')->lockForUpdate()->findOrFail($id);
            $payment->update($data + ['updated_by'=>$request->user()->id]);
            return $payment;
        });
        return $this->ok('Payment status updated', ['payment_status'=>$payment->payment_status]);
    }

    public function store(Request $request)
    {
        if (is_string($request->input('quote_number'))) $request->merge(['quote_number'=>trim($request->input('quote_number'))]);
        $data = $request->validate([
            'quote_number'=>['required','string','max:100',Rule::unique('quote_payments','quote_number'),Rule::unique('quotations','quotation_number')],
            'amount'=>['required','numeric','min:0','max:999999999999.99','decimal:0,2'],
            'payment_status'=>['required',Rule::in(['pending','received'])],
            'pdf'=>['required','file','mimes:pdf','extensions:pdf','max:10240'],
        ]);
        $path = null;
        try {
            $payment = DB::transaction(function () use ($request,$data,&$path) {
                $file = $request->file('pdf');
                $path = $file->store('quote-payments', 'local');
                if (!$path) throw new \RuntimeException('Unable to store PDF.');
                return QuotePayment::create([
                    'quote_number'=>$data['quote_number'], 'amount'=>$data['amount'], 'payment_status'=>$data['payment_status'],
                    'file_path'=>$path, 'file_name'=>mb_substr(basename($file->getClientOriginalName()),0,255), 'updated_by'=>$request->user()->id,
                ]);
            });
        } catch (\Throwable $error) {
            if ($path) Storage::disk('local')->delete($path);
            throw $error;
        }
        return $this->ok('Custom quotation uploaded', $payment, [], 201);
    }

    public function download(int $id)
    {
        $payment = QuotePayment::whereNull('quotation_id')->findOrFail($id);
        abort_unless($payment->file_path && Storage::disk('local')->exists($payment->file_path),404);
        return Storage::disk('local')->download($payment->file_path,$payment->file_name,['X-Content-Type-Options'=>'nosniff']);
    }
}
