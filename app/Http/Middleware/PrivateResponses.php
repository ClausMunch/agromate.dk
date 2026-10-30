<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class PrivateResponses {
 public function handle(Request $request, Closure $next) {
  if ($request->is('api/*') && (strlen($request->getContent())>32768 || (int)$request->header('Content-Length',0)>32768)) return response()->json(['error'=>'payload_too_large'],413);
  $response=$next($request);
  if ($request->is('api/*') || $request->is('auth/*')) $response->headers->set('Cache-Control','no-store, private');
  $response->headers->set('X-Content-Type-Options','nosniff');$response->headers->set('Referrer-Policy','same-origin');
  return $response;
 }
}
