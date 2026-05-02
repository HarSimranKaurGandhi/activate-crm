<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationTermResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'term_master_id' => $this->term_master_id,
            'title' => $this->title,
            'content' => $this->content,
            'display_order' => $this->display_order,
        ];
    }
}
