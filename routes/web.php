<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\SaveController;
use App\Http\Middleware\AccountBound;
use Illuminate\Support\Facades\Route;
use Laravel\Socialite\Facades\Socialite;

Route::get('/', fn () => response(
    file_get_contents(public_path('index.html')),
    200,
    ['Content-Type' => 'text/html; charset=UTF-8'],
));
Route::get('/api/session', [AccountController::class, 'session']);
Route::get('/auth/google', function () {
    abort_unless(AccountController::loginAvailable(), 503);
    return Socialite::driver('google')->redirect();
})->middleware('throttle:10,1,oauth-start:');
Route::get('/auth/google/callback', [AccountController::class, 'callback'])
    ->middleware('throttle:10,1,oauth-callback:');
Route::get('/api/leaderboard', [SaveController::class, 'leaderboard'])
    ->middleware('throttle:60,1,leaderboard:');

Route::middleware(AccountBound::class)->group(function () {
    Route::post('/api/logout', [AccountController::class, 'logout'])->middleware('throttle:10,1,logout:');
    Route::patch('/api/profile', [AccountController::class, 'profile'])->middleware('throttle:10,1,profile:');
    Route::delete('/api/account', [AccountController::class, 'delete'])->middleware('throttle:5,1,account-delete:');
    Route::get('/api/save', [SaveController::class, 'show'])->middleware('throttle:30,1,save-read:');
    Route::put('/api/save', [SaveController::class, 'store'])->middleware('throttle:30,1,save-write:');
});
