<?php

namespace App\Http\Controllers\Api\Leads;

use App\Http\Controllers\Api\ApiController;
use App\Models\Lead;
use App\Services\LeadWhatsappFollowUpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class LeadWhatsappFollowUpController extends ApiController
{
    public function __construct(private LeadWhatsappFollowUpService $followUps) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        return $this->ok('Due WhatsApp follow-ups fetched', $this->followUps->due($request->user()));
    }

    public function store(Request $request, Lead $lead): JsonResponse
    {
        $this->authorizeToken($request);
        $data = $request->validate(['message' => ['nullable', 'string', 'max:5000']]);

        return $this->ok('WhatsApp follow-up recorded', $this->followUps->record($request->user(), $lead, $data['message'] ?? null));
    }

    private function authorizeToken(Request $request): void
    {
        $token = $request->user()?->currentAccessToken();
        abort_unless(
            $request->bearerToken()
            && $token instanceof PersonalAccessToken
            && in_array('leads:write', $token->abilities ?? [], true)
            && ! in_array('*', $token->abilities ?? [], true),
            403,
            'A lead API token is required.'
        );
    }
}
