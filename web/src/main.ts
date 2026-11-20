import * as THREE from 'three';
import { Game, TUNING, DT } from './core/game.js';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="hud">
  <div class="panel">
    <div class="title">Đảo Đèn Lồng · Đêm 1</div>
    <div class="row"><span id="health">♥ ♥ ♥</span><span id="motes">✦ 0/8</span><span id="lamps">🏮 0/5</span></div>
    <div id="light-meter"><div id="light-fill"></div></div>
  </div>
  <div class="panel" style="text-align:right">
    <div class="title">Đêm đang trôi</div>
    <div class="row" style="justify-content:flex-end"><span id="time">05:00</span><span id="score">★ 0</span></div>
  </div>
</div>
<div id="objective">✧ Gom đom đóm, thắp sáng cả năm ngọn đèn ✧</div>
<div id="toast"></div>
<div id="controls"><kbd>W A S D</kbd> Di chuyển &nbsp; <kbd>Space</kbd> Nhảy &nbsp; <kbd>E</kbd> Thắp đèn &nbsp; <kbd>Q</kbd> Tỏa sáng &nbsp; <kbd>Chuột</kbd> Xoay camera</div>
<div id="start"><div class="modal"><div class="star">✦ 🏮 ✦</div><div class="title">Một chuyến phiêu lưu cổ tích</div>
<h1>Đảo Đèn Lồng</h1><p>Một màn sương đen đã nuốt mất ánh sáng. Hãy giúp Mây nhặt những đốm đom đóm, thắp sáng năm ngọn đèn và tránh xa các Bóng Mực.</p>
<button id="play">Bắt đầu Đêm 1 →</button><p style="font-size:12px">Được tạo bằng Three.js · Phase 1 · AI SDLC</p></div></div>
`;
const el = (id:string)=>document.getElementById(id)!;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.3;
app.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b0e25);
scene.fog=new THREE.FogExp2(0x19112e,.014);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,350);
scene.add(new THREE.HemisphereLight(0x6676c9,0x151524,2.2));
const moonlight=new THREE.DirectionalLight(0xc7c9ff,2.5);
moonlight.position.set(-14,22,13);moonlight.castShadow=true;
moonlight.shadow.mapSize.set(1024,1024);moonlight.shadow.camera.left=-35;moonlight.shadow.camera.right=35;
moonlight.shadow.camera.top=35;moonlight.shadow.camera.bottom=-35;
scene.add(moonlight);
const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,pos?:[number,number,number])=>{
 const m=new THREE.Mesh(geo,mat);if(pos)m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;return m;
};
const material=(c:number,opts:Record<string,unknown>={})=>new THREE.MeshStandardMaterial({color:c,roughness:.88,...opts});
const grass=material(0x32634b), rim=material(0x43314e), pathMat=material(0x997b70), wood=material(0x5a3646), leaf=material(0x276459), trunk=material(0x55374f);
const ocean=mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x1a254d,roughness:.3,metalness:.15}),[0,-5,0]);
ocean.rotation.x=-Math.PI/2;scene.add(ocean);
const island=mesh(new THREE.CylinderGeometry(24.5,22.7,3,96),rim,[0,-1.5,0]);scene.add(island);
const turf=mesh(new THREE.CylinderGeometry(24.4,24.45,.28,96),grass,[0,-.14,0]);scene.add(turf);
const central=mesh(new THREE.CylinderGeometry(4.2,5,.11,48),pathMat,[0,.04,0]);scene.add(central);
const circle=new THREE.Group();scene.add(circle);
for(let i=0;i<5;i++){
 const theta=i*Math.PI*2/5-Math.PI/2;
 const dx=Math.cos(theta),dz=Math.sin(theta);
 const path=mesh(new THREE.BoxGeometry(3,.07,13),pathMat,[dx*9,.06,dz*9]);
 path.rotation.y=-theta+Math.PI/2;scene.add(path);
}
const treeMat=material(0x2d6254),treeTop=material(0x3b806c);
for(let i=0;i<23;i++){
 let a=i*2.3999632,rad=19+(i%4)*1.03,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
 const g=new THREE.Group();g.position.set(x,0,z);
 const stem=mesh(new THREE.CylinderGeometry(.15,.25,2.1,7),trunk,[0,1,0]);
 const crown=mesh(new THREE.ConeGeometry(1.2+(i%3)*.2,3.2,8),i%2?treeMat:treeTop,[0,3,0]);
 g.add(stem,crown);g.scale.setScalar(.65+(i%5)*.12);scene.add(g);
}
// Maya/Mây is a tiny low-poly lantern keeper wearing a conical hat.
const may=new THREE.Group();scene.add(may);
const body=mesh(new THREE.ConeGeometry(.47,1.35,8),material(0xd8a6b1),[0,.88,0]);may.add(body);
const face=mesh(new THREE.SphereGeometry(.32,12,8),material(0xffd9b9),[0,1.7,0]);may.add(face);
const hat=mesh(new THREE.ConeGeometry(.83,.65,16),material(0xc4a46a),[0,2.17,0]);may.add(hat);
const hatRim=mesh(new THREE.CylinderGeometry(.75,.82,.055,16),material(0xf3d29c),[0,1.88,0]);may.add(hatRim);
const arms=material(0xeac7bd);
may.add(mesh(new THREE.SphereGeometry(.22,8,6),arms,[-.43,1.2,0]));
may.add(mesh(new THREE.SphereGeometry(.22,8,6),arms,[.43,1.2,0]));
// The little lamp hangs from the rim of Mây's conical hat.
const cord=mesh(new THREE.CylinderGeometry(.025,.025,.45,6),material(0xf6d6a6),[.77,1.67,.15]);may.add(cord);
const handLantern=new THREE.PointLight(0xffca6a,.75,5,2);handLantern.position.set(.77,1.43,.15);may.add(handLantern);
may.add(mesh(new THREE.OctahedronGeometry(.21),new THREE.MeshBasicMaterial({color:0xffdf8b}),[.77,1.43,.15]));
const lampMeshes=new Map<string,{group:THREE.Group,light:THREE.PointLight,orb:THREE.Mesh}>();
function makeLantern(id:string,pos:number[]) {
 const group=new THREE.Group();group.position.set(pos[0],0,pos[2]);
 const base=mesh(new THREE.CylinderGeometry(.83,.95,.42,12),material(0x59475b),[0,.2,0]);
 const post=mesh(new THREE.CylinderGeometry(.12,.19,4.8,8),wood,[0,2.6,0]);
 const top=mesh(new THREE.CylinderGeometry(.9,.9,.15,8),wood,[0,4.92,0]);
 const orb=mesh(new THREE.SphereGeometry(.62,12,8),new THREE.MeshStandardMaterial({color:0x6b4a67,emissive:0x241426,emissiveIntensity:.5,roughness:.4}),[0,4.35,0]);
 const light=new THREE.PointLight(0xffa749,0,13,1.5);light.position.set(0,4.3,0);
 const roof=mesh(new THREE.ConeGeometry(1,.55,8),material(0x834c53),[0,5.17,0]);
 const glowCircle=mesh(new THREE.TorusGeometry(1.0,.05,6,32),new THREE.MeshBasicMaterial({color:0xf4be78,transparent:true,opacity:.33}),[0,.13,0]);
 glowCircle.rotation.x=Math.PI/2;group.add(base,post,top,orb,roof,light,glowCircle);
 scene.add(group);lampMeshes.set(id,{group,light,orb});
}
let game=new Game({seed:2026});
game.lanterns.forEach(l=>makeLantern(l.id,l.pos));
const motes=new Map<string,THREE.Mesh>();
const shades=new Map<string,THREE.Group>();
const moteMaterial=new THREE.MeshBasicMaterial({color:0xffd98a});
const glowCanvas=document.createElement('canvas');
glowCanvas.width=64;glowCanvas.height=64;
const glowCtx=glowCanvas.getContext('2d')!;
const gradient=glowCtx.createRadialGradient(32,32,1,32,32,31);
gradient.addColorStop(0,'rgba(255,252,220,1)');
gradient.addColorStop(.18,'rgba(255,226,148,.85)');
gradient.addColorStop(.45,'rgba(255,193,93,.3)');
gradient.addColorStop(1,'rgba(255,160,50,0)');
glowCtx.fillStyle=gradient;glowCtx.fillRect(0,0,64,64);
const glowMaterial=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false});
const shadeMat=material(0x21152f,{roughness:.3,metalness:.05});
const shadeEye=new THREE.MeshBasicMaterial({color:0xff6592});
function makeShade(id:string) {
 const g=new THREE.Group();
 const blob=mesh(new THREE.SphereGeometry(.65,12,9),shadeMat,[0,0,0]);blob.scale.set(1,.88,.75);g.add(blob);
 g.add(mesh(new THREE.SphereGeometry(.115,8,8),shadeEye,[-.24,.12,-.54]));
 g.add(mesh(new THREE.SphereGeometry(.115,8,8),shadeEye,[.24,.12,-.54]));
 for(let i=0;i<4;i++){const tentacle=mesh(new THREE.ConeGeometry(.14,.63,6),shadeMat,[(i-1.5)*.25,-.53,.03]);tentacle.rotation.z=(i-1.5)*.2;g.add(tentacle)}
 scene.add(g);return g;
}
function sync() {
 for(const l of game.lanterns){
  const obj=lampMeshes.get(l.id)!;obj.group.position.set(l.pos[0],0,l.pos[2]);
  obj.light.intensity=l.lit?18:0;
  (obj.orb.material as THREE.MeshStandardMaterial).color.setHex(l.lit?0xffbd56:0x6b4a67);
  (obj.orb.material as THREE.MeshStandardMaterial).emissive.setHex(l.lit?0xff9c24:0x241426);
  (obj.orb.material as THREE.MeshStandardMaterial).emissiveIntensity=l.lit?3.3:.5;
 }
 const live=new Set(game.motes.map((m:any)=>m.id));
 for(const [id,m] of motes)if(!live.has(id)){scene.remove(m);motes.delete(id)}
 for(const m of game.motes){
  if(!motes.has(m.id)){
   const orb=mesh(new THREE.IcosahedronGeometry(.18,0),moteMaterial);
   const glow=new THREE.Sprite(glowMaterial);
   glow.scale.set(1.2,1.2,1);orb.add(glow);scene.add(orb);motes.set(m.id,orb);
  }
  const orb=motes.get(m.id)!;
  orb.position.set(m.pos[0],.6+Math.sin(game.tick*.04+m.pos[0])*.25,m.pos[2]);
 }
 const activeIds=new Set(game.shades.map((s:any)=>s.id));
 for(const [id,g] of shades)if(!activeIds.has(id)){scene.remove(g);shades.delete(id)}
 for(const s of game.shades){
  if(!shades.has(s.id))shades.set(s.id,makeShade(s.id));
  const g=shades.get(s.id)!;
  g.position.set(s.pos[0],1+Math.sin(game.tick*.025+s.pos[0])*.13,s.pos[2]);
  g.rotation.y=Math.atan2(game.player.pos[0]-s.pos[0],game.player.pos[2]-s.pos[2])+Math.PI;
  g.scale.setScalar(s.state==='stunned'?.7:1);
 }
 may.position.set(game.player.pos[0],game.player.pos[1],game.player.pos[2]);
 el('health').textContent='♥ '.repeat(game.player.flames).trim()||'♡';
 el('motes').textContent='✦ '+game.player.carried+'/'+TUNING.carry_capacity;
 el('lamps').textContent='🏮 '+game.lanterns.filter(l=>l.lit).length+'/5';
 el('light-fill').style.width=(game.player.carried/TUNING.carry_capacity*100)+'%';
 el('score').textContent='★ '+game.score;
 el('time').textContent=Math.floor(game.timeLeft/60).toString().padStart(2,'0')+':'+Math.floor(game.timeLeft%60).toString().padStart(2,'0');
}
const pressed=new Set<string>();
let started=false;
let camAngle=Math.PI,camPitch=.42,camDistance=13;
let toastUntil=0;
const pulseMaterial=new THREE.MeshBasicMaterial({color:0xffe0a1,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
const pulseWave=new THREE.Mesh(new THREE.RingGeometry(.94,1.04,64),pulseMaterial);
pulseWave.rotation.x=-Math.PI/2;pulseWave.visible=false;scene.add(pulseWave);
let pulseFlash=0;
const showToast=(text:string)=>{
 el('toast').textContent=text;el('toast').style.opacity='1';toastUntil=performance.now()+1800;
};
window.addEventListener('keydown',(e)=>{
 const k=e.key.toLowerCase();
 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
 pressed.add(k);
 if(k==='r' && game.state!=='playing') reset();
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>pressed.clear());
// Rotate camera whenever the mouse moves; no click or dragging required.
window.addEventListener('pointermove',e=>{
 if(!started || game.state!=='playing' || e.pointerType!=='mouse')return;
 camAngle-=e.movementX*.006;
});
renderer.domElement.addEventListener('wheel',e=>{
 camDistance=Math.max(7,Math.min(22,camDistance+e.deltaY*.01));
},{passive:true});
let previous=performance.now(),accumulator=0;
function reset(){
 game=new Game({seed:2026});accumulator=0;started=true;
 el('start').classList.add('hidden');
 sync();
}
el('play').addEventListener('click',reset);
// Browser smoke test opt-in, normal users still see the introductory screen.
if(new URLSearchParams(location.search).has('autoplay'))reset();
function input(){
 // Reverse screen-horizontal mapping to match the visible camera view.
 const right=(pressed.has('a')||pressed.has('arrowleft')?1:0)-(pressed.has('d')||pressed.has('arrowright')?1:0);
 const forward=(pressed.has('w')||pressed.has('arrowup')?1:0)-(pressed.has('s')||pressed.has('arrowdown')?1:0);
 return {move:[right,forward],cam_yaw_deg:camAngle*180/Math.PI+180,
  jump:pressed.has(' '),interact:pressed.has('e'),pulse:pressed.has('q')};
}
function animate(now:number){
 requestAnimationFrame(animate);
 const delta=Math.min((now-previous)/1000,.1);previous=now;
 if(started && game.state==='playing'){
  accumulator+=delta;
  let steps=0;
  while(accumulator>=DT && steps<7){
   const events=game.step(input());
   accumulator-=DT;steps++;
   for(const event of events) {
    switch(event.name){
     case 'mote_picked':if(event.data.carried%3===0)showToast('✦ Ánh sáng đang lớn dần');break;
     case 'lantern_lit':showToast('🏮 Một chiếc đèn đã được thắp sáng!');break;
     case 'deposit':showToast('Đã nạp '+event.data.amount+' đom đóm');break;
     case 'player_hit':showToast('Bóng Mực tấn công!');break;
     case 'pulse':
      showToast('✧ Tỏa sáng đẩy lùi Bóng Mực');
      pulseFlash=.6;pulseWave.visible=true;
      pulseWave.position.set(game.player.pos[0],.12,game.player.pos[2]);break;
    }
   }
  }
  if(steps>=7)accumulator=0;
  sync();
  if(game.state!=='playing'){
   const won=game.state==='won';
   const modal=el('start');modal.classList.remove('hidden');
   modal.querySelector('h1')!.textContent=won?'Đảo đã bừng sáng!':'Sương đen đã thắng';
   modal.querySelector('p')!.textContent=won?'Bạn đã thắp lại năm ngọn đèn và mang ánh sáng về Đảo Bến.':'Mây chưa thể thắp sáng cả hòn đảo. Hãy thử lại một lần nữa!';
   el('play').textContent='Chơi lại Đêm 1 ↻';
   started=false;
  }
 }
 if(toastUntil<now)el('toast').style.opacity='0';
 if(pulseFlash>0){
  pulseFlash=Math.max(0,pulseFlash-delta);
  pulseWave.scale.setScalar(1+(1-pulseFlash/.6)*TUNING.pulse_radius);
  pulseMaterial.opacity=pulseFlash/.6*.66;
  pulseWave.visible=pulseFlash>0;
 }
 const px=game.player.pos[0],pz=game.player.pos[2];
 const target=new THREE.Vector3(px,1.2,pz);
 const lookFrom=new THREE.Vector3(
  px+Math.sin(camAngle)*Math.cos(camPitch)*camDistance,
  1.7+Math.sin(camPitch)*camDistance,
  pz+Math.cos(camAngle)*Math.cos(camPitch)*camDistance
 );
 camera.position.lerp(lookFrom,.08);
 camera.lookAt(target);
 renderer.render(scene,camera);
}
sync();
requestAnimationFrame(animate);
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
