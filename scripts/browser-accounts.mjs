// Local test fixtures only. Generate with scripts/browser-fixture.php in the Docker harness.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import P from '../public/progression.js';
const scratch=process.env.TMPDIR;assert.ok(scratch?.startsWith('/home/munch/.hermes/cache/scratch'));
const artifacts=`${scratch}/agromate-repair`;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.AGROMATE_URL||'http://127.0.0.1:8088';
assert.equal(base,'http://127.0.0.1:8088','Authenticated fixture runner is limited to the isolated harness');
const a=JSON.parse(await readFile(`${artifacts}/session-a.json`,'utf8'));
const b=JSON.parse(await readFile(`${artifacts}/session-b.json`,'utf8'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
try {
 const initial=P.freshState();initial.money=5000;initial.day=4;initial.produce.carrot=7;initial.produce.strawberry=3;
 initial.upgrades={wateringCan:1,stable:true,plow:true,sprinkler:true,jamMaker:true};initial.horse={...initial.horse,owned:true,name:'Cloud Fern'};
 await page.addInitScript(state=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(state));},initial);
 await page.goto(base);
 await page.locator('#farmer-name').fill('Local Guest');await page.locator('#play').click();await page.locator('#return-title').click();
 await context.addCookies([a.cookie]);await page.reload();await page.locator('#title-account-open').click();
 await page.waitForFunction(()=>!document.getElementById('signed-in-controls').hidden);
 assert.match(await page.locator('#cloud-mode').textContent(),/Playing the local farm/);
 // A re-run can have an existing cloud farm: replacement is explicitly confirmed.
 await page.locator('#cloud-replace').click();
 await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the cloud farm'));
 if(await page.locator('#account-dialog').evaluate(el=>el.open))await page.locator('#account-close').click();
 await page.locator('#farmer-name').fill('Private Cloud A');await page.locator('#play').click();
 await page.waitForFunction(()=>document.getElementById('saved').textContent.includes('Saved to cloud'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).farmerName),'Local Guest');
 // Exercise v2 gameplay, autosave, and explicit reloading from the real authenticated server.
 await page.locator('#orders').click();await page.locator('[data-deliver="carrot-5"]').click();await page.locator('#modal .dialog-close').click();
 await page.locator('#shop').click();await page.locator('#jam-action').click();await page.locator('#modal .dialog-close').click();
 await page.waitForFunction(()=>document.getElementById('saved').textContent.includes('Saved to cloud'));
 const cloudState=await page.evaluate(()=>AgromateFarm.snapshot());assert.equal(cloudState.processor.input,'strawberry');assert.equal(cloudState.horse.name,'Cloud Fern');
 await page.reload();await page.locator('#title-account-open').click();await page.locator('#cloud-load').click();
 await page.waitForFunction(()=>window.AgromateFarm.snapshot().processor.input==='strawberry');
 assert.deepEqual(await page.evaluate(()=>AgromateFarm.snapshot()),cloudState);
 await page.locator('#account-close').click();await page.locator('#play').click();
 await page.locator('#sleep').click();await page.locator('#confirm-sleep').click();await page.locator('#shop').click();await page.locator('#jam-action').click();await page.locator('#modal .dialog-close').click();
 await page.waitForFunction(()=>document.getElementById('saved').textContent.includes('Saved to cloud'));
 assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().produce.jam),1);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).produce.jam),0,'Private progression never replaces guest storage');
 await page.locator('#account-open').click();
 await page.screenshot({path:`${artifacts}/account-desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${artifacts}/account-mobile-signedin.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:1440,height:1000});
 if(process.env.TEST_RESET_ONLY==='1') {
  await page.locator('#farm-reset').click();
  assert.equal(await page.evaluate(()=>window.AgromateFarm.snapshot().farmerName),'Private Cloud A','Cloud reset preserves a valid chosen farmer name');
  console.log('PASS: cloud reset retains valid name');
 } else {
  await page.locator('#public-name').fill('Public Alias A');await page.locator('#leaderboard-opt-in').check();await page.locator('#profile-form button').click();
  await page.waitForFunction(()=>document.getElementById('account-status').textContent==='Public profile saved');
  await page.locator('#account-close').click();await page.locator('#scoreboard-open').click();
  await page.waitForFunction(()=>document.getElementById('scoreboard-entries').textContent.includes('Public Alias A'));
  assert.doesNotMatch(await page.locator('#scoreboard-entries').textContent(),/browser-fixture|Private Cloud|@/);
  await page.screenshot({path:`${artifacts}/scoreboard-desktop.png`,fullPage:true});await page.locator('#scoreboard-close').click();
  // A separate writer advances the revision while this browser still has the previous one.
  await page.evaluate(async()=>{const session=await (await fetch('/api/session')).json();const headers={'Content-Type':'application/json','X-CSRF-TOKEN':session.csrf_token,'X-Account-ID':String(session.user.id)};const cloud=await(await fetch('/api/save',{headers})).json();const response=await fetch('/api/save',{method:'PUT',headers,body:JSON.stringify({revision:cloud.save.revision,state:{...cloud.save.state,money:333}})});if(!response.ok)throw Error('Fixture concurrent save failed');});
  await page.locator('#return-title').click();await page.locator('#farmer-name').fill('Conflicted Draft');await page.locator('#play').click();
  await page.waitForFunction(()=>document.getElementById('saved').textContent.includes('Cloud conflict'));
  await page.locator('#account-open').click();await page.locator('#cloud-load').click();
  await page.waitForFunction(()=>window.AgromateFarm.snapshot().money===333);
  assert.equal(await page.evaluate(()=>window.AgromateFarm.snapshot().farmerName),'Private Cloud A');
  // A different signed-in account in the shared browser must restore only the guest farm.
  await context.addCookies([b.cookie]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>window.AgromateFarm.snapshot().farmerName==='Local Guest');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('agromate-private-draft')),null);
  assert.match(await page.locator('#cloud-mode').textContent(),/Playing the local farm/);
  await page.locator('#title-account-open').click();await page.locator('#account-logout').click();await page.waitForFunction(()=>!document.getElementById('signed-out-controls').hidden);
  assert.equal(await page.evaluate(()=>window.AgromateFarm.snapshot().farmerName),'Local Guest');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${artifacts}/account-mobile.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile page has no horizontal overflow');
  assert.deepEqual(errors,[]);
  console.log('PASS: v2 horse/orders/jam gameplay, autosave, authenticated reload, private guest separation; explicit cloud replacement, debounce/name save, guest separation, public opt-in alias, revision conflict/load choice, account switch draft purge, logout, mobile layout; zero page errors');
 }
} finally {await browser.close();}
