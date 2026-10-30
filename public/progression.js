/* Progression domain. Behaviors are introduced through tests/frontend/progression.test.cjs. */
(function(root){'use strict';
const CROPS={parsnip:{days:2,sell:35},carrot:{days:3,sell:55},strawberry:{days:4,sell:90}};
const OFFERS=[{id:'carrot-5',crop:'carrot',required:5,reward:320},{id:'parsnip-8',crop:'parsnip',required:8,reward:320},{id:'strawberry-3',crop:'strawberry',required:3,reward:300}];
const makeOrders=()=>OFFERS.map(o=>({...o,delivered:0,completed:false}));
function freshState(){return {version:2,farmerName:'',day:1,minutes:360,money:250,energy:100,
 seeds:{parsnip:10,carrot:0,strawberry:0},produce:{parsnip:0,carrot:0,strawberry:0,jam:0},selectedSeed:'parsnip',
 planted:0,harvested:0,earned:0,questReward:false,player:{x:489,y:422},
 tiles:Array.from({length:28},()=>({tilled:false,crop:null,age:0,watered:false})),
 upgrades:{wateringCan:0,sprinkler:false,plow:false,stable:false,jamMaker:false},
 horse:{owned:false,name:'',mounted:false,feedDay:0,feedBonus:false,x:180,y:240},orders:makeOrders(),
 reservations:{parsnip:0,carrot:0,strawberry:0},processor:{input:null,output:0,readyDay:0,startedDay:0},dailyActions:{},lastNightDay:0};}
function migrate(raw){
 if(raw==null)return freshState();
 if(!Number.isInteger(raw.version)||raw.version<1||raw.version>2)throw Error('Unsupported save version. Please update Agromate.');
 const copy=JSON.parse(JSON.stringify(raw));
 if(raw.version===2){const base=freshState();return {...copy,horse:{...base.horse,...copy.horse},reservations:{...base.reservations,...copy.reservations},orders:copy.orders?.length?copy.orders:base.orders};}
 const base=freshState();return {...base,...copy,version:2,produce:{...copy.produce,jam:0}};
}
function reservedProduce(s){const result={parsnip:0,carrot:0,strawberry:0};for(const o of s.orders)if(!o.completed&&CROPS[o.crop])result[o.crop]+=Math.max(0,o.required-o.delivered);return result;}
function sellableProduce(s){const r=reservedProduce(s);return Object.fromEntries(Object.keys(CROPS).map(k=>[k,Math.max(0,s.produce[k]-r[k])]));}
function deliverOrder(s,id){const o=s.orders.find(o=>o.id===id),known=OFFERS.find(o=>o.id===id);
 if(!o||!known||o.completed||o.crop!==known.crop||o.required!==known.required||o.reward!==known.reward||o.delivered!==0)return {ok:false,error:'invalid_order'};
 if(s.produce[o.crop]<o.required)return {ok:false,error:'insufficient'};
 s.produce[o.crop]-=o.required;o.delivered=o.required;o.completed=true;s.money+=o.reward;s.earned+=o.reward;
 return {ok:true,delivered:o.required,reward:o.reward};
}
function advanceDay(s){
 for(const t of s.tiles){if(t.crop&&t.watered)t.age=Math.min(CROPS[t.crop].days,t.age+1);t.watered=false;}
 if(s.upgrades.sprinkler)for(const i of SPRINKLER)if(s.tiles[i].crop&&s.tiles[i].tilled)s.tiles[i].watered=true;
 if(s.horse.mounted){s.horse.x=s.player.x;s.horse.y=s.player.y;}s.horse.mounted=false;s.horse.feedBonus=false;s.horse.feedDay=0;s.dailyActions={};
 if(s.processor.input&&s.processor.readyDay===s.day+1){s.processor.input=null;s.processor.output=1;}
 s.lastNightDay=s.day;s.day++;s.minutes=360;s.energy=100;
 s.orders=s.orders.map(o=>o.completed?{...OFFERS.find(t=>t.id===o.id),delivered:0,completed:false}:o);
 return s;
}
const PRICES={wateringCan:350,sprinkler:600,stable:2500,plow:750,jamMaker:900};
function buy(s,key){if(!Object.hasOwn(PRICES,key))return {ok:false,error:'unknown'};
 if(key==='plow'&&!s.upgrades.stable)return {ok:false,error:'stable_required'};
 if(s.upgrades[key])return {ok:false,error:'duplicate'};
 if(s.money<PRICES[key])return {ok:false,error:'insufficient'};
 s.money-=PRICES[key];s.upgrades[key]=key==='wateringCan'?1:true;if(key==='stable')s.horse.owned=true;
 return {ok:true,price:PRICES[key]};
}
function waterTargets(s,index){
 if(!Number.isInteger(index)||index<0||index>=28)return [];
 const indices=[index];if(s.upgrades.wateringCan){if(index%7<6)indices.push(index+1);if(index+7<28)indices.push(index+7);}
 return indices.filter(i=>s.tiles[i].tilled&&s.tiles[i].crop&&!s.tiles[i].watered);
}
function water(s,index){const targets=waterTargets(s,index),cost=targets.length*(s.upgrades.wateringCan?1:2);
 if(!targets.length||s.energy<cost)return {ok:false,error:'water_or_energy'};
 targets.forEach(i=>s.tiles[i].watered=true);s.energy-=cost;return {ok:true,count:targets.length,cost};
}
const SPRINKLER=[7,8,9,14,15,16];
const speed=s=>s.horse.mounted?140:100;
function mount(s,position,canWalk){
 if(!s.horse.owned)return {ok:false,error:'not_owned'};
 if(s.horse.mounted){
  const p=s.player,spot=[[24,0],[-24,0],[0,24],[0,-24]].map(([x,y])=>({x:p.x+x,y:p.y+y})).find(p=>canWalk(p.x,p.y));
  if(!spot)return {ok:false,error:'blocked'};
  s.horse.x=p.x;s.horse.y=p.y;s.player=spot;s.horse.mounted=false;
 }else{if(Math.hypot(s.player.x-position.x,s.player.y-position.y)>48||!canWalk(s.player.x,s.player.y))return {ok:false,error:'near_horse'};s.horse.mounted=true;}
 return {ok:true};
}
function plowRow(s,index){
 if(!s.horse.owned||!s.horse.mounted||!s.upgrades.plow)return {ok:false,error:'not_equipped'};
 if(!Number.isInteger(index)||index<0||index>=28)return {ok:false,error:'invalid_tile'};
 const x=401+index%7*29,y=289+Math.floor(index/7)*29;
 if(Math.hypot(s.player.x-x,s.player.y-y)>48)return {ok:false,error:'too_far'};
 const targets=[index,index+1,index+2].filter(i=>i<28&&Math.floor(i/7)===Math.floor(index/7)&&!s.tiles[i].crop&&!s.tiles[i].tilled);
 const cost=s.horse.feedBonus?1:2;
 if(!targets.length||s.energy<cost)return {ok:false,error:'soil_or_energy'};
 targets.forEach(i=>s.tiles[i].tilled=true);s.energy-=cost;return {ok:true,count:targets.length,cost};
}
function feedHorse(s){
 if(!s.horse.owned||s.horse.feedDay===s.day)return {ok:false,error:'already'};
 if(s.produce.carrot<1)return {ok:false,error:'carrot'};
 s.produce.carrot--;s.horse.feedDay=s.day;s.horse.feedBonus=true;return {ok:true};
}
function startJam(s){
 if(!s.upgrades.jamMaker||s.processor.input||s.processor.output)return {ok:false,error:'busy'};
 if(s.produce.strawberry<1)return {ok:false,error:'strawberries'};
 s.produce.strawberry--;s.processor={input:'strawberry',output:0,startedDay:s.day,readyDay:s.day+1};return {ok:true};
}
function collectJam(s){if(s.processor.output!==1)return {ok:false,error:'not_ready'};
 s.produce.jam++;s.processor={input:null,output:0,readyDay:0,startedDay:0};return {ok:true};
}
const api={startJam,collectJam,plowRow,feedHorse,speed,mount,SPRINKLER,waterTargets,water,PRICES,buy,advanceDay,reservedProduce,sellableProduce,deliverOrder,migrate,CROPS,OFFERS,freshState,makeOrders};
if(typeof module!=='undefined')module.exports=api;else root.AgromateProgression=api;
})(typeof window==='undefined'?globalThis:window);
