import assert from 'node:assert/strict';
import {browserSession} from './chrome-session.mjs';
const browser=await browserSession();
try{
 await browser.navigate('/');
 const initial=await browser.evaluate("({title:document.querySelector('#modalTitle')?.textContent,settings:!!document.querySelector('#settingsPanel'),errors:!!document.querySelector('#boardList')})");
 assert.equal(initial.title,'Đảo Đèn Lồng');
 assert.ok(initial.settings&&initial.errors);
 const a11y=await browser.evaluate(`(()=>{
 const setup=[...document.querySelectorAll('#actions button')].find(x=>x.textContent==='Cài đặt');
 setup.click();
 const count=document.querySelectorAll('#keyBindings button').length;
 const forward=document.querySelector('#keyBindings button');forward.click();
 window.dispatchEvent(new KeyboardEvent('keydown',{key:'q',bubbles:true}));
 const duplicate=document.querySelector('#bindStatus').textContent;
 window.dispatchEvent(new KeyboardEvent('keydown',{key:'i',bubbles:true}));
 const persisted=JSON.parse(localStorage.getItem('ddl-settings')).bindings.forward;
 const large=document.querySelector('#largeText');large.checked=true;large.dispatchEvent(new Event('change'));
 const big=document.body.classList.contains('large-text');
 return {count,duplicate,persisted,big,mp4:MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),webm:MediaRecorder.isTypeSupported('video/webm;codecs=vp9')};
})()`);
 assert.equal(a11y.count,9);
 assert.ok(a11y.duplicate.includes('đã được sử dụng'));
 assert.equal(a11y.persisted,'i');assert.equal(a11y.big,true);
 console.log('PASS browser menu/settings/accessibility',a11y);
 await browser.screenshot('docs/proof/phase-4/settings-1280x720.png');
 await browser.evaluate("document.querySelector('#resetBindings').click();");
 await browser.navigate('/');
 const score=await browser.evaluate("document.querySelector('#actions button:nth-child(2)').click();true");
 await browser.sleep(500);
 const board=await browser.evaluate("document.querySelector('#modalTitle').textContent");
 assert.equal(board,'Bảng xếp hạng');
 console.log('PASS browser leaderboard menu');
 await browser.screenshot('docs/proof/phase-4/leaderboard-1280x720.png');
 await browser.navigate('/?autoplay=1');
 await browser.screenshot('docs/proof/phase-4/gameplay-1280x720.png');
 await browser.navigate('/?score-proof=1');
 const savePanel=await browser.evaluate("!document.querySelector('#saveScore').classList.contains('hidden')");
 assert.equal(savePanel,true);
 const saved=await browser.evaluate(`(async()=>{
  document.querySelector('#scoreName').value='Smoke_1';
  document.querySelector('#saveEntry').click();
  await new Promise(r=>setTimeout(r,500));
  return document.querySelector('#saveMessage').textContent;
 })()`);
 assert.ok(saved.includes('Đã lưu'),saved);
 await browser.screenshot('docs/proof/phase-4/save-score-1280x720.png');
 console.log('PASS browser score screen + POST to disk API',saved);
}finally{await browser.close();}
