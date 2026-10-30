<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class AccountBound {
 public function handle(Request $request, Closure $next) {
  if (!$request->user()) return response()->json(['error'=>'unauthenticated'],401);
  if ($request->header('X-Account-ID') !== (string)$request->user()->id) return response()->json(['error'=>'account_changed'],409);
  return $next($request);
 }
}
