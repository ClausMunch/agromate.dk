<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
class User extends Authenticatable {
 protected $attributes=['public_name'=>'Farmer','leaderboard_opt_in'=>false];
 protected $fillable=['provider','provider_subject','public_name','leaderboard_opt_in'];
 protected $hidden=['provider','provider_subject'];
 protected function casts():array {return ['leaderboard_opt_in'=>'boolean'];}
}
