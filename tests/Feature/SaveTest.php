<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
class SaveTest extends TestCase {
 use RefreshDatabase;
 public static function state(): array { return ['version'=>1,'farmerName'=>'Farmer','day'=>1,'minutes'=>360,'money'=>250,'energy'=>100,'seeds'=>['parsnip'=>10,'carrot'=>0,'strawberry'=>0],'produce'=>['parsnip'=>0,'carrot'=>0,'strawberry'=>0],'selectedSeed'=>'parsnip','planted'=>0,'harvested'=>0,'earned'=>0,'questReward'=>false,'player'=>['x'=>489,'y'=>422],'tiles'=>array_fill(0,28,['tilled'=>false,'crop'=>null,'age'=>0,'watered'=>false])]; }
 protected function user(): User {return User::create(['provider'=>'google','provider_subject'=>bin2hex(random_bytes(8))]);}
 protected function bind(User $user): static {return $this->actingAs($user)->withHeader('X-Account-ID',(string)$user->id);}
 public function test_guest_cannot_read_or_write_save():void {$this->getJson('/api/save')->assertUnauthorized();$this->putJson('/api/save',['revision'=>0,'state'=>self::state()])->assertUnauthorized();}
 public function test_create_update_conflict_and_isolation():void {
  $a=$this->user();$b=$this->user();$this->bind($a)->getJson('/api/save')->assertJsonPath('save',null);
  $this->putJson('/api/save',['revision'=>0,'state'=>self::state()])->assertOk()->assertJsonPath('save.revision',1);
  $this->putJson('/api/save',['revision'=>0,'state'=>self::state()])->assertConflict()->assertJsonPath('error','revision_conflict');
  $this->putJson('/api/save',['revision'=>1,'state'=>ProgressionSaveTest::v2()])->assertOk()->assertJsonPath('save.revision',2);
  $this->bind($b)->getJson('/api/save')->assertJsonPath('save',null);
  $this->withHeader('X-Account-ID',(string)$a->id)->putJson('/api/save',['revision'=>0,'state'=>self::state()])->assertStatus(409);
  $this->bind($b)->putJson('/api/save',['revision'=>0,'state'=>self::state(),'user_id'=>$a->id])->assertUnprocessable();
  $this->bind($a)->getJson('/api/save')->assertJsonPath('save.revision',2);
 }
 public function test_strict_nested_validation_and_extremes():void {
  $this->bind($this->user());
  $cases=[['money',-1],['money',1e30],['money','250'],['version',2],['energy',101],['day',0],['minutes',1200],['farmerName',str_repeat('x',25)],['selectedSeed','evil'],['questReward',1],['player',['x'=>INF,'y'=>0]],['player',['x'=>961,'y'=>0]],['seeds',['parsnip'=>0,'carrot'=>0,'strawberry'=>0,'evil'=>2]],['tiles',[]]];
  foreach($cases as [$key,$value]) {$state=self::state();$state[$key]=$value;if($key==='player' && is_infinite($value['x'])) continue;$this->putJson('/api/save',['revision'=>0,'state'=>$state])->assertUnprocessable();}
  foreach([['extra'=>1],['crop'=>'evil'],['age'=>5],['tilled'=>1]] as $bad) {$state=self::state();$state['tiles'][0]=array_merge($state['tiles'][0],$bad);$this->putJson('/api/save',['revision'=>0,'state'=>$state])->assertUnprocessable();}
  $state=self::state();$state['extra']=true;$this->putJson('/api/save',['revision'=>0,'state'=>$state])->assertUnprocessable();
  $this->call('PUT','/api/save',[],[],[],['CONTENT_TYPE'=>'application/json','HTTP_ACCEPT'=>'application/json'],str_repeat(' ',40000))->assertStatus(413);
 }
 public function test_save_rate_limit():void {$this->bind($this->user());for($i=0;$i<31;$i++)$response=$this->getJson('/api/save');$response->assertStatus(429);}
 public function test_tiles_match_crop_structure():void {
  $this->bind($this->user());
  foreach([['tilled'=>true,'crop'=>'parsnip','age'=>3],['tilled'=>true,'crop'=>'carrot','age'=>4],['crop'=>null,'age'=>1],['tilled'=>false,'crop'=>'strawberry','age'=>0]] as $bad){$state=self::state();$state['tiles'][0]=array_merge($state['tiles'][0],$bad);$this->putJson('/api/save',['revision'=>0,'state'=>$state])->assertUnprocessable();}
 }
 public function test_malformed_nested_shapes_return_validation_errors_and_blank_name_is_valid():void {
  $this->bind($this->user());
  foreach([['tiles','wrong'],['tiles',[null]],['player','wrong'],['seeds',null],['produce',[]]] as [$key,$value]){$state=self::state();$state[$key]=$value;$this->putJson('/api/save',['revision'=>0,'state'=>$state])->assertUnprocessable();}
  $state=self::state();$state['farmerName']='';$this->putJson('/api/save',['revision'=>0,'state'=>$state])->assertOk();
 }
}
