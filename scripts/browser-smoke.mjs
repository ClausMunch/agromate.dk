// Run with PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/browser-smoke.mjs
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
  const response=await page.goto(process.env.AGROMATE_URL || 'http://127.0.0.1:8088/');
  assert.equal(response.status(),200);
  assert.match(await response.text(),/<meta[^>]+property="og:title"/);
  await page.locator('#farmer-name').fill('Browser Farmer');
  await page.locator('#play').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('agromate-save'))?.farmerName==='Browser Farmer');
  assert.equal(await page.locator('#title-screen').evaluate(el=>el.open),false);
  await page.locator('#return-title').click();
  assert.equal(await page.locator('#title-screen').evaluate(el=>el.open),true);
  await page.locator('#farmer-name').fill('Renamed Farmer');
  await page.locator('#play').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('agromate-save')).farmerName),'Renamed Farmer');
  await page.reload();
  assert.equal(await page.locator('#farmer-name').inputValue(),'Renamed Farmer');
  assert.equal(await page.getByRole('button',{name:/account.*cloud|cloud.*account/i}).count()>0,true,'Account/cloud controls exist');
  assert.deepEqual(errors,[]);
  console.log('PASS: HTTP metadata, local create/rename/title/reload and account controls; zero page errors');
} finally {await browser.close();}
