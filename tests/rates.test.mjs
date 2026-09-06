import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNbkr,createRateService} from '../lib/rates.mjs';
const xml='<CurrencyRates Date="06.09.2026"><Currency ISOCode="USD"><Nominal>1</Nominal><Value>87,4491</Value></Currency></CurrencyRates>';
test('NBKR: decimal comma, nominal and official effective date',()=>{
 assert.equal(parseNbkr(xml).usdKgs,87.4491);assert.equal(parseNbkr(xml).rateDate,'2026-09-06');
 assert.equal(parseNbkr(xml.replace('<Nominal>1','<Nominal>10')).usdKgs,8.74491);
 assert.throws(()=>parseNbkr(xml.replace('USD','EUR')));assert.throws(()=>parseNbkr(xml.replace('87,4491','0')));
});
test('NBKR: single request, hourly cache and visible fallback on outage',async()=>{
 let value=null,calls=0,time=10000000,offline=false;
 const get=createRateService({read:()=>value,write:v=>value=v,clock:()=>time,fetcher:async()=>{calls++;if(offline)throw Error();return {ok:true,text:async()=>xml};}});
 const results=await Promise.all([get(),get()]);assert.equal(calls,1);assert.equal(results[0].rateStale,false);
 await get();assert.equal(calls,1);time+=3600001;offline=true;
 const fallback=await get();assert.equal(fallback.usdKgs,87.4491);assert.equal(fallback.rateStale,true);assert.equal(calls,2);
 await get();assert.equal(calls,2);
});
test('NBKR: outage without cache does not invent an exchange rate',async()=>{
 const get=createRateService({read:()=>null,write:()=>{},fetcher:async()=>{throw Error();}});
 assert.deepEqual(await get(),{rateUnavailable:true});
});
