<?php
namespace App\Http\Controllers;

final class FarmLifeRules
{
    public static function rules($integer, $boolean): array
    {
        $rules=['state.life'=>['sometimes','array:coop,hens,fedDay,eggs,goods,rod,casts,pendingCatch,dug,rareSeeds,map,cache,clue,bed,stall,stock,sales,decorations,bond,groomDay,treatDay,tack','size:22']];
        foreach (['pendingCatch','coop','rod','map','cache','clue','stall'] as $key) $rules["state.life.$key"]=['required_with:state.life',$boolean];
        foreach (['fedDay'=>1000000,'eggs'=>18,'casts'=>5,'rareSeeds'=>1000000,'bond'=>20,'groomDay'=>1000000,'treatDay'=>1000000] as $key=>$max) $rules["state.life.$key"]=['required_with:state.life',$integer,'integer','between:0,'.$max];
        $rules['state.life.hens']=['required_with:state.life','array','list','size:3'];
        $rules['state.life.hens.*']=['required','string','min:1','max:16'];
        foreach (['goods','stock'] as $bag) {
            $rules["state.life.$bag"]=['required_with:state.life','array:egg,perch,carp,moonfish,seasonal,moonflower'];
            foreach (['egg','perch','carp','moonfish','seasonal','moonflower'] as $item) $rules["state.life.$bag.$item"]=['required_with:state.life',$integer,'integer','between:0,'.($bag==='stock'?12:1000000)];
        }
        $rules['state.life.dug']=['present_with:state.life','array','list','max:3'];
        $rules['state.life.dug.*']=['required',$integer,'integer','between:0,5','distinct:strict'];
        $rules['state.life.bed']=['required_with:state.life','array:crop,age,watered'];
        $rules['state.life.bed.crop']=['present_with:state.life','nullable','in:Spring,Summer,Autumn,Winter,moonflower'];
        $rules['state.life.bed.age']=['required_with:state.life',$integer,'integer','between:0,4'];
        $rules['state.life.bed.watered']=['required_with:state.life',$boolean];
        $rules['state.life.sales']=['present_with:state.life','array','list','max:3'];
        $rules['state.life.sales.*']=['required','array:name,item,price'];
        $rules['state.life.sales.*.name']=['required','in:Mila,Otto,Iris','distinct:strict'];
        $rules['state.life.sales.*.item']=['required','in:egg,perch,carp,moonfish,seasonal,moonflower'];
        $rules['state.life.sales.*.price']=['required',$integer,'integer','between:1,330'];
        $rules['state.life.decorations']=['present_with:state.life','array','list','max:12'];
        $rules['state.life.decorations.*']=['required','array:kind,slot'];
        $rules['state.life.decorations.*.kind']=['required','in:fence,flowers,lamp,bench'];
        $rules['state.life.decorations.*.slot']=['required',$integer,'integer','between:0,11','distinct:strict'];
        $rules['state.life.tack']=['required_with:state.life','in:plain,blue,royal'];
        return $rules;
    }

    public static function check(array $s, $validator): void
    {
        if (!isset($s['life'])) return;
        $l=$s['life'];$errors=[];
        foreach (['fedDay','groomDay','treatDay'] as $key) if ($l[$key]>$s['day']) $errors[]='Daily actions cannot be in the future.';
        if (!$l['coop'] && ($l['fedDay'] || $l['eggs'])) $errors[]='Hens require a coop.';
        if (($l['pendingCatch'] && !$l['casts']) || (!$l['rod'] && $l['casts'])) $errors[]='Fishing requires a rod.';
        if ((!$l['map'] && $l['clue']) || (!$l['clue'] && $l['cache'])) $errors[]='Treasure discoveries must agree.';
        if (array_sum($l['stock'])>12 || (!$l['stall'] && (array_sum($l['stock']) || $l['sales']))) $errors[]='Shop stock requires a stall and fits 12 items.';
        if (!$s['horse']['owned'] && ($l['bond'] || $l['groomDay'] || $l['treatDay'] || $l['tack']!=='plain')) $errors[]='Horse friendship requires the stable.';
        if (($l['tack']==='blue' && $l['bond']<5) || ($l['tack']==='royal' && $l['bond']<12)) $errors[]='Saddle blanket is locked.';
        $days=['Spring'=>2,'Summer'=>3,'Autumn'=>4,'Winter'=>3,'moonflower'=>4];
        if (($l['bed']['crop']===null && ($l['bed']['age'] || $l['bed']['watered'])) || ($l['bed']['crop']!==null && $l['bed']['age']>$days[$l['bed']['crop']])) $errors[]='Seasonal bed growth must agree.';
        foreach ($errors as $error) $validator->errors()->add('state.life',$error);
    }
}
