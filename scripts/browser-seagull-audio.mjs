// Real media decoding and user-triggered playback on the local game only.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,isMobile:width<600,reducedMotion:'reduce',ignoreHTTPSErrors:true});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const NativeAudio=window.Audio;window.testAudioCount=0;window.testGullVoices=[];window.Audio=function(...args){window.testAudioCount++;const voice=new NativeAudio(...args);window.testGullVoices.push(voice);return window.testGullAudio=voice;};});
  await page.goto('https://agromate.ddev.site');
  await page.locator('#farmer-name').fill('Kris listener');await page.locator('#play').click();
  assert.equal(await page.evaluate(()=>window.testAudioCount),0,'No sound or audio fetch before interacting');
  const greet=async()=>{const button=page.locator('#kris-interact');if(width<600)await button.tap();else await button.click();};
  await greet();await page.waitForFunction(()=>window.testGullAudio?.currentTime>.15);
  const media=await page.evaluate(()=>({duration:testGullAudio.duration,error:testGullAudio.error,paused:testGullAudio.paused,volume:testGullAudio.volume}));
  assert.ok(Number.isFinite(media.duration)&&media.duration>0,'WAV decodes');assert.equal(media.error,null);assert.equal(media.paused,false);assert.equal(media.volume,.65);
  assert.match(await page.locator('#gull-speech').textContent(),/Mine!/);
  await greet();await page.waitForFunction(()=>testGullVoices.length===2&&testGullVoices.every(v=>!v.paused&&v.currentTime>0));assert.equal(await page.evaluate(()=>window.testAudioCount),2,'Repeated clicks create overlapping voices');
  assert.equal(await page.evaluate(()=>new URL(testGullAudio.src).pathname),'/seagull_mine.wav');
  await page.locator('#return-title').click();assert.equal(await page.evaluate(()=>testGullVoices.every(v=>v.paused)),true);
  await page.locator('#play').click();await page.locator('#kris-interact').waitFor({state:'visible'});await page.locator('#kris-interact').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!testGullAudio.paused&&testGullAudio.currentTime>0);
  await page.locator('#journal').click();assert.equal(await page.evaluate(()=>testGullVoices.every(v=>v.paused)),true,'Dialogs stop playback');
  const mapped=await page.evaluate(()=>AgromateFarm.snapshot());mapped.life.map=true;
  await page.evaluate(s=>AgromateFarm.replace(s),mapped);await page.locator('#play').click();await greet();
  await page.locator('#gull-speech').waitFor({state:'visible'});
  const bubble=await page.locator('#gull-speech').evaluate(el=>{const box=el.getBoundingClientRect(),shell=el.parentElement.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(el);return {wrap:getComputedStyle(el).whiteSpace,inside:[...range.getClientRects()].every(r=>r.left>=box.left&&r.right<=box.right&&r.top>=box.top&&r.bottom<=box.bottom),inFarm:box.left>=shell.left&&box.right<=shell.right&&box.top>=shell.top};});
  assert.equal(bubble.wrap,'normal');assert.equal(bubble.inside,true,'Bubble background contains every line of the full clue');assert.equal(bubble.inFarm,true);
  assert.match(await page.locator('#gull-speech').textContent(),/wildflowers/);
  await page.screenshot({path:`/tmp/agromate-kris-speech-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: WAV, overlapping voices, pointer/touch/keyboard, pause, complete wrapped clue inside bubble and farm, no runtime errors`);
  await context.close();
 }
}finally{await browser.close();}
