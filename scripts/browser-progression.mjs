// Reusable local browser fixture: all artifacts must be outside the repository.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import P from '../public/progression.js';
const scratch=process.env.TMPDIR;
assert.ok(scratch?.startsWith('/home/munch/.hermes/cache/scratch'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.AGROMATE_URL||'http://127.0.0.1:8088';assert.equal(base,'http://127.0.0.1:8088');
const step=process.env.TEST_STEP||'full',mobile=process.env.MOBILE==='1';
await mkdir(`${scratch}/agromate-repair`,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:true,isMobile:mobile}),page=await context.newPage();
page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const old=P.freshState();old.version=1;old.farmerName='Legacy';old.money=10000;old.produce={carrot:7,parsnip:8,strawberry:5};old.player={x:180,y:260};
 for(const i of [0,1,7])old.tiles[i]={tilled:true,crop:'carrot',age:0,watered:false};
 for(const k of ['horse','upgrades','orders','processor','reservations','dailyActions','lastNightDay'])delete old[k];
 await page.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},old);
 await page.goto(base);await page.locator('#play').click();
 await page.locator('#orders').click();await page.locator('[data-deliver="carrot-5"]').click();
 assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().produce.carrot),2);
 await page.locator('#modal .dialog-close').click();
 if(step!=='orders'){
  await page.locator('#shop').click();
  let confirmations=0;page.on('dialog',async dialog=>{confirmations++;await dialog.dismiss();});
  await page.locator('[data-upgrade="wateringCan"]').click();
  assert.equal(confirmations,1,'Purchase must show a confirmation');
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().upgrades.wateringCan),0,'Cancel preserves money/ownership');
  page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());
  await page.locator('[data-upgrade="wateringCan"]').click();
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().upgrades.wateringCan),1);
  await page.locator('#modal .dialog-close').click();
  console.log('PASS browser: confirmation cancel/accept and owned upgrade');
 }
 if(['water','horse','jam','full'].includes(step)){
  await page.getByRole('button',{name:'Watering can',exact:true}).click();
  const point=await page.locator('#game').evaluate(c=>{const r=c.getBoundingClientRect(),p=AgromateFarm.snapshot().player,vx=Math.max(0,Math.min(960-c.width,p.x-c.width/2)),vy=Math.max(0,Math.min(600-c.height,p.y-c.height*.65));return {x:r.x+(401-vx)/c.width*r.width,y:r.y+(289-vy)/c.height*r.height};});
  await page.mouse.move(point.x,point.y);
  await page.locator('#water-preview').waitFor({state:'visible'});
  assert.match(await page.locator('#water-preview').textContent(),/3.*3 energy/);
  await page.locator('#game').focus();await page.keyboard.press('3');
  await page.waitForFunction(()=>document.getElementById('water-preview').textContent.includes('0 dry crops'));
  await page.mouse.move(point.x+3,point.y);await page.mouse.move(point.x,point.y);
  await page.waitForFunction(()=>document.getElementById('water-preview').textContent.includes('3 dry crops'));
  if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  const after=await page.evaluate(()=>AgromateFarm.snapshot());assert.equal(after.energy,97);assert.deepEqual(after.tiles.flatMap((t,i)=>t.watered?[i]:[]),[0,1,7]);
  console.log('PASS browser: preview matches three-tile watering and actual energy');
 }
 if(['horse','jam','full'].includes(step)){
  await page.locator('#shop').click();
  for(const id of ['stable','plow','sprinkler'])await page.locator(`[data-upgrade="${id}"]`).click();
  await page.locator('#horse-name').fill('Fern <3');await page.locator('#save-horse-name').click();assert.equal(await page.locator('#horse-name').inputValue(),'Fern <3','Horse names round-trip as text in the editor');
  await page.locator('#modal .dialog-close').click();
  await page.locator('#horse-mount').waitFor({state:'visible'});
  assert.match(await page.locator('#horse-status').textContent(),/Fern <3/);
  await page.locator('#game').focus();await page.keyboard.press('m');
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().horse.mounted),true);
  await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
  const x=await page.evaluate(()=>AgromateFarm.snapshot().player.x);assert.ok(x>235&&x<260,`Mounted travel over 500ms: ${x}`);
  await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
  const edge=await page.evaluate(()=>AgromateFarm.snapshot().player.y);assert.ok(edge>=251&&edge<255,`Mounted farmhouse collision: ${edge}`);
  await page.keyboard.down('s');await page.waitForFunction(()=>AgromateFarm.snapshot().player.y>=260);await page.keyboard.up('s');
  await page.keyboard.press('m');assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().horse.mounted),false);
  await page.locator('#horse-mount').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().horse.mounted),true);
  await page.locator('#horse-feed').click();assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().horse.feedBonus),true);
  await page.locator('#game').focus();
  await page.keyboard.down('d');await page.waitForFunction(()=>AgromateFarm.snapshot().player.x>=401);await page.keyboard.up('d');
  await page.keyboard.down('s');await page.waitForFunction(()=>AgromateFarm.snapshot().player.y>=347);await page.keyboard.up('s');
  await page.locator('#horse-plow').click();
  const plowed=await page.evaluate(()=>AgromateFarm.snapshot());assert.equal(plowed.tiles.filter(t=>t.tilled).length,6);assert.equal(plowed.energy,96);
  assert.match(await page.locator('#sprinkler-status').textContent(),/dawn/);
  console.log('PASS browser: named stable, mount/speed/dismount, feed, local plow, marked sprinkler');
 }
 if(['jam','full'].includes(step)){
  await page.locator('#shop').click();await page.locator('[data-upgrade="jamMaker"]').click();await page.locator('#jam-action').click();
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().processor.input),'strawberry');
  await page.locator('#modal .dialog-close').click();await page.reload();await page.locator('#play').click();
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().processor.input),'strawberry');
  await page.locator('#sleep').click();await page.locator('#confirm-sleep').click();
  await page.locator('#shop').click();await page.locator('#jam-action').click();
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().produce.jam),1);
  await page.locator('#modal .dialog-close').click();
  const before=await page.evaluate(()=>AgromateFarm.snapshot());
  const raw=Object.entries(P.sellableProduce(before)).reduce((n,[id,q])=>n+q*P.CROPS[id].sell,0);
  await page.getByRole('button',{name:'Basket',exact:true}).click();await page.locator('#game').focus();await page.keyboard.press('Space');
  const sold=await page.evaluate(()=>AgromateFarm.snapshot());assert.equal(sold.money,before.money+raw+180);assert.equal(sold.earned,before.earned+raw+180);assert.equal(sold.produce.jam,0);
  await page.reload();await page.locator('#play').click();
  const restored=await page.evaluate(()=>AgromateFarm.snapshot());assert.deepEqual(restored,sold);assert.equal(restored.orders.length,3);
  if(mobile){
   await page.locator('#game').scrollIntoViewIfNeeded();
   const hit=await page.locator('#game').evaluate(c=>{const r=c.getBoundingClientRect(),p=AgromateFarm.snapshot().player,vx=Math.max(0,Math.min(960-c.width,p.x-c.width/2)),vy=Math.max(0,Math.min(600-c.height,p.y-c.height*.65));return document.elementFromPoint(r.x+(575-vx)/c.width*r.width,r.y+(347-vy)/c.height*r.height)?.id;});
   assert.equal(hit,'game','Right garden tiles must remain tappable beneath UI');
  }
  await page.screenshot({path:`${scratch}/agromate-repair/progression-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  if(mobile){
   await page.locator('#horse-mount').tap();assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().horse.mounted),true);
   await page.locator('#horse-feed').tap();assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().horse.feedBonus),true);
   // Real CDP touch start/end exercises the on-screen movement pad.
   const box=await page.locator('[data-dir="down"]').boundingBox(),client=await context.newCDPSession(page);
   const y=await page.evaluate(()=>AgromateFarm.snapshot().player.y);
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
   await page.waitForTimeout(220);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.ok(await page.evaluate(()=>AgromateFarm.snapshot().player.y)>y+15,'Touch pad moves mounted horse');
   await page.locator('#horse-plow').tap();await page.locator('#horse-mount').tap();
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log(`PASS browser ${mobile?'mobile/touch':'desktop/keyboard'}: jam pending reload, one sleep/collection, sale/earned, full reload, accessible controls, zero page errors`);
 }
 if(step==='orders'){assert.deepEqual(errors,[]);console.log('PASS browser: legacy migration and visible order delivery');}
}finally{await browser.close();}
