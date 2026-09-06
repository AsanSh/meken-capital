import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { once } from 'node:events';

test('server: persistent accounts, publication gates, private documents, decisions and revocation',async t=>{
 const probe=net.createServer().listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin=`http://127.0.0.1:${port}`,dir=mkdtempSync(join(tmpdir(),'meken-test-'));
 const env={...process.env,NODE_ENV:'test',APP_ORIGIN:origin,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir,ADMIN_EMAIL:'owner@example.com',ADMIN_PASSWORD:'Strong-test-password-42'};
 let proc;async function start(){proc=spawn(process.execPath,['server.mjs'],{env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{proc.stdout.on('data',x=>{if(x.toString().includes('Meken ready'))resolve();});proc.on('exit',code=>reject(new Error('Server stopped: '+code)));});}
 async function stop(){const p=proc;if(!p||p.exitCode!==null)return;const exited=once(p,'exit');p.kill('SIGTERM');await exited;}
 t.after(async()=>{await stop();rmSync(dir,{recursive:true,force:true});});await start();
 async function req(path,method='GET',body,cookie='',extra={}){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,'X-Meken-Request':'1','Content-Type':'application/json',Cookie:cookie,...extra},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};}
 assert.equal((await req('admin/overview')).status,401);
 assert.equal((await fetch(origin+'/admin.js')).status,404);
 assert.equal((await fetch(origin+'/.env')).status,404);
 assert.equal((await fetch(origin+'/concepts/market.html',{redirect:'manual'})).status,302);
 const login=await req('login','POST',{email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);const admin=login.cookie;
 const register=await req('register','POST',{name:'Investor',email:'investor@example.com',password:'Investor-test-secret-42',consent:true});assert.equal(register.status,201);
 const second=await req('register','POST',{name:'Other',email:'other@example.com',password:'Investor-test-secret-42',consent:true});assert.equal(second.status,201);
 const investor=(await req('login','POST',{email:'investor@example.com',password:'Investor-test-secret-42'})).cookie;
 const other=(await req('login','POST',{email:'other@example.com',password:'Investor-test-secret-42'})).cookie;
 assert.equal((await req('admin/overview','GET',undefined,investor)).status,403);
 assert.equal((await req('admin/settings','POST',{usdKgs:88},admin,{Origin:'https://evil.example'})).status,403);
 const deal={title:'Test materials',category:'Материалы',sharia:'Мурабаха',description:'Real asset description',risk:'Commercial risk',exit:'Sale',mechanism:'Purchase then sale',location:'Bishkek',capital:1000000,revenue:1100000,costs:20000,min:100000,max:500000,months:4,share:.7,shariaReviewer:'Test reviewer',image:'materials'};
 const created=await req('admin/deals','POST',deal,admin);assert.equal(created.status,200);const did=created.data.id;
 assert.equal((await req('deals')).data.deals.length,0);
 assert.equal((await req('admin/publish','POST',{id:did,published:true},admin)).status,400);
 for(const kind of ['asset','finance','contract','sharia'])assert.equal((await req('admin/documents','POST',{dealId:did,name:kind+'.pdf',kind,base64:Buffer.from('%PDF-1.4\nTest fixture').toString('base64')},admin)).status,200);
 assert.equal((await req('admin/publish','POST',{id:did,published:true},admin)).status,200);
 assert.equal((await req('deals')).data.deals.length,1);
 assert.equal((await req('applications','POST',{dealId:did,amount:10,consent:true},investor)).status,400);
 assert.equal((await req('applications','POST',{dealId:did,amount:100000,consent:true},investor)).status,201);
 assert.equal((await req('applications','POST',{dealId:did,amount:100000,consent:true},investor)).status,409);
 assert.equal((await req('documents?deal='+did,'GET',undefined,investor)).status,403);
 const overview=(await req('admin/overview','GET',undefined,admin)).data;const aid=overview.applications[0].id;
 assert.equal((await req('admin/application','POST',{id:aid,status:'approved'},admin)).status,200);
 const docs=(await req('documents?deal='+did,'GET',undefined,investor)).data.documents;assert.equal(docs.length,4);
 assert.equal((await req('documents/'+docs[0].id,'GET',undefined,other)).status,403);
 const pdf=await fetch(origin+'/api/documents/'+docs[0].id,{headers:{Cookie:investor}});assert.equal(pdf.status,200);assert.match(await pdf.text(),/^%PDF/);
 assert.equal((await req('applications','GET',undefined,other)).data.applications.length,0);
 assert.equal((await req('admin/polls','POST',{dealId:did,question:'Approve report?',closes:new Date(Date.now()+86400000).toISOString()},admin)).status,200);
 const poll=(await req('polls','GET',undefined,investor)).data.polls[0];assert.ok(poll);
 assert.equal((await req('vote','POST',{pollId:poll.id,answer:'yes'},other)).status,403);
 assert.equal((await req('vote','POST',{pollId:poll.id,answer:'yes'},investor)).status,200);
 assert.equal((await req('vote','POST',{pollId:poll.id,answer:'no'},investor)).status,409);
 assert.ok((await req('notifications','GET',undefined,investor)).data.notifications.length>=2);
 await stop();await start();assert.equal((await req('applications','GET',undefined,investor)).data.applications[0].status,'approved');assert.equal((await req('polls','GET',undefined,investor)).data.polls[0].answer,'yes');
 const version=(await req('admin/overview','GET',undefined,admin)).data.deals[0].version;
 assert.equal((await req('admin/deals','POST',{...deal,id:did,version:0},admin)).status,409);
 assert.equal((await req('admin/deals','POST',{...deal,id:did,version},admin)).status,200);assert.equal((await req('deals')).data.deals.length,0);
 assert.equal((await req('password','POST',{current:'Investor-test-secret-42',password:'Changed-investor-secret-42'},investor)).status,200);
 assert.equal((await req('me','GET',undefined,investor)).data.user,null);
 await req('logout','POST',{},admin);assert.equal((await req('admin/overview','GET',undefined,admin)).status,401);
});
