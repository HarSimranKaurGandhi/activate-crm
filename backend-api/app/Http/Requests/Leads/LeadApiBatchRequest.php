<?php

namespace App\Http\Requests\Leads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LeadApiBatchRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function validationData(): array
    {
        $data=parent::validationData();
        return array_is_list($data)?['leads'=>$data]:$data;
    }

    public function rules(): array
    {
        return [
            'leads'=>['required','array','min:1','max:100'],
            'leads.*.lead_source'=>['nullable',Rule::in(['walk_in','reference','india_mart','website','johnson','hercules','affiliate'])],
            'leads.*.name'=>['nullable','string','max:255'],
            'leads.*.phone'=>['nullable','digits:10','required_without:leads.*.email'],
            'leads.*.email'=>['nullable','email','max:255','required_without:leads.*.phone'],
            'leads.*.address_line_1'=>['nullable','string','max:255'],'leads.*.address_line_2'=>['nullable','string','max:255'],
            'leads.*.city'=>['nullable','string','max:100'],'leads.*.state'=>['nullable','string','max:100'],'leads.*.pincode'=>['nullable','string','max:20'],'leads.*.country'=>['nullable','string','max:100'],
            'leads.*.requirement'=>['required','string','max:5000'],
            'leads.*.expected_order_value'=>['nullable',Rule::in(['Less Than 1L','1L-5L','5L-10L','10L-30L','30L+'])],
            'leads.*.expected_closure'=>['nullable',Rule::in(['10 days','20 days','30 days','90 days'])],
            'leads.*.status'=>['nullable',Rule::in(['new','enquiry','in_progress','on_hold','order_confirmed','closed_success','closed_fail'])],
            'leads.*.tags'=>['nullable','array'],'leads.*.tags.*'=>[Rule::in(['hot','premium'])],
            'leads.*.customer_importance'=>['nullable','string',Rule::in(['UVIP','VIP','IMP'])],
            'leads.*.customer_category'=>['nullable','string',Rule::in(['GYM OWNER','GOVT OFFICIAL','BUILDER','CORPORATE','DEALER'])],
            'leads.*.follow_up_date'=>['nullable','date'],'leads.*.assigned_to'=>['nullable','integer','exists:users,id'],
            'leads.*.assigned_user'=>['nullable','string','max:20'],
        ];
    }
}
