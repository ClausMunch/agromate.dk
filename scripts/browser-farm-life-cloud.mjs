// Generate SESSION_FIXTURE with browser-fixture.php in the isolated local Docker harness.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import P from '../public/progression.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture=JSON.parse(await readFile(process.env.SESSION_FIXTURE||'/tmp/agromate-life-session.json','utf8'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await context.addCookies([fixture.cookie]);
 const guest=P.freshState();guest.farmerName='Life cloud test';guest.money=5000;
 await page.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},guest);
 await page.goto('http://127.0.0.1:8088');await page.locator('#title-account-open').click();
 await page.waitForFunction(()=>!document.getElementById('signed-in-controls').hidden);
 await page.locator('#cloud-replace').click();
 await page.waitForFunction(()=>document.getElementById('cloud-mode').textContent.includes('Playing the cloud farm'));
 await page.locator('#account-close').click();await page.locator('#play').click();
 await page.locator('[data-life="hens"]').click();await page.locator('[data-action="buy-coop"]').click();
 await page.locator('#hen-0').fill('Cloud Hazel');await page.locator('[data-action="name-0"]').click();
 await page.locator('[data-action="feed-hens"]').click();await page.locator('#modal .dialog-close').click();
 await page.locator('#sleep').click();await page.locator('#confirm-sleep').click();
 await page.waitForFunction(()=>document.getElementById('saved').textContent.includes('Saved to cloud'));
 const expected=await page.evaluate(()=>AgromateFarm.snapshot().life);assert.equal(expected.eggs,3);
 const server=await page.evaluate(async()=>{const session=await(await fetch('/api/session')).json();return(await fetch('/api/save',{headers:{'X-Account-ID':String(session.user.id)}})).json();});
 assert.deepEqual(server.save.state.life,expected);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).life.coop),false,'Private activities preserve the guest farm');
 await page.reload();await page.locator('#title-account-open').click();await page.locator('#cloud-load').click();
 await page.waitForFunction(()=>AgromateFarm.snapshot().life.hens[0]==='Cloud Hazel');
 assert.deepEqual(await page.evaluate(()=>AgromateFarm.snapshot().life),expected);assert.deepEqual(errors,[]);
 console.log('PASS: authenticated coop/name/feed/eggs autosave, real server data, explicit cloud reload, guest isolation and zero runtime errors');
}finally{await browser.close();}
