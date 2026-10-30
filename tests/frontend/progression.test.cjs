const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../../public/progression.js');
test('fresh farms have independent complete v2 fields and three unique offers',()=>{
 const a=P.freshState(),b=P.freshState();
 assert.equal(a.version,2);assert.equal(a.tiles.length,28);assert.equal(a.orders.length,3);
 assert.equal(new Set(a.orders.map(o=>o.id)).size,3);
 assert.deepEqual(a.reservations,{parsnip:0,carrot:0,strawberry:0});
 a.tiles[0].tilled=true;assert.equal(b.tiles[0].tilled,false);
});
test('migration preserves v1 farm and v2 progression without mutating input; future/scalar versions fail',()=>{
 const old=P.freshState();old.version=1;old.day=9;old.money=999;old.tiles[2]={tilled:true,crop:'carrot',age:2,watered:true};
 for(const key of ['upgrades','horse','orders','reservations','processor','dailyActions','lastNightDay'])delete old[key];delete old.produce.jam;
 const before=JSON.stringify(old),next=P.migrate(old);assert.equal(JSON.stringify(old),before);
 assert.equal(next.version,2);assert.equal(next.money,999);assert.deepEqual(next.tiles,old.tiles);assert.equal(next.orders.length,3);
 assert.deepEqual(next.reservations,{parsnip:0,carrot:0,strawberry:0});
 next.horse.name='Fern';next.reservations.carrot=2;assert.deepEqual(P.migrate(next),next);
 assert.equal(P.migrate(null).orders.length,3);
 for(const version of [3,'1',1.5,0])assert.throws(()=>P.migrate({...old,version}),/update|version/i);
});
test('delivery is atomic, pays earned once, protects reservations, and rejects malformed negative needs',()=>{
 const s=P.freshState(),before=JSON.stringify(s);
 assert.equal(P.deliverOrder(s,'carrot-5').ok,false);assert.equal(JSON.stringify(s),before);
 s.produce.carrot=7;assert.equal(P.sellableProduce(s).carrot,2);
 assert.deepEqual(P.deliverOrder(s,'carrot-5'),{ok:true,delivered:5,reward:320});
 assert.equal(s.money,570);assert.equal(s.earned,320);assert.equal(s.produce.carrot,2);
 assert.equal(P.deliverOrder(s,'carrot-5').ok,false);assert.equal(s.money,570);
 s.orders[1].delivered=100;const bad=JSON.stringify(s);assert.equal(P.deliverOrder(s,'parsnip-8').ok,false);assert.equal(JSON.stringify(s),bad);
});
test('completed offer stays until sleep then unique slots refresh deterministically and crops grow once',()=>{
 const s=P.freshState();s.produce.parsnip=8;P.deliverOrder(s,'parsnip-8');
 assert.equal(P.migrate(s).orders[1].completed,true);
 s.tiles[0]={tilled:true,crop:'parsnip',age:0,watered:true};P.advanceDay(s);
 assert.equal(s.day,2);assert.equal(s.tiles[0].age,1);assert.equal(s.tiles[0].watered,false);
 assert.equal(new Set(s.orders.map(o=>o.id)).size,3);assert.equal(s.orders[1].completed,false);
 assert.deepEqual(P.migrate(s).orders,s.orders);P.advanceDay(s);assert.equal(s.tiles[0].age,1);
});
test('known upgrades are permanent atomic purchases with stable prerequisite',()=>{
 const s=P.freshState();for(const key of ['wateringCan','sprinkler','stable','jamMaker','plow','evil']){const before=JSON.stringify(s);assert.equal(P.buy(s,key).ok,false);assert.equal(JSON.stringify(s),before);}
 s.money=6000;assert.equal(P.buy(s,'plow').error,'stable_required');
 assert.equal(P.buy(s,'stable').ok,true);assert.equal(s.horse.owned,true);
 for(const key of ['wateringCan','sprinkler','jamMaker','plow'])assert.equal(P.buy(s,key).ok,true);
 const before=JSON.stringify(s);assert.equal(P.buy(s,'stable').ok,false);assert.equal(JSON.stringify(s),before);assert.equal(s.earned,0);
});
test('watering pattern stays in row, previews valid dry crops, costs one per upgraded tile and is atomic',()=>{
 const s=P.freshState();s.tiles=s.tiles.map(()=>({tilled:true,crop:'carrot',age:0,watered:false}));
 assert.deepEqual(P.waterTargets(s,6),[6]);s.upgrades.wateringCan=1;
 assert.deepEqual(P.waterTargets(s,6),[6,13]);assert.deepEqual(P.waterTargets(s,27),[27]);assert.deepEqual(P.waterTargets(s,null),[]);
 s.tiles[1].watered=true;s.tiles[7].crop=null;assert.deepEqual(P.waterTargets(s,0),[0]);
 s.energy=0;const before=JSON.stringify(s);assert.equal(P.water(s,0).ok,false);assert.equal(JSON.stringify(s),before);
 s.energy=3;assert.equal(P.water(s,6).count,2);assert.equal(s.energy,1);assert.deepEqual(P.waterTargets(s,6),[]);
 s.upgrades.wateringCan=0;s.energy=2;assert.equal(P.water(s,2).ok,true);assert.equal(s.energy,0);
});
test('sprinkler waters only marked crop coverage at dawn and loading never advances growth',()=>{
 const s=P.freshState();s.upgrades.sprinkler=true;s.tiles=s.tiles.map(()=>({tilled:true,crop:'carrot',age:0,watered:false}));
 P.advanceDay(s);assert.deepEqual(s.tiles.flatMap((t,i)=>t.watered?[i]:[]),[7,8,9,14,15,16]);assert.equal(s.tiles[7].age,0);
 for(let i=0;i<3;i++)assert.equal(P.migrate(s).tiles[7].age,0);
 P.advanceDay(s);assert.equal(s.tiles[7].age,1);assert.equal(s.tiles[6].age,0);assert.equal(s.lastNightDay,2);
});
test('mount needs owned horse nearby, gives 1.4x speed; dismount chooses clear adjacent ground or stays mounted',()=>{
 const s=P.freshState(),home={x:180,y:240};s.player={...home};assert.equal(P.mount(s,home,()=>true).ok,false);
 s.horse.owned=true;s.upgrades.stable=true;s.player.x=400;assert.equal(P.mount(s,home,()=>true).ok,false);
 s.player={...home};const beforeMount=JSON.stringify(s);assert.equal(P.mount(s,home,()=>false).ok,false);assert.equal(JSON.stringify(s),beforeMount);assert.equal(P.mount(s,home,()=>true).ok,true);assert.equal(P.speed(s),140);
 assert.equal(P.mount(s,home,()=>false).ok,false);assert.equal(s.horse.mounted,true);
 const before={...s.player};assert.equal(P.mount(s,home,(x,y)=>x<180&&y===240).ok,true);
 assert.equal(P.speed(s),100);assert.ok(s.player.x<before.x);assert.equal(s.player.y,before.y);
 assert.ok(Math.hypot(s.player.x-before.x,s.player.y-before.y)<=24);
});
test('plow requires mounted equipment, local valid row and sufficient energy atomically; feed saves one energy once per day',()=>{
 const s=P.freshState();s.player={x:401,y:289};s.upgrades.stable=true;s.horse.owned=true;s.upgrades.plow=true;
 assert.equal(P.plowRow(s,0).ok,false);s.horse.mounted=true;
 for(const i of [null,-1,28,20]){const b=JSON.stringify(s);assert.equal(P.plowRow(s,i).ok,false);assert.equal(JSON.stringify(s),b);}
 s.tiles[1]={tilled:true,crop:'carrot',age:2,watered:true};s.energy=1;const before=JSON.stringify(s);
 assert.equal(P.plowRow(s,0).ok,false);assert.equal(JSON.stringify(s),before);
 s.energy=2;assert.equal(P.plowRow(s,0).count,2);assert.equal(s.energy,0);assert.equal(s.tiles[1].crop,'carrot');
 s.player={x:575,y:318};s.energy=2;assert.equal(P.plowRow(s,13).count,1);assert.equal(s.tiles[14].tilled,false);
 s.produce.carrot=2;assert.equal(P.feedHorse(s).ok,true);assert.equal(P.feedHorse(P.migrate(s)).ok,false);assert.equal(s.produce.carrot,1);
 s.player={x:401,y:347};s.energy=1;assert.equal(P.plowRow(s,14).count,3);assert.equal(s.energy,0);
 P.advanceDay(s);assert.equal(s.horse.feedBonus,false);assert.equal(s.horse.mounted,false);assert.equal(P.feedHorse(s).ok,true);
});
test('one-slot jam consumes one strawberry, finishes only on day transition, persists, collects once, resets idle',()=>{
 const s=P.freshState();s.produce.strawberry=2;assert.equal(P.startJam(s).ok,false);s.upgrades.jamMaker=true;
 assert.equal(P.startJam(s).ok,true);assert.equal(s.produce.strawberry,1);assert.equal(s.processor.readyDay,2);
 const before=JSON.stringify(s);assert.equal(P.startJam(s).ok,false);assert.equal(P.collectJam(s).ok,false);assert.equal(JSON.stringify(s),before);
 const loaded=P.migrate(s);P.advanceDay(loaded);assert.equal(loaded.processor.output,1);P.advanceDay(loaded);assert.equal(loaded.processor.output,1);
 assert.equal(P.startJam(loaded).ok,false);assert.equal(P.collectJam(loaded).ok,true);assert.equal(P.collectJam(loaded).ok,false);
 assert.equal(loaded.produce.jam,1);assert.deepEqual(loaded.processor,{input:null,output:0,readyDay:0,startedDay:0});assert.equal(loaded.earned,0);
});
test('repairs earlier incomplete v2 defaults without losing crops, money or completed offers',()=>{
 const old=P.freshState();old.reservations={};old.orders=[];delete old.horse.x;delete old.horse.y;old.money=999;
 const fixed=P.migrate(old);assert.deepEqual(fixed.reservations,{parsnip:0,carrot:0,strawberry:0});assert.equal(fixed.orders.length,3);assert.equal(fixed.horse.x,180);assert.equal(fixed.money,999);
});
test('a three-crop watering action with two energy changes neither crops nor energy',()=>{
 const s=P.freshState();s.upgrades.wateringCan=1;s.energy=2;
 for(const i of [0,1,7])s.tiles[i]={tilled:true,crop:'carrot',age:0,watered:false};
 const before=JSON.stringify(s);assert.equal(P.water(s,0).ok,false);assert.equal(JSON.stringify(s),before);
});
