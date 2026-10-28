// Run a local public/ server and Chrome with --remote-debugging-port=9238 first.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(process.argv[2] || 'http://127.0.0.1:8000/');
if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Expected an HTTP(S) preview URL');
const debug = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9238';
const tab = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject) => {ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let sequence = 0;
const pending = new Map();
const exceptions = [];
ws.addEventListener('message', ({data}) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
  if (message.id) {
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);clearTimeout(task.timeout);
    message.error ? task.reject(message.error) : task.resolve(message.result);
  }
});
function send(method,params={}) {
  return new Promise((resolve,reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => {pending.delete(id);reject(new Error(`Chrome timeout: ${method}`));},10000);
    pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
try {
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1200,height:630,deviceScaleFactor:1,mobile:false});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await send('Page.navigate',{url:new URL('about.html',origin).href});
  await evaluate('new Promise(resolve => document.readyState === "complete" ? resolve() : window.addEventListener("load",resolve,{once:true}))');
  const tree = await send('Page.getFrameTree');
  const html = (await readFile(path.join(root,'scripts/social-card.html'),'utf8')).replace('__ASSET_ORIGIN__',origin.href.replaceAll('&','&amp;').replaceAll('"','&quot;'));
  await send('Page.setDocumentContent',{frameId:tree.frameTree.frame.id,html});
  const ready = await evaluate(`new Promise(resolve => {let attempts=0;const check=()=>{const img=document.querySelector('.logo img'),canvas=document.querySelector('#title-landscape');if(img?.complete&&img.naturalWidth&&canvas?.getContext('2d').getImageData(0,0,1,1).data[3])resolve(true);else if(++attempts>100)resolve(false);else setTimeout(check,50)};check()})`);
  if (!ready || exceptions.length) throw new Error(`Share image failed to render: ${JSON.stringify(exceptions)}`);
  const result = await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1200,height:630,scale:1}});
  const output = path.join(root,'public/agromate-social-v1.png');
  await writeFile(output,Buffer.from(result.data,'base64'));
  console.log(`Rendered ${output} (1200 × 630 PNG)`);
} finally {
  ws.close();
  await fetch(`${debug}/json/close/${tab.id}`);
}
