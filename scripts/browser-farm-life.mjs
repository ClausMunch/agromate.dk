// Local integration check: PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSERS_PATH can select an existing installation.
import assert from 'node:assert/strict';
import P from '../public/progression.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.AGROMATE_URL||'https://agromate.ddev.site';
assert.ok(['https://agromate.ddev.site','http://127.0.0.1:8000','http://127.0.0.1:8088'].includes(base),'Use a local game only');
const artifacts=process.env.ARTIFACT_DIR||'/tmp';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},ignoreHTTPSErrors:true,hasTouch:true,isMobile:width<600});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);
 const s=P.freshState();s.money=15000;s.farmerName='Willow';s.produce.carrot=10;delete s.life;
 await page.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},s);
 await page.goto(base);const click=async selector=>{const loc=page.locator(selector);if(width<600)await loc.tap();else await loc.click();};
 const state=()=>page.evaluate(()=>AgromateFarm.snapshot());
 const tab=async id=>click(`[data-tab="${id}"]`),act=async id=>click(`[data-action="${id}"]`),close=()=>click('#modal .dialog-close');
 await click('#play');assert.equal((await state()).life.coop,false);
 await click('[data-life="hens"]');await act('buy-coop');await page.locator('#hen-0').fill('Hazel <3');await act('name-0');assert.equal((await state()).life.hens[0],'Hazel <3');await act('feed-hens');assert.equal(await page.locator('[data-action="feed-hens"]').isDisabled(),true);
 await tab('season');await act('plant-bed');await act('water-bed');assert.equal((await state()).life.bed.watered,true);
 await tab('treasure');await act('dig-1');assert.equal((await state()).life.map,true);await act('clue');assert.match(await page.locator('#treasure-clue').textContent(),/wildflowers/);await act('dig-4');assert.equal((await state()).life.cache,true);assert.equal((await state()).life.rareSeeds,3);
 await tab('fishing');await act('buy-rod');await act('cast');await page.locator('[data-action="reel"]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const n=Number(document.getElementById('fish-track').getAttribute('aria-valuenow'));return n>=43&&n<=49;},null,{polling:'raf'});await act('reel');assert.equal(Object.values((await state()).life.goods).reduce((a,b)=>a+b,0),1);assert.equal(await page.locator('[data-action="reel"]').isDisabled(),true);
 await act('cast');await close();await page.waitForFunction(()=>!AgromateFarm.snapshot().life.pendingCatch);assert.equal((await state()).life.pendingCatch,false,'Closing forfeits a cast without a reward');
 await click('#shop');await click('[data-upgrade="stable"]');await click('#confirm-accept');await close();await click('[data-life="horse"]');await act('groom');await act('treat');assert.equal((await state()).life.bond,3);await close();
 await click('#sleep');await click('#confirm-sleep');assert.equal((await state()).life.eggs,3);assert.equal((await state()).life.bed.age,1);
 await click('[data-life="hens"]');await act('collect-eggs');assert.equal((await state()).life.goods.egg,3);await tab('season');await act('water-bed');await tab('horse');await act('groom');await act('treat');await act('tack-blue');assert.equal((await state()).life.tack,'blue');
 await tab('market');await act('buy-stall');const fish=Object.entries((await state()).life.goods).find(([id,n])=>id!=='egg'&&n>0)?.[0];await act('stock-'+fish);const before=(await state()).money;await close();await click('#sleep');await click('#confirm-sleep');assert.ok((await state()).money>before,'A customer buys a stocked fish on day 2');assert.equal((await state()).life.sales.length,1);
 await click('[data-life="season"]');await act('harvest-bed');assert.equal((await state()).life.goods.seasonal,3);await act('plant-rare');assert.equal((await state()).life.bed.crop,'moonflower');
 await tab('decor');for(const [i,kind] of ['fence','flowers','lamp','bench'].entries()){await act('place-'+kind);await click(`[data-plot="${i}"]`);}assert.equal((await state()).life.decorations.length,4);await act('remove-0');assert.equal((await state()).life.decorations.length,3);
 await page.screenshot({path:`${artifacts}/agromate-life-decor-${width}.png`,fullPage:true});await close();
 const saved=(await state()).life;await page.reload();await click('#play');assert.deepEqual((await state()).life,saved,'Every activity persists after reload');
 await page.screenshot({path:`${artifacts}/agromate-life-farm-${width}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Exercise seasons/weather at their real world coordinates using isolated local fixtures.
 for(const day of [4,29,57,88]){const fixture=await state();fixture.day=day;await page.evaluate(s=>AgromateFarm.replace(s),fixture);await click('#play');assert.equal(await page.locator('#season-name').textContent(),P.Life.season(day));await page.screenshot({path:`${artifacts}/agromate-life-season-${day}-${width}.png`,fullPage:true});}
 await click('[data-life="fishing"]');await act('cast');await tab('hens');assert.equal((await state()).life.pendingCatch,false);assert.deepEqual(errors,[]);
 console.log(`PASS ${width}px: old save migration, named/fed hens and eggs, seasonal plant/water/harvest, map/Kris/cache, real fishing timing and cancellation, customer sales, horse friendship/equipment, four decorations/remove, full reload, seasons/weather, no overflow or runtime errors`);await context.close();
}
}finally{await browser.close();}
