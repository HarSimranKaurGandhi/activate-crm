<?php

namespace App\Services;

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class AuthService
{
    private ?bool $supportsLoginLogTimestamps = null;

    public function login(array $credentials, Request $request): array
    {
        $user = User::query()
            ->with('role')
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! $this->passwordMatches($user, $credentials['password'])) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account is inactive. Please contact an administrator.'],
            ]);
        }

        $token = $user->createToken('react-api')->plainTextToken;

        if ($this->supportsLoginLogTimestamps()) {
            try {
                LoginLog::create([
                    'user_id' => $user->id,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'log_in_at' => now(),
                ]);
            } catch (Throwable $exception) {
                // Do not block successful login if optional activity-log schema differs.
                Log::warning('Login log insert failed', [
                    'user_id' => $user->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ];
    }

    public function profile(User $user): User
    {
        return $user->load('role');
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();

        if (! $this->supportsLoginLogTimestamps()) {
            return;
        }

        $loginLog = LoginLog::query()
            ->where('user_id', $user->id)
            ->whereNull('log_out_at')
            ->latest('log_in_at')
            ->first();

        $loginLog?->update(['log_out_at' => now()]);
    }

    private function passwordMatches(User $user, string $plainPassword): bool
    {
        $storedPassword = (string) $user->password;
        $passwordInfo = password_get_info($storedPassword);

        if (($passwordInfo['algoName'] ?? 'unknown') !== 'unknown') {
            try {
                return Hash::check($plainPassword, $storedPassword);
            } catch (RuntimeException) {
                return false;
            }
        }

        if (! hash_equals($storedPassword, $plainPassword)) {
            return false;
        }

        $user->forceFill([
            'password' => Hash::make($plainPassword),
        ])->save();

        return true;
    }

    private function supportsLoginLogTimestamps(): bool
    {
        if ($this->supportsLoginLogTimestamps !== null) {
            return $this->supportsLoginLogTimestamps;
        }

        $this->supportsLoginLogTimestamps = Schema::hasTable('login_logs')
            && Schema::hasColumn('login_logs', 'log_in_at')
            && Schema::hasColumn('login_logs', 'log_out_at');

        return $this->supportsLoginLogTimestamps;
    }
}
