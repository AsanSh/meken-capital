const test=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.MEKEN_JSDOM_PATH||'jsdom');
const fs=require('node:fs');
const path=require('node:path');
const site=path.resolve(__dirname,'../site');
function boot(stored){const dom=new JSDOM(fs.readFileSync(path.join(site,'admin.html'),'utf8'),{url:'http://localhost/admin.html',runScripts:'outside-only'});const w=dom.window;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.eval(fs.readFileSync(path.join(site,'interest.js'),'utf8'));if(stored)w.localStorage.setItem('meken-interest-v1',JSON.stringify(stored));w.eval(fs.readFileSync(path.join(site,'admin.js'),'utf8'));return{dom,w,d:w.document,click:s=>{const e=w.document.querySelector(s);assert.ok(e,'missing '+s);e.click()},set:(s,v)=>{const e=w.document.querySelector(s);assert.ok(e,'missing '+s);e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}))},type:(s,v)=>{const e=w.document.querySelector(s);assert.ok(e,'missing '+s);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}))}}}
test('admin opens on operational overview and navigates all sections',()=>{const x=boot();assert.match(x.d.querySelector('#panel').textContent,/Капитал проектов/);for(const p of ['deals','investors','capital','governance','interest']){x.click(`[data-panel="${p}"]`);assert.equal(x.d.querySelector('.side-link.active').dataset.panel,p)}x.dom.window.close()});
test('deal search, stage filter and detail status work',()=>{const x=boot();x.click('[data-panel="deals"]');const search=x.d.querySelector('#deal-search');search.value='арматура';search.dispatchEvent(new x.w.Event('input',{bubbles:true}));assert.equal(x.d.querySelectorAll('#deal-table tbody tr').length,1);x.click('[data-deal="MC-026"]');assert.equal(x.d.querySelector('#detail-dialog').open,true);const status=x.d.querySelector('#detail-stage');status.value='live';status.dispatchEvent(new x.w.Event('change',{bubbles:true}));assert.match(x.w.sessionStorage.getItem('meken-admin-deals'),/"stage":"live"/);x.dom.window.close()});
test('publication stays locked until every document is checked',()=>{const x=boot();x.click('[data-panel="governance"]');const card=x.d.querySelector('[data-gov="MC-026"]'),button=card.querySelector('[data-publish]');assert.equal(button.disabled,true);card.querySelectorAll('[data-doc]').forEach(c=>{c.checked=true;c.dispatchEvent(new x.w.Event('change',{bubbles:true}))});assert.equal(button.disabled,false);x.click('[data-publish="MC-026"]');assert.match(x.w.sessionStorage.getItem('meken-admin-deals'),/"stage":"live"/);x.dom.window.close()});
test('separate admin login rejects a wrong password and creates a session for the correct one',()=>{const dom=new JSDOM(fs.readFileSync(path.join(site,'admin-login.html'),'utf8'),{url:'http://localhost/admin-login.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window,d=w.document;w.eval(fs.readFileSync(path.join(site,'admin-login.js'),'utf8'));d.querySelector('#login-password').value='wrong-pass';d.querySelector('#admin-login').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(d.querySelector('#login-error').hidden,false);d.querySelector('#login-password').value='Meken2026!';d.querySelector('#admin-login').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(w.sessionStorage.getItem('meken-admin-auth'),'ok');dom.window.close()});

const filed={id:'live-1',projectId:'house',projectTitle:'Дом на юге города',amount:900000,window:'3d',name:'Тест Инвестор',contact:'test@example.com',note:'',source:'market',onDemand:true,notContract:true,createdAt:'2026-09-07T10:00:00.000Z'};
test('the interest register shows who is ready for how much and by when',()=>{
 const x=boot([filed]);
 x.click('[data-panel="interest"]');
 assert.equal(x.d.querySelector('#interest-nav-count').textContent,'6');
 assert.equal(x.d.querySelectorAll('#interest-table tbody tr').length,6);
 const metrics=x.d.querySelector('.metric-grid').textContent;
 assert.match(metrics,/Заявлено по анкетам/);
 assert.match(metrics,/9\s200\s000/);
 assert.match(metrics,/Готовы за 3 дня/);
 assert.equal(x.d.querySelectorAll('.interest-groups article').length,5);
 assert.match(x.d.querySelector('#interest-table').textContent,/Тест Инвестор/);
 x.dom.window.close();
});
test('the register filters by readiness window and by investor or project',()=>{
 const x=boot([filed]);
 x.click('[data-panel="interest"]');
 x.set('#interest-window-filter','3d');
 assert.equal(x.d.querySelectorAll('#interest-table tbody tr').length,3);
 x.type('#interest-search','Тест');
 assert.equal(x.d.querySelectorAll('#interest-table tbody tr').length,1);
 x.type('#interest-search','нет такого инвестора');
 assert.match(x.d.querySelector('#interest-table').textContent,/не попала ни одна анкета/);
 x.dom.window.close();
});
test('records rejected by validation never reach the register',()=>{
 const x=boot([{...filed,onDemand:false}]);
 x.click('[data-panel="interest"]');
 assert.equal(x.d.querySelectorAll('#interest-table tbody tr').length,5);
 assert.doesNotMatch(x.d.querySelector('#interest-table').textContent,/Тест Инвестор/);
 x.dom.window.close();
});
