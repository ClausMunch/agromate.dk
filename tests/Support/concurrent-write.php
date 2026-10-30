<?php
require __DIR__.'/../../vendor/autoload.php';
$app=require __DIR__.'/../../bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
[$script,$id,$revision,$stateFile,$barrier,$name]=$argv;
$user=App\Models\User::findOrFail($id);
file_put_contents($barrier.'.'.$name,'ready');
$deadline=microtime(true)+10;
while(!is_file($barrier)){if(microtime(true)>$deadline)exit(2);usleep(1000);}
$request=Illuminate\Http\Request::create('/api/save','PUT',json_decode(file_get_contents($stateFile),true));
$request->setUserResolver(fn()=>$user);
$response=(new App\Http\Controllers\SaveController)->store($request);
echo $response->getStatusCode();
