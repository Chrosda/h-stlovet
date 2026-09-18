import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort().map(f=>'drizzle/'+f))sqlite.exec(readFileSync(f,'utf8'));
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async run(){return {meta:{changes:Number(sqlite.prepare(this.sql).run(...this.args).changes)}}}}
globalThis.__db={prepare:s=>new Statement(s),async batch(ss){sqlite.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
await build({entryPoints:['lib/server.ts'],outfile:'/tmp/hostlovet-engine.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'db',setup(b){b.onResolve({filter:/db\/runtime$/},()=>({path:'db',namespace:'db'}));b.onLoad({filter:/.*/,namespace:'db'},()=>({contents:'export function database(){return globalThis.__db}',loader:'js'}))}}]});
const {action,state}=await import('/tmp/hostlovet-engine.mjs');
const req=new Request('https://test.invalid/api/action',{headers:{'oai-authenticated-user-id':'parent-one'}});
await action(req,{action:'register',name:'Testförälder'});
const c=await action(req,{action:'child',nickname:'Testbarn',phone:'0701234567'});
const payment={action:'pay',key:'test-payment-key-12345',child:c.id,templates:['walk','read','forest'],method:'swish'};
await action(req,payment);await action(req,payment);
let s=await state(req);assert.equal(s.payments.length,1);assert.equal(s.challenges.length,3);assert.equal(s.budget.available,13000);
const l=await action(req,{action:'link',child:c.id});const token=l.link.split('#')[1];const session=await action(req,{action:'redeem',token});await assert.rejects(action(req,{action:'redeem',token}));
const cr=new Request('https://test.invalid/api/action',{headers:{cookie:'hv_child='+session.session}});
let cs=await state(cr,true);assert.equal(cs.children[0].phone,undefined);assert.equal(cs.budget,undefined);await assert.rejects(action(cr,{action:'pay',...payment}));
const task=s.challenges.find(a=>a.template==='walk');await action(cr,{action:'claim',challenge:task.id});await action(cr,{action:'claim',challenge:task.id});
await action(req,{action:'approve',challenge:task.id});await action(req,{action:'approve',challenge:task.id});s=await state(req);assert.equal(s.orders.length,1);assert.equal(s.budget.reserved,3000);assert.equal(s.budget.available,10000);
await action(req,{action:'process'});sqlite.exec('UPDATE reward_orders SET next_attempt=0');await action(req,{action:'process'});await action(req,{action:'process'});s=await state(req);assert.equal(s.orders[0].status,'Delivered');assert.equal(s.notifications.length,1);assert.equal(s.budget.reserved,0);assert.equal(s.budget.spent,3000);assert.equal(sqlite.prepare('SELECT count(*) n FROM coupons').get().n,1);
// Rejection and a permanent provider failure must return the reservation exactly once.
const fail=s.challenges.find(a=>a.template==='read');await action(cr,{action:'claim',challenge:fail.id});await action(req,{action:'reject',challenge:fail.id});await action(cr,{action:'claim',challenge:fail.id});await action(req,{action:'approve',challenge:fail.id});await action(req,{action:'scenario',order:'order:'+fail.id,scenario:'permanent'});await action(req,{action:'process'});sqlite.exec('UPDATE reward_orders SET next_attempt=0');await action(req,{action:'process'});s=await state(req);assert.equal(s.budget.reserved,0);assert.equal(s.budget.available,10000);assert.equal(s.orders.find(o=>o.challenge===fail.id).status,'ManualReview');
// Temporary errors retain reservation, have exponential retry times and eventually issue one coupon.
const retry=s.challenges.find(a=>a.template==='forest');await action(cr,{action:'claim',challenge:retry.id});await action(req,{action:'approve',challenge:retry.id});await action(req,{action:'scenario',order:'order:'+retry.id,scenario:'temporary'});await action(req,{action:'process'});sqlite.exec('UPDATE reward_orders SET next_attempt=0');await action(req,{action:'process'});s=await state(req);assert.equal(s.budget.reserved,5000);const retry1=s.orders.find(o=>o.challenge===retry.id);assert.equal(retry1.status,'Failed');assert.ok(retry1.next_attempt>Date.now());
await action(req,{action:'process'});assert.equal((await state(req)).orders.find(o=>o.id===retry1.id).attempts,1);
for(let i=0;i<2;i++){sqlite.exec('UPDATE reward_orders SET next_attempt=0');await action(req,{action:'process'})}
s=await state(req);assert.equal(s.budget.spent,8000);assert.equal(s.budget.reserved,0);assert.equal(s.notifications.length,2);
await assert.rejects(action(req,{action:'update_ledger',available:99}));await assert.rejects(action(req,{action:'delete_audit'}));assert.throws(()=>sqlite.exec('UPDATE balance_accounts SET available=-1'),/CHECK/);
const totals=sqlite.prepare('SELECT SUM(available) available,SUM(reserved) reserved,SUM(spent) spent,SUM(refunded) refunded FROM ledger_transactions').get();const projection=sqlite.prepare('SELECT available,reserved,spent,refunded FROM balance_accounts').get();assert.deepEqual(totals,projection);
const stranger=new Request('https://test.invalid',{headers:{'oai-authenticated-user-id':'stranger'}});await assert.rejects(action(stranger,{action:'approve',challenge:task.id}));
await action(req,{action:'refund',key:'refund-test-key-12345'});s=await state(req);assert.equal(s.budget.available,0);assert.equal(s.budget.refunded,5000);
await action(req,{action:'pay',key:'insufficient-payment-12345',child:c.id,templates:['walk'],method:'card'});await action(req,{action:'refund',key:'insufficient-refund-12345'});
const unpaid=(await state(req)).challenges.find(a=>a.status==='Assigned');await action(cr,{action:'claim',challenge:unpaid.id});await assert.rejects(action(req,{action:'approve',challenge:unpaid.id}),/nonnegative_money/);assert.equal((await state(req)).challenges.find(a=>a.id===unpaid.id).status,'Claimed');assert.equal(sqlite.prepare('SELECT count(*) n FROM approvals WHERE challenge=?').get(unpaid.id).n,0);
// New product journey: persisted start, child isolation despite platform parent header, family rewards.
const both=new Request('https://test.invalid',{headers:{cookie:'hv_child='+session.session,'oai-authenticated-user-id':'parent-one'}});
await assert.rejects(state(both));await assert.rejects(action(both,{action:'approve',challenge:task.id}));await assert.rejects(action(both,{action:'fund',key:'forbidden-budget-1234',amount:100,method:'swish'}));
const sibling=await action(req,{action:'child',nickname:'Syskon',phone:''});
const custom={action:'save_task',key:'custom-family-task-1234',child:c.id,title:'Hjälp med middagen',instructions:'Duka bordet tillsammans.',reward:'Välj fredagsfilm',kind:'family',image:'',amount:0,greeting:'Tack för hjälpen!'};
await action(req,custom);await action(req,custom);
await action(cr,{action:'select',challenge:custom.key});await action(cr,{action:'select',challenge:custom.key});
assert.equal((await state(cr,true)).challenges.find(a=>a.id===custom.key).status,'Selected');
await action(cr,{action:'start',challenge:custom.key});await action(cr,{action:'start',challenge:custom.key});
assert.equal((await state(cr,true)).challenges.find(a=>a.id===custom.key).status,'Started');
await action(cr,{action:'claim',challenge:custom.key});await action(cr,{action:'claim',challenge:custom.key});
await action(req,{action:'approve',challenge:custom.key});await action(req,{action:'approve',challenge:custom.key});
await assert.rejects(action(cr,{action:'open_reward',challenge:custom.key}));
await action(req,{action:'family_deliver',challenge:custom.key});await action(req,{action:'family_deliver',challenge:custom.key});
await action(cr,{action:'open_reward',challenge:custom.key});assert.equal((await state(cr,true)).challenges.find(a=>a.id===custom.key).opened,1);
assert.equal(sqlite.prepare('SELECT count(*) n FROM reward_orders WHERE challenge=?').get(custom.key).n,0);
await action(cr,{action:'avatar',avatar:'book'});assert.equal((await state(cr,true)).children[0].avatar,'book');
await action(cr,{action:'suggest',key:'suggestion-123456789',title:'Bygg en koja'});await action(cr,{action:'suggest',key:'suggestion-123456789',title:'Bygg en koja'});assert.equal((await state(req)).suggestions.length,1);
await action(req,{action:'copy_task',key:'copy-family-task-1234',source:custom.key,child:sibling.id});await assert.rejects(action(cr,{action:'select',challenge:'copy-family-task-1234'}));
assert.equal((await state(cr,true)).challenges.some(a=>a.child===sibling.id),false);
await action(req,{action:'save_task',...custom,key:'custom-paid-task-12345',kind:'gift',image:'froosh',reward:'Froosh – test',amount:2900});
await action(req,{action:'fund',key:'fund-test-123456789',amount:2900,method:'swish'});await action(req,{action:'fund',key:'fund-test-123456789',amount:2900,method:'swish'});
await action(cr,{action:'select',challenge:'custom-paid-task-12345'});await action(cr,{action:'start',challenge:'custom-paid-task-12345'});await action(cr,{action:'claim',challenge:'custom-paid-task-12345'});await action(req,{action:'approve',challenge:'custom-paid-task-12345'});await action(req,{action:'approve',challenge:'custom-paid-task-12345'});await action(req,{action:'process'});sqlite.exec('UPDATE reward_orders SET next_attempt=0');await action(req,{action:'process'});await action(cr,{action:'open_reward',challenge:'custom-paid-task-12345'});assert.equal((await state(cr,true)).challenges.find(a=>a.id==='custom-paid-task-12345').status,'Delivered');
console.log('PASS: persistent selection/start, avatars, suggestions, family delivery/opening, copy to sibling, duplicate guards, parent header + child cookie isolation.');
await action(req,{action:'revoke',child:c.id});await assert.rejects(state(cr,true));await action(req,{action:'delete',child:c.id});assert.equal((await state(req)).children.length,1);assert.equal((await state(req)).notifications.length,0);
console.log('PASS: account → payment → child link → claim → approval → reserve → coupon → SMS; duplicates, rejection, retries, permanent failure, refunds, immutable journal, role isolation, revocation, deletion.');
// Generic webhook verifier rejects altered bodies, expired timestamps and missing secrets.
await build({entryPoints:['lib/providers.ts'],outfile:'/tmp/hostlovet-providers.mjs',bundle:true,platform:'node',format:'esm'});
const {verifyWebhook}=await import('/tmp/hostlovet-providers.mjs');
const secret='unit-test-only-not-a-provider-secret';const raw='{"event":"test"}';const stamp=String(Math.floor(Date.now()/1000));
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const mac=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+raw)))).map(x=>x.toString(16).padStart(2,'0')).join('');
assert.equal(await verifyWebhook(raw,stamp+':'+mac,secret),true);assert.equal(await verifyWebhook(raw+'x',stamp+':'+mac,secret),false);assert.equal(await verifyWebhook(raw,'1:'+mac,secret),false);assert.equal(await verifyWebhook(raw,null,undefined),false);
console.log('PASS: webhook signature and freshness guards.');
