// Mock account APIs only; no real account is reset or deleted by this runner.
import assert from 'node:assert/strict';
import P from '../public/progression.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<600,hasTouch:true,ignoreHTTPSErrors:true});
  const page=await context.newPage(),errors=[],native=[];page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{native.push(d.message());await d.dismiss();});
  const initial=P.freshState();initial.farmerName='Confirmation farmer';initial.money=10000;
  let user={id:1,public_name:'Fixture',leaderboard_opt_in:false},slot={revision:1,state:structuredClone(initial)},writes=0,deletes=0;
  await page.route('**/api/**',async route=>{
   const r=route.request(),path=new URL(r.url()).pathname;let json={};
   if(path==='/api/session')json={user,csrf_token:'fixture',login_available:false};
   if(path==='/api/save'){
    if(r.method()==='PUT'){writes++;const body=r.postDataJSON();slot={revision:slot.revision+1,state:body.state};}
    json={account_id:user?.id,save:slot};
   }
   if(path==='/api/account'&&r.method()==='DELETE'){deletes++;user=null;}
   if(path==='/api/leaderboard')json={entries:[]};
   await route.fulfill({json});
  });
  await page.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},initial);
  const click=async selector=>{if(width<600)await page.locator(selector).tap();else await page.locator(selector).click();};
  const state=()=>page.evaluate(()=>AgromateFarm.snapshot());
  await page.goto('https://agromate.ddev.site');await click('#play');await click('#shop');
  const sprinkler='[data-upgrade="sprinkler"]';
  await click(sprinkler);assert.equal(await page.locator('#confirm-heading').textContent(),'Buy Sprinkler?');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'confirm-cancel','Cancel receives initial focus');
  await page.keyboard.press('Escape');assert.equal((await state()).money,10000);assert.equal(await page.evaluate(()=>document.activeElement.dataset.upgrade),'sprinkler');
  await click(sprinkler);await page.mouse.click(3,3);assert.equal((await state()).upgrades.sprinkler,false,'Backdrop cancels');
  await click(sprinkler);await click('#confirm-message');assert.equal(await page.locator('#confirm-dialog').isVisible(),true,'Clicking inside does not dismiss');
  await page.screenshot({path:`/tmp/agromate-confirm-purchase-${width}.png`,fullPage:true});
  await click('#confirm-cancel');assert.equal((await state()).money,10000);
  await click(sprinkler);await page.keyboard.press('Enter');assert.equal((await state()).money,10000,'Enter defaults to cancellation');
  await click(sprinkler);
  await page.evaluate(()=>AgromateFarm.replace({...AgromateFarm.snapshot(),farmerName:'Replacement farm'}));
  await page.waitForFunction(()=>!document.getElementById('confirm-dialog').open);
  assert.equal((await state()).upgrades.sprinkler,false,'Replacing the farm cancels an outstanding purchase');
  await click('#play');await click('#shop');
  let money=10000;
  for(const id of ['wateringCan','sprinkler','fieldIrrigation','stable','plow','jamMaker']){
   await click(`[data-upgrade="${id}"]`);
   if(id==='sprinkler')await page.evaluate(()=>document.querySelector('[data-upgrade="sprinkler"]').click());
   await click('#confirm-accept');money-=P.PRICES[id];
   assert.equal((await state()).money,money);assert.ok((await state()).upgrades[id]);
  }
  await click('#modal .dialog-close');await click('#account-open');
  await page.waitForFunction(()=>!document.getElementById('signed-in-controls').hidden);
  for(const id of ['cloud-load','cloud-replace','account-delete','farm-reset']){
   const before=await state();await click('#'+id);await click('#confirm-cancel');assert.deepEqual(await state(),before);
  }
  assert.equal(writes,0);assert.equal(deletes,0,'Cancelling destructive prompts sends no mutation');
  await click('#cloud-replace');await click('#confirm-accept');
  await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the cloud farm'));
  assert.equal(writes,1);await click('#title-account-open');
  await click('#cloud-local');await click('#confirm-cancel');assert.match(await page.locator('#cloud-mode').textContent(),/Playing the cloud farm/);
  await click('#cloud-local');await click('#confirm-accept');await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the local farm'));
  await click('#cloud-load');await click('#confirm-accept');await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the cloud farm'));
  await click('#farm-reset');await click('#confirm-cancel');assert.equal((await state()).money,money);
  await click('#cloud-local');await click('#confirm-accept');await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the local farm'));
  // An account change while confirming must not delete the newly selected account.
  await click('#account-delete');user={...user,id:2};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.getElementById('account-status').textContent.includes('Local farm'));
  if(await page.locator('#confirm-dialog').isVisible())await click('#confirm-accept');
  assert.equal(deletes,0);
  await click('#account-delete');await page.screenshot({path:`/tmp/agromate-confirm-delete-${width}.png`,fullPage:true});await click('#confirm-accept');
  await page.waitForFunction(()=>document.getElementById('signed-in-controls').hidden);assert.equal(deletes,1);
  assert.equal((await state()).money,money,'Deleting account preserves guest farm');
  await click('#farm-reset');await click('#confirm-accept');assert.equal((await state()).money,250);assert.equal(await page.evaluate(()=>localStorage.getItem('agromate-save')),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(native,[]);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: all upgrades, Escape/backdrop/cancel/focus, all five cloud/account prompts, guarded account switch, explicit delete/reset, no native prompts or runtime errors`);
  await context.close();
 }
}finally{await browser.close();}
