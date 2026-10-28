// Original landscape for the title screen. Independent of the playable farm.
(() => {
  'use strict';
  const canvas = document.getElementById('title-landscape');
  const c = canvas.getContext('2d');
  const title = document.getElementById('title-screen');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const base = document.createElement('canvas');
  base.width = canvas.width = 640; base.height = canvas.height = 360;
  const b = base.getContext('2d');
  let seed = 142, frame = 0, elapsed = 0, last = 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function rect(ctx, x, y, w, h, color) {ctx.fillStyle = color;ctx.fillRect(Math.round(x), Math.round(y), w, h);}
  function polygon(ctx, points, color) {ctx.fillStyle = color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function pine(ctx, x, y, size) {
    rect(ctx,x-2*size,y-7*size,4*size,20*size,'#604c39');
    for(let i=0;i<4;i++){
      const w=(9+i*6)*size,yy=y-(46-i*13)*size;
      polygon(ctx,[[x,yy-24*size],[x-w,yy+11*size],[x+w,yy+11*size]],['#284c3e','#315b40','#3f7046','#50804a'][i]);
      rect(ctx,x-w+4*size,yy+8*size,w-4*size,2*size,'#65914e');
    }
  }
  function oak(ctx, x, y, size) {
    rect(ctx,x-4*size,y-24*size,8*size,32*size,'#785539');
    rect(ctx,x-1*size,y-24*size,3*size,32*size,'#a07948');
    for(const [xx,yy,w,h,color] of [[-30,-45,53,26,'#365a36'],[-40,-62,73,27,'#426c3c'],[-31,-80,58,31,'#537f40'],[-15,-91,35,19,'#658e47'],[-31,-66,39,18,'#6a984d'],[8,-67,28,22,'#57833e']])rect(ctx,x+xx*size,y+yy*size,w*size,h*size,color);
    for(let i=0;i<22;i++)rect(ctx,x+(-25+random()*48)*size,y+(-80+random()*47)*size,3*size,2*size,'#8ba955');
  }
  function fence(ctx, x, y, count) {
    rect(ctx,x,y+5,count*17,3,'#a57d49');rect(ctx,x,y+13,count*17,3,'#bc965f');
    for(let i=0;i<=count;i++){rect(ctx,x+i*17,y,4,24,'#977443');rect(ctx,x+i*17,y,4,3,'#e0c087');}
  }
  function barn(ctx,x,y) {
    rect(ctx,x,y,95,63,'#a96b48');
    for(let i=0;i<10;i++){rect(ctx,x+i*10,y,2,63,'#855236');rect(ctx,x+i*10+2,y+2,1,59,'#c48855');}
    polygon(ctx,[[x-9,y+2],[x+47,y-49],[x+105,y+2]],'#79503c');
    polygon(ctx,[[x-5,y-1],[x+47,y-44],[x+100,y-1]],'#b66f46');
    for(let i=0;i<5;i++)rect(ctx,x+9+i*7,y-8-i*7,75-i*14,2,'#d48b55');
    rect(ctx,x+30,y+21,39,42,'#684e35');rect(ctx,x+34,y+24,31,39,'#af8453');
    rect(ctx,x+48,y+24,3,39,'#d9b77c');
    polygon(ctx,[[x+34,y+26],[x+64,y+56],[x+64,y+61],[x+34,y+31]],'#d9b77c');
    polygon(ctx,[[x+64,y+26],[x+34,y+56],[x+34,y+61],[x+64,y+31]],'#d9b77c');
    for(const dx of [9,77]){rect(ctx,x+dx,y+13,11,15,'#594c36');rect(ctx,x+dx+2,y+15,7,11,'#acc0a1');rect(ctx,x+dx+5,y+15,1,11,'#e6cd95');}
    rect(ctx,x+40,y-13,17,15,'#6d5139');rect(ctx,x+43,y-11,11,11,'#d8b46e');rect(ctx,x+47,y-9,3,7,'#8c784a');
  }
  function makeBase() {
    const sky=b.createLinearGradient(0,0,0,250);sky.addColorStop(0,'#287da3');sky.addColorStop(.6,'#75bbbd');sky.addColorStop(1,'#d4dfb2');b.fillStyle=sky;b.fillRect(0,0,640,360);
    polygon(b,[[0,174],[45,131],[77,142],[126,96],[161,116],[202,81],[248,119],[280,109],[328,148],[374,94],[410,111],[445,75],[492,121],[523,103],[588,147],[640,119],[640,240],[0,240]],'#7ca9a3');
    polygon(b,[[0,191],[68,164],[115,178],[184,139],[230,168],[278,144],[329,179],[399,144],[455,165],[514,134],[565,167],[640,151],[640,252],[0,252]],'#6c9a7c');
    polygon(b,[[0,224],[66,190],[132,207],[200,180],[266,212],[340,188],[410,209],[493,184],[557,206],[640,189],[640,280],[0,280]],'#639257');
    polygon(b,[[0,250],[90,220],[169,231],[260,208],[365,229],[454,207],[540,228],[640,213],[640,360],[0,360]],'#82a452');
    for(let i=0;i<5500;i++){const x=random()*640,y=232+random()*128;rect(b,x,y,random()>.8?3:1,1,['#94b35c','#7a9d4a','#a2b865','#709347'][i%4]);}
    // A winding lane and small crop beds lead down from the barn.
    polygon(b,[[455,258],[473,258],[428,286],[423,307],[479,360],[415,360],[390,310],[398,282]],'#cbb37a');
    polygon(b,[[102,275],[214,275],[252,327],[85,327]],'#b3925d');
    for(let row=0;row<5;row++){
      const y=280+row*10;rect(b,99-row*2,y,119+row*7,3,'#917947');
      for(let col=0;col<9;col++){const x=106+col*13+row*2;rect(b,x,y-4,2,7,'#52763b');rect(b,x-2,y-6,3,3,'#739a45');rect(b,x+1,y-7,3,3,'#8faa51');if(row%2)rect(b,x-1,y+1,4,3,'#dcaa5b');}
    }
    for(let i=0;i<13;i++)pine(b,25+i*51,210+(i%3)*7,.5+(i%4)*.08);
    fence(b,349,247,13);barn(b,468,208);
    rect(b,560,252,12,10,'#b9955b');rect(b,562,250,8,3,'#d0b271');
    // Pond at the left and warm flowers in the foreground.
    polygon(b,[[0,285],[38,278],[67,287],[81,305],[64,326],[19,338],[0,333]],'#4c7d6a');
    polygon(b,[[0,290],[38,284],[61,291],[72,305],[59,321],[17,331],[0,326]],'#7fafa2');
    for(let i=0;i<25;i++)rect(b,random()*54,292+random()*31,4+random()*8,1,'#b3ccad');
    for(let i=0;i<90;i++){
      const x=random()*640,y=308+random()*52;if(x>85&&x<260||x>385&&x<480)continue;
      rect(b,x,y,1,5,'#648143');rect(b,x-1,y-2,3,2,i%3?'#ead491':'#e8bd94');
    }
    oak(b,18,318,1.4);oak(b,626,313,1.35);pine(b,76,276,.9);pine(b,590,271,.85);
    rect(b,0,353,640,7,'#6f8e43');
    for(let i=0;i<145;i++){const x=random()*640,y=340+random()*20;rect(b,x,y,2,5,'#567438');rect(b,x+2,y-3,1,5,'#95aa55');}
  }
  makeBase();
  function cloud(x,y,scale=1) {
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
    for(const [xx,yy,w,h,col]of [[0,8,56,13,'#d8e9d6'],[5,2,43,17,'#edf2d9'],[13,-5,18,19,'#f8f4dc'],[28,0,17,17,'#f3f2d9'],[46,10,16,10,'#eaf1d6']])rect(c,xx,yy,w,h,col);
    c.restore();
  }
  function paint(time) {
    c.clearRect(0,0,640,360);c.drawImage(base,0,0);
    // Clouds remain in the sky, below the foreground trees and above the hills.
    for(const [x,y,s,speed]of [[-20,31,1.2,1.6],[155,18,.9,.8],[410,39,1.3,1.2],[535,10,.7,.9]])cloud((x+time*speed+90)%820-90,y,s);
    if(!reduced.matches){
      for(let i=0;i<3;i++){const x=(time*13+i*14+210)%760-60,y=121+i*5+Math.sin(time*.3)*6,flap=Math.sin(time*9+i)>0?-2:2;rect(c,x,y,2,1,'#4d7162');rect(c,x-3,y+flap,3,1,'#4d7162');rect(c,x+2,y+flap,3,1,'#4d7162');}
      for(let i=0;i<12;i++){const x=255+(i*37+time*2)%170,y=302+i%4*11+Math.sin(time+i)*3;rect(c,x,y,1,1,'#f0d99b');}
    }
  }
  function tick(now) {
    if(!title.open||document.hidden){frame=0;last=0;return;}
    if(last)elapsed+=Math.min((now-last)/1000,.05);last=now;paint(elapsed);
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;last=0;
    if(!title.open||document.hidden)return;
    paint(reduced.matches?0:elapsed);
    if(!reduced.matches)frame=requestAnimationFrame(tick);
  }
  title.addEventListener('toggle',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  sync();
})();
