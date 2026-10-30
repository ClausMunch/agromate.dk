<?php
// CLI-only test session for the isolated Docker harness. Never a web route.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (PHP_SAPI !== 'cli' || getenv('AGROMATE_BROWSER_FIXTURE') !== '1' || !$app->environment('local') || config('database.connections.mysql.database') !== 'agromate_test') {
    fwrite(STDERR, "Fixture is restricted to the isolated local test database.\n"); exit(1);
}
$subject = $argv[1] ?? 'browser-fixture';
if (!preg_match('/^browser-fixture(?:-[ab])?$/', $subject)) { exit(1); }
$user = App\Models\User::firstOrCreate(['provider'=>'google','provider_subject'=>$subject]);
$session = $app->make('session')->driver();
$session->start();
Illuminate\Support\Facades\Auth::login($user);
$session->regenerate();
$session->save();
$name = config('session.cookie');
$encrypter = $app->make('encrypter');
$value = Illuminate\Cookie\CookieValuePrefix::create($name, $encrypter->getKey()).$session->getId();
echo json_encode(['user_id'=>$user->id,'csrf_token'=>$session->token(),'cookie'=>['name'=>$name,'value'=>$encrypter->encrypt($value, false),'domain'=>'127.0.0.1','path'=>'/','httpOnly'=>true,'secure'=>false,'sameSite'=>'Lax']], JSON_UNESCAPED_SLASHES)."\n";
