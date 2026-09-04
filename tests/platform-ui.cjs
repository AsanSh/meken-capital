const test=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require(process.env.MEKEN_JSDOM_PATH || 'jsdom');
const fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'../site/concepts')+'/';
function boot(mode,stored,opts={}){
 const dom=new JSDOM(fs.readFileSync(root+mode+'.html','utf8'),{url:'http://localhost/concepts/'+mode+'.html'+(opts.hash||''),runScripts:'outside-only',...(opts.silent?{virtualConsole:new (require('jsdom').VirtualConsole)()}:{})});
 const w=dom.window;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 if(stored)w.localStorage.setItem('meken-platform-draft-v1',JSON.stringify(stored));
 w.eval(fs.readFileSync(root+'model.js','utf8'));w.eval(fs.readFileSync(root+'platform.js','utf8'));
 const d=w.document;
 return {dom,w,d,click:s=>{assert.ok(d.querySelector(s),'missing '+s);d.querySelector(s).click();},input:(s,v)=>{const el=d.querySelector(s);el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}));}};
}
for(const mode of ['market','club','flow'])test(mode+' loads working surfaces and opens a project',()=>{
 const x=boot(mode);assert.ok(x.d.querySelector('h1').textContent.length>5);
 assert.equal(x.d.querySelector('.portal-back').getAttribute('href'),mode==='market'?'../index.html':'market.html');
 assert.equal(x.d.querySelectorAll('.route-links a').length,4);
 x.click('[data-open="materials"]');assert.equal(x.d.querySelector('#detail-dialog').open,true);
 assert.match(x.d.querySelector('#calc-profit').textContent,/28/);
 x.click('[data-scenario="down"]');assert.match(x.d.querySelector('#calc-profit').textContent,/-42/);
 x.input('#amount','-1');assert.equal(x.d.querySelector('#add-draft').disabled,true);
 x.input('#amount','100000');assert.equal(x.d.querySelector('#add-draft').disabled,false);
 x.click('#add-draft');assert.equal(x.d.querySelector('#detail-dialog').open,false);
 x.click('[data-view="portfolio"]');assert.match(x.d.querySelector('#portfolio-view').textContent,/Арматура/);
 x.click('[data-remove="0"]');assert.match(x.d.querySelector('#portfolio-view').textContent,/Пока нет/);
 x.dom.window.close();
});
test('filters, empty state, comparison selection and reset',()=>{
 const x=boot('market');assert.equal(x.d.querySelectorAll('.project').length,6);assert.equal(x.d.querySelectorAll('.opportunity').length,12);
 x.d.querySelector('#horizon').value='short';x.d.querySelector('#horizon').dispatchEvent(new x.w.Event('change',{bubbles:true}));
 assert.equal(x.d.querySelectorAll('.project').length,2);
 x.d.querySelector('#goal').value='Заработать';x.d.querySelector('#goal').dispatchEvent(new x.w.Event('change',{bubbles:true}));
 assert.equal(x.d.querySelectorAll('.project').length,2);
 x.d.querySelector('#horizon').value='all';x.d.querySelector('#horizon').dispatchEvent(new x.w.Event('change',{bubbles:true}));
 x.d.querySelector('#goal').value='all';x.d.querySelector('#goal').dispatchEvent(new x.w.Event('change',{bubbles:true}));
 x.click('[data-category="Аренда"]');assert.equal(x.d.querySelectorAll('.project').length,1);
 x.d.querySelector('#season').value='Сезонный';x.d.querySelector('#season').dispatchEvent(new x.w.Event('change',{bubbles:true}));
 assert.match(x.d.querySelector('#project-list').textContent,/пока нет/);x.click('#reset-filters');
 x.click('[data-compare="materials"]');x.click('[data-compare="house"]');x.click('[data-compare="rent"]');
 x.click('[data-compare="land"]');assert.equal(x.d.querySelector('[data-compare="land"]').checked,false);
 x.click('#show-compare');assert.equal(x.d.querySelector('#compare-dialog').open,true);assert.match(x.d.querySelector('#compare-content').textContent,/аренды/);
 x.dom.window.close();
});
test('flow allocation, project switching and invalid inputs',()=>{
 const x=boot('flow');assert.match(x.d.querySelector('#flow-result').textContent,/28/);
 x.input('#flow-share','50');assert.match(x.d.querySelector('#flow-result').textContent,/20/);
 x.input('#flow-share','101');assert.equal(x.d.querySelector('#flow-add').disabled,true);
 x.input('#flow-share','70');x.click('[data-batch="rent"]');assert.match(x.d.querySelector('#flow-caption').textContent,/12 мес/);
 assert.match(x.d.querySelector('#flow-help').textContent,/Капитал остаётся/);
 x.click('#flow-add');x.click('[data-view="portfolio"]');assert.match(x.d.querySelector('#portfolio-view').textContent,/Помещение/);
 x.dom.window.close();
});
test('allocation limit cannot be exceeded by repeated additions',()=>{
 const x=boot('market',[{id:'materials',amount:1900000,share:.7,scenario:'base'}]);
 x.click('[data-open="materials"]');assert.equal(x.d.querySelector('#amount').max,'100000');
 x.input('#amount','200000');assert.equal(x.d.querySelector('#add-draft').disabled,true);
 x.input('#amount','100000');assert.equal(x.d.querySelector('#add-draft').disabled,false);
 x.dom.window.close();
});
test('a deal has its own address that can be sent to someone',()=>{
 const x=boot('market',null,{hash:'#deal=apartment'});
 assert.equal(x.d.querySelector('#detail-dialog').open,true);
 assert.match(x.d.querySelector('#detail-content').textContent,/Квартира/);
 assert.equal(x.w.location.hash,'#deal=apartment');
 x.click('[data-close="detail-dialog"]');
 x.dom.window.close();
});
test('opening a deal writes the address, an unknown deal is ignored',()=>{
 const x=boot('market');
 assert.equal(x.w.location.hash,'');
 x.click('[data-open="offplan"]');
 assert.equal(x.w.location.hash,'#deal=offplan');
 assert.equal(x.d.querySelector('#detail-dialog').open,true);
 x.dom.window.close();
 const y=boot('market',null,{hash:'#deal=nosuchdeal'});
 assert.equal(y.d.querySelector('#detail-dialog').open,false);
 y.dom.window.close();
});
test('a saved plan survives a new tab and leads to the invitation form',()=>{
 const x=boot('market',[{id:'materials',amount:500000,share:.7,scenario:'base'}],{silent:true});
 assert.equal(x.d.querySelector('#portfolio-count').textContent,'1');
 x.click('[data-view="portfolio"]');
 assert.ok(x.d.querySelector('#send-plan'),'нет выхода из списка выбранного');
 x.click('#send-plan');
 const handoff=x.w.sessionStorage.getItem('meken-plan-handoff-v1');
 assert.match(handoff,/Арматура/);
 assert.match(handoff,/в год/);
 assert.match(handoff,/не заявка на инвестирование/);
 x.dom.window.close();
});
