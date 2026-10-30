<?php
namespace Tests\Feature;
use Tests\TestCase;
class HeadersTest extends TestCase {
 public function test_session_cannot_be_cached_or_read_via_cross_origin_cors():void {
  $this->getJson('/api/session',['Origin'=>'https://untrusted.example'])->assertHeader('Cache-Control','no-store, private')->assertHeaderMissing('Access-Control-Allow-Origin');
 }
}
