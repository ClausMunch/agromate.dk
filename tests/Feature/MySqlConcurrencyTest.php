<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
class MySqlConcurrencyTest extends TestCase {
 public function test_simultaneous_create_and_update_have_exactly_one_winner():void {
  if(DB::connection()->getDriverName()!=='mysql')$this->markTestSkipped('Real MySQL concurrency test.');
  $user=User::create(['provider'=>'google','provider_subject'=>'concurrency-'.bin2hex(random_bytes(8))]);
  try {
   foreach([0,1] as $revision){
    $base=tempnam(sys_get_temp_dir(),'agromate-concurrency-');unlink($base);
    $payload=$base.'.json';file_put_contents($payload,json_encode(['revision'=>$revision,'state'=>ProgressionSaveTest::v2()]));
    $workers=[];
    foreach(['a','b'] as $name){$worker=new Process([PHP_BINARY,base_path('tests/Support/concurrent-write.php'),(string)$user->id,(string)$revision,$payload,$base,$name],base_path(),['APP_ENV'=>'testing','DB_CONNECTION'=>'mysql']);$worker->start();$workers[]=$worker;}
    $deadline=microtime(true)+10;while(!is_file($base.'.a')||!is_file($base.'.b')){if(microtime(true)>$deadline)throw new \RuntimeException('Worker readiness timeout');usleep(1000);}
    touch($base);$statuses=[];foreach($workers as $worker){$worker->wait();$this->assertTrue($worker->isSuccessful(),$worker->getErrorOutput());$statuses[]=trim($worker->getOutput());}sort($statuses);$this->assertSame(['200','409'],$statuses);
    $this->assertSame($revision+1,(int)DB::table('cloud_saves')->where('user_id',$user->id)->value('revision'));
    foreach(glob($base.'*') as $file)unlink($file);
   }
  }finally{$user->delete();}
 }
}
