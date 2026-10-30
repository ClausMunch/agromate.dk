<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
class ProfileTest extends TestCase {
 use RefreshDatabase;
 public function test_opt_in_defaults_profile_privacy_and_delete():void {
  $user=User::create(['provider'=>'google','provider_subject'=>'private-subject']);
  $this->actingAs($user)->withHeader('X-Account-ID',(string)$user->id);
  $this->getJson('/api/session')->assertJsonPath('user.leaderboard_opt_in',false)->assertJsonMissing(['provider_subject'=>'private-subject']);
  $this->putJson('/api/save',['revision'=>0,'state'=>array_merge(SaveTest::state(),['earned'=>1234])])->assertOk();
  $this->getJson('/api/leaderboard')->assertExactJson(['entries'=>[]]);
  $this->patchJson('/api/profile',['public_name'=>'Kind farmer','leaderboard_opt_in'=>true])->assertOk();
  $this->getJson('/api/leaderboard')->assertExactJson(['entries'=>[['public_name'=>'Kind farmer','score'=>1234]]]);
  $this->patchJson('/api/profile',['public_name'=>'<script>','leaderboard_opt_in'=>true])->assertUnprocessable();
  $this->patchJson('/api/profile',['public_name'=>'','leaderboard_opt_in'=>true])->assertUnprocessable();
  $this->deleteJson('/api/account')->assertOk();$this->assertDatabaseCount('users',0);$this->assertDatabaseCount('cloud_saves',0);$this->getJson('/api/session')->assertJsonPath('user',null);
 }
 public function test_logout_invalidates_session_and_csrf():void {
  $user=User::create(['provider'=>'google','provider_subject'=>'one']);$this->actingAs($user)->withHeader('X-Account-ID',(string)$user->id);
  $token=$this->getJson('/api/session')->json('csrf_token');$this->postJson('/api/logout')->assertOk();
  $this->getJson('/api/session')->assertJsonPath('user',null);$this->assertNotEquals($token,session()->token());$this->getJson('/api/save')->assertUnauthorized();
 }
}
