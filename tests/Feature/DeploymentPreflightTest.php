<?php
namespace Tests\Feature;
use Tests\TestCase;
use Symfony\Component\Process\Process;
class DeploymentPreflightTest extends TestCase {
 private function preflight(array $overrides=[]):Process {
  $environment=['APP_ENV'=>'production','APP_DEBUG'=>'false','APP_KEY'=>'base64:WmFhWmFhWmFhWmFhWmFhWmFhWmFhWmFhWmFhWmFhWmE=','APP_URL'=>'https://agromate.dk','DB_CONNECTION'=>'mysql','SESSION_DRIVER'=>'database','CACHE_STORE'=>'database','SESSION_SECURE_COOKIE'=>'true','SESSION_HTTP_ONLY'=>'true','SESSION_SAME_SITE'=>'lax','SESSION_ENCRYPT'=>'true'];
  $process=new Process([PHP_BINARY,base_path('scripts/deployment-preflight.php')],base_path(),array_merge($environment,$overrides));$process->run();return $process;
 }
 public function test_secure_preflight_accepts_configuration_without_database_access():void {$process=$this->preflight();$this->assertTrue($process->isSuccessful(),$process->getErrorOutput());$this->assertStringContainsString('Preflight passed',$process->getOutput());}
 public function test_preflight_rejects_each_insecure_setting_without_exposing_values():void {
  foreach(['APP_ENV'=>'local','APP_DEBUG'=>'true','APP_KEY'=>'secret-invalid-key','APP_URL'=>'http://agromate.dk','DB_CONNECTION'=>'sqlite','SESSION_DRIVER'=>'file','CACHE_STORE'=>'array','SESSION_SECURE_COOKIE'=>'false','SESSION_HTTP_ONLY'=>'false','SESSION_SAME_SITE'=>'none','SESSION_ENCRYPT'=>'false'] as $key=>$value){$process=$this->preflight([$key=>$value]);$this->assertSame(1,$process->getExitCode(),$key);$this->assertStringContainsString('Preflight rejected',$process->getErrorOutput());$this->assertStringNotContainsString('secret-invalid-key',$process->getErrorOutput());}
 }
}
