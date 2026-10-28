(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d'), modal=$('modal');
const WORLD={w:960,h:600}, garden={x:387,y:275,cols:7,rows:4,size:29};
const crops={parsnip:{name:'Parsnip',days:2,price:10,sell:35,color:'#eedb9c'},carrot:{name:'Carrot',days:3,price:15,sell:55,color:'#e99a46'},strawberry:{name:'Strawberry',days:4,price:25,sell:90,color:'#d96561'}};
const fresh=()=>({version:1,farmerName:'',day:1,minutes:360,money:250,energy:100,seeds:{parsnip:10,carrot:0,strawberry:0},produce:{parsnip:0,carrot:0,strawberry:0},selectedSeed:'parsnip',planted:0,harvested:0,earned:0,questReward:false,player:{x:489,y:422},tiles:Array.from({length:28},()=>({tilled:false,crop:null,age:0,watered:false}))});
let state=fresh(), storageOK=true, hasFarm=false, playing=false;
try{const raw=JSON.parse(localStorage.getItem('agromate-save'));if(raw&&raw.version===1&&raw.tiles?.length===28&&raw.seeds&&raw.produce&&raw.player&&Number.isFinite(raw.player.x)&&Number.isFinite(raw.money)){state={...fresh(),...raw};hasFarm=true;if(typeof state.farmerName!=='string')state.farmerName='';}}catch{storageOK=false;}
let tool=0,hover=null,target=null,actionFX=[],keys=new Set(),facing={x:0,y:1},walk=0,moving=false,idleTime=0,last=0,clockElapsed=0,dirty=false,toastTimer,view={w:960,h:600,x:0,y:0},audio=null,soundEnabled=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const tools=[['Hoe','Prepare a little patch of earth'],['Seeds','Plant something wonderful'],['Watering can','A little care goes a long way'],['Harvest','Gather the good things you grew'],['Basket','Sell your harvest at the shipping box']];
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
let seed=1187;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
const base=document.createElement('canvas');base.width=960;base.height=600;const b=base.getContext('2d');
function tree(c,x,y,s=1,type=0){c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);ellipse(c,5,7,27,9,'#4e783c55');rect(c,-5,-24,11,30,'#775a38');rect(c,-2,-22,4,28,'#9c7545');rect(c,4,-18,3,22,'#624c32');if(type){for(let i=0;i<4;i++){let yy=-65+i*14,ww=12+i*7;poly(c,[[0,yy-22],[-ww,yy+13],[ww,yy+13]],['#355b40','#416d43','#4b7d46','#58874b'][i]);rect(c,-ww+5,yy+10,ww,3,'#65934e');}}else{const blobs=[[-21,-37,21,17,'#3e6a3e'],[19,-37,23,18,'#3c6b3c'],[-12,-56,23,20,'#507e43'],[11,-59,24,22,'#598b47'],[0,-39,31,22,'#568648'],[-20,-49,16,14,'#63934c'],[10,-64,18,15,'#6c9d51'],[-3,-46,24,17,'#679849']];for(const [xx,yy,rx,ry,col]of blobs){poly(c,[[xx-rx,yy-ry/2],[xx-rx+7,yy-ry],[xx+rx-8,yy-ry],[xx+rx,yy-5],[xx+rx-3,yy+ry-5],[xx+rx/2,yy+ry],[xx-rx+4,yy+ry-4]],col);}for(let i=0;i<18;i++)rect(c,-25+rand()*48,-71+rand()*38,3+Math.floor(rand()*4),2,'#92ad5c');}c.restore();}
function fence(c,x,y,n,horizontal=true){for(let i=0;i<n;i++){let xx=x+(horizontal?i*24:0),yy=y+(horizontal?0:i*24);rect(c,xx+2,yy+5,horizontal?25:4,horizontal?4:27,'#816c45');rect(c,xx+2,yy+12,horizontal?25:4,horizontal?4:27,'#c3a775');rect(c,xx,yy,5,23,'#a38b59');rect(c,xx,yy,5,3,'#e1cd91');rect(c,xx+4,yy+3,2,20,'#796844');}}
function flower(c,x,y,col='#f1d98b'){rect(c,x,y,2,7,'#507b3d');rect(c,x-2,y-2,6,3,col);rect(c,x,y-4,2,7,col);rect(c,x,y-1,2,2,'#d8b95c');}
function rock(c,x,y,s=1){poly(c,[[x-8*s,y],[x-5*s,y-7*s],[x+3*s,y-9*s],[x+9*s,y-3*s],[x+9*s,y+3*s],[x-5*s,y+4*s]],'#7c8872');poly(c,[[x-6*s,y-2*s],[x-3*s,y-6*s],[x+3*s,y-7*s],[x+6*s,y-3*s]],'#a6ad8c');}
function house(){ellipse(b,310,242,95,19,'#52723c55');rect(b,232,151,154,91,'#846843');rect(b,237,150,146,86,'#d0b07a');for(let y=157;y<235;y+=10){rect(b,237,y,146,2,'#ae8d5d');rect(b,240,y+2,138,1,'#e0bf86');}rect(b,230,232,160,11,'#887b59');for(let i=0;i<10;i++)rect(b,232+i*16,235,12,5,'#b7a582');rect(b,298,190,27,47,'#766340');rect(b,302,194,19,43,'#9a7545');rect(b,303,197,2,36,'#b18b53');rect(b,317,215,3,3,'#e6ca72');rect(b,295,235,34,5,'#dbc69a');rect(b,292,240,40,5,'#bca87d');for(const x of [251,344]){rect(b,x-3,177,26,31,'#8c744e');rect(b,x,180,20,25,'#a6c4ac');rect(b,x+3,183,6,8,'#d3dfb9');rect(b,x+9,180,2,25,'#f1dbab');rect(b,x,191,20,3,'#f1dbab');rect(b,x-5,205,30,5,'#a38251');rect(b,x-2,210,24,7,'#8c673e');for(let j=0;j<5;j++)flower(b,x+j*4,209,j%2?'#e49a81':'#e4dca2');}rect(b,353,98,17,47,'#8a7960');for(let y=99;y<136;y+=7){rect(b,354,y,15,2,'#b09c79');}rect(b,350,94,23,7,'#b6a07c');poly(b,[[216,161],[239,105],[308,83],[379,108],[402,161]],'#74513f');poly(b,[[221,154],[245,105],[308,88],[376,108],[397,154]],'#b46a4b');for(let y=111;y<154;y+=8){const inset=(154-y)*.45;rect(b,221+inset,y,176-inset*2,2,'#8c523e');for(let x=235;x<390;x+=17){if(x>221+inset&&x<397-inset)rect(b,x+(y%16?8:0),y-5,2,5,'#ca8256');}}rect(b,216,156,186,6,'#694d38');rect(b,219,153,180,3,'#d18a58');poly(b,[[274,150],[307,119],[341,150]],'#edce8b');poly(b,[[279,150],[307,124],[335,150]],'#b2704f');rect(b,299,139,17,16,'#745d40');rect(b,302,141,11,11,'#b9c6a1');rect(b,306,140,2,14,'#e6ce92');rect(b,298,152,19,3,'#e0bb79');}
function makeWorld(){rect(b,0,0,960,600,'#7e9d50');for(let i=0;i<14500;i++){const x=rand()*960,y=rand()*600;rect(b,x,y,rand()>.7?3:2,2,['#86a557','#75994b','#8ba85a','#719348','#91aa5d'][Math.floor(rand()*5)]);} // worn paths
poly(b,[[304,226],[332,226],[334,252],[373,253],[373,414],[654,414],[654,444],[347,444],[347,280],[302,280]],'#bdad77');poly(b,[[320,249],[756,249],[756,274],[320,274]],'#c2b17b');poly(b,[[460,421],[490,421],[490,600],[456,600]],'#c2b17b');for(let i=0;i<1700;i++){let x=rand()*960,y=rand()*600;if((x>348&&x<372&&y>260&&y<430)||(y>416&&y<442&&x>352&&x<655)||(x>459&&x<488&&y>425)||(y>251&&y<272&&x>320&&x<750))rect(b,x,y,2,1,rand()>.5?'#d3c08b':'#ab9b69');}
// pond with stepped pixel edges
const pond=[[744,302],[807,300],[807,308],[837,308],[837,323],[858,323],[858,342],[867,342],[867,385],[855,385],[855,407],[828,407],[828,419],[761,419],[761,412],[725,412],[725,397],[709,397],[709,370],[701,370],[701,339],[718,339],[718,319],[744,319]];
poly(b,pond,'#acaa6b');b.save();b.translate(3,-5);poly(b,pond,'#577a59');b.restore();b.save();b.translate(5,-9);poly(b,pond,'#719e95');b.restore();poly(b,[[748,318],[804,314],[832,330],[848,348],[848,384],[817,402],[759,402],[729,383],[721,347]],'#78a89e');for(let i=0;i<90;i++){let x=725+rand()*115,y=326+rand()*66;rect(b,x,y,4+rand()*9,2,'#95bbab');}for(const [x,y]of [[726,335],[838,385],[791,395]]){ellipse(b,x,y,8,4,'#60854f');rect(b,x,y-4,2,4,'#cad58b');}for(let i=0;i<17;i++){let x=714+rand()*139,y=i%2?417+rand()*8:299+rand()*9;rect(b,x,y,2,10,'#6b8641');rect(b,x+3,y+3,2,8,'#8a984a');}rock(b,858,408,1.1);rock(b,866,397,.8);
// garden earth and timber edging
rect(b,380,268,217,130,'#607c3b');rect(b,383,271,211,124,'#b09b67');rect(b,387,275,203,116,'#87974c');for(let r=0;r<4;r++)for(let c=0;c<7;c++){let x=387+c*29,y=275+r*29;rect(b,x+1,y+1,27,27,'#a99a61');for(let j=0;j<18;j++)rect(b,x+rand()*26+2,y+rand()*26+2,2,1,'#b9a66e');}rect(b,380,268,217,3,'#d3bd85');rect(b,380,271,3,124,'#c3ab77');rect(b,383,395,211,3,'#796c45');
house();fence(b,211,266,5);fence(b,611,269,4);fence(b,216,333,1,false);fence(b,216,357,5);fence(b,611,393,3);
// shipping crate
rect(b,636,306,44,31,'#795b38');rect(b,639,307,38,27,'#b58a51');for(let i=0;i<4;i++)rect(b,639,309+i*7,38,2,'#936c3e');rect(b,634,299,48,10,'#d0a567');rect(b,637,301,42,3,'#e1b878');rect(b,643,313,6,22,'#d4aa66');rect(b,668,313,5,22,'#d4aa66');rect(b,653,316,11,11,'#e6cc8d');rect(b,656,319,5,5,'#7a8c4b');
// mailbox and sign
rect(b,402,220,5,28,'#8b7351');rect(b,391,213,25,15,'#7c9481');rect(b,390,212,27,4,'#a8b7a1');rect(b,410,208,3,12,'#c8785a');rect(b,412,208,8,5,'#dd9972');rect(b,605,221,4,31,'#947b4c');rect(b,587,216,41,19,'#cbb17a');rect(b,589,218,37,14,'#dfc78c');b.fillStyle='#7a6c47';b.font='6px monospace';b.textAlign='center';b.fillText('FARM',607,227);
// trees and wilderness
for(let i=0;i<19;i++)tree(b,i*57-18,57+rand()*23,1.05+rand()*.25,i%6===0);for(let i=0;i<10;i++){tree(b,18+rand()*38,105+i*57,1.1,i%4===0);tree(b,918+rand()*32,95+i*55,1.12,i%3===0);}for(const [x,y,s,t]of [[135,145,1.2,0],[182,119,1,0],[833,144,1.3,0],[884,219,1,1],[127,318,1.1,0],[165,442,1.2,0],[270,483,1.1,0],[93,532,1.3,0],[348,568,1.1,0],[672,545,1.15,0],[787,513,1.2,0],[878,556,1.1,0],[579,574,.9,1]])tree(b,x,y,s,t);
for(let i=0;i<100;i++){let x=85+rand()*800,y=90+rand()*470;if((x>205&&x<695&&y>86&&y<460)||(x>690&&x<875&&y>285&&y<435)||(x>445&&x<500&&y>420))continue;flower(b,x,y,['#e7d89a','#f0dfaf','#c6b8bc','#ecc48a'][i%4]);}for(const [x,y,s]of [[191,195,.8],[697,189,.7],[227,500,.6],[610,486,.6],[874,277,.8],[105,400,.6]])rock(b,x,y,s);
// vegetables outside the main field, baskets, logs
for(let i=0;i<6;i++){rect(b,246+i*16,319,12,17,'#8a7845');flower(b,251+i*16,319,'#c8c57a');rect(b,249+i*16,325,6,6,'#db9e55');}rect(b,181,288,22,16,'#b9995a');rect(b,180,287,24,4,'#d3b77b');rect(b,182,296,20,2,'#7e6e42');for(let i=0;i<3;i++){rect(b,688+i*6,452-i*2,7,24,'#957343');rect(b,689+i*6,452-i*2,4,4,'#c8a269');}
}
makeWorld();
function crop(c,x,y,t){if(!t.crop)return;const type=crops[t.crop],p=Math.min(t.age/type.days,1);if(p===0){rect(c,x-3,y,6,2,'#e4c28a');rect(c,x-1,y-2,2,5,'#765132');return;}const h=6+p*12;rect(c,x-1,y-h,3,h,'#527342');poly(c,[[x,y-5],[x-9,y-11],[x-8,y-15],[x-2,y-12],[x+1,y-4]],'#719548');poly(c,[[x,y-8],[x+8,y-16],[x+10,y-13],[x+8,y-7]],'#8ba856');if(p>=1){if(t.crop==='strawberry'){for(const off of [-5,5]){rect(c,x+off-3,y-8,7,7,type.color);rect(c,x+off-1,y-7,1,1,'#f0c887');rect(c,x+off,y-4,1,1,'#f0c887');}}else{poly(c,[[x-5,y-5],[x+5,y-5],[x+4,y+2],[x,y+6],[x-3,y+2]],type.color);rect(c,x-3,y-4,3,5,'#fff0b4');}rect(c,x-2,y-h-3,3,7,'#8eaf58');}}
function updateFarmerIdle(dt, active) {
  if (moving) { idleTime = 0; return; }
  if (!active) return;
  idleTime += dt;
  // Turning also updates the tool direction, so Space uses the tile we face.
  if (idleTime >= .9) facing = { x: 0, y: 1 };
}
function farmer(c, x, y, idle) {
  const turning = !reduced && !moving && idle >= .65 && idle < .9 && facing.y < 0;
  const side = facing.x !== 0 || turning;
  const back = facing.y < 0 && !turning;
  const direction = facing.x < 0 ? -1 : 1;
  const step = moving ? Math.sin(walk) * 2 : 0;
  const breathe = !reduced && !moving && idle > 1.1 ? Math.round(Math.sin((idle - 1.1) * Math.PI * .7)) : 0;
  const blink = !reduced && !moving && idle > 1.1 && (idle - 1.1) % 5.4 > 5.23;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  ellipse(c, 0, 3, 11, 4, '#415c3e55');
  if (side) c.scale(direction, 1);
  if (side) {
    // Profile legs and boots alternate along the direction of travel.
    rect(c, -4 - step, -10, 5, 11, '#46525b');
    rect(c, 1 + step, -10, 5, 11, '#56636a');
    rect(c, -4 - step, 0, 7, 3, '#624f3c');
    rect(c, 1 + step, 0, 7, 3, '#71583f');
  } else {
    rect(c, -6, -10, 5, 11 + step, '#46525b');
    rect(c, 2, -10, 5, 11 - step, '#46525b');
    rect(c, -7, step, 6, 3, '#624f3c');
    rect(c, 2, -step, 6, 3, '#624f3c');
  }
  // Only the upper body rises with each breath; the feet stay on the ground.
  c.translate(0, breathe);
  if (side) {
    rect(c, -6, -24, 13, 16, '#c78b63');
    rect(c, -5, -20, 11, 12, '#678c8a');
    rect(c, 2, -23, 3, 13, '#adc0a0');
    rect(c, -2, -22, 5, 10, '#d5a37b');
    rect(c, -2 + step, -13, 4, 4, '#e8bd8b');
    rect(c, -5, -36, 13, 14, '#dcb082');
    rect(c, -7, -36, 6, 15, '#805b3a');
    rect(c, -2, -36, 10, 5, '#805b3a');
    rect(c, 7, -29, 3, 4, '#e8bd8b');
    rect(c, 4, -29 + (blink ? 1 : 0), 2, blink ? 1 : 2, '#4b4b3b');
    rect(c, -11, -39, 24, 5, '#d6b16b');
    rect(c, -7, -46, 16, 9, '#e4c37d');
    rect(c, -5, -46, 11, 2, '#f0d893');
    rect(c, -7, -39, 16, 2, '#a37b47');
  } else {
    rect(c, -8, -24, 17, 16, '#c78b63');
    rect(c, -6, -20, 13, 12, back ? '#587e7d' : '#678c8a');
    rect(c, -4, -22, 3, 8, '#adc0a0');
    rect(c, 3, -22, 3, 8, '#adc0a0');
    if (back) {
      rect(c, -4, -15, 10, 2, '#adc0a0');
      rect(c, -4, -11, 3, 3, '#466d70');
      rect(c, 3, -11, 3, 3, '#466d70');
    }
    rect(c, -11, -22, 4, 11, '#e8bd8b');
    rect(c, 9, -22, 4, 11, '#e8bd8b');
    rect(c, -7, -36, 15, 14, '#dcb082');
    rect(c, -9, -37, 18, 6, '#805b3a');
    if (back) {
      rect(c, -8, -32, 16, 9, '#805b3a');
      rect(c, -5, -30, 3, 6, '#966d43');
      rect(c, 3, -31, 3, 6, '#966d43');
    } else {
      rect(c, -8, -30, 3, 8, '#805b3a');
      rect(c, -2, -29 + (blink ? 1 : 0), 2, blink ? 1 : 2, '#4b4b3b');
      rect(c, 5, -29 + (blink ? 1 : 0), 2, blink ? 1 : 2, '#4b4b3b');
    }
    rect(c, -12, -39, 26, 5, '#d6b16b');
    rect(c, -8, -46, 18, 9, '#e4c37d');
    rect(c, -6, -46, 13, 2, '#f0d893');
    rect(c, -8, -39, 18, 2, '#a37b47');
  }
  c.restore();
}
function drawTool(c,index){c.clearRect(0,0,20,20);if(index===0){poly(c,[[5,17],[7,18],[15,5],[13,3]],'#9c7149');poly(c,[[8,3],[17,3],[18,6],[14,7],[13,5],[8,5]],'#808e87');rect(c,9,3,7,1,'#c1c8ac');}if(index===1){rect(c,5,5,11,12,'#bfa06a');rect(c,5,4,11,3,'#e2cc96');rect(c,7,8,7,6,'#f1dfac');rect(c,10,9,1,5,'#71884e');rect(c,8,9,3,2,'#8ca35b');rect(c,11,8,2,3,'#8ca35b');}if(index===2){rect(c,5,8,10,8,'#789d9c');rect(c,7,6,6,3,'#9db8ac');rect(c,3,6,3,8,'#7f9c95');rect(c,1,7,4,2,'#96afa1');poly(c,[[14,10],[18,6],[19,8],[16,14],[13,14]],'#789d9c');rect(c,7,9,2,5,'#b6ccba');}if(index===3){poly(c,[[3,16],[5,18],[13,7],[11,5]],'#ad8451');poly(c,[[11,5],[12,2],[17,2],[19,5],[19,9],[17,11],[15,10],[17,7],[16,5]],'#9ca99b');}if(index===4){rect(c,4,9,13,8,'#bc985c');rect(c,3,8,15,3,'#dac18a');rect(c,7,5,7,2,'#947e4c');rect(c,5,6,2,4,'#947e4c');rect(c,14,6,2,4,'#947e4c');rect(c,5,13,11,1,'#8e7846');rect(c,8,10,1,7,'#e1bd75');rect(c,13,10,1,7,'#e1bd75');}}
tools.forEach(([name],i)=>{const button=document.createElement('button');button.className='tool'+(i===0?' active':'');button.title=`${i+1} · ${name}`;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed',String(i===0));button.innerHTML=`<span class="tool-key">${i+1}</span><canvas width="20" height="20" aria-hidden="true"></canvas><span class="tool-amount" id="amount-${i}"></span>`;drawTool(button.querySelector('canvas').getContext('2d'),i);if(i===1){button.setAttribute('popovertarget','seed-picker');button.setAttribute('aria-controls','seed-picker');button.setAttribute('aria-expanded','false');}button.onclick=()=>selectTool(i,i===1);$('toolbar').append(button);});
Object.entries(crops).forEach(([id, crop]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'seed-option';
  button.dataset.seed = id;
  button.innerHTML = `<span class="seed-swatch" aria-hidden="true" style="--crop-color:${crop.color}"></span><span>${crop.name}</span><strong></strong>`;
  button.onclick = () => {
    if (state.seeds[id] <= 0) return;
    state.selectedSeed = id;
    selectTool(1);
    update();
    save();
    document.querySelector('.tool:nth-child(2)').focus({preventScroll:true});
  };
  $('seed-options').append(button);
});
function positionSeedPicker() {
  const picker = $('seed-picker');
  if (!picker.matches(':popover-open')) return;
  const toolbar = $('toolbar').getBoundingClientRect();
  const width = Math.min(310, window.innerWidth - 24);
  picker.style.width = width + 'px';
  picker.style.left = Math.max(12, Math.min(window.innerWidth - width - 12, toolbar.left + toolbar.width / 2 - width / 2)) + 'px';
  picker.style.top = Math.max(12, toolbar.top - picker.getBoundingClientRect().height - 10) + 'px';
}
$('seed-picker').addEventListener('toggle', event => {
  const open = event.newState === 'open';
  document.querySelector('.tool:nth-child(2)').setAttribute('aria-expanded', String(open));
  document.querySelector('.game-shell').classList.toggle('sowing', open);
  if (open) positionSeedPicker();
});
window.addEventListener('resize', positionSeedPicker);
window.addEventListener('scroll', positionSeedPicker, {passive:true});
function updateSeedPicker() {
  document.querySelectorAll('[data-seed]').forEach(button => {
    const id = button.dataset.seed, count = state.seeds[id];
    button.disabled = count <= 0;
    button.setAttribute('aria-pressed', String(state.selectedSeed === id));
    button.setAttribute('aria-label', `${crops[id].name}, ${count} seeds${count <= 0 ? ', buy more at the seed shop' : ''}`);
    button.querySelector('strong').textContent = count;
  });
}
function selectTool(i,keepPicker=false){if(!keepPicker)$('seed-picker').hidePopover();tool=i;updateSeedPicker();document.querySelectorAll('.tool').forEach((el,j)=>{el.classList.toggle('active',i===j);el.setAttribute('aria-pressed',String(i===j));});$('tool-caption').innerHTML=tools[i][0].toUpperCase()+' <span>·</span> '+(i===1?crops[state.selectedSeed].name+' seeds selected':tools[i][1]);}
function save(){if(!playing&&!hasFarm)return;try{localStorage.setItem('agromate-save',JSON.stringify(state));storageOK=true;dirty=false;}catch{storageOK=false;}$('saved').textContent=storageOK?'● Saved on this device':'● Saving unavailable';}
function update(){ updateSeedPicker(); $('day').textContent=((state.day-1)%28)+1;$('weekday').textContent=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][(state.day-1)%7]+', Year '+(Math.floor((state.day-1)/112)+1);$('money').textContent=state.money.toLocaleString();$('energy-label').textContent=state.energy+' / 100';$('energy-bar').style.width=state.energy+'%';$('amount-1').textContent=state.seeds[state.selectedSeed];$('amount-4').textContent=Object.values(state.produce).reduce((a,b)=>a+b,0)||'';let mins=Math.floor(state.minutes/10)*10,h=Math.floor(mins/60);$('time').textContent=(h%12||12)+':'+String(mins%60).padStart(2,'0')+(h>=12?' pm':' am');let count=Math.min(5,state.planted);$('quest-count').textContent=count+' / 5';$('quest-bar').style.width=count*20+'%';if(state.questReward){$('quest-title').textContent='A growing beginning';$('quest-description').textContent='Your roots are taking hold. Harvest, sell, and make this farm your own.';$('quest-count').textContent='✓';} }
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function effect(x,y,text,color='#fff4c6'){actionFX.push({x,y,text,color,life:1.3});}
function tileAt(x,y){let col=Math.floor((x-garden.x)/29),row=Math.floor((y-garden.y)/29);return col>=0&&col<7&&row>=0&&row<4?row*7+col:null;}
function tileCenter(i){return{x:garden.x+(i%7)*29+14,y:garden.y+Math.floor(i/7)*29+14};}
function useTile(i){const t=state.tiles[i],pos=tileCenter(i);if(tool===4){sell();return;}if(state.energy<2){toast('Time to rest. End the day to restore your energy.');return;}let message='';if(tool===0){if(t.crop){toast('Something is already growing here.');return;}if(t.tilled){toast('Ready for seeds! Select the seed packet (2).');return;}t.tilled=true;message='Fresh earth';}if(tool===1){if(!t.tilled){toast('Use the hoe (1) to prepare this soil first.');return;}if(t.crop){toast('This little patch already has a crop.');return;}if(state.seeds[state.selectedSeed]<=0){toast('Out of these seeds. Click the seed packet to choose another type, or visit the seed shop.');return;}t.crop=state.selectedSeed;t.age=0;state.seeds[t.crop]--;state.planted++;message='Planted';if(state.planted>=5&&!state.questReward){state.questReward=true;state.money+=50;toast('Small beginnings complete! A little gift: +50g.');}}if(tool===2){if(!t.tilled){toast('Prepare the soil with your hoe first.');return;}if(t.watered){toast('Already watered. Let nature do its thing.');return;}t.watered=true;message='Watered';}if(tool===3){if(!t.crop){toast('Nothing to gather here just yet.');return;}if(t.age<crops[t.crop].days){toast(crops[t.crop].name+': '+(crops[t.crop].days-t.age)+' watered day(s) until harvest.');return;}state.produce[t.crop]++;state.harvested++;message='+1 '+crops[t.crop].name;t.crop=null;t.age=0;t.watered=false;}state.energy-=2;state.minutes=Math.min(1190,state.minutes+5);effect(pos.x,pos.y-15,message);dirty=true;update();save();chime();}
function sell(){let total=0,count=0;for(const id in state.produce){count+=state.produce[id];total+=state.produce[id]*crops[id].sell;state.produce[id]=0;}if(!count){toast('Your basket is empty. Harvest ripe crops with tool 4 first.');return;}state.money+=total;state.earned+=total;effect(659,294,'+'+total+'g');toast(`Sold ${count} crop${count===1?'':'s'} for ${total}g. A good day's work.`);update();save();chime();}
function endDay(){const watered=state.tiles.filter(t=>t.crop&&t.watered).length,dry=state.tiles.filter(t=>t.crop&&!t.watered&&t.age<crops[t.crop].days).length;openModal(`<div class="eyebrow">A WELL-EARNED REST</div><h2>Call it a day?</h2><p>${watered?`${watered} watered crop${watered===1?' is':'s are'} ready to grow overnight.`:'A new morning brings a fresh start.'} ${dry?`${dry} unwatered crop${dry===1?' will':'s will'} wait for a little care.`:''}</p><p>Sleep restores all your energy. Your farm is saved automatically.</p><button class="primary-button" id="confirm-sleep">Sleep until morning ☾</button>`);$('confirm-sleep').onclick=()=>{for(const t of state.tiles){if(t.crop&&t.watered)t.age=Math.min(crops[t.crop].days,t.age+1);t.watered=false;}state.day++;state.energy=100;state.minutes=360;target=null;modal.close();update();save();toast('Good morning! A new day, a little more possibility.');};}
function openModal(html){$('seed-picker').hidePopover();keys.clear();target=null;$('modal-content').innerHTML=html;if(!modal.open)modal.showModal();}
function shop(){openModal(`<div class="eyebrow">WILLOWBROOK SEED & SUPPLY</div><h2>Good things start small.</h2><p>Pick a seed to plant. Every growing day needs water.<br>Your purse: <strong>${state.money}g</strong></p>`+Object.entries(crops).map(([id,c])=>`<div class="shop-row"><div><strong>${c.name}</strong><small>${c.days} days · sells for ${c.sell}g · ${state.seeds[id]} in your bag</small><small><label><input type="radio" name="seed" value="${id}" ${state.selectedSeed===id?'checked':''}> Select for planting</label></small></div><button data-buy="${id}" ${state.money<c.price*5?'disabled':''}>5 seeds · ${c.price*5}g</button></div>`).join(''));document.querySelectorAll('[data-buy]').forEach(el=>el.onclick=()=>{let id=el.dataset.buy,price=crops[id].price*5;if(state.money<price)return;state.money-=price;state.seeds[id]+=5;state.selectedSeed=id;update();save();selectTool(1);shop();});document.querySelectorAll('[name="seed"]').forEach(el=>el.onchange=()=>{state.selectedSeed=el.value;selectTool(1);update();save();});}
function help(){openModal(`<div class="eyebrow">WELCOME TO AGROMATE</div><h2>Make yourself at home.</h2><p>A little land, a handful of seeds, and all the time you need.</p><ol class="help-list"><li><strong>Explore</strong> with WASD, arrow keys, or tap a path.</li><li><strong>Till</strong> a garden square with the hoe (1).</li><li><strong>Plant</strong> a seed (2). Click the seed packet to open the seed selector, choose a crop, then water it (3).</li><li><strong>End the day</strong> to grow watered crops.</li><li><strong>Harvest</strong> ripe crops (4), then sell with the basket (5) or click the wooden shipping box.</li></ol><p class="welcome-note">Click a garden tile to use your selected tool. Space uses it in front of you. Start with 10 parsnip seeds; they grow in 2 watered days. Progress saves on this device.</p><button class="primary-button" id="start-farming">Back to the farm →</button>`);$('start-farming').onclick=()=>modal.close();}
$('contact').onclick = () => {
  const address = String.fromCharCode(97,103,114,111,109,97,116,101,64,99,111,100,101,112,111,105,110,116,46,100,101,118);
  openModal(`<div class="eyebrow">LET'S TALK</div><h2>Get in touch.</h2><p>Questions, feedback, or a little farm trouble? Send me an email.</p><a class="contact-email" href="mailto:${address}">${address}</a>`);
};
$('shop').onclick=shop;$('sleep').onclick=endDay;$('help').onclick=help;$('journal').onclick=()=>openModal(`<div class="eyebrow">YOUR FARM JOURNAL</div><h2>One day at a time.</h2><p>Willowbrook Farm · Spring, day ${((state.day-1)%28)+1}</p><div class="journal-stats"><div>Seeds planted<strong>${state.planted}</strong></div><div>Crops harvested<strong>${state.harvested}</strong></div><div>Gold earned<strong>${state.earned}g</strong></div><div>Days on the farm<strong>${state.day}</strong></div></div><p>In your basket: ${Object.entries(state.produce).map(([id,n])=>`${n} ${crops[id].name.toLowerCase()}${n===1?'':'s'}`).join(', ')}.</p><p>Growing: ${state.tiles.filter(t=>t.crop).length} crops. Ready to harvest: ${state.tiles.filter(t=>t.crop&&t.age>=crops[t.crop].days).length}.</p><p class="welcome-note">${storageOK?'Your progress is saved in this browser. Come back whenever you like.':'Local saving is unavailable in this browser. Keep this tab open to retain your progress.'}</p>`);
document.querySelector('.dialog-close').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){let r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
const blocks=[{x:224,y:100,w:175,h:145},{x:700,y:296,w:173,h:123},{x:630,y:296,w:55,h:43}];
function canWalk(x,y){return x>70&&x<895&&y>82&&y<560&&!blocks.some(r=>x>r.x-5&&x<r.x+r.w+5&&y>r.y&&y<r.y+r.h+6);}
function worldPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*view.w+view.x,y:(e.clientY-r.top)/r.height*view.h+view.y};}
canvas.addEventListener('pointermove',e=>{const p=worldPoint(e);hover=tileAt(p.x,p.y);});canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('pointerdown',e=>{if(!playing)return;e.preventDefault();canvas.focus({preventScroll:true});const p=worldPoint(e),i=tileAt(p.x,p.y);if(i!==null){useTile(i);return;}if(p.x>625&&p.x<690&&p.y>290&&p.y<345){sell();return;}if(p.x>289&&p.x<335&&p.y>188&&p.y<250){endDay();return;}if(canWalk(p.x,p.y))target=p;else toast('Take the path around the farmhouse and pond.');});
window.addEventListener('keydown',e=>{if(!playing||modal.open)return;let k=e.key.toLowerCase();if(e.target.closest?.('#seed-picker')&&[' ','enter','arrowup','arrowdown','arrowleft','arrowright'].includes(k))return;if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(k)){e.preventDefault();keys.add(k);target=null;}if('12345'.includes(k)&&k.length===1&&!e.repeat){const wasOpen=$('seed-picker').matches(':popover-open');selectTool(Number(k)-1);if(k==='2'&&!wasOpen)$('seed-picker').showPopover();}if(k===' '&&!e.repeat){if(tool===4)sell();else{let i=tileAt(state.player.x+facing.x*24,state.player.y+facing.y*24);if(i===null)i=tileAt(state.player.x,state.player.y);if(i!==null)useTile(i);else toast('Use your tool on the garden squares. Click a square to reach it.');}}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();save();}});window.addEventListener('pagehide',save);
document.querySelectorAll('[data-dir]').forEach(el=>{const key={up:'w',left:'a',down:'s',right:'d'}[el.dataset.dir];el.addEventListener('pointerdown',e=>{e.preventDefault();target=null;keys.add(key);el.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>keys.delete(key));});
function resize(){const r=canvas.getBoundingClientRect(),ratio=r.width/r.height;view.w=Math.min(960,600*ratio);view.h=Math.min(600,960/ratio);canvas.width=Math.round(view.w);canvas.height=Math.round(view.h);ctx.imageSmoothingEnabled=false;}
new ResizeObserver(resize).observe(canvas);
function showTitle() {
  playing = false;
  keys.clear(); target = null;
  $('seed-picker').hidePopover();
  if (modal.open) modal.close();
  $('farmer-name').value = state.farmerName;
  $('farmer-name').setCustomValidity('');
  $('play').textContent = hasFarm ? 'Continue your farm →' : 'Play →';
  $('title-description').textContent = hasFarm ? 'Welcome back. Your little corner of Willowbrook is right where you left it.' : 'A patch of earth. A handful of seeds. A little place to call your own.';
  if (!$('title-screen').open) $('title-screen').showModal();
}
$('title-screen').addEventListener('cancel', event => event.preventDefault());
$('farmer-name').addEventListener('input', () => $('farmer-name').setCustomValidity(''));
$('start-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('farmer-name').value.trim().slice(0, 24);
  if (!name) {
    $('farmer-name').setCustomValidity('Please enter your farmer’s name.');
    $('farmer-name').reportValidity();
    return;
  }
  state.farmerName = name;
  playing = true; hasFarm = true;
  $('title-screen').close();
  $('welcome-label').textContent = `WELCOME HOME, ${name}`;
  save();
  canvas.focus({preventScroll:true});
  toast(state.planted ? `Welcome back, ${name}. Your farm missed you.` : `Welcome home, ${name}. Select the hoe and click a garden square to begin.`);
});
document.querySelector('.brand').addEventListener('click', event => {event.preventDefault();showTitle();});
function chime(){if(!soundEnabled||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(660,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(880,audio.currentTime+.1);gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.3);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.3);}
let ambientNodes=[];$('sound').onclick=async()=>{try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();soundEnabled=!soundEnabled;if(soundEnabled){for(const freq of [130.81,196,261.63]){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.value=.008;osc.connect(gain).connect(audio.destination);osc.start();ambientNodes.push(osc);}chime();}else{ambientNodes.forEach(n=>n.stop());ambientNodes=[];}$('sound').classList.toggle('sound-on',soundEnabled);$('sound').setAttribute('aria-label',soundEnabled?'Disable ambient sound':'Enable ambient sound');$('sound').setAttribute('aria-pressed',String(soundEnabled));}catch{toast('Sound is unavailable in this browser.');}};
function draw(now){const dt=Math.min((now-last)/1000||0,.05);last=now;moving=false;if(!reduced&&playing&&!modal.open&&!document.hidden){window.AgromateWildlife.update(dt);window.AgromateCompanions.update(dt);}if(playing&&!modal.open&&!document.hidden){let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));if(target&&!dx&&!dy){dx=target.x-state.player.x;dy=target.y-state.player.y;if(Math.hypot(dx,dy)<4){target=null;dx=dy=0;}}if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;let nx=state.player.x+dx*100*dt,ny=state.player.y+dy*100*dt;const oldX=state.player.x,oldY=state.player.y;if(canWalk(nx,state.player.y))state.player.x=nx;if(canWalk(state.player.x,ny))state.player.y=ny;if(target&&oldX===state.player.x&&oldY===state.player.y)target=null;facing={x:Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0,y:Math.abs(dy)>=Math.abs(dx)?Math.sign(dy):0};moving=oldX!==state.player.x||oldY!==state.player.y;if(moving){walk+=dt*12;dirty=true;}else walk=0;}else walk=0;clockElapsed+=dt;if(clockElapsed>6){clockElapsed=0;if(state.minutes<1190)state.minutes+=10;update();if(dirty)save();}}
updateFarmerIdle(dt,playing&&!modal.open&&!document.hidden);
view.x=Math.max(0,Math.min(960-view.w,state.player.x-view.w/2));view.y=Math.max(0,Math.min(600-view.h,state.player.y-view.h*.65));ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(-Math.round(view.x),-Math.round(view.y));ctx.drawImage(base,0,0);window.AgromateWildlife.drawWater(ctx,reduced);
for(let i=0;i<state.tiles.length;i++){const t=state.tiles[i],p=tileCenter(i),x=p.x-14,y=p.y-14;if(t.tilled){rect(ctx,x+1,y+1,27,27,t.watered?'#786a49':'#9a794c');rect(ctx,x+2,y+2,25,2,t.watered?'#655e44':'#866940');for(let row=0;row<3;row++)rect(ctx,x+4,y+8+row*7,20,1,t.watered?'#665d42':'#82643e');if(t.watered){rect(ctx,x+5,y+4,2,2,'#97a294');rect(ctx,x+21,y+17,2,2,'#97a294');}}crop(ctx,p.x,p.y+3,t);if(t.crop&&t.age>=crops[t.crop].days&&!reduced){const phase=(now/500+i)%4;rect(ctx,p.x+9,p.y-18+Math.sin(phase)*2,2,2,'#f6e3a4');}}
if(hover!==null){const p=tileCenter(hover);ctx.strokeStyle='#fff1bb';ctx.lineWidth=1;ctx.strokeRect(p.x-13.5,p.y-13.5,27,27);for(const [x,y]of [[-14,-14],[10,-14],[-14,10],[10,10]]){rect(ctx,p.x+x,p.y+y,4,2,'#fff0c3');rect(ctx,p.x+x,p.y+y,2,4,'#fff0c3');}}
// scarecrow guarding the garden
rect(ctx,613,346,3,33,'#a58a53');rect(ctx,600,346,29,4,'#9b8050');poly(ctx,[[605,342],[620,342],[625,362],[601,362]],'#ac8350');rect(ctx,608,332,11,11,'#ddc491');rect(ctx,602,331,24,4,'#bea66b');rect(ctx,608,325,12,8,'#d7c086');rect(ctx,610,337,2,2,'#695f3e');rect(ctx,617,337,2,2,'#695f3e');rect(ctx,612,342,5,4,'#b46e4d');
// wandering hens
for(let i=0;i<3;i++){let x=260+i*26+(reduced?0:Math.sin(now/4500+i*2)*9),y=367+i%2*15;ellipse(ctx,x,y+4,7,3,'#5a703944');rect(ctx,x-5,y-5,11,9,i===1?'#cfa976':'#e9e1b5');rect(ctx,x+3,y-9,6,8,i===1?'#dfbd8c':'#f4edc6');rect(ctx,x+4,y-11,3,3,'#c97d58');rect(ctx,x+8,y-5,3,2,'#d7a653');rect(ctx,x+6,y-7,1,1,'#50533d');rect(ctx,x-3,y+4,2,3,'#c6a05d');rect(ctx,x+2,y+4,2,3,'#c6a05d');}
window.AgromateCompanions.drawGround(ctx,state.player.y,true,reduced);
farmer(ctx,state.player.x,state.player.y,idleTime);
window.AgromateCompanions.drawGround(ctx,state.player.y,false,reduced);
if(target){ctx.strokeStyle='#f3e6ad88';ctx.lineWidth=1;ctx.strokeRect(target.x-4,target.y-2,8,4);}
if(!reduced){for(let i=0;i<7;i++){let x=180+(i*107+now*.009)%660,y=145+(i*59)%330+Math.sin(now/1700+i)*16;rect(ctx,x,y,2,2,'#f2db9477');}for(let i=0;i<5;i++){let x=741+i*22+Math.sin(now/1800+i)*5,y=340+i%3*22;rect(ctx,x,y,11,1,'#b0cbb480');}}
for(const f of actionFX){f.life-=dt;f.y-=dt*14;ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle='#4b5c3a';ctx.fillText(f.text,f.x+1,f.y+1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;actionFX=actionFX.filter(f=>f.life>0);
if(!reduced)window.AgromateWildlife.drawSky(ctx);
if(state.minutes>=1020){rect(ctx,0,0,960,600,`rgba(67,58,94,${Math.min(.22,(state.minutes-1020)/900)})`);}ctx.restore();requestAnimationFrame(draw);}
update();resize();requestAnimationFrame(draw);showTitle();
})();
