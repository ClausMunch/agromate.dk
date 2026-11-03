import assert from 'node:assert/strict';
import P from '../public/progression.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,isMobile:width<600,ignoreHTTPSErrors:true});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  const s=P.freshState();s.farmerName='Goal farmer';s.planted=4;s.tiles[0].tilled=true;
  await page.addInitScript(s=>{if(!localStorage.getItem('agromate-save'))localStorage.setItem('agromate-save',JSON.stringify(s));},s);
  const click=async selector=>{if(width<600)await page.locator(selector).tap();else await page.locator(selector).click();};
  await page.goto('https://agromate.ddev.site');await click('#play');
  assert.equal(await page.locator('#quest-count').textContent(),'4 / 5');
  await click('[aria-label="Seeds"]');await click('[data-seed="parsnip"]');
  await page.locator('#game').scrollIntoViewIfNeeded();
  const point=await page.locator('#game').evaluate(c=>{const r=c.getBoundingClientRect(),p=AgromateFarm.snapshot().player,vx=Math.max(0,Math.min(960-c.width,p.x-c.width/2)),vy=Math.max(0,Math.min(600-c.height,p.y-c.height*.65));return {x:r.x+(401-vx)/c.width*r.width,y:r.y+(289-vy)/c.height*r.height};});
  if(width<600)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  assert.equal(await page.locator('#quest-label').textContent(),'GOAL COMPLETE');
  assert.equal(await page.evaluate(()=>AgromateFarm.snapshot().money),300,'Original 50g reward paid once');
  await click('#journal');await page.waitForTimeout(2800);
  assert.equal(await page.locator('#quest-label').textContent(),'GOAL COMPLETE','Dialogs pause the completion notice');
  await click('#modal .dialog-close');
  await page.waitForFunction(()=>document.getElementById('quest-label').textContent==='FIRST HARVEST');
  assert.equal(await page.locator('#quest-count').textContent(),'0 / 5');
  await page.waitForFunction(()=>document.getElementById('quest-bar').getBoundingClientRect().width===0);
  await page.screenshot({path:`/tmp/agromate-goals-active-${width}.png`,fullPage:true});
  await page.reload();await click('#play');assert.equal(await page.locator('#quest-label').textContent(),'FIRST HARVEST','Reload skips completed planting goal');
  const mature=await page.evaluate(()=>AgromateFarm.snapshot());mature.harvested=50;mature.earned=2999;mature.upgrades.wateringCan=1;mature.life.coop=true;
  await page.evaluate(s=>AgromateFarm.replace(s),mature);await click('#play');assert.equal(await page.locator('#quest-label').textContent(),'SETTLING IN');
  assert.equal(await page.locator('#quest-count').textContent(),'2,999 / 3,000g');
  // Complete the last goal through real digging income, without a separate goal save field.
  await click('[data-life="treasure"]');await click('[data-action="dig-0"]');await click('#modal .dialog-close');
  await page.waitForFunction(()=>document.getElementById('quest').hidden);
  await page.screenshot({path:`/tmp/agromate-goals-finished-${width}.png`,fullPage:true});
  await page.reload();await click('#play');assert.equal(await page.locator('#quest').isVisible(),false,'Finished farms stay clear after reload');
  const fresh=P.freshState();fresh.farmerName='New farmer';await page.evaluate(s=>AgromateFarm.replace(s),fresh);await click('#play');
  assert.equal(await page.locator('#quest-label').textContent(),'SMALL BEGINNINGS','Replacing farms resets goal presentation');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: planting reward, brief completion, dialog pause, next goal, reload/advanced saves, final hiding, farm replacement, no overflow or runtime errors`);
  await context.close();
 }
}finally{await browser.close();}
