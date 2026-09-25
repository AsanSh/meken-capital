(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MekenTownhouses=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const projects=[
  {id:'besh-kungey',name:'Беш-Кунгей · 6 таунхаусов',landTerms:'Земля на условиях долевого участия; доля владельца и порядок расчётов уточняются.',landArea:13,units:6,land:195000,layout:'3 спальни, 2 санузла, гараж, кухня-гостиная. Благоустройство включено в оценку строительства под ключ.',variants:{turnkey:{name:'Под ключ',buildUnit:92000,saleUnit:155000,months:6},pso:{name:'ПСО',buildUnit:65200,saleUnit:117700,months:4}}},
  {id:'oskon-ordo',name:'Оскон Ордо · 2 таунхауса',landTerms:'Земля предоставляется застройщиком; оценка вклада и порядок возврата согласуются в договоре.',landArea:4,units:2,land:88000,layout:'3 спальни, включая мастер-спальню, 2 санузла, кухня-гостиная.',variants:{turnkey:{name:'Под ключ',buildUnit:96100,saleUnit:175000,months:6},pso:{name:'ПСО',buildUnit:62200,saleUnit:124000,months:4}}}
 ];
 function calculate(id,variant='turnkey',funding='all',priceFactor=1,costFactor=1,extraCosts=0,delay=0){
  const p=projects.find(p=>p.id===id),v=p?.variants[variant];
  if(!v||!['all','construction'].includes(funding)||![priceFactor,costFactor,extraCosts,delay].every(Number.isFinite)||priceFactor<0||costFactor<0||extraCosts<0||delay<0)throw new Error('Некорректные параметры расчёта');
  const build=p.units*v.buildUnit*costFactor,budget=p.land+build+extraCosts,revenue=p.units*v.saleUnit*priceFactor,profit=revenue-budget;
  const investorCapital=funding==='all'?budget:build+extraCosts,capitalShare=investorCapital/budget;
  // Positive distributable project result: proposed 50/50 split. Loss: capital ratio.
  const investorResult=profit>=0?profit*.5:profit*capitalShare,months=v.months+delay,roi=investorResult/investorCapital*100;
  return {build,budget,revenue,profit,investorCapital,investorResult,roi,annualSimple:roi*12/months,moic:1+roi/100,margin:revenue?profit/revenue*100:0,breakEvenUnit:budget/p.units,priceCushion:100*(1-budget/(p.units*v.saleUnit)),months,landShare:p.land/budget*100};
 }
 return {projects,calculate,version:'2026-09-21-v2'};
});
