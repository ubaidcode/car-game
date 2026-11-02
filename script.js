'use strict';
// Turbo Rush: 2D top-down racing. Canvas is 480x800 logical px, scaled by CSS.
const $=s=>document.querySelector(s),cv=$('#c'),x=cv.getContext('2d');
const W=480,H=800,RX=80,RW=320,LN=4,LW=RW/LN,K=2.4;
cv.width=W;cv.height=H;
const R=Math.random,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

// ---- Level data: goal (m), coins needed, top speed, traffic gap (s), oncoming lanes, swerving cars, hazards
const LV=[
{n:'Sunny Highway',m:'Reach 2000 m',goal:2000,need:0,max:190,tr:1.3,side:'#3f9b43',road:'#3a3f4a',deco:'tree',hz:['cone']},
{n:'Desert Run',m:'Drive 3000 m and grab 8 coins',goal:3000,need:8,max:210,tr:1,side:'#d9a45b',road:'#4a4038',deco:'cactus',hz:['cone','oil']},
{n:'Midnight City',m:'Drive 4000 m, grab 12 coins. Oncoming lanes on the left!',goal:4000,need:12,max:230,tr:.8,side:'#161a2b',road:'#23262f',deco:'bldg',onc:1,hz:['cone','oil','barrier']},
{n:'Frozen Pass',m:'Drive 5500 m on ice, grab 15 coins',goal:5500,need:15,max:240,tr:.7,side:'#e6f1fb',road:'#56606e',deco:'pine',onc:1,sw:1,hz:['cone','ice','barrier']},
{n:'Neon Inferno',m:'Final: 7500 m and 20 coins',goal:7500,need:20,max:270,tr:.55,side:'#2a0a1a',road:'#1a1020',deco:'pillar',onc:1,sw:1,hz:['cone','oil','barrier','ice']}];
const COL=['#e53935','#8e24aa','#fdd835','#43a047','#fb8c00','#eceff1','#00acc1'];

// ---- State
let S='menu',G=0,L=0,P,T=[],O=[],C=[],F=[],AM=[],tm={},sc=0,dist=0,coins=0,t=0,cd=0,shake=0,scroll=0,prev='menu',last=0;
const keys={},tch={},save={un:1,st:[0,0,0,0,0],best:[0,0,0,0,0],snd:1,sens:1};
try{Object.assign(save,JSON.parse(localStorage.tr||'{}'))}catch(e){}
const store=()=>{try{localStorage.tr=JSON.stringify(save)}catch(e){}};

// ---- Audio (WebAudio, no files)
let AC,eng,eg;
function initAudio(){
 if(AC){if(AC.state=='suspended')AC.resume();return}
 try{AC=new(window.AudioContext||window.webkitAudioContext)();eng=AC.createOscillator();eg=AC.createGain();eng.type='sawtooth';eg.gain.value=0;eng.connect(eg).connect(AC.destination);eng.start()}catch(e){AC=null}}
function tone(f,d,ty='square',v=.1,sl=0){
 if(!AC||!save.snd)return;const n=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
 o.type=ty;o.frequency.setValueAtTime(f,n);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),n+d);
 g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g).connect(AC.destination);o.start();o.stop(n+d)}
const seq=(a,ty,d,v)=>a.forEach((f,i)=>setTimeout(()=>tone(f,d,ty,v),i*140));
const sfx={click:()=>tone(600,.06,'square',.05),beep:()=>tone(700,.12,'square',.08),coin:()=>{tone(880,.1,'square',.08);setTimeout(()=>tone(1320,.15,'square',.08),80)},
 crash:()=>tone(160,.4,'sawtooth',.2,-120),skid:()=>tone(300,.3,'triangle',.08,-150),cone:()=>tone(220,.1,'square',.1),
 win:()=>seq([523,659,784,1047],'triangle',.25,.15),lose:()=>seq([400,300,200],'sawtooth',.3,.12)};

// ---- Screens
const act={
 play:()=>start(Math.min(save.un,5)-1),levels:()=>{grid();go('lvs')},menu:()=>go('menu'),restart:()=>start(L),next:()=>start(L+1),
 pause:()=>go(S=='play'?'pause':'play'),settings:()=>{prev=S;go('set')},back:()=>go(prev),snd:()=>{save.snd^=1;store();lbl()}};
function go(id){
 S=id;if(id=='menu'||id=='lvs')G=0;
 document.querySelectorAll('.s').forEach(e=>e.classList.toggle('on',e.id==id));
 $('#tc').classList.toggle('on',id=='play');$('#pb').style.display=id=='play'?'block':'none'}
const lbl=()=>$('#sb').textContent='SOUND: '+(save.snd?'ON':'OFF');
function grid(){
 const g=$('#grid');g.innerHTML='';
 LV.forEach((l,i)=>{
  const ok=i<save.un,d=document.createElement('div');d.className='lv'+(ok?'':' lock');
  d.innerHTML=`<b>${i+1}. ${l.n}</b><small>${ok?'★'.repeat(save.st[i])+'☆'.repeat(3-save.st[i])+' Best '+save.best[i]:'🔒 Finish the previous level'}</small>`;
  if(ok)d.onclick=()=>{initAudio();sfx.click();start(i)};g.append(d)});
 for(let i=6;i<=8;i++){const d=document.createElement('div');d.className='lv soon';d.innerHTML=`<b>🔒 Level ${i}</b><small>COMING SOON</small>`;g.append(d)}}

// ---- Game flow
function start(i){
 L=i;P={x:W/2,y:630,vx:0,v:0,hp:3,inv:0,spin:0,ice:0,n:100};T=[];O=[];C=[];F=[];sc=dist=coins=t=0;cd=3;tm={t:1,o:2.5,c:1.5};
 AM=[];if(i>2)for(let k=0;k<45;k++)AM.push({x:R()*W,y:R()*H,s:.5+R()});
 G=1;go('play')}
function burst(px,py,c,n){for(let i=0;i<n;i++){const a=R()*6.28,s=60+R()*220;F.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:.6,m:.6,c,s:2+R()*3})}}
function crash(){
 P.hp--;P.inv=1.6;P.v*=.45;shake=.6;sfx.crash();burst(P.x,P.y-10,'#ffb300',26);
 if(P.hp<=0){go('dead');setTimeout(()=>{if(S!='dead')return;sfx.lose();
  $('#oi').innerHTML=`Level ${L+1}: ${LV[L].n}<br>Distance <b>${Math.floor(dist)} m</b> | Score <b>${Math.floor(sc)}</b>`;go('over')},1000)}}
function win(){
 sc+=P.hp*500;save.st[L]=Math.max(save.st[L],P.hp);save.best[L]=Math.max(save.best[L],Math.floor(sc));
 if(L<4)save.un=Math.max(save.un,L+2);store();sfx.win();
 if(L==4){$('#wi').innerHTML=`Final level cleared!<br>Total best score <b>${save.best.reduce((a,b)=>a+b)}</b><br>More levels are coming soon.`;go('win')}
 else{$('#stars').textContent='★'.repeat(P.hp)+'☆'.repeat(3-P.hp);$('#di').innerHTML=`Score <b>${Math.floor(sc)}</b> | Coins ${coins}`;go('done')}}
function spawnT(l){
 const ln=R()*LN|0,on=l.onc&&ln<2;if(T.some(c=>c.ln==ln&&c.y<140))return;
 T.push({ln,x:RX+ln*LW+LW/2,y:-90,spd:on?-90:35+R()*55,on,col:COL[R()*COL.length|0],sw:l.sw&&!on&&R()<.45?(R()<.5?-1:1):0,tt:1+R()*2})}
function spawnO(l){
 const ty=l.hz[R()*l.hz.length|0],d={cone:[20,26],oil:[60,40],barrier:[70,24],ice:[LW*2,90]}[ty];
 O.push({t:ty,x:ty=='ice'?RX+LW*(1+(R()*3|0)):RX+LW*(R()*LN|0)+LW/2,y:-60,w:d[0],h:d[1]})}

function update(dt){
 const l=LV[L];
 if(cd>0){const n=Math.ceil(cd);cd-=dt;if(Math.ceil(cd)!=n)sfx.beep();return}
 t+=dt;
 const lf=keys.arrowleft||keys.a||tch.l,rt=keys.arrowright||keys.d||tch.r,br=keys.arrowdown||keys.s;
 const nit=(keys[' ']||keys.shift||tch.n)&&P.n>0&&!br;
 P.v+=((br?30:l.max+(nit?70:0))-P.v)*Math.min(1,dt*(br?2.5:.7));
 if(nit){P.n-=dt*30;F.push({x:P.x+(R()-.5)*14,y:P.y+36,vx:0,vy:200+R()*100,l:.25,m:.25,c:'#ffb300',s:5})}else P.n=Math.min(100,P.n+dt*7);
 P.spin=Math.max(0,P.spin-dt);P.inv=Math.max(0,P.inv-dt);P.ice=Math.max(0,P.ice-dt);
 const tv=P.spin>0?Math.sin(t*16)*240:((rt?1:0)-(lf?1:0))*270*save.sens;
 P.vx+=(tv-P.vx)*Math.min(1,dt*(P.ice>0?1.6:9));P.x=cl(P.x+P.vx*dt,RX+24,RX+RW-24);
 const sp=P.v*K*dt;scroll+=sp;dist+=P.v/3.6*dt;sc+=P.v*dt*.05;
 if((tm.t-=dt)<=0){spawnT(l);if(l.tr<.6&&R()<.35)spawnT(l);tm.t=l.tr*(.7+R()*.6)}
 if((tm.o-=dt)<=0){spawnO(l);tm.o=1.4+R()*1.6}
 if((tm.c-=dt)<=0){C.push({x:RX+LW*(R()*LN|0)+LW/2,y:-30});tm.c=1+R()*1.2}
 const hb={x:P.x-16,y:P.y-30,w:32,h:60};
 for(const c of T){
  c.y+=(P.v-c.spd)*K*dt;
  if(c.sw&&(c.tt-=dt)<0){c.tt=1e9;c.ln=cl(c.ln+c.sw,l.onc?2:0,3);c.tx=RX+c.ln*LW+LW/2}
  if(c.tx)c.x+=(c.tx-c.x)*Math.min(1,dt*3);
  if(!P.inv&&hit(hb,{x:c.x-17,y:c.y-32,w:34,h:64})){T.splice(T.indexOf(c),1);crash();break}}
 T=T.filter(c=>c.y<H+150&&c.y>-400);
 for(const o of O){
  o.y+=sp;
  if(hit(hb,{x:o.x-o.w/2,y:o.y-o.h/2,w:o.w,h:o.h})){
   if(o.t=='ice')P.ice=.4;
   else if(!o.u){o.u=1;
    if(o.t=='cone'){P.v*=.85;burst(o.x,o.y,'#ff9800',10);sfx.cone()}
    else if(o.t=='oil'){P.spin=1.2;sfx.skid()}
    else if(!P.inv)crash()}}}
 O=O.filter(o=>o.y<H+80);
 for(const c of C){c.y+=sp;if(hit(hb,{x:c.x-14,y:c.y-14,w:28,h:28})){c.g=1;coins++;sc+=100;sfx.coin();burst(c.x,c.y,'#ffd54f',10)}}
 C=C.filter(c=>!c.g&&c.y<H+40);
 if(P.hp>0&&dist>=l.goal&&coins>=l.need)win()}
function parts(dt){for(const p of F){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt}F=F.filter(p=>p.l>0)}
function amb(dt){for(const a of AM){a.y+=(L==3?50+P.v*.4:P.v*.7-90)*a.s*dt;a.x+=Math.sin(t+a.y*.02)*12*dt;if(a.y>H)a.y=-5;if(a.y<-5)a.y=H}}

// ---- Drawing
function tri(a,b,c,d,e,f){x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.lineTo(e,f);x.fill()}
function deco(k,cx,cy,h){
 x.save();x.translate(cx,cy);
 if(k=='tree'){x.fillStyle='#0003';x.beginPath();x.arc(4,6,24,0,7);x.fill();x.fillStyle=h>.5?'#2e7d32':'#1b5e20';x.beginPath();x.arc(0,0,18+h*6,0,7);x.fill();x.fillStyle='#4caf50';x.beginPath();x.arc(-5,-5,9,0,7);x.fill()}
 else if(k=='cactus'){x.fillStyle='#2e7d32';for(const r of[[-5,-24,10,48],[-18,-10,10,22],[8,-16,10,20]]){x.beginPath();x.roundRect(...r,5);x.fill()}x.fillRect(-14,6,10,5);x.fillRect(4,-2,10,5)}
 else if(k=='bldg'){x.fillStyle='#10142a';x.fillRect(-28,-36,56,72);x.fillStyle='#1d2547';x.fillRect(-28,-36,56,6);for(let a=0;a<3;a++)for(let b=0;b<4;b++){x.fillStyle=(h*97+a*7+b*13)%1>.4?'#ffe082':'#2a3358';x.fillRect(-20+a*16,-26+b*15,9,9)}}
 else if(k=='pine'){x.fillStyle='#2e5d4b';tri(0,-30,-20,22,20,22);x.fillStyle='#fff';tri(0,-30,-9,-8,9,-8)}
 else{x.shadowBlur=12;x.shadowColor=x.strokeStyle=h>.5?'#ff2d75':'#00e5ff';x.fillStyle='#2a0a1a';x.lineWidth=3;x.fillRect(-12,-30,24,60);x.strokeRect(-12,-30,24,60)}
 x.restore()}
function bg(){
 const l=LV[L];x.fillStyle=l.side;x.fillRect(0,0,W,H);
 const f=Math.floor(scroll/140),o=scroll%140;
 for(let k=-1;k<7;k++){const i=f-k,h=Math.abs(Math.sin(i*12.9898)*43758.5453)%1,y=k*140+o;deco(l.deco,40+h*10,y+h*40,h);deco(l.deco,W-40-h*10,y+(1-h)*40,1-h)}
 x.fillStyle=l.road;x.fillRect(RX,0,RW,H);
 const ne=L>=2,ec=L==4?'#ff2d75':ne?'#00e5ff':'#fff';
 x.save();if(ne){x.shadowBlur=12;x.shadowColor=ec}x.fillStyle=ec;x.fillRect(RX-3,0,4,H);x.fillRect(RX+RW-1,0,4,H);x.restore();
 for(let i=1;i<LN;i++){
  if(l.onc&&i==2){x.fillStyle='#ffd54f';x.fillRect(RX+LW*i-4,0,3,H);x.fillRect(RX+LW*i+1,0,3,H)}
  else{x.fillStyle='#ffffffaa';for(let y=-80+scroll%80;y<H;y+=80)x.fillRect(RX+LW*i-2,y,4,40)}}}
function car(px,py,col,rot,flip,stripe){
 x.save();x.translate(px,py);x.rotate(rot+(flip?Math.PI:0));
 x.fillStyle='#0005';x.beginPath();x.roundRect(-18,-30,42,70,10);x.fill();
 x.fillStyle='#111';for(const w of[[-24,-26],[17,-26],[-24,10],[17,10]])x.fillRect(w[0],w[1],7,17);
 x.fillStyle=col;x.beginPath();x.roundRect(-20,-35,40,70,10);x.fill();
 if(stripe){x.fillStyle='#ffffff55';x.fillRect(-4,-35,8,70)}
 x.fillStyle='#10182a';x.beginPath();x.roundRect(-14,-16,28,22,5);x.fill();x.fillStyle='#4fc3f755';x.fillRect(-12,-14,24,7);
 x.fillStyle='#fff59d';x.fillRect(-17,-35,9,4);x.fillRect(8,-35,9,4);x.fillStyle='#ff1744';x.fillRect(-17,31,9,4);x.fillRect(8,31,9,4);x.restore()}
function obstacle(o){
 x.save();x.translate(o.x,o.y);
 if(o.t=='cone'){x.fillStyle='#ff6d00';tri(0,-13,10,12,-10,12);x.fillStyle='#fff';x.fillRect(-5,0,10,4)}
 else if(o.t=='oil'){x.fillStyle='#0d0d14';x.beginPath();x.ellipse(0,0,o.w/2,o.h/2,0,0,7);x.fill();x.strokeStyle='#7c4dff88';x.lineWidth=2;x.stroke()}
 else if(o.t=='ice'){x.fillStyle='#b3e5fcaa';x.beginPath();x.roundRect(-o.w/2,-o.h/2,o.w,o.h,20);x.fill();x.strokeStyle='#fff';x.lineWidth=2;x.stroke()}
 else{x.fillStyle='#e53935';x.fillRect(-o.w/2,-12,o.w,24);x.fillStyle='#fff';for(let i=-o.w/2;i<o.w/2;i+=20)x.fillRect(i,-12,10,24)}
 x.restore()}
function hud(){
 const l=LV[L];x.fillStyle='#000a';x.fillRect(0,0,W,76);x.font='bold 15px system-ui';x.fillStyle='#fff';
 x.textAlign='left';x.fillText(`LEVEL ${L+1}: ${l.n}`,14,24);x.textAlign='right';x.fillText('SCORE '+Math.floor(sc),W-14,24);
 x.fillStyle='#fff3';x.fillRect(14,36,W-28,8);x.fillStyle='#00e5ff';x.fillRect(14,36,(W-28)*Math.min(1,dist/l.goal),8);
 x.textAlign='left';x.font='20px system-ui';x.fillStyle='#ff2d75';x.fillText('♥'.repeat(P.hp)+'♡'.repeat(3-P.hp),14,66);
 x.textAlign='center';x.fillStyle='#ffd54f';x.font='bold 16px system-ui';x.fillText(`● ${coins}${l.need?' / '+l.need:''}`,W/2,66);
 x.textAlign='right';x.fillStyle='#fff';x.font='bold 22px system-ui';x.fillText(Math.floor(P.v)+' km/h',W-14,66);
 x.font='12px system-ui';x.fillStyle='#fffa';x.fillText(Math.min(l.goal,Math.floor(dist))+' / '+l.goal+' m',W-14,94);
 x.fillStyle='#fff3';x.fillRect(W-18,120,8,160);x.fillStyle='#ff9800';x.fillRect(W-18,280-1.6*P.n,8,1.6*P.n);
 if(dist>=l.goal&&coins<l.need){x.textAlign='center';x.fillStyle='#ffd54f';x.font='bold 18px system-ui';x.fillText('Collect '+(l.need-coins)+' more coins to finish!',W/2,120)}
 if(cd>0||t<1.2){x.textAlign='center';x.fillStyle='#000b';x.fillRect(0,200,W,150);x.fillStyle='#fff';x.font='bold 22px system-ui';x.fillText(`LEVEL ${L+1}: ${l.n}`,W/2,238);
  x.fillStyle='#ffd54f';x.font='15px system-ui';x.fillText(l.m,W/2,264);x.font='bold 64px system-ui';x.fillStyle='#00e5ff';x.fillText(cd>0?Math.ceil(cd):'GO!',W/2,332)}}
function draw(){
 x.save();if(shake)x.translate((R()-.5)*shake*16,(R()-.5)*shake*16);bg();
 if(G){
  if(L==2||L==4){const g=x.createLinearGradient(0,P.y-30,0,P.y-300);g.addColorStop(0,'#fff59d55');g.addColorStop(1,'#fff59d00');x.fillStyle=g;tri(P.x-14,P.y-32,P.x+14,P.y-32,P.x+70,P.y-300);tri(P.x-14,P.y-32,P.x-70,P.y-300,P.x+70,P.y-300)}
  O.forEach(obstacle);
  for(const c of C){x.fillStyle='#ffd54f';x.beginPath();x.ellipse(c.x,c.y,12*Math.abs(Math.cos(t*4+c.y*.02))+2,12,0,0,7);x.fill();x.strokeStyle='#b8860b';x.lineWidth=2;x.stroke()}
  for(const c of T)car(c.x,c.y,c.col,c.tx?(c.tx-c.x)/200:0,c.on);
  if(!(P.inv>0&&Math.floor(P.inv*10)%2))car(P.x,P.y,'#00e5ff',P.vx/700+(P.spin>0?Math.sin(t*14)*.6:0),0,1);
  for(const p of F){x.globalAlpha=p.l/p.m;x.fillStyle=p.c;x.fillRect(p.x,p.y,p.s,p.s)}x.globalAlpha=1;
  for(const a of AM){x.fillStyle=L==3?'#fff':'#ff7a3d';x.beginPath();x.arc(a.x,a.y,a.s*2.2,0,7);x.fill()}
  if(P.v>200){x.fillStyle='#ffffff22';for(let i=0;i<8;i++)x.fillRect(R()*W,R()*H,2,40+R()*50)}
  x.restore();hud();return}
 car(W/2,630,'#00e5ff',0,0,1);x.restore()}
function loop(ts){
 const dt=Math.min(.05,(ts-last)/1e3||0);last=ts;
 if(S=='play')update(dt);else if(!G)scroll+=420*dt;
 if(S=='play'||S=='dead'){parts(dt);amb(dt)}
 shake=Math.max(0,shake-dt*1.5);draw();
 if(eg){eg.gain.value=S=='play'&&cd<=0&&save.snd?.04:0;eng.frequency.value=45+(P?P.v:0)*.55}
 requestAnimationFrame(loop)}

// ---- Input
addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();keys[k]=1;initAudio();
 if(k.startsWith('arrow')||k==' ')e.preventDefault();
 if((k=='escape'||k=='p')&&(S=='play'||S=='pause'))act.pause()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
addEventListener('blur',()=>{for(const k in keys)keys[k]=0;if(S=='play')go('pause')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S=='play')go('pause')});
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;b.blur();initAudio();sfx.click();act[b.dataset.a]()});
for(const[s,k]of[['#bl','l'],['#br','r'],['#bn','n']]){
 const b=$(s);b.onpointerdown=e=>{e.preventDefault();tch[k]=1;initAudio()};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>tch[k]=0}
$('#sens').value=save.sens;$('#sens').oninput=e=>{save.sens=+e.target.value;store()};
lbl();go('menu');requestAnimationFrame(loop);
