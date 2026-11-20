import * as THREE from 'three';
import {Game,MAPS,TUNING,DT} from './core/game.js';
import './style-v11.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<div class="hud">
 <div class="hudTop">
  <div class="group"><div class="micro" id="night">Đêm 1 · Đảo Bến</div><div class="large" id="health">♥ ♥ ♥</div><div class="dim" id="charm">🍃 Không có bùa</div></div>
  <div class="group hudTime"><div class="micro">Thời gian còn lại</div><div class="large" id="timer">05:00</div></div>
  <div class="group" style="text-align:right"><div class="micro" id="lamps">🏮 0/5 Đèn</div><div class="large" id="score">★ 0</div><div class="dim" id="total">Tổng 0</div></div>
 </div>
 <div id="windAlert"></div>
 <div id="toast"></div><div id="pointer"></div>
 <div class="hudBottom">
  <div class="group controls"><kbd>W A S D</kbd> Đi · <kbd>Space</kbd> Nhảy<br><kbd>Shift</kbd> Lướt · <kbd>E</kbd> Nạp · <kbd>Q</kbd> Tỏa sáng<br><kbd>Mouse</kbd> Xoay camera · <kbd>Esc</kbd> Tạm dừng</div>
  <div class="group prompts"><div id="hint"></div><div class="micro">Đom đóm <span id="count">0/10</span></div><div class="moteSlots" id="slots"></div></div>
  <div class="group" style="text-align:right"><div class="micro">Kỹ năng</div><div class="dim" id="dash">Lướt: sẵn sàng</div><div class="dim" id="pulse">Tỏa sáng: sẵn sàng</div></div>
 </div>
 <div id="fps">FPS —</div>
</div>
<div id="screen" class="screen"><div class="dialog">
 <div class="micro" id="modalKicker">Ngày xưa, trên một biển mây...</div>
 <h1 id="modalTitle">Đảo Đèn Lồng</h1>
 <p id="modalText">Ông Đăng: “Mây ơi, đêm nay đảo cần ánh sáng của con. Thu thập đom đóm và thắp lại các ngọn đèn trước bình minh nhé!”</p>
 <div id="actions"><button id="primary">Bắt đầu Đêm 1</button><button id="settings" class="secondary">Cài đặt</button></div>
 <div id="settingsPanel" class="hidden">
  <div class="setting"><span>Âm lượng</span><input id="volume" type="range" min="0" max="100" value="35"></div>
  <div class="setting"><span>Độ nhạy chuột</span><input id="sensitivity" type="range" min="1" max="100" value="40"></div>
  <button id="closeSettings" class="secondary">Đóng cài đặt</button>
 </div>
</div></div>`;
const el=(id:string)=>document.getElementById(id)!;
let settings={volume:.35,sensitivity:.004};
try{settings={...settings,...JSON.parse(localStorage.getItem('ddl-settings')||'{}')}}catch{}
(el('volume') as HTMLInputElement).value=String(Math.round(settings.volume*100));
(el('sensitivity') as HTMLInputElement).value=String(Math.round(settings.sensitivity*10000));
const saveSettings=()=>{settings.volume=Number((el('volume') as HTMLInputElement).value)/100;
 settings.sensitivity=Number((el('sensitivity') as HTMLInputElement).value)/10000;
 localStorage.setItem('ddl-settings',JSON.stringify(settings));};
el('volume').addEventListener('input',saveSettings);
el('sensitivity').addEventListener('input',saveSettings);
el('settings').addEventListener('click',()=>el('settingsPanel').classList.remove('hidden'));
el('closeSettings').addEventListener('click',()=>el('settingsPanel').classList.add('hidden'));
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
app.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#0E1430');
scene.fog=new THREE.FogExp2('#1B2350',.009);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,600);
const ambient=new THREE.HemisphereLight('#cad2ff','#1B2350',.15);scene.add(ambient);
const moon=new THREE.DirectionalLight('#b1c6ff',1.6);moon.position.set(-12,25,12);moon.castShadow=true;
moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-90;moon.shadow.camera.right=90;
moon.shadow.camera.top=90;moon.shadow.camera.bottom=-90;scene.add(moon);
const m=(color:number|string,extra:Record<string,unknown>={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const create=(geometry:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0)=>{
 const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
};
const stage=new THREE.Group();scene.add(stage);
const props=new THREE.Group();scene.add(props);
const ocean=create(new THREE.PlaneGeometry(2000,2000),m('#12384A',{roughness:.3}),0,-13,0);
ocean.rotation.x=-Math.PI/2;scene.add(ocean);
const bodyMat=m('#E8E2D0'),scarfMat=m('#C8102E'),skin=m('#ffe0bd');
const may=new THREE.Group();scene.add(may);
may.add(create(new THREE.ConeGeometry(.48,1.15,10),bodyMat,0,.85,0));
may.add(create(new THREE.SphereGeometry(.33,12,8),skin,0,1.62,0));
may.add(create(new THREE.ConeGeometry(.85,.6,16),m('#C9B48A'),0,2.12,0));
may.add(create(new THREE.CylinderGeometry(.77,.8,.05,16),m('#ffe0a0'),0,1.89,0));
may.add(create(new THREE.SphereGeometry(.14,8,6),scarfMat,-.24,1.49,-.1));
may.add(create(new THREE.SphereGeometry(.14,8,6),scarfMat,.24,1.49,-.1));
may.add(create(new THREE.CylinderGeometry(.025,.025,.4,6),m('#ffe9b0'),.77,1.69,.05));
may.add(create(new THREE.OctahedronGeometry(.21),new THREE.MeshBasicMaterial({color:'#FFE9B0'}),.77,1.43,.05));
const mayLight=new THREE.PointLight('#FFB347',2,7);mayLight.position.set(.77,1.43,.05);may.add(mayLight);
const lanterns=new Map<string,{group:THREE.Group,lamp:THREE.Mesh,light:THREE.PointLight}>();
const motes=new Map<string,THREE.Group>(),shades=new Map<string,THREE.Group>(),drifters=new Map<string,THREE.Group>(),charms=new Map<string,THREE.Mesh>();
const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;
const gctx=glowCanvas.getContext('2d')!, grad=gctx.createRadialGradient(32,32,1,32,32,31);
grad.addColorStop(0,'rgba(255,246,194,1)');grad.addColorStop(.3,'rgba(255,229,138,.65)');grad.addColorStop(1,'rgba(255,229,138,0)');
gctx.fillStyle=grad;gctx.fillRect(0,0,64,64);
const glowSpriteMaterial=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
const shadeMaterial=m('#120A1A',{roughness:.3}),eyes=new THREE.MeshBasicMaterial({color:'#7A3CFF'});
let game=new Game({night:1,seed:2026}),night=1,total=0,mode:'menu'|'intro'|'playing'|'pause'|'won'|'lost'|'dawn'='menu';
function clearGroup(g:THREE.Group){while(g.children.length)g.remove(g.children[0]);}
function addIsland(x:number,z:number,r:number,y=0){
 const base=create(new THREE.CylinderGeometry(r,r-1.7,4,64),m('#6B4A2F'),x,y-2,z);
 const turf=create(new THREE.CylinderGeometry(r-.04,r,.24,64),m('#2F5D50'),x,y-.12,z);
 stage.add(base,turf);
}
function buildWorld(id:number){
 clearGroup(stage);clearGroup(props);
 const map=(MAPS as Record<number,any>)[id];
 if(id===1)addIsland(0,0,40);
 if(id===2){
  addIsland(0,0,28);addIsland(70,0,28);
  const bridge=create(new THREE.BoxGeometry(18,.3,4),m('#C9B48A'),35,-.1,0);
  stage.add(bridge);
  for(let x=26;x<=44;x+=2){
   const plank=create(new THREE.BoxGeometry(1.8,.33,4),m('#6B4A2F'),x,.02,0);
   stage.add(plank);
  }
 }
 if(id===3){
  addIsland(0,0,45);
  const r1=create(new THREE.RingGeometry(12,24,64,1,0,Math.PI),
   m('#2F5D50',{side:THREE.DoubleSide}),0,3,0);
  r1.rotation.x=Math.PI/2;stage.add(r1);
  // Elevated disk must be a platform, not a solid wall obstructing the spawn below it.
  stage.add(create(new THREE.CylinderGeometry(8,8,.32,64),m('#C9B48A'),0,5.84,0));
  for(const angle of [30,150]){
   const a=angle*Math.PI/180;
   const ramp=create(new THREE.BoxGeometry(6.7,.22,3),m('#C9B48A'),27*Math.cos(a),1.5,27*Math.sin(a));
   ramp.rotation.y=-a;ramp.rotation.z=.46;stage.add(ramp);
  }
  const tower=create(new THREE.CylinderGeometry(2,2,8,14),m('#6B4A2F'),0,10,0);
  stage.add(tower);
  const bell=create(new THREE.ConeGeometry(2.5,2,12),m('#F2C14E'),0,15,0);stage.add(bell);
 }
 const pads=id===2?[[20,0,18],[50,0,-18]]:id===3?[[0,3,13]]:[];
 for(const [x,y,z] of pads){
  const pad=create(new THREE.CylinderGeometry(1,1,.18,32),
   m('#F2C14E',{emissive:'#FFB347',emissiveIntensity:1}),x,y+.06,z);
  stage.add(pad);
 }
 const treeMaterial=m('#2F5D50'),barkMaterial=m('#6B4A2F');
 const places=id===2?[[0,0,28],[70,0,28]]:[[0,0,map.radius]];
 for(const [cx,cz,r] of places)for(let i=0;i<20;i++){
  const a=i*2.39996,rad=r-3-(i%3);
  const x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad;
  const tree=new THREE.Group();tree.position.set(x,0,z);
  tree.add(create(new THREE.CylinderGeometry(.18,.3,2,6),barkMaterial,0,1,0));
  tree.add(create(new THREE.ConeGeometry(1.2,3,7),treeMaterial,0,3,0));
  tree.scale.setScalar(.75+(i%4)*.14);props.add(tree);
 }
 for(const obj of lanterns.values())props.remove(obj.group);
 lanterns.clear();
 for(const l of game.lanterns){
  const g=new THREE.Group();g.position.set(l.pos[0],l.pos[1],l.pos[2]);
  g.add(create(new THREE.CylinderGeometry(.65,.78,.38,10),m('#6B4A2F'),0,.19,0));
  g.add(create(new THREE.CylinderGeometry(.12,.16,4.4,8),m('#6B4A2F'),0,2.25,0));
  const lamp=create(new THREE.SphereGeometry(.58,12,10),m('#5B5F6E',{emissive:'#111320'}),0,4.2,0);
  g.add(lamp);g.add(create(new THREE.ConeGeometry(.95,.53,8),m('#6B4A2F'),0,4.95,0));
  const light=new THREE.PointLight('#FFB347',0,13);light.position.y=4.2;g.add(light);
  props.add(g);lanterns.set(l.id,{group:g,lamp,light});
 }
 motes.forEach(obj=>scene.remove(obj));motes.clear();
 shades.forEach(obj=>scene.remove(obj));shades.clear();
 drifters.forEach(obj=>scene.remove(obj));drifters.clear();
 charms.forEach(obj=>scene.remove(obj));charms.clear();
 camera.position.set(game.player.pos[0],7,game.player.pos[2]-15);
}
const moteMat=new THREE.MeshBasicMaterial({color:'#FFF6C2'});
function makeMote(){
 const g=new THREE.Group();g.add(create(new THREE.IcosahedronGeometry(.17,0),moteMat));
 const spr=new THREE.Sprite(glowSpriteMaterial);spr.scale.set(1.5,1.5,1);g.add(spr);
 scene.add(g);return g;
}
function makeShade(){
 const g=new THREE.Group();g.add(create(new THREE.SphereGeometry(.68,12,10),shadeMaterial.clone()));
 g.add(create(new THREE.SphereGeometry(.12,8,6),eyes,-.23,.15,-.52));
 g.add(create(new THREE.SphereGeometry(.12,8,6),eyes,.23,.15,-.52));
 for(let i=0;i<4;i++)g.add(create(new THREE.ConeGeometry(.15,.7,6),shadeMaterial,(i-1.5)*.27,-.51,.1));
 scene.add(g);return g;
}
function makeDrifter(){
 const g=new THREE.Group(),cloth=m('#8FA3B8',{side:THREE.DoubleSide});
 for(let i=0;i<3;i++){
  const plane=create(new THREE.PlaneGeometry(.4,1.8),cloth,(i-1)*.37,0,0);
  plane.rotation.y=i*.4;g.add(plane);
 }
 scene.add(g);return g;
}
function sync(){
 let lit=0;
 for(const l of game.lanterns){
  const obj=lanterns.get(l.id);if(!obj)continue;
  obj.group.position.set(l.pos[0],l.pos[1],l.pos[2]);obj.light.intensity=l.lit?10:0;
  const mat=obj.lamp.material as THREE.MeshStandardMaterial;
  mat.color.set(l.lit?'#FFB347':'#5B5F6E');
  mat.emissive.set(l.lit?'#FFB347':'#222532');mat.emissiveIntensity=l.lit?2:.15;
  if(l.lit)lit++;
 }
 const existing=new Set(game.motes.map((x:any)=>x.id));
 for(const [id,obj]of motes)if(!existing.has(id)){scene.remove(obj);motes.delete(id);}
 for(const mote of game.motes){
  if(!motes.has(mote.id))motes.set(mote.id,makeMote());
  motes.get(mote.id)!.position.set(mote.pos[0],mote.pos[1]+.6+Math.sin(game.simTick*.04+mote.pos[0])*.2,mote.pos[2]);
 }
 const shadowIds=new Set(game.shades.map((x:any)=>x.id));
 for(const [id,obj]of shades)if(!shadowIds.has(id)){scene.remove(obj);shades.delete(id);}
 for(const shade of game.shades){
  if(!shades.has(shade.id))shades.set(shade.id,makeShade());
  const obj=shades.get(shade.id)!;
  obj.position.set(shade.pos[0],shade.pos[1],shade.pos[2]);
  obj.scale.setScalar(shade.state==='stunned'?.75:1);
  const body=obj.children[0] as THREE.Mesh;
  if(body.material instanceof THREE.MeshStandardMaterial)body.material.color.set(shade.state==='stunned'?'#3A3450':'#120A1A');
 }
 const windIds=new Set(game.drifters.map((x:any)=>x.id));
 for(const [id,obj]of drifters)if(!windIds.has(id)){scene.remove(obj);drifters.delete(id);}
 for(const d of game.drifters){
  if(!drifters.has(d.id))drifters.set(d.id,makeDrifter());
  const obj=drifters.get(d.id)!;
  obj.position.set(d.pos[0],d.pos[1],d.pos[2]);obj.rotation.y+=.011;
 }
 const charmIds=new Set(game.charms.filter((c:any)=>c.available).map((c:any)=>c.id));
 for(const [id,obj]of charms)if(!charmIds.has(id)){scene.remove(obj);charms.delete(id);}
 for(const c of game.charms)if(c.available){
  if(!charms.has(c.id)){
   const obj=create(new THREE.OctahedronGeometry(.55),m('#C8102E',{emissive:'#F2C14E',emissiveIntensity:.35}));
   scene.add(obj);charms.set(c.id,obj);
  }
  const obj=charms.get(c.id)!;obj.position.set(c.pos[0],c.pos[1]+.8+Math.sin(game.simTick*.05)*.2,c.pos[2]);
  obj.rotation.y+=.025;
 }
 may.position.set(game.player.pos[0],game.player.pos[1],game.player.pos[2]);
 if(game.player.vel[0]||game.player.vel[2])may.rotation.y=Math.atan2(game.player.vel[0],game.player.vel[2]);
 ambient.intensity=.15+.55*(lit/game.lanterns.length);
 el('night').textContent='Đêm '+night+' · '+(MAPS as Record<number,any>)[night].name;
 el('health').textContent='♥ '.repeat(game.player.flames).trim()||'♡';
 el('lamps').textContent='🏮 '+lit+'/'+game.lanterns.length+' Đèn';
 el('score').textContent='★ '+game.score;el('total').textContent='Tổng '+(total+game.score);
 el('count').textContent=game.player.carried+'/10';
 el('slots').innerHTML=Array.from({length:10},(_,i)=>'<span class="slot '+(i<game.player.carried?'full':'')+'"></span>').join('');
 const mm=Math.floor(game.timeLeft/60),ss=Math.ceil(game.timeLeft%60);
 el('timer').textContent=String(mm).padStart(2,'0')+':'+String(ss===60?59:ss).padStart(2,'0');
 el('timer').classList.toggle('danger',game.timeLeft<=30);
 const buff=game.player.charmTicks;
 el('charm').textContent=buff?'🍃 Bùa Gió '+(buff/60).toFixed(1)+' s':'🍃 Không có bùa';
 el('dash').textContent='Lướt: '+(game.player.dashCd>0?(game.player.dashCd/60).toFixed(1)+'s':'sẵn sàng');
 el('pulse').textContent='Tỏa sáng: '+(game.player.pulseCd>0?(game.player.pulseCd/60).toFixed(1)+'s':'sẵn sàng');
 const near=game.lanterns.filter((l:any)=>!l.lit&&Math.hypot(l.pos[0]-game.player.pos[0],l.pos[2]-game.player.pos[2])<=2)
 .sort((a:any,b:any)=>a.id.localeCompare(b.id));
 el('hint').textContent=near.length?'E — Nạp ánh sáng ('+near[0].deposited+'/10)':'';
 if(night===3&&game.simTick%1800>=1680&&game.simTick%1800<1800)
  el('windAlert').textContent='🍃 Gió mạnh sắp đến!';
 else el('windAlert').textContent=game.wind.active?'🍃 Gió mạnh đang thổi!':'';
}
let audio:AudioContext|null=null,ambientVoice:OscillatorNode|null=null,ambientGain:GainNode|null=null;
const harmony:OscillatorNode[]=[];
function startAudio(){
 if(audio){void audio.resume();return;}
 try{
  audio=new AudioContext();
  ambientVoice=audio.createOscillator();ambientVoice.type='sine';ambientVoice.frequency.value=110;
  ambientGain=audio.createGain();ambientGain.gain.value=.012*settings.volume;
  ambientVoice.connect(ambientGain).connect(audio.destination);ambientVoice.start();
  for(const pitch of [164.81,220,329.63]){
   const voice=audio.createOscillator(),gain=audio.createGain();
   voice.type='sine';voice.frequency.value=pitch;gain.gain.value=.004;
   voice.connect(gain).connect(ambientGain);voice.start();harmony.push(voice);
  }
 }catch{audio=null;}
}
function sound(freq=450,duration=.12){
 if(!audio||!settings.volume)return;
 const o=audio.createOscillator(),g=audio.createGain();
 o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);
 o.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.55),audio.currentTime+duration);
 g.gain.setValueAtTime(.12*settings.volume,audio.currentTime);
 g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
 o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
}
el('volume').addEventListener('input',()=>{if(ambientGain)ambientGain.gain.value=.012*settings.volume});
let toastUntil=0;
function toast(message:string){
 el('toast').textContent=message;el('toast').style.opacity='1';toastUntil=performance.now()+1700;
}
type Action={text:string,run:()=>void,secondary?:boolean};
function dialog(kicker:string,title:string,message:string,actions:Action[]){
 el('screen').classList.remove('hidden');el('modalKicker').textContent=kicker;
 el('modalTitle').textContent=title;el('modalText').textContent=message;
 const root=el('actions');root.innerHTML='';
 for(const a of actions){
  const b=document.createElement('button');b.textContent=a.text;
  if(a.secondary)b.className='secondary';
  b.addEventListener('click',()=>{startAudio();sound(360,.15);a.run();});
  root.appendChild(b);
 }
 const settingsBtn=document.createElement('button');
 settingsBtn.textContent='Cài đặt';settingsBtn.className='secondary';
 settingsBtn.addEventListener('click',()=>el('settingsPanel').classList.remove('hidden'));
 root.appendChild(settingsBtn);
 el('settingsPanel').classList.add('hidden');
}
function menu(){
 mode='menu';total=0;night=1;
 dialog('Màn hình chính','Đảo Đèn Lồng',
 'Ông Đăng: “Đêm nay biển mây đang hóa đen. Mây ơi, con có thể thắp lại ánh sáng của ba hòn đảo không?”',
 [{text:'Bắt đầu hành trình',run:()=>intro(1)}]);
}
function intro(n:number){
 mode='intro';night=n;
 const details=[
  'Ông Đăng: “Đảo Bến đã chìm trong sương đen. Hãy thu thập đom đóm và thắp 5 ngọn đèn trước bình minh.”',
  'Ông Đăng: “Đảo Cau có hai bờ đảo nối bằng cầu tre. Con có thể lướt qua gió hoặc dùng bục nhảy để sang bờ bên kia.”',
  'Ông Đăng: “Đảo Chuông cao ba tầng. Những cơn gió mạnh sẽ thử thách con lần cuối trước khi Bình Minh trở lại.”'
 ];
 dialog('Đêm '+n+' / 3',(MAPS as Record<number,any>)[n].name,details[n-1],
 [{text:'Bước vào Đêm '+n,run:()=>begin(n)}]);
}
function begin(n:number){
 night=n;game=new Game({night:n,seed:2026+n});buildWorld(n);
 mode='playing';el('screen').classList.add('hidden');
 pressed.clear();accumulator=0;lastCountdown=-1;camAngle=Math.PI;camPitch=n===3?.18:.48;sync();
}
function result(){
 if(game.state==='won'){
  total+=game.score;sound(720,.4);
  if(night===3){
   mode='dawn';
   dialog('Kết thúc hành trình','BÌNH MINH','Ba hòn đảo đã sáng lại. Tổng điểm của bạn: '+total,
    [{text:'Về menu chính',run:menu}]);
  }else{
   mode='won';
   dialog('Đêm '+night+' hoàn thành','Đèn lồng bừng sáng',
    'Điểm đêm này: '+game.score+' · Tổng: '+total+' — Ông Đăng đang đợi ở hòn đảo tiếp theo.',
    [{text:'Tiếp tục Đêm '+(night+1),run:()=>intro(night+1)}]);
  }
 }else{
  mode='lost';sound(165,.35);
  dialog('Đêm '+night+' kết thúc','Sương đen còn đó',
   'Mây đã gục ngã hoặc bình minh đã tới quá sớm. Đừng bỏ cuộc — thử lại đêm này nhé!',
   [{text:'Chơi lại Đêm '+night,run:()=>begin(night)},{text:'Về menu',run:menu,secondary:true}]);
 }
}
function pauseMenu(){
 mode='pause';
 dialog('Tạm dừng','Đảo Đèn Lồng đang nghỉ','Ông Đăng: “Con cứ nghỉ một chút, đèn vẫn đợi con.”',
 [{text:'Tiếp tục',run:resume},{text:'Chơi lại Đêm',run:()=>begin(night),secondary:true},
 {text:'Về menu',run:menu,secondary:true}]);
}
function resume(){
 // Release and re-press pause edge while retaining zero gameplay advancement.
 game.step({pause:false});game.step({pause:true});game.step({pause:false});
 mode='playing';el('screen').classList.add('hidden');pressed.clear();
}
const pressed=new Set<string>();
let camAngle=Math.PI,camPitch=.48,camDistance=14,accumulator=0;
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if([' ','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key))e.preventDefault();
 if(key===' '&&mode==='playing'&&!pressed.has(key))sound(525,.08);
 pressed.add(key);
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>pressed.clear());
window.addEventListener('pointermove',e=>{
 if(mode!=='playing'||e.pointerType!=='mouse')return;
 camAngle-=e.movementX*settings.sensitivity;
});
renderer.domElement.addEventListener('wheel',e=>{
 camDistance=Math.max(7,Math.min(25,camDistance+e.deltaY*.013));
},{passive:true});
function controls(){
 const right=(pressed.has('a')||pressed.has('arrowleft')?1:0)-(pressed.has('d')||pressed.has('arrowright')?1:0);
 const forward=(pressed.has('w')||pressed.has('arrowup')?1:0)-(pressed.has('s')||pressed.has('arrowdown')?1:0);
 return {
  move:[right,forward],cam_yaw_deg:camAngle*180/Math.PI+180,
  jump:pressed.has(' '),dash:pressed.has('shift'),interact:pressed.has('e'),
  pulse:pressed.has('q'),pause:pressed.has('escape')||pressed.has('p')
 };
}
function eventReaction(event:any){
 switch(event.name){
  case 'mote_picked':sound(610,.09);break;
  case 'deposit':toast('✦ Đã nạp '+event.data.amount+' đom đóm');sound(400,.17);break;
  case 'lantern_lit':toast('🏮 Một ngọn đèn đã bừng sáng!');sound(750,.3);break;
  case 'pulse':toast('✧ Ánh sáng xua tan bóng tối');sound(340,.23);break;
  case 'dash':sound(380,.1);break;
  case 'player_hit':toast('⚠ Mây bị tấn công!');sound(170,.2);break;
  case 'charm_picked':toast('🍃 Bùa Gió — nhanh hơn và lướt không hồi chiêu!');sound(880,.2);break;
  case 'drifter_steal':toast('🌫 Gió Lạc đã cướp đom đóm!');sound(210,.15);break;
  case 'shade_spawned':sound(130,.2);break;
  case 'paused':pauseMenu();break;
  case 'resumed':mode='playing';el('screen').classList.add('hidden');break;
 }
}
let previous=performance.now(),frames=0,lastFPS=performance.now(),fps=0,lastCountdown=-1;
function animate(now:number){
 requestAnimationFrame(animate);
 const elapsed=Math.min(.10,(now-previous)/1000);previous=now;
 frames++;
 if(now-lastFPS>=1000){fps=Math.round(frames*1000/(now-lastFPS));frames=0;lastFPS=now;el('fps').textContent='FPS '+fps;}
 if(mode==='playing'||mode==='pause'){
  accumulator+=elapsed;
  let steps=0;
  while(accumulator>=DT&&steps<7){
   const events=game.step(controls());
   for(const event of events)eventReaction(event);
   const remaining=Math.ceil(game.timeLeft);
   if(mode==='playing'&&remaining<=10&&remaining>=1&&remaining!==lastCountdown){
    sound(remaining<=3?960:700,.1);lastCountdown=remaining;
   }
   accumulator-=DT;steps++;
   if(game.state==='won'||game.state==='lost'){result();break;}
  }
  if(steps>=7)accumulator=0;
  sync();
 }
 if(now>toastUntil)el('toast').style.opacity='0';
 if(mode==='playing'){
  const nearest=game.lanterns.filter((x:any)=>!x.lit).sort((a:any,b:any)=>{
   const da=Math.hypot(a.pos[0]-game.player.pos[0],a.pos[2]-game.player.pos[2]);
   const db=Math.hypot(b.pos[0]-game.player.pos[0],b.pos[2]-game.player.pos[2]);
   return da-db;
  })[0];
  if(nearest){
   const target=new THREE.Vector3(nearest.pos[0],nearest.pos[1]+4,nearest.pos[2]);
   target.project(camera);
   if(target.z>1||Math.abs(target.x)>1||Math.abs(target.y)>1){
    const direction=target.x>.4?'↗':target.x<-.4?'↖':'↑';
    el('pointer').textContent=direction+' Đèn gần nhất: '+nearest.id;
    el('pointer').style.transform='translateX(-50%)';
   }else el('pointer').textContent='';
  }else el('pointer').textContent='';
 }
 const p=game.player.pos;
 const dest=new THREE.Vector3(
  p[0]+Math.sin(camAngle)*Math.cos(camPitch)*camDistance,
  p[1]+1.7+Math.sin(camPitch)*camDistance,
  p[2]+Math.cos(camAngle)*Math.cos(camPitch)*camDistance
 );
 camera.position.lerp(dest,.12);
 camera.lookAt(new THREE.Vector3(p[0],p[1]+1.5,p[2]));
 renderer.render(scene,camera);
}
menu();buildWorld(1);sync();
if(new URLSearchParams(location.search).has('autoplay')){
 const n=Number(new URLSearchParams(location.search).get('autoplay'));begin([1,2,3].includes(n)?n:1);
}
requestAnimationFrame(animate);
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
