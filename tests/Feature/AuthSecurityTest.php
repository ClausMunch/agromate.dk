<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as OAuthUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
class AuthSecurityTest extends TestCase {
 use RefreshDatabase;
 protected function configured():void {config(['services.google'=>['client_id'=>'test-client','client_secret'=>'test-secret','redirect'=>'http://localhost/auth/google/callback']]);}
 public function test_invalid_oauth_state_is_rejected_without_account_creation():void {
  $this->configured();$this->get('/auth/google')->assertRedirect();
  $this->get('/auth/google/callback?code=fake&state=incorrect')->assertStatus(400);$this->assertDatabaseCount('users',0);
 }
 public function test_identity_uses_subject_not_email_and_regenerates_session():void {
  $this->configured();$existing=User::create(['provider'=>'google','provider_subject'=>'first']);
  $provider=\Mockery::mock(\Laravel\Socialite\Contracts\Provider::class);
  $identity=(new OAuthUser)->setRaw([])->map(['id'=>'second','email'=>'same@example.test','name'=>'Private Name']);
  $provider->shouldReceive('user')->once()->andReturn($identity);Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
  $this->getJson('/api/session');$old=session()->getId();
  $this->get('/auth/google/callback?code=test&state=test')->assertRedirect('/');
  $this->assertDatabaseCount('users',2);$this->assertNotEquals($old,session()->getId());
  $session=$this->getJson('/api/session');$session->assertJsonPath('user.leaderboard_opt_in',false)->assertJsonMissing(['public_name'=>'Private Name']);
  $this->assertNotEquals($existing->id,$session->json('user.id'));
  $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('users','email'));
  $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('users','password'));
 }
 public function test_real_csrf_middleware_rejects_missing_and_bad_token_accepts_valid_token():void {
  // Laravel normally skips CSRF while running unit tests. Switch only the application environment.
  $this->app->instance('env','local');
  $user=User::create(['provider'=>'google','provider_subject'=>'csrf']);$this->actingAs($user)->withHeader('X-Account-ID',(string)$user->id);
  $token=$this->getJson('/api/session')->json('csrf_token');
  $this->patchJson('/api/profile',['public_name'=>'Farmer','leaderboard_opt_in'=>false])->assertStatus(419);
  $this->withHeader('X-CSRF-TOKEN','invalid')->postJson('/api/logout')->assertStatus(419);
  $this->withHeader('X-CSRF-TOKEN',$token)->patchJson('/api/profile',['public_name'=>'Farmer','leaderboard_opt_in'=>false])->assertOk();
 }
 public function test_session_cookie_security_defaults():void {
  config(['session.secure'=>true]);$response=$this->getJson('/api/session');
  $cookies=$response->headers->getCookies();$session=array_values(array_filter($cookies,fn($c)=>$c->getName()===config('session.cookie')))[0];
  $this->assertTrue($session->isSecure());$this->assertTrue($session->isHttpOnly());$this->assertSame('lax',$session->getSameSite());
 }
}
