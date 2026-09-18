import {database} from '@/db/runtime';
import {templates} from './catalog';
import {MockPaymentProvider,MockCouponProvider,MockSmsProvider} from './providers';
export const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
export async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
const p=(sql:string,...args:any[])=>database().prepare(sql).bind(...args);
const audit=(h:string,actor:string,event:string,ref:string)=>p('INSERT INTO audit_events VALUES (?,?,?,?,?,?)',uid(),h,actor,event,ref,now());
export async function identity(req:Request,childOnly=false){
 const cookie=req.headers.get('cookie')?.match(/(?:^|; )hv_child=([^;]+)/)?.[1];
 if(childOnly&&cookie){const s=await p('SELECT s.*, c.household FROM child_sessions s JOIN child_profiles c ON c.id=s.child WHERE s.hash=? AND s.expires>? AND c.deleted=0 AND c.version=s.version',await hash(cookie),Date.now()).first<any>();if(s)return {role:'child',household:s.household,child:s.child,actor:s.child};}
 if(childOnly)throw new Error('Barnlänken saknas eller har återkallats. Be din vuxen om en ny länk.');
 if(cookie)throw new Error('Du är i barnläget. Föräldravyn öppnas på din vuxens enhet.');
 const owner=req.headers.get('oai-authenticated-user-id');if(!owner)throw new Error('Logga in för att fortsätta.');
 const h=await p('SELECT * FROM households WHERE owner=?',owner).first<any>();return {role:'parent',household:h?.id,actor:owner};
}
export async function rate(req:Request,actor:string){const key=actor+':'+Math.floor(Date.now()/60000);const r=await p('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',key,Date.now()+120000).first<any>();await p('DELETE FROM rate_limits WHERE expires<?',Date.now()).run();if(r.count>90)throw new Error('För många försök. Vänta en minut.');}
export async function state(req:Request,childOnly=false){const i=await identity(req,childOnly);if(!i.household)return {registered:false,children:[],challenges:[],orders:[],ledger:[],notifications:[],audit:[],payments:[],budget:{available:0,reserved:0,spent:0,refunded:0}};
 const h=i.household;const child=childOnly?i.child:null;
 const cs=await p('SELECT id,nickname,phone,version FROM child_profiles WHERE household=? AND deleted=0'+(child?' AND id=?':''),...[h,...(child?[child]:[])]).all<any>();
 const as=await p('SELECT a.*,c.nickname,d.title,d.instructions,d.reward,d.kind,d.image,d.greeting,d.opened FROM assigned_challenges a JOIN child_profiles c ON c.id=a.child LEFT JOIN challenge_details d ON d.challenge=a.id WHERE a.household=? AND c.deleted=0'+(child?' AND a.child=?':'')+' ORDER BY a.created',...[h,...(child?[child]:[])]).all<any>();
 const ns=await p('SELECT * FROM notifications WHERE household=?'+(child?' AND child=?':'')+' ORDER BY created DESC',...[h,...(child?[child]:[])]).all<any>();
 const suggestions=await p('SELECT * FROM suggestions WHERE household=?'+(child?' AND child=?':''),...[h,...(child?[child]:[])]).all<any>();
 const prefs=await p('SELECT cp.* FROM child_preferences cp JOIN child_profiles c ON c.id=cp.child WHERE c.household=?',h).all<any>();
 if(childOnly)return {registered:true,children:cs.results.map(c=>({id:c.id,nickname:c.nickname,avatar:prefs.results.find(p=>p.child===c.id)?.avatar||'sun'})),suggestions:suggestions.results,challenges:as.results,notifications:ns.results,child:true};
 const [b,o,l,a,pa,cl]=await Promise.all([p('SELECT COALESCE(SUM(available),0) available,COALESCE(SUM(reserved),0) reserved,COALESCE(SUM(spent),0) spent,COALESCE(SUM(refunded),0) refunded FROM ledger_transactions WHERE household=?',h).first(),p('SELECT * FROM reward_orders WHERE household=? ORDER BY created DESC',h).all(),p('SELECT * FROM ledger_transactions WHERE household=? ORDER BY created DESC',h).all(),p('SELECT * FROM audit_events WHERE household=? ORDER BY created DESC LIMIT 100',h).all(),p('SELECT * FROM payments WHERE household=? ORDER BY created DESC',h).all(),p('SELECT c.* FROM completion_claims c JOIN assigned_challenges a ON a.id=c.challenge WHERE a.household=?',h).all()]);
 return {registered:true,children:cs.results,suggestions:suggestions.results,challenges:as.results,notifications:ns.results,budget:b,orders:o.results,ledger:l.results,audit:a.results,payments:pa.results,claims:cl.results};
}
export async function action(req:Request,b:any){
 if(b.action==='redeem'){
  if(typeof b.token!=='string'||b.token.length>100)throw new Error('Ogiltig länk');
  await rate(req,'redeem:'+(req.headers.get('oai-authenticated-user-id')??'anonymous'));
  const child=await p('SELECT * FROM child_profiles WHERE token_hash=? AND token_expires>? AND deleted=0',await hash(b.token),Date.now()).first<any>();if(!child)throw new Error('Länken har använts eller gått ut. Be din vuxen om en ny.');
  const token=uid()+uid();const digest=await hash(token);
  const result=await database().batch([p('INSERT INTO child_sessions (hash,child,version,expires) SELECT ?,id,version,? FROM child_profiles WHERE id=? AND token_hash=?',digest,Date.now()+7*86400000,child.id,await hash(b.token)),p('UPDATE child_profiles SET token_hash=NULL,token_expires=NULL WHERE id=? AND token_hash=?',child.id,await hash(b.token)),audit(child.household,child.id,'Barnlänk använd',child.id)]);
  if(result[0].meta.changes!==1)throw new Error('Länken har redan använts');return {session:token};
 }
 const isChild=['claim','select','start','suggest','avatar','open_reward'].includes(b.action);const i=await identity(req,isChild);await rate(req,i.actor);
 const h=i.household;
 if(b.action==='register'){
  if(h)return {ok:true};const id=uid();const name=String(b.name??'').trim().slice(0,60);if(!name)throw new Error('Ange ditt förnamn');
  await database().batch([p('INSERT INTO households VALUES (?,?,?,?)',id,i.actor,name,now()),p('INSERT INTO parent_users VALUES (?,?,?)',i.actor,id,name),p('INSERT INTO balance_accounts (household) VALUES (?)',id),audit(id,i.actor,'Testkonto skapat',id)]);return {ok:true};
 }
 if(!h)throw new Error('Skapa ditt testkonto först');
 if(b.action==='child'){
  const nickname=String(b.nickname??'').trim();const phone=String(b.phone??'').replace(/[\s-]/g,'').replace(/^0/,'+46');if(!nickname||nickname.length>30||(phone&&!/^\+467\d{8}$/.test(phone)))throw new Error('Ange smeknamn och lämna telefonnummer tomt om du bjuder in med länk.');
  const count=await p('SELECT COUNT(*) n FROM child_profiles WHERE household=? AND deleted=0',h).first<any>();if(count.n>=6)throw new Error('Testfamiljen kan ha högst sex barn');
  const id=uid();await database().batch([p('INSERT INTO child_profiles (id,household,nickname,phone) VALUES (?,?,?,?)',id,h,nickname,phone),audit(h,i.actor,'Barnprofil skapad',id)]);return {id};
 }
 if(b.action==='link'||b.action==='revoke'||b.action==='delete'){
  const c=await p('SELECT * FROM child_profiles WHERE id=? AND household=? AND deleted=0',b.child,h).first<any>();if(!c)throw new Error('Barnprofilen finns inte');
  if(b.action==='delete'){
   const pending=await p("SELECT COUNT(*) n FROM assigned_challenges WHERE child=? AND status IN ('Approved','Issuing','Failed')",c.id).first<any>();if(pending.n)throw new Error('Hantera pågående belöningar före radering.');
   await database().batch([p("UPDATE child_profiles SET nickname='Raderad profil',phone='',deleted=1,token_hash=NULL,version=version+1 WHERE id=?",c.id),p('DELETE FROM child_sessions WHERE child=?',c.id),p('DELETE FROM notifications WHERE child=?',c.id),p('DELETE FROM suggestions WHERE child=?',c.id),p('DELETE FROM child_preferences WHERE child=?',c.id),p('DELETE FROM challenge_details WHERE challenge IN (SELECT id FROM assigned_challenges WHERE child=?)',c.id),audit(h,i.actor,'Barnprofil raderad; ekonomisk historik bevarad',c.id)]);return {ok:true};
  }
  const token=uid()+uid();await database().batch([p('UPDATE child_profiles SET version=version+1,token_hash=?,token_expires=? WHERE id=?',b.action==='link'?await hash(token):null,Date.now()+86400000,c.id),p('DELETE FROM child_sessions WHERE child=?',c.id),audit(h,i.actor,b.action==='link'?'Ny testlänk skapad':'Barnsession återkallad',c.id)]);return b.action==='link'?{link:'/barn#'+token}:{ok:true};
 }
 if(b.action==='avatar'){
  if(!['sun','leaf','ball','book'].includes(b.avatar))throw new Error('Välj en avatar');
  await p('INSERT INTO child_preferences VALUES (?,?) ON CONFLICT(child) DO UPDATE SET avatar=excluded.avatar',i.child,b.avatar).run();return {ok:true};
 }
 if(b.action==='select'||b.action==='start'){
  const a=await p('SELECT * FROM assigned_challenges WHERE id=? AND child=?',b.challenge,i.child).first<any>();if(!a)throw new Error('Uppdraget finns inte');
  const target=b.action==='select'?'Selected':'Started';if(a.status===target)return {ok:true};
  if(!(b.action==='select'?['Assigned','Rejected']:['Selected','Rejected']).includes(a.status))throw new Error('Uppdragets status har ändrats. Uppdatera sidan.');
  await database().batch([p('UPDATE assigned_challenges SET status=? WHERE id=? AND status=?',target,a.id,a.status),audit(h,i.actor,'Uppdrag '+target,a.id)]);return {ok:true};
 }
 if(b.action==='suggest'){
  const title=String(b.title||'').trim();if(title.length<3||title.length>160)throw new Error('Beskriv din idé med 3–160 tecken.');
  if(!/^[a-zA-Z0-9-]{10,80}$/.test(b.key||''))throw new Error('Ogiltig nyckel');
  await p('INSERT OR IGNORE INTO suggestions VALUES (?,?,?,?,?,?)',b.key,h,i.child,title,'Pending',now()).run();return {ok:true};
 }
 if(b.action==='open_reward'){
  const a=await p("SELECT * FROM assigned_challenges WHERE id=? AND child=? AND status='Delivered'",b.challenge,i.child).first<any>();if(!a)throw new Error('Belöningen är inte tillgänglig än.');
  await p('UPDATE challenge_details SET opened=1 WHERE challenge=?',a.id).run();return {ok:true};
 }
 if(b.action==='suggestion_reject'){
  await p("UPDATE suggestions SET status='Declined' WHERE id=? AND household=? AND status='Pending'",b.id,h).run();return {ok:true};
 }
 if(b.action==='save_task'||b.action==='copy_task'){
  const c=await p('SELECT id FROM child_profiles WHERE id=? AND household=? AND deleted=0',b.child,h).first();if(!c)throw new Error('Välj ett barn i din familj');
  if(!/^[a-zA-Z0-9-]{10,80}$/.test(b.key||''))throw new Error('Ogiltig nyckel');
  if(await p('SELECT id FROM assigned_challenges WHERE id=? AND household=?',b.key,h).first())return {ok:true};
  const source=b.action==='copy_task'?await p('SELECT a.*,d.* FROM assigned_challenges a JOIN challenge_details d ON d.challenge=a.id WHERE a.id=? AND a.household=?',b.source,h).first<any>():null;
  if(b.action==='copy_task'&&!source)throw new Error('Uppdraget kan inte kopieras');
  const title=String(source?.title??b.title??'').trim().slice(0,100),instructions=String(source?.instructions??b.instructions??'').trim().slice(0,500),reward=String(source?.reward??b.reward??'').trim().slice(0,150),kind=source?.kind??b.kind;
  const amount=kind==='family'?0:Math.round(Number(source?.amount??b.amount));
  if(!title||!instructions||!reward||!['family','gift'].includes(kind)||!Number.isSafeInteger(amount)||amount<0||amount>100000)throw new Error('Fyll i uppdrag, belöning och ett giltigt belopp.');
  const image=String(source?.image??b.image??'');if(!['','glass','froosh','fika','spel'].includes(image))throw new Error('Ogiltig belöningsbild');
  const greeting=String(source?.greeting??b.greeting??'Bra jobbat!').slice(0,250);
  let id=b.key;const batch=[];
  if(b.edit){const a=await p("SELECT id FROM assigned_challenges WHERE id=? AND household=? AND status='Assigned'",b.edit,h).first<any>();if(!a)throw new Error('Bara uppdrag som inte valts kan ändras.');id=a.id;batch.push(p('UPDATE assigned_challenges SET child=?,amount=? WHERE id=?',b.child,amount,id));}
  else batch.push(p("INSERT INTO assigned_challenges VALUES (?,?,?,?,?,'Assigned',?)",id,h,b.child,source?.template??'custom',amount,now()));
  batch.push(p('INSERT INTO challenge_details VALUES (?,?,?,?,?,?,?,0) ON CONFLICT(challenge) DO UPDATE SET title=excluded.title,instructions=excluded.instructions,reward=excluded.reward,kind=excluded.kind,image=excluded.image,greeting=excluded.greeting',id,title,instructions,reward,kind,image,greeting));
  if(b.suggestion)batch.push(p("UPDATE suggestions SET status='Accepted' WHERE id=? AND household=? AND child=? AND status='Pending'",b.suggestion,h,b.child));
  batch.push(audit(h,i.actor,'Uppdrag planerat',id));await database().batch(batch);return {ok:true};
 }
 if(b.action==='family_deliver'){
  const a=await p("SELECT a.* FROM assigned_challenges a JOIN challenge_details d ON d.challenge=a.id WHERE a.id=? AND a.household=? AND d.kind='family' AND a.status='Approved'",b.challenge,h).first<any>();if(!a)return {ok:true};
  await database().batch([p("UPDATE assigned_challenges SET status='Delivered' WHERE id=? AND status='Approved'",a.id),audit(h,i.actor,'Familjebelöning tillgängliggjord av vuxen',a.id)]);return {ok:true};
 }
 if(b.action==='fund'){
  const amount=Number(b.amount);if(!Number.isSafeInteger(amount)||amount<=0||amount>100000||!/^[a-zA-Z0-9-]{10,80}$/.test(b.key||''))throw new Error('Ogiltigt testbelopp');
  if(await p('SELECT id FROM payments WHERE id=? AND household=?',b.key,h).first())return {ok:true};
  await new MockPaymentProvider().charge(b.key,amount,b.method);await database().batch([p('INSERT INTO payments VALUES (?,?,?,?,?,?)',b.key,h,amount,b.method,'test_paid',now()),p('UPDATE balance_accounts SET available=available+? WHERE household=?',amount,h),p('INSERT INTO ledger_transactions VALUES (?,?,?,?,?,?,?,?)','payment:'+b.key,h,amount,0,0,0,'Testbetalning',now()),audit(h,i.actor,'Testbudget påfylld',b.key)]);return {ok:true};
 }
 if(b.action==='pay'){
  if(!/^[a-zA-Z0-9-]{10,80}$/.test(b.key??''))throw new Error('Ogiltig betalningsnyckel');
  if(await p('SELECT id FROM payments WHERE id=? AND household=?',b.key,h).first())return {ok:true};
  const c=await p('SELECT id FROM child_profiles WHERE id=? AND household=? AND deleted=0',b.child,h).first();if(!c)throw new Error('Välj ett barn');
  const selected=templates.filter(t=>Array.isArray(b.templates)&&b.templates.includes(t.id));if(!selected.length)throw new Error('Välj minst ett uppdrag');const amount=selected.reduce((s,t)=>s+t.amount*100,0);
  await new MockPaymentProvider().charge(b.key,amount,b.method);const stamp=now();
  await database().batch([p('INSERT INTO payments VALUES (?,?,?,?,?,?)',b.key,h,amount,b.method,'test_paid',stamp),p('UPDATE balance_accounts SET available=available+? WHERE household=?',amount,h),p('INSERT INTO ledger_transactions VALUES (?,?,?,?,?,?,?,?)','payment:'+b.key,h,amount,0,0,0,'Testbetalning',stamp),...selected.map(t=>p('INSERT INTO assigned_challenges VALUES (?,?,?,?,?,?,?)',uid(),h,b.child,t.id,t.amount*100,'Assigned',stamp)),audit(h,i.actor,'Testbetalning bokförd',b.key)]);return {ok:true};
 }
 if(b.action==='claim'){
  const a=await p('SELECT * FROM assigned_challenges WHERE id=? AND child=? AND household=?',b.challenge,i.child,h).first<any>();if(!a)throw new Error('Uppdraget finns inte');if(a.status==='Claimed')return {ok:true};if(!['Assigned','Selected','Started','Rejected'].includes(a.status))throw new Error('Uppdraget har redan hanterats');
  await database().batch([p("INSERT INTO completion_claims SELECT ?,id,? FROM assigned_challenges WHERE id=? AND status IN ('Assigned','Selected','Started','Rejected')",uid(),now(),a.id),p("UPDATE assigned_challenges SET status='Claimed' WHERE id=? AND status IN ('Assigned','Selected','Started','Rejected')",a.id),audit(h,i.actor,'Uppdrag klarmarkerat',a.id)]);return {ok:true};
 }
 if(b.action==='approve'||b.action==='reject'){
  const a=await p('SELECT * FROM assigned_challenges WHERE id=? AND household=?',b.challenge,h).first<any>();if(!a)throw new Error('Uppdraget finns inte');if(await p('SELECT id FROM approvals WHERE challenge=?',a.id).first())return {ok:true};if(a.status!=='Claimed')throw new Error('Uppdraget väntar inte på godkännande');
  if(b.action==='reject'){await database().batch([p("UPDATE assigned_challenges SET status='Rejected' WHERE id=? AND status='Claimed'",a.id),audit(h,i.actor,'Inte riktigt än',a.id)]);return {ok:true}}
  const detail=await p('SELECT kind FROM challenge_details WHERE challenge=?',a.id).first<any>();
  if(detail?.kind==='family'){await database().batch([p('INSERT OR IGNORE INTO approvals VALUES (?,?,?,?)','approval:'+a.id,a.id,i.actor,now()),p("UPDATE assigned_challenges SET status='Approved' WHERE id=? AND status='Claimed'",a.id),audit(h,i.actor,'Familjeuppdrag godkänt',a.id)]);return {ok:true};}
  const key='approval:'+a.id;const stamp=now();
  await database().batch([p("INSERT INTO approvals SELECT ?,id,?,? FROM assigned_challenges WHERE id=? AND status='Claimed'",key,i.actor,stamp,a.id),p('UPDATE balance_accounts SET available=available-?,reserved=reserved+? WHERE household=? AND EXISTS (SELECT 1 FROM approvals WHERE id=?)',a.amount,a.amount,h,key),p('INSERT INTO ledger_transactions (id,household,available,reserved,spent,refunded,reason,created) SELECT ?,? ,?, ?,0,0,?,? FROM approvals WHERE id=?','reserve:'+a.id,h,-a.amount,a.amount,'Belöning reserverad',stamp,key),p("INSERT INTO reward_orders (id,household,challenge,status,created) SELECT ?,?,challenge,'Approved',? FROM approvals WHERE id=?",'order:'+a.id,h,stamp,key),p("UPDATE assigned_challenges SET status='Approved' WHERE id=? AND status='Claimed'",a.id),audit(h,i.actor,'Belöning godkänd och reserverad',a.id)]);return {ok:true};
 }
 if(b.action==='refund'){
  if(!/^[a-zA-Z0-9-]{10,80}$/.test(b.key??''))throw new Error('Ogiltig nyckel');
  if(await p('SELECT id FROM ledger_transactions WHERE id=?','refund:'+b.key).first())return {ok:true};
  const bal=await p('SELECT COALESCE(SUM(available),0) amount FROM ledger_transactions WHERE household=?',h).first<any>();if(bal.amount<=0)throw new Error('Inget tillgängligt belopp att återbetala');
  await database().batch([p('UPDATE balance_accounts SET available=available-?,refunded=refunded+? WHERE household=?',bal.amount,bal.amount,h),p('INSERT INTO ledger_transactions VALUES (?,?,?,?,?,?,?,?)','refund:'+b.key,h,-bal.amount,0,0,bal.amount,'Simulerad återbetalning',now()),audit(h,i.actor,'Tillgängligt testbelopp återbetalt',b.key)]);return {ok:true};
 }
 if(b.action==='scenario'){
  if(!['success','temporary','permanent'].includes(b.scenario))throw new Error('Ogiltigt testscenario');await p("UPDATE reward_orders SET scenario=? WHERE id=? AND household=? AND status IN ('Approved','Issuing') AND attempts=0",b.scenario,b.order,h).run();return {ok:true};
 }
 if(b.action==='process'){
  const list=await p("SELECT o.*,a.amount,a.child FROM reward_orders o JOIN assigned_challenges a ON a.id=o.challenge WHERE o.household=? AND o.status IN ('Approved','Issuing','Failed') AND o.next_attempt<=?",h,Date.now()).all<any>();
  for(const o of list.results){
   if(o.status==='Approved'){await database().batch([p("UPDATE reward_orders SET status='Issuing',next_attempt=? WHERE id=? AND status='Approved'",Date.now()+8000,o.id),p("UPDATE assigned_challenges SET status='Issuing' WHERE id=? AND status='Approved'",o.challenge),audit(h,i.actor,'Kupongorder skickas · mock',o.id)]);continue;}
   const lease=await p("UPDATE reward_orders SET next_attempt=? WHERE id=? AND attempts=? AND status IN ('Issuing','Failed') AND next_attempt<=?",Date.now()+30000,o.id,o.attempts,Date.now()).run();if(lease.meta.changes!==1)continue;
   const response=await new MockCouponProvider().issue(o.id,o.scenario,o.attempts);
   if(!response.accepted){const permanent=response.permanent||o.attempts>=3;const stamp=now();const statements=[p('UPDATE reward_orders SET status=?,attempts=attempts+1,next_attempt=?,error=? WHERE id=? AND status IN (\'Issuing\',\'Failed\')',permanent?'ManualReview':'Failed',Date.now()+Math.min(60000,2000*2**o.attempts),response.error,o.id),p('UPDATE assigned_challenges SET status=? WHERE id=?',permanent?'ManualReview':'Failed',o.challenge),audit(h,i.actor,permanent?'Permanent fel; reservation återförd':'Tillfälligt fel; återförsök planerat',o.id)];if(permanent)statements.unshift(p('UPDATE balance_accounts SET available=available+?,reserved=reserved-? WHERE household=? AND NOT EXISTS (SELECT 1 FROM ledger_transactions WHERE id=?)',o.amount,o.amount,h,'release:'+o.id),p('INSERT OR IGNORE INTO ledger_transactions VALUES (?,?,?,?,?,?,?,?)','release:'+o.id,h,o.amount,-o.amount,0,0,'Reservation återförd',stamp));await database().batch(statements);continue;}
   // Unique coupon/order and unique journal IDs make a repeated/concurrent delivery roll back atomically.
   const sms=await new MockSmsProvider().send(o.id,'Bra jobbat! Din testbelöning på '+o.amount/100+' kr är levererad. Detta är ingen giltig kupong.');
   try{await database().batch([p('INSERT INTO coupons VALUES (?,?,?,?)','coupon:'+o.id,o.id,response.id,'issued_test'),p('UPDATE balance_accounts SET reserved=reserved-?,spent=spent+? WHERE household=?',o.amount,o.amount,h),p('INSERT INTO ledger_transactions VALUES (?,?,?,?,?,?,?,?)','spend:'+o.id,h,0,-o.amount,o.amount,0,'Kupongorder accepterad · mock',now()),p("UPDATE reward_orders SET status='Delivered',attempts=attempts+1,error=NULL WHERE id=?",o.id),p("UPDATE assigned_challenges SET status='Delivered' WHERE id=?",o.challenge),p('INSERT INTO notifications VALUES (?,?,?,?,?)',sms.id,h,o.child,sms.body,now()),audit(h,i.actor,'Testkupong accepterad; simulerat SMS levererat',o.id)]);}catch(e){if(!await p('SELECT id FROM coupons WHERE order_id=?',o.id).first())throw e;}
  }return {ok:true};
 }
 throw new Error('Åtgärden stöds inte');
}
