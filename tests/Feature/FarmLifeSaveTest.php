<?php
namespace Tests\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;

class FarmLifeSaveTest extends \Tests\TestCase
{
 use RefreshDatabase;
 private function signIn(): void {$u=User::create(['provider'=>'google','provider_subject'=>bin2hex(random_bytes(8))]);$this->actingAs($u)->withHeader('X-Account-ID',(string)$u->id);}
 public static function state(): array {
  $s=ProgressionSaveTest::v2();
  $goods=['egg'=>0,'perch'=>0,'carp'=>0,'moonfish'=>0,'seasonal'=>0,'moonflower'=>0];
  $s['life']=['coop'=>false,'hens'=>['Clover','Pip','Maple'],'fedDay'=>0,'eggs'=>0,'goods'=>$goods,'rod'=>false,'casts'=>0,'pendingCatch'=>false,'dug'=>[],'rareSeeds'=>0,'map'=>false,'cache'=>false,'clue'=>false,'bed'=>['crop'=>null,'age'=>0,'watered'=>false],'stall'=>false,'stock'=>$goods,'sales'=>[],'decorations'=>[],'bond'=>0,'groomDay'=>0,'treatDay'=>0,'tack'=>'plain'];return $s;
 }
 public function test_new_farms_and_every_activity_round_trip_without_losses(): void {
  $this->signIn();$s=self::state();
  $this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertOk()->assertJsonPath('save.state',$s);
  $s['day']=4;$s['upgrades']['stable']=true;$s['horse']['owned']=true;
  $s['life']=array_replace($s['life'],['coop'=>true,'hens'=>['Hazel','Pip','Maple'],'fedDay'=>3,'eggs'=>3,'rod'=>true,'casts'=>2,'dug'=>[1,4],'rareSeeds'=>2,'map'=>true,'clue'=>true,'cache'=>true,'stall'=>true,'bond'=>6,'groomDay'=>4,'treatDay'=>4,'tack'=>'blue','bed'=>['crop'=>'Summer','age'=>2,'watered'=>true],'sales'=>[['name'=>'Mila','item'=>'egg','price'=>53]],'decorations'=>[['kind'=>'lamp','slot'=>0],['kind'=>'bench','slot'=>11]]]);
  $s['life']['goods']['perch']=2;$s['life']['stock']['egg']=1;
  $this->putJson('/api/save',['revision'=>1,'state'=>$s])->assertOk()->assertJsonPath('save.state',$s);
  $this->getJson('/api/save')->assertOk()->assertJsonPath('save.state.life',fn ($life) => $life == $s['life']);
  $this->putJson('/api/save',['revision'=>2,'state'=>ProgressionSaveTest::v2()])->assertConflict()->assertJsonPath('error','client_upgrade_required');
  $this->getJson('/api/save')->assertJsonPath('save.revision',2)->assertJsonPath('save.state.life.tack','blue');
 }
 public function test_new_nested_shapes_and_json_types_are_strict(): void {
  $this->signIn();
  $cases=[];foreach(['life','goods','stock','bed','hens','dug','sales','decorations'] as $bag){$s=self::state();if($bag==='life')$s['life']='bad';else $s['life'][$bag]='bad';$cases[]=$s;}
  foreach(['coop'=>1,'eggs'=>'3','bond'=>21,'casts'=>6,'pendingCatch'=>1,'tack'=>'evil','hens'=>['one'],'dug'=>[0,0],'decorations'=>[['kind'=>'lamp','slot'=>0],['kind'=>'bench','slot'=>0]]] as $key=>$value){$s=self::state();$s['life'][$key]=$value;$cases[]=$s;}
  foreach(['dug','sales','decorations','pendingCatch'] as $key){$s=self::state();unset($s['life'][$key]);$cases[]=$s;}
  $s=self::state();$s['life']['goods']['evil']=1;$cases[]=$s;
  $s=self::state();$s['life']['bed']['watered']=1;$cases[]=$s;
  $s=self::state();$s['life']['extra']=['nested'=>'evil'];$cases[]=$s;
  foreach($cases as $s)$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
 }
 public function test_impossible_daily_inventory_and_unlock_states_are_rejected(): void {
  $this->signIn();$cases=[];
  foreach(['fedDay'=>2,'eggs'=>1,'casts'=>1,'pendingCatch'=>true,'bond'=>1,'groomDay'=>1,'treatDay'=>1,'tack'=>'royal','clue'=>true,'cache'=>true] as $key=>$value){$s=self::state();$s['life'][$key]=$value;$cases[]=$s;}
  $s=self::state();$s['life']['stock']['egg']=1;$cases[]=$s;
  $s=self::state();$s['life']['stall']=true;$s['life']['stock']['egg']=12;$s['life']['stock']['carp']=1;$cases[]=$s;
  $s=self::state();$s['life']['bed']['age']=1;$cases[]=$s;
  $s=self::state();$s['life']['bed']=['crop'=>'Spring','age'=>3,'watered'=>false];$cases[]=$s;
  foreach($cases as $s)$this->putJson('/api/save',['revision'=>0,'state'=>$s])->assertUnprocessable();
 }
}
