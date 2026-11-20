import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Game,MAPS,TUNING,DT} from './core/game.js';
import './style-v12.css';
import {makeBenchmark} from './bench-mode.js';
import {fetchBoard,saveBoard,type LeaderEntry} from './leaderboard-ui.js';
const app=document.querySelector<HTMLDivElement>('#app')!;
const benchOptions=new URLSearchParams(location.search);
const isBenchmark=benchOptions.has('benchmark');
const benchSeed=Number(benchOptions.get('seed')??42);
const benchDuration=Number(benchOptions.get('duration')??30);
let activeBench:ReturnType<typeof makeBenchmark>|null=null;
app.innerHTML=`
<div class="hud">
 <div class="hudTop">
  <div class="group"><div class="micro" id="night">Đêm 1 · Đảo Bến</div><div class="large" id="health">♥ ♥ ♥</div><div class="dim" id="charm">🍃 Không có bùa</div></div>
  <div class="group hudTime"><div class="micro">Thời gian còn lại</div><div class="large" id="timer">05:00</div></div>
  <div class="group" style="text-align:right"><div class="micro" id="lamps">🏮 0/5 Đèn</div><div class="large" id="score">★ 0</div><div class="dim" id="total">Tổng 0</div></div>
 </div>
 <div id="windAlert"></div>
 <div id="toast" role="status"></div><div id="pointer"></div>
  <div id="threatArrow" aria-live="polite"></div>
  <div id="lowFuel" aria-live="polite"></div>
  <div id="lastTen" aria-live="assertive"></div>
 <div class="hudBottom">
  <div class="group controls" id="controlsText">WASD: Di chuyển · Space: Nhảy · Shift: Lướt · E: Nạp · Q: Tỏa sáng · Esc: Tạm dừng</div>
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
  <div class="setting"><label for="colorblind">Bảng màu dễ phân biệt</label><input id="colorblind" type="checkbox" style="width:22px;height:22px"></div>
  <div class="setting"><label for="reducedMotion">Giảm chuyển động</label><input id="reducedMotion" type="checkbox"></div>
  <div class="setting"><label for="largeText">Chữ lớn (×1.25)</label><input id="largeText" type="checkbox"></div>
  <div class="micro">Gán phím điều khiển</div><div id="keyBindings"></div>
  <div id="bindStatus" role="status"></div>
  <button id="resetBindings" class="secondary">Khôi phục phím mặc định</button>
  <button id="closeSettings" class="secondary">Đóng cài đặt</button>
 </div>
 <div id="boardList"></div>
 <div id="saveScore" class="hidden"><label for="scoreName">Tên (3–12 ký tự A–Z, 0–9, _)</label>
  <input id="scoreName" maxlength="12" placeholder="NguoiChoi" />
  <button id="saveEntry">Lưu điểm</button><div id="saveMessage" role="status"></div></div>
</div></div>`;
const el=(id:string)=>document.getElementById(id)!;
type KeyAction='forward'|'backward'|'left'|'right'|'jump'|'dash'|'interact'|'pulse'|'pause';
const defaultKeys:Record<KeyAction,string>={forward:'w',backward:'s',left:'a',right:'d',jump:' ',dash:'shift',interact:'e',pulse:'q',pause:'escape'};
const actionNames:Record<KeyAction,string>={forward:'Đi tới',backward:'Đi lùi',left:'Sang trái',right:'Sang phải',jump:'Nhảy',dash:'Lướt',interact:'Tương tác',pulse:'Tỏa sáng',pause:'Tạm dừng'};
const allActions=Object.keys(defaultKeys) as KeyAction[];
let settings={volume:.35,sensitivity:.004,colorblind:false,reducedMotion:false,largeText:false,bindings:{...defaultKeys}};
try{settings={...settings,...JSON.parse(localStorage.getItem('ddl-settings')||'{}')}}catch{}
settings.bindings={...defaultKeys,...settings.bindings};
if(new Set(Object.values(settings.bindings)).size!==allActions.length)settings.bindings={...defaultKeys};
// Optional visual-only check; does not alter headless state or persist preference.
if(new URLSearchParams(location.search).has('colorblind'))settings.colorblind=true;
(el('volume') as HTMLInputElement).value=String(Math.round(settings.volume*100));
(el('sensitivity') as HTMLInputElement).value=String(Math.round(settings.sensitivity*10000));
(el('colorblind') as HTMLInputElement).checked=settings.colorblind;
(el('reducedMotion') as HTMLInputElement).checked=settings.reducedMotion;
(el('largeText') as HTMLInputElement).checked=settings.largeText;
const saveSettings=()=>{settings.volume=Number((el('volume') as HTMLInputElement).value)/100;
 settings.sensitivity=Number((el('sensitivity') as HTMLInputElement).value)/10000;
 settings.colorblind=(el('colorblind') as HTMLInputElement).checked;
 settings.reducedMotion=(el('reducedMotion') as HTMLInputElement).checked;
 settings.largeText=(el('largeText') as HTMLInputElement).checked;
 applyColorMode();
 localStorage.setItem('ddl-settings',JSON.stringify(settings));};
el('volume').addEventListener('input',saveSettings);
el('sensitivity').addEventListener('input',saveSettings);
el('colorblind').addEventListener('change',saveSettings);
el('reducedMotion').addEventListener('change',saveSettings);
el('largeText').addEventListener('change',saveSettings);
let rebinding:KeyAction|null=null;
function renderKeyBindings(){
 const root=el('keyBindings');root.innerHTML='';
 for(const action of allActions){
  const line=document.createElement('div');line.className='setting';
  const label=document.createElement('span');label.textContent=actionNames[action];
  const button=document.createElement('button');button.className='secondary';
  button.textContent=settings.bindings[action]===' '?'Space':settings.bindings[action];
  button.addEventListener('click',()=>{
   rebinding=action;el('bindStatus').textContent='Nhấn phím mới cho '+actionNames[action];
  });
  line.append(label,button);root.appendChild(line);
 }
 const display=(a:KeyAction)=>settings.bindings[a]===' '?'Space':settings.bindings[a].toUpperCase();
 el('controlsText').textContent=
  [display('forward'),display('left'),display('backward'),display('right')].join('/')+
  ' Di chuyển · '+display('jump')+' Nhảy · '+display('dash')+' Lướt · '+
  display('interact')+' Nạp · '+display('pulse')+' Tỏa sáng · '+display('pause')+' Tạm dừng';
}
el('resetBindings').addEventListener('click',()=>{
 settings.bindings={...defaultKeys};rebinding=null;
 el('bindStatus').textContent='Đã khôi phục phím mặc định';
 renderKeyBindings();saveSettings();
});
renderKeyBindings();
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
const moon=new THREE.DirectionalLight('#b1c6ff',1.8);moon.position.set(-12,25,12);moon.castShadow=true;
const fill=new THREE.DirectionalLight('#b1c6ff',.55);fill.position.set(16,15,-18);scene.add(fill);
moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-90;moon.shadow.camera.right=90;
moon.shadow.camera.top=90;moon.shadow.camera.bottom=-90;scene.add(moon);
const m=(color:number|string,extra:Record<string,unknown>={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const create=(geometry:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0)=>{
 const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
};
const stage=new THREE.Group();scene.add(stage);
const props=new THREE.Group();scene.add(props);
const cameraObstacles:THREE.Object3D[]=[];
const cameraRay=new THREE.Raycaster();
let upperSurface:THREE.Mesh|null=null;
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
type LanternVisual={group:THREE.Group,lamp:THREE.Mesh,light:THREE.PointLight,
 fuelBar:THREE.Group,fuelFill:THREE.Mesh,broken:THREE.Mesh};
const lanterns=new Map<string,LanternVisual>();
const motes=new Map<string,THREE.Group>(),shades=new Map<string,THREE.Group>(),drifters=new Map<string,THREE.Group>(),charms=new Map<string,THREE.Mesh>();
const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;
const gctx=glowCanvas.getContext('2d')!, grad=gctx.createRadialGradient(32,32,1,32,32,31);
grad.addColorStop(0,'rgba(255,246,194,1)');grad.addColorStop(.3,'rgba(255,229,138,.65)');grad.addColorStop(1,'rgba(255,229,138,0)');
gctx.fillStyle=grad;gctx.fillRect(0,0,64,64);
const glowSpriteMaterial=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
const shadeMaterial=m('#120A1A',{roughness:.3}),eyes=new THREE.MeshBasicMaterial({color:'#7A3CFF'});
const shadeOutlines=new THREE.MeshBasicMaterial({color:'#7A3CFF',wireframe:true,transparent:true,opacity:.35,depthWrite:false});
function applyColorMode(){
 const on=settings.colorblind;
 eyes.color.set(on?'#00B3FF':'#7A3CFF');
 shadeOutlines.color.set(on?'#00B3FF':'#7A3CFF');
 document.body.classList.toggle('colorblind',on);
 document.body.classList.toggle('reduce-motion',settings.reducedMotion);
 document.body.classList.toggle('large-text',settings.largeText);
}
applyColorMode();
let game=new Game({night:1,seed:2026}),night=1,total=0,mode:'menu'|'intro'|'playing'|'pause'|'won'|'lost'|'dawn'|'bench'='menu';
function clearGroup(g:THREE.Group){while(g.children.length)g.remove(g.children[0]);}
function addIsland(x:number,z:number,r:number,y=0){
 // Turf must sit above the base top rather than on the same plane (z-fighting).
 const base=create(new THREE.CylinderGeometry(r,r-1.7,4,96),m('#6B4A2F'),x,y-2.18,z);
 const turf=create(new THREE.CylinderGeometry(r-.04,r,.24,96),m('#2F5D50'),x,y-.12,z);
 base.castShadow=false;
 stage.add(base,turf);
}
function buildWorld(id:number){
 clearGroup(stage);clearGroup(props);cameraObstacles.length=0;upperSurface=null;
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
  // Half-annulus platform, with a real lower rim instead of a paper-thin surface.
  const r1=create(new THREE.RingGeometry(12,24,96,1,0,Math.PI),
   m('#2F5D50',{side:THREE.DoubleSide}),0,3,0);
  r1.rotation.x=-Math.PI/2;r1.castShadow=false;
  stage.add(r1);cameraObstacles.push(r1);
  const upperMat=m('#C9B48A',{transparent:true,opacity:1,side:THREE.DoubleSide});
  const upper=create(new THREE.CylinderGeometry(8,8,.32,64),upperMat,0,5.84,0);
  upper.castShadow=false;
  stage.add(upper);cameraObstacles.push(upper);upperSurface=upper;
  for(const angle of [30,150]){
   const a=angle*Math.PI/180;
   // Align ramp's long axis radially, incline 3m over 6m horizontally.
   const ramp=create(new THREE.BoxGeometry(Math.hypot(6,3),.24,3),m('#C9B48A'),
    27*Math.cos(a),1.5,27*Math.sin(a));
   const heading=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-a);
   const slope=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.atan2(3,6));
   ramp.quaternion.copy(heading.multiply(slope));stage.add(ramp);
  }
  const tower=create(new THREE.CylinderGeometry(2,2,8,14),m('#6B4A2F'),0,10,0);
  stage.add(tower);cameraObstacles.push(tower);
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
  const tornShape=new THREE.Shape();
  tornShape.moveTo(-.16,-.2);tornShape.lineTo(.12,-.06);
  tornShape.lineTo(-.03,.11);tornShape.lineTo(-.13,.21);tornShape.closePath();
  const broken=create(new THREE.ShapeGeometry(tornShape),
   new THREE.MeshBasicMaterial({color:'#151628',side:THREE.DoubleSide}),0,4.2,.51);
  g.add(broken);
  const fuelBar=new THREE.Group();fuelBar.position.set(0,5.65,0);
  const bg=create(new THREE.PlaneGeometry(1.55,.25),
   new THREE.MeshBasicMaterial({color:'#131727',transparent:true,opacity:.8,depthWrite:false}));
  const fuelFill=create(new THREE.PlaneGeometry(1.38,.15),
   new THREE.MeshBasicMaterial({color:'#FFB347',transparent:true,depthWrite:false}),0,0,.02);
  fuelBar.add(bg,fuelFill);g.add(fuelBar);
  const light=new THREE.PointLight('#FFB347',0,13);light.position.y=4.2;g.add(light);
  props.add(g);lanterns.set(l.id,{group:g,lamp,light,fuelBar,fuelFill,broken});
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
// Merge the two eyes and four tentacles once for *both* normal gameplay and
// benchmark; visual meshes remain identical, but draw calls per shade halve.
const shadeBodyGeometry=new THREE.SphereGeometry(.68,12,10);
const shadeOutlineGeometry=new THREE.SphereGeometry(.715,12,10);
const shadeEyeGeometry=mergeGeometries([-1,1].map(side=>{
 const geo=new THREE.SphereGeometry(.12,8,6);
 geo.translate(side*.23,.15,-.52);return geo;
}))!;
const shadeTentacleGeometry=mergeGeometries(Array.from({length:4},(_,i)=>{
 const geo=new THREE.ConeGeometry(.15,.7,6);
 geo.translate((i-1.5)*.27,-.51,.1);return geo;
}))!;
function makeShade(){
 const g=new THREE.Group();
 const body=create(shadeBodyGeometry,shadeMaterial.clone());
 g.add(body);
 const eyeMesh=create(shadeEyeGeometry,eyes);
 eyeMesh.castShadow=false;g.add(eyeMesh);
 const outlineMesh=create(shadeOutlineGeometry,shadeOutlines);
 outlineMesh.castShadow=false;g.add(outlineMesh);
 const tentacles=create(shadeTentacleGeometry,shadeMaterial);
 tentacles.castShadow=false;g.add(tentacles);
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
  obj.group.position.set(l.pos[0],l.pos[1],l.pos[2]);
  const fuel=l.fuelUnits/60;
  const low=l.lit&&fuel<30,blink=low&&!settings.reducedMotion?(Math.floor(game.simTick/30)%2===0?1:.35):1;
  obj.light.intensity=l.lit?10*blink:0;
  const mat=obj.lamp.material as THREE.MeshStandardMaterial;
  mat.color.set(l.lit?'#FFB347':'#5B5F6E');
  mat.emissive.set(l.lit?'#FFB347':'#222532');mat.emissiveIntensity=l.lit?2*blink:.15;
  obj.lamp.scale.setScalar(l.lit?1:.8);obj.broken.visible=!l.lit;
  obj.fuelBar.visible=l.lit;
  obj.fuelBar.quaternion.copy(camera.quaternion);
  const fraction=Math.max(0,Math.min(1,fuel/100));
  obj.fuelFill.scale.x=fraction;obj.fuelFill.position.x=-(1-fraction)*.69;
  const fillMat=obj.fuelFill.material as THREE.MeshBasicMaterial;
  fillMat.color.set(low?'#FF5A5F':'#F2C14E');fillMat.opacity=blink;
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
 el('count').textContent=game.player.carried+'/'+game.capacity;
 el('slots').innerHTML=Array.from({length:game.capacity},(_,i)=>'<span class="slot '+(i<game.player.carried?'full':'')+'"></span>').join('');
 const mm=Math.floor(game.timeLeft/60),ss=Math.ceil(game.timeLeft%60);
 el('timer').textContent=(game.timeLeft<=30?'⚠ ':'')+String(mm).padStart(2,'0')+':'+String(ss===60?59:ss).padStart(2,'0');
 el('timer').classList.toggle('danger',game.timeLeft<=30);
 const buff=game.player.charmTicks;
 el('charm').textContent=buff?'🍃 Bùa Gió '+(buff/60).toFixed(1)+' s':'🍃 Không có bùa';
 el('dash').textContent='Lướt: '+(game.player.dashCd>0?(game.player.dashCd/60).toFixed(1)+'s':'sẵn sàng');
 el('pulse').textContent='Tỏa sáng: '+(game.player.pulseCd>0?(game.player.pulseCd/60).toFixed(1)+'s':'sẵn sàng');
 const near=game.lanterns.filter((l:any)=>(!l.lit||l.fuelUnits<6000)&&
  Math.hypot(l.pos[0]-game.player.pos[0],l.pos[2]-game.player.pos[2])<=2)
 .sort((a:any,b:any)=>a.id.localeCompare(b.id));
 const target=near[0];
 el('hint').textContent=target?(target.lit?
  'E — Châm dầu '+target.id+' ('+(target.fuelUnits/60).toFixed(1)+'%)':
  'E — Nạp ánh sáng ('+target.deposited+'/'+(target.ever_lit?5:10)+')'):'';
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
let lastSpawnId:string|null=null,lastSpawnNoticeUntil=0;
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
 el('saveScore').classList.add('hidden');
 el('boardList').innerHTML='';
}
let entrySaved=false;
let sessionSeed=2027;
async function showBoard(){
 mode='menu';
 dialog('10 người dẫn đầu','Bảng xếp hạng','Điểm cao nhất được giữ lại trên máy này.',
  [{text:'Về menu',run:menu}]);
 const list=el('boardList');list.innerHTML='';
 const entries=await fetchBoard();
 if(!entries.length){list.textContent='Chưa có điểm được lưu.';return;}
 const table=document.createElement('table');
 table.className='leaderboardTable';
 const header=document.createElement('tr');
 for(const name of ['#','Tên','Điểm','Đêm thắng','Ngày']){
  const cell=document.createElement('th');cell.textContent=name;header.appendChild(cell);
 }
 table.appendChild(header);
 entries.forEach((e,i)=>{
  const row=document.createElement('tr');
  for(const v of [String(i+1),e.name,String(e.score),String(e.nights_won),new Date(e.achieved_at).toLocaleDateString('vi-VN')]){
   const cell=document.createElement('td');cell.textContent=v;row.appendChild(cell);
  }
  table.appendChild(row);
 });
 list.appendChild(table);
}
function showSave(score:number,nightsWon:number){
 entrySaved=false;
 el('saveScore').classList.remove('hidden');
 el('saveMessage').textContent='';
 (el('scoreName') as HTMLInputElement).value='';
 el('saveEntry').onclick=async()=>{
  if(entrySaved)return;
  const name=(el('scoreName') as HTMLInputElement).value.trim();
  if(!/^[A-Za-z0-9_]{3,12}$/.test(name)){
   el('saveMessage').textContent='⚠ Tên phải có 3–12 ký tự A–Z, 0–9 hoặc _';return;
  }
  const entry:LeaderEntry={name,score,nights_won:nightsWon,
   achieved_at:new Date().toISOString(),seed:sessionSeed};
  try{
   const result=await saveBoard(entry);
   entrySaved=true;
   el('saveMessage').textContent=result.onDisk?
    'Đã lưu điểm trên đĩa!':'Đã lưu trong trình duyệt (dùng bản phát hành để xuất ra file).';
  }catch(e){
   el('saveMessage').textContent='⚠ '+(e as Error).message;
  }
 };
}
function menu(){
 mode='menu';total=0;night=1;
 dialog('Màn hình chính','Đảo Đèn Lồng',
 'Ông Đăng: “Đêm nay biển mây đang hóa đen. Mây ơi, con có thể thắp lại ánh sáng của ba hòn đảo không?”',
 [{text:'Bắt đầu hành trình',run:()=>intro(1)},
  {text:'Bảng xếp hạng',run:()=>{void showBoard()},secondary:true}]);
}
function intro(n:number){
 mode='intro';night=n;
 const details=[
  'Ông Đăng: “Đảo Bến chìm trong sương. Hãy giữ ít nhất 3/5 đèn sáng đến bình minh. Đèn cạn dầu thì phải châm thêm!”',
  'Ông Đăng: “Đảo Cau có hai bờ nối bằng cầu tre. Hãy giữ ít nhất 4/6 đèn sáng đến bình minh và châm dầu kịp thời.”',
  'Ông Đăng: “Đảo Chuông ba tầng đầy gió. Hãy sống sót và giữ ít nhất 5/7 đèn sáng đến bình minh.”'
 ];
 dialog('Đêm '+n+' / 3',(MAPS as Record<number,any>)[n].name,details[n-1],
 [{text:'Bước vào Đêm '+n,run:()=>begin(n)}]);
}
function begin(n:number){
 night=n;
 if(n===1&&total===0)sessionSeed=2027;
 const preview=new URLSearchParams(location.search).has('visual-proof');
 const visualScenario=preview?{random_motes:false,random_shades:false,random_drifters:false,
  shades:[{id:'S1',pos:[0,1,14],state:'wander'}],
  lanterns:[
   {id:'L1',pos:[0,0,7],lit:true,fuel:24},
   {id:'L2',pos:[4,0,10],lit:true,fuel:82},
   {id:'L3',pos:[-4,0,10],lit:false,ever_lit:true}
  ]}:undefined;
 const gameOptions:any={night:n,seed:2026+n};
 if(preview)gameOptions.scenario=visualScenario;
 game=new Game(gameOptions);buildWorld(n);
 mode='playing';el('screen').classList.add('hidden');
 pressed.clear();accumulator=0;lastCountdown=-1;camAngle=Math.PI;camPitch=n===3?.18:.48;
 const pos=game.player.pos;
 camera.position.set(
  pos[0]+Math.sin(camAngle)*Math.cos(camPitch)*camDistance,
  pos[1]+1.7+Math.sin(camPitch)*camDistance,
  pos[2]+Math.cos(camAngle)*Math.cos(camPitch)*camDistance
 );
 camera.lookAt(pos[0],pos[1]+1.5,pos[2]);sync();
}
function result(){
 if(game.state==='won'){
  total+=game.score;sound(720,.4);
  if(night===3){
   mode='dawn';
   dialog('Kết thúc hành trình','BÌNH MINH','Ba hòn đảo đã sáng lại. Tổng điểm của bạn: '+total,
    [{text:'Về menu chính',run:menu},{text:'Bảng xếp hạng',run:()=>{void showBoard()},secondary:true}]);
    showSave(total,3);
  }else{
   mode='won';
   dialog('Đêm '+night+' hoàn thành','Bình minh trở lại',
    'Điểm đêm này: '+game.score+' · Tổng: '+total+' — Ông Đăng đang đợi ở hòn đảo tiếp theo.',
    [{text:'Tiếp tục Đêm '+(night+1),run:()=>intro(night+1)}]);
  }
 }else{
  mode='lost';sound(165,.35);
  dialog('Đêm '+night+' kết thúc','Sương đen còn đó',
   'Mây đã cạn Ngọn Lửa hoặc chưa giữ đủ đèn sáng đến bình minh. Hãy thử lại đêm này!',
   [{text:'Chơi lại Đêm '+night,run:()=>begin(night)},{text:'Về menu',run:menu,secondary:true},
    {text:'Bảng xếp hạng',run:()=>{void showBoard()},secondary:true}]);
   showSave(total,night-1);
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
 if(rebinding!==null){
  e.preventDefault();
  if(Object.entries(settings.bindings).some(([name,v])=>name!==rebinding&&v===key)){
   el('bindStatus').textContent='⚠ Phím '+(key===' '?'Space':key)+' đã được sử dụng';
   return;
  }
  settings.bindings[rebinding]=key;
  el('bindStatus').textContent='Đã gán '+actionNames[rebinding]+' = '+(key===' '?'Space':key);
  rebinding=null;renderKeyBindings();saveSettings();return;
 }
 if([' ','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key))e.preventDefault();
 if(key===settings.bindings.jump&&mode==='playing'&&!pressed.has(key))sound(525,.08);
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
 const right=(pressed.has(settings.bindings.left)?1:0)-(pressed.has(settings.bindings.right)?1:0);
 const forward=(pressed.has(settings.bindings.forward)?1:0)-(pressed.has(settings.bindings.backward)?1:0);
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
  case 'lantern_lit':toast(event.data.relight?'🏮 Đèn đã được thắp lại!':'🏮 Một ngọn đèn đã bừng sáng!');sound(750,.3);break;
  case 'refuel':toast('✦ Châm '+event.data.amount+' đom đóm vào đèn');sound(540,.16);break;
  case 'lantern_out':toast('⚠ Một đèn đã cạn dầu!');sound(160,.3);break;
  case 'fuel_drain':toast('⚠ Bóng Mực đang hút dầu!');sound(135,.16);break;
  case 'pulse':toast('✧ Ánh sáng xua tan bóng tối');sound(340,.23);break;
  case 'dash':sound(380,.1);break;
  case 'player_hit':toast('⚠ Mây bị tấn công!');sound(170,.2);break;
  case 'charm_picked':toast('🍃 Bùa Gió — nhanh hơn và lướt không hồi chiêu!');sound(880,.2);break;
  case 'drifter_steal':toast('🌫 Gió Lạc đã cướp đom đóm!');sound(210,.15);break;
  case 'shade_spawned':
   lastSpawnId=event.data.id;lastSpawnNoticeUntil=performance.now()+4500;
   sound(130,.2);break;
  case 'paused':pauseMenu();break;
  case 'resumed':mode='playing';el('screen').classList.add('hidden');break;
 }
}
let previous=performance.now(),frames=0,lastFPS=performance.now(),fps=0,lastCountdown=-1;
function animate(now:number){
 requestAnimationFrame(animate);
 const elapsed=Math.min(.10,(now-previous)/1000);previous=now;
 if(mode==='bench'&&activeBench){
  activeBench.frame(now,{game,camera,renderer,scene,shades,motes});return;
 }
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
 const lookAt=new THREE.Vector3(p[0],p[1]+1.5,p[2]);
 const isBeneathUpper=night===3&&p[1]<5.5&&Math.hypot(p[0],p[2])<11;
 if(upperSurface){
  const mat=upperSurface.material as THREE.MeshStandardMaterial;
  mat.opacity=THREE.MathUtils.lerp(mat.opacity,isBeneathUpper?.12:1,.18);
 }
 const aim=dest.clone().sub(lookAt),length=aim.length();
 if(length>.001&&cameraObstacles.length){
  cameraRay.set(lookAt,aim.clone().normalize());
  cameraRay.far=length;
  const candidates=isBeneathUpper?cameraObstacles.filter(x=>x!==upperSurface):cameraObstacles;
  const hits=cameraRay.intersectObjects(candidates,false);
  if(hits.length)dest.copy(lookAt).addScaledVector(aim.normalize(),Math.max(1.8,hits[0].distance-.6));
 }
 if(settings.reducedMotion)camera.position.copy(dest);else camera.position.lerp(dest,.16);
 camera.lookAt(lookAt);
 renderer.render(scene,camera);
}
if(isBenchmark){
 if(!Number.isInteger(benchSeed)||!Number.isFinite(benchDuration)||benchDuration<=0)
  throw Error('Invalid benchmark arguments');
 activeBench=makeBenchmark(benchSeed,benchDuration);
 game=activeBench.game;night=1;buildWorld(1);sync();
 mode='bench';may.position.set(0,0,0);
 el('screen').classList.add('hidden');
 (document.querySelector('.hud') as HTMLElement).style.display='none';
 camera.position.set(30,15,0);camera.lookAt(0,0,0);
 (window as any).__benchmarkInfo={shades:game.shades.length,motes:game.motes.length,
  lit:game.lanterns.filter((l:any)=>l.lit).length};
}else{menu();buildWorld(1);sync();}
if(!isBenchmark&&new URLSearchParams(location.search).has('score-proof')){
 begin(1);game.state='lost';result();
}
if(!isBenchmark&&new URLSearchParams(location.search).has('autoplay')){
 const n=Number(new URLSearchParams(location.search).get('autoplay'));begin([1,2,3].includes(n)?n:1);
}
requestAnimationFrame(animate);
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
