<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::create('users',function(Blueprint $table){$table->id();$table->string('provider',32);$table->string('provider_subject',255);$table->unique(['provider','provider_subject']);$table->string('public_name',24)->default('Farmer');$table->boolean('leaderboard_opt_in')->default(false);$table->timestamps();});
  Schema::create('cloud_saves',function(Blueprint $table){$table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();$table->unsignedBigInteger('revision');$table->json('state');$table->unsignedBigInteger('score')->default(0);$table->timestamps();});
  Schema::create('sessions',function(Blueprint $table){$table->string('id')->primary();$table->foreignId('user_id')->nullable()->index();$table->string('ip_address',45)->nullable();$table->text('user_agent')->nullable();$table->longText('payload');$table->integer('last_activity')->index();});
  Schema::create('cache',function(Blueprint $table){$table->string('key')->primary();$table->mediumText('value');$table->integer('expiration');});
  Schema::create('cache_locks',function(Blueprint $table){$table->string('key')->primary();$table->string('owner');$table->integer('expiration');});
 }
 public function down():void {Schema::dropIfExists('cache_locks');Schema::dropIfExists('cache');Schema::dropIfExists('sessions');Schema::dropIfExists('cloud_saves');Schema::dropIfExists('users');}
};
