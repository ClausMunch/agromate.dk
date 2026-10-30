<?php
namespace Tests\Feature;
use Tests\TestCase;
class SessionTest extends TestCase {
 public function test_session_is_minimal_and_oauth_fails_closed(): void {
  $this->getJson('/api/session')->assertOk()->assertJsonPath('user',null)->assertJsonPath('login_available',false)->assertJsonStructure(['csrf_token']);
  $this->get('/auth/google')->assertStatus(503);
  $this->get('/auth/google/callback?code=fake&state=fake')->assertStatus(503);
 }
 public function test_root_preserves_static_game_and_asset(): void {
  $this->get('/')->assertOk()->assertSee('<meta property="og:',false)->assertSee('id="game"',false);
 }
}
