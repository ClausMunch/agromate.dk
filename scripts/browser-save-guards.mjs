import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import P from '../public/progression.js';
const scratch=process.env.TMPDIR;assert.ok(scratch?.startsWith('/home/munch/.hermes/cache/scratch'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:8088',errors=[];
try{
 const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const fixture=JSON.parse(await readFile(`${scratch}/agromate-repair/session-a.json`));await context.addCookies([fixture.cookie]);
 const future={...P.freshState(),version:99,farmerName:'Future farm',money:999};
 await page.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},future);
 await page.goto(base);assert.equal(await page.locator('#play').isDisabled(),true);assert.match(await page.locator('#title-description').textContent(),/update/i);
 await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).version),99);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).money),999);
 await page.locator('#title-account-open').click();await page.locator('#cloud-load').click();await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the cloud farm'));
 await page.locator('#cloud-local').click();await page.locator('#account-close').click();assert.equal(await page.locator('#play').isDisabled(),true,'Returning from cloud keeps unsupported guest farm protected');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).version),99);
 await context.close();
 const cloud=await browser.newContext(),p=await cloud.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await cloud.addCookies([fixture.cookie]);
 const guest={...P.freshState(),farmerName:'Guarded guest'};guest.orders[0].id='"><img src=x onerror=window.orderInjected=true>';
 await p.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},guest);
 await p.goto(base);await p.locator('#play').click();await p.locator('#orders').click();assert.equal(await p.locator('#modal-content img').count(),0);assert.equal(await p.evaluate(()=>window.orderInjected),undefined);assert.equal(await p.locator('[data-deliver]').first().getAttribute('data-deliver'),guest.orders[0].id);await p.locator('#modal .dialog-close').click();await p.locator('#return-title').click();await p.locator('#title-account-open').click();await p.waitForFunction(()=>!document.getElementById('signed-in-controls').hidden);
 // Deliberately injected future server response; authenticated happy-path lives in browser-accounts.mjs.
 await p.route('**/api/save',route=>route.fulfill({json:{account_id:fixture.user_id,save:{revision:4,state:future}}}));
 await p.locator('#cloud-load').click();await p.waitForFunction(()=>document.getElementById('account-status').textContent.includes('update'));
 assert.equal(await p.evaluate(()=>AgromateFarm.snapshot().farmerName),'Guarded guest');assert.match(await p.locator('#cloud-mode').textContent(),/local farm/);
 await p.evaluate(({id,state})=>sessionStorage.setItem('agromate-private-draft',JSON.stringify({account_id:String(id),revision:4,state})),{id:fixture.user_id,state:future});
 await p.reload();await p.locator('#title-account-open').click();await p.locator('#draft-recover').click();
 await p.waitForFunction(()=>document.getElementById('account-status').textContent.includes('update'));
 assert.equal(await p.evaluate(()=>AgromateFarm.snapshot().farmerName),'Guarded guest');assert.equal(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('agromate-private-draft')).state.version),99);
 assert.match(await p.locator('#cloud-mode').textContent(),/local farm/);assert.deepEqual(errors,[]);
 console.log('PASS: future local save survives reload/pagehide and blocks Play; future cloud/draft responses preserve current farm, mode and original draft with explicit update message; escaped order attributes; zero page errors');
}finally{await browser.close();}
