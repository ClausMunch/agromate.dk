<?php
namespace Tests\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
class ProgressionSaveTest extends \Tests\TestCase {
 use RefreshDatabase;
 public static function state(): array {return SaveTest::state();}
 protected function user(): User {return User::create(['provider'=>'google','provider_subject'=>bin2hex(random_bytes(8))]);}
 protected function bind(User $user): static {return $this->actingAs($user)->withHeader('X-Account-ID',(string)$user->id);}
 public static function v2(): array {
  $s=self::state();$s['version']=2;$s['produce']['jam']=0;
  return $s+['upgrades'=>['wateringCan'=>0,'sprinkler'=>false,'plow'=>false,'stable'=>false,'jamMaker'=>false],
   'horse'=>['owned'=>false,'name'=>'','mounted'=>false,'feedDay'=>0,'feedBonus'=>false,'x'=>180,'y'=>240],
   'orders'=>[['id'=>'carrot-5','crop'=>'carrot','required'=>5,'reward'=>320,'delivered'=>0,'completed'=>false],['id'=>'parsnip-8','crop'=>'parsnip','required'=>8,'reward'=>320,'delivered'=>0,'completed'=>false],['id'=>'strawberry-3','crop'=>'strawberry','required'=>3,'reward'=>300,'delivered'=>0,'completed'=>false]],
   'reservations'=>['parsnip'=>0,'carrot'=>0,'strawberry'=>0],'processor'=>['input'=>null,'output'=>0,'readyDay'=>0,'startedDay'=>0],'dailyActions'=>[], 'lastNightDay'=>0];
 }
 public function test_legacy_is_validated_before_migration_and_scalar_versions_are_rejected(): void {
  $this->bind($this->user());
  foreach(['1',1.5,3] as $version){$s=self::state();$s['version']=$version;$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();}
  foreach([null,'bad',5] as $bag){$s=self::state();$s['produce']=$bag;$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();}
  $this->putJson('/api/save',['revision'=>0,'state'=>self::state()])->assertOk()->assertJsonPath('save.state.version',2)->assertJsonCount(3,'save.state.orders')->assertJsonPath('save.state.produce.jam',0);
 }
 public function test_v2_progression_roundtrip_is_private_and_downgrade_cannot_erase_it(): void {
  $a=$this->user();$b=$this->user();$this->bind($a);$s=self::v2();
  $s['day']=3;$s['upgrades']['stable']=true;$s['upgrades']['plow']=true;$s['upgrades']['jamMaker']=true;
  $s['horse']=array_replace($s['horse'],['owned'=>true,'name'=>'Fern','mounted'=>true,'feedDay'=>3,'feedBonus'=>true]);
  $s['processor']=['input'=>'strawberry','output'=>0,'startedDay'=>3,'readyDay'=>4];
  $this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertOk()->assertJsonPath('save.state',$s);
  $this->putJson('/api/save',['revision'=>1,'state'=>self::state()])->assertConflict()->assertJsonPath('error','client_upgrade_required');
  $this->getJson('/api/save')->assertJsonPath('save.state.horse.name','Fern')->assertJsonPath('save.revision',1);
  $this->bind($b)->getJson('/api/save')->assertJsonPath('save',null);
  $this->getJson('/api/leaderboard')->assertJsonPath('entries',[]);
 }
 public function test_known_orders_only_no_duplicates_overdelivery_or_arbitrary_daily_actions(): void {
  $this->bind($this->user());
  $cases=[];
  foreach (['id'=>'<img onerror=alert(1)>','crop'=>'parsnip','required'=>6,'reward'=>999,'delivered'=>6,'completed'=>true] as $key=>$value) {$s=self::v2();$s['orders'][0][$key]=$value;$cases[]=$s;}
  $s=self::v2();$s['orders'][1]=$s['orders'][0];$cases[]=$s;
  $s=self::v2();$s['dailyActions']=['evil'=>['deep'=>true]];$cases[]=$s;
  foreach ($cases as $s) $this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
  $s=self::v2();$s['orders'][0]['delivered']=5;$s['orders'][0]['completed']=true;
  $this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertOk();
 }
 public function test_impossible_equipment_feed_and_processor_states_are_rejected(): void {
  $this->bind($this->user());$cases=[];
  foreach ([['horse','owned',true],['horse','mounted',true],['horse','feedDay',2],['horse','feedBonus',true],['upgrades','plow',true],['processor','output',1],['processor','input','strawberry'],['processor','readyDay',1],['processor','startedDay',1],['horse','x',900],['horse','name',str_repeat('x',21)],['reservations','carrot',-1]] as [$bag,$key,$value]) {$s=self::v2();$s[$bag][$key]=$value;$cases[]=$s;}
  foreach($cases as $s)$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
  $s=self::v2();$s['day']=2;$s['upgrades']['jamMaker']=true;$s['processor']=['input'=>null,'output'=>1,'startedDay'=>1,'readyDay'=>2];
  $this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertOk();
 }
 public function test_malformed_v2_containers_and_scalars_never_throw(): void {
  $this->bind($this->user());
  foreach(['horse','upgrades','orders','processor','dailyActions','reservations','produce'] as $bag) {
   $s=self::v2();$s[$bag]='bad';$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
  }
 }
 public function test_progression_keys_and_json_types_are_exact(): void {
  $this->bind($this->user());
  foreach(['upgrades','horse','reservations','processor'] as $bag){$s=self::v2();$s[$bag]['arbitrary']=['nested'=>true];$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();}
  foreach([['horse','mounted',1],['horse','feedDay','0'],['upgrades','wateringCan','1'],['upgrades','sprinkler',1],['processor','output','0'],['produce','jam',1.5]] as [$bag,$key,$value]){$s=self::v2();$s[$bag][$key]=$value;$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();}
  $s=self::v2();$s['orders'][]=$s['orders'][0];$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
  $s=self::v2();$s['lastNightDay']=1;$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
 }
}
