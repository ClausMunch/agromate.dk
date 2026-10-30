<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class AccountController
{
    public static function loginAvailable(): bool
    {
        foreach (['client_id', 'client_secret', 'redirect'] as $key) {
            $value = config("services.google.$key");
            if (!is_string($value) || trim($value) === '') {
                return false;
            }
        }
        return true;
    }

    public function session(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => $user ? [
                'id' => $user->id,
                'public_name' => $user->public_name,
                'leaderboard_opt_in' => $user->leaderboard_opt_in,
            ] : null,
            'csrf_token' => $request->session()->token(),
            'login_available' => self::loginAvailable(),
        ]);
    }

    public function profile(Request $request)
    {
        $data = $request->validate([
            'public_name' => ['required', 'string', 'max:24', 'regex:/^[\pL\pN _.-]+$/u'],
            'leaderboard_opt_in' => ['required', function ($attribute, $value, $fail) {
                if (!is_bool($value)) {
                    $fail('Must be a JSON boolean.');
                }
            }],
        ]);
        if (array_diff(array_keys($request->all()), ['public_name', 'leaderboard_opt_in'])) {
            throw ValidationException::withMessages(['request' => 'Unknown request keys.']);
        }
        $request->user()->update($data);
        return $this->session($request);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['ok' => true]);
    }

    public function delete(Request $request)
    {
        $id = $request->user()->id;
        DB::transaction(function () use ($id) {
            // Use the same owner lock as saves, including concurrent account deletion.
            DB::table('users')->where('id', $id)->lockForUpdate()->firstOrFail();
            DB::table('users')->where('id', $id)->delete();
            DB::table('sessions')->where('user_id', $id)->delete();
        });
        return $this->logout($request);
    }

    public function callback(Request $request)
    {
        abort_unless(self::loginAvailable(), 503);
        try {
            // Stateful Socialite checks and consumes the session OAuth state before contacting Google.
            $identity = Socialite::driver('google')->user();
        } catch (InvalidStateException $exception) {
            return response('Invalid OAuth state. Please start sign-in again.', 400);
        } catch (\Throwable $exception) {
            // Provider responses may contain credentials; never log or echo them.
            return response('Google sign-in is unavailable. Please try again.', 502);
        }
        $subject = $identity->getId();
        if (!is_string($subject) || $subject === '' || strlen($subject) > 255) {
            return response('Invalid provider identity.', 400);
        }
        // Email and provider profile names are deliberately not copied or used for linking.
        $user = User::firstOrCreate(['provider' => 'google', 'provider_subject' => $subject]);
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->regenerateToken();
        return redirect('/');
    }
}
