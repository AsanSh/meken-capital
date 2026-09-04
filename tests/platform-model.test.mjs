import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={};
vm.runInNewContext(readFileSync(new URL('../site/concepts/model.js',import.meta.url),'utf8'),context);
const {projects,opportunities,economics}=context.MekenPlatform;

test('every listed project and search idea has an explicit Islamic structure',()=>{
 assert.equal(opportunities.length,12);
 for(const item of [...projects,...opportunities])assert.ok(item.sharia?.length>4,item.title);
});

test('materials: 10% markup is 5.6% investor result after costs and 70/30 split',()=>{
 const p=projects.find(p=>p.id==='materials');const e=economics(p,500000);
 assert.equal(e.revenue,11000000);assert.equal(e.gross,1000000);assert.equal(e.net,800000);
 assert.equal(e.investorPool,560000);assert.ok(Math.abs(e.managerPool-240000)<.001);
 assert.equal(e.profit,28000);assert.equal(e.total,528000);assert.ok(Math.abs(e.rate-5.6)<.0001);
});
test('a loss is shared by capital, with no manager profit share',()=>{
 const e=economics(projects[0],500000,'down');
 assert.equal(e.net,-850000);assert.equal(e.investorPool,-850000);assert.equal(e.managerPool,0);assert.equal(e.profit,-42500);assert.equal(e.total,457500);
});
test('rent is cashflow only, principal is not presented as redeemed',()=>{
 const p=projects.find(p=>p.id==='rent'), e=economics(p,1000000);
 assert.equal(p.hold,36);assert.equal(p.months,12);assert.equal(e.total,null);assert.equal(e.net,3600000);assert.equal(e.profit,63000);
});
test('24 month project result is not labelled annual yield',()=>{
 const p=projects.find(p=>p.id==='offplan'),e=economics(p,500000);
 assert.equal(p.months,24);assert.ok(Math.abs(e.rate-16.8)<.0001);assert.equal(e.profit,84000);
});
test('profit allocation and participation scale consistently',()=>{
 for(const p of projects){for(const share of [0,.5,.7,1]){
  const a=economics(p,p.min,'base',share),b=economics(p,p.min*2,'base',share);
  assert.ok(Math.abs(a.net-a.investorPool-a.managerPool)<.001);assert.equal(b.profit,a.profit*2);
 }}
 assert.equal(new Set(projects.map(p=>p.id)).size,6);
 assert.ok(projects.every(p=>p.min>0&&p.min<=p.max&&p.raised<p.capital));
});
test('annualRate brings different cycle lengths to one comparable base',()=>{
 const expected={materials:16.8,house:12,apartment:21,land:14,offplan:8.4,rent:6.3};
 for(const p of projects){
  const e=economics(p,p.min);
  assert.ok(Math.abs(e.annualRate-expected[p.id])<.0001,`${p.id}: ${e.annualRate}`);
  assert.ok(Math.abs(e.annualRate-e.rate*12/p.months)<1e-9,p.id);
 }
});
test('ranking by result uses the annual base, not the raw cycle result',()=>{
 const byCycle=[...projects].sort((a,b)=>economics(b,b.min).rate-economics(a,a.min).rate).map(p=>p.id);
 const byYear=[...projects].sort((a,b)=>economics(b,b.min).annualRate-economics(a,a.min).annualRate).map(p=>p.id);
 // сортировка по результату за цикл ставила первым самый слабый по годовой ставке проект
 assert.equal(byCycle[0],'offplan');
 assert.equal(byYear[0],'apartment');
 assert.equal(byYear.at(-1),'rent');
 assert.notDeepEqual(byCycle,byYear);
});
