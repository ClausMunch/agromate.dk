// Deterministic representative parsnip strategy; one energy budget per day.
// Mirrors the game's 2-energy till/plant/harvest, seed packs of five, quest gift,
// reservation-safe sales and tested progression actions. No fixture income.
const assert=require('node:assert/strict'),P=require('../public/progression.js');
const s=P.freshState(),milestones=[];let harvests=0,deliveries=0,harvestDays=0;
for(let day=1;day<=40;day++){
 let harvestedToday=0;
 for(const t of s.tiles)if(t.crop&&t.age>=P.CROPS[t.crop].days&&s.energy>=2){s.energy-=2;s.produce[t.crop]++;s.harvested++;harvests++;harvestedToday++;t.crop=null;t.age=0;t.watered=false;}
 if(harvestedToday)harvestDays++;
 for(const o of s.orders)if(P.deliverOrder(s,o.id).ok)deliveries++;
 for(const [id,quantity]of Object.entries(P.sellableProduce(s))){const gold=quantity*P.CROPS[id].sell;s.produce[id]-=quantity;s.money+=gold;s.earned+=gold;}
 for(const key of ['wateringCan','stable','plow','jamMaker','sprinkler']){
  // Keep 100g for seed purchases, except once all 28 plots are established.
  if(!s.upgrades[key]&&s.money>=P.PRICES[key]+100&&P.buy(s,key).ok){milestones.push({purchase:key,day:s.day,harvests,harvestDays,deliveries,money:s.money});}
  if(!s.upgrades[key])break;
 }
 // Water established crops first so an overly ambitious planting day cannot dry them out.
 for(let i=0;i<28;i++)if(s.tiles[i].crop)P.water(s,i);
 for(const t of s.tiles){
  if(t.crop)continue;const cost=(t.tilled?0:2)+2+(s.upgrades.wateringCan?1:2);
  if(s.energy<cost)break;
  if(!s.seeds.parsnip){if(s.money<50)break;s.money-=50;s.seeds.parsnip+=5;}
  if(!t.tilled){s.energy-=2;t.tilled=true;}
  s.energy-=2;t.crop='parsnip';t.age=0;s.seeds.parsnip--;s.planted++;
  if(s.planted>=5&&!s.questReward){s.questReward=true;s.money+=50;}
  P.water(s,s.tiles.indexOf(t));
 }
 assert.ok(s.energy>=0&&s.energy<=100);assert.ok(s.money>=0);
 if(milestones.length===5)break;
 P.advanceDay(s);
}
assert.deepEqual(milestones.map(m=>m.purchase),['wateringCan','stable','plow','jamMaker','sprinkler']);
console.log(JSON.stringify({strategy:'28 plots, parsnips, reserve and deliver, seed packs; no gifted progression funds',milestones,endingDay:s.day,totalHarvests:harvests,totalDeliveries:deliveries,earned:s.earned},null,2));
