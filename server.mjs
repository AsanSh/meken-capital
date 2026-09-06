import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === 'production';
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:4173';
if (production && !origin.startsWith('https://')) throw new Error('APP_ORIGIN must use HTTPS');
const dataDir = resolve(process.env.DATA_DIR || resolve(root, 'data'));
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(resolve(dataDir, 'meken.sqlite'));
chmodSync(resolve(dataDir, 'meken.sqlite'), 0o600);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'investor', created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY, payload TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), deal_id TEXT NOT NULL REFERENCES deals(id), amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'submitted', created TEXT NOT NULL, UNIQUE(user_id,deal_id));
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id), name TEXT NOT NULL, kind TEXT NOT NULL, content BLOB NOT NULL, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS polls (id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id), question TEXT NOT NULL, closes TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS votes (poll_id TEXT NOT NULL REFERENCES polls(id), user_id TEXT NOT NULL REFERENCES users(id), answer TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(poll_id,user_id));
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created TEXT NOT NULL);
`);
const now = () => new Date().toISOString();
const id = () => randomBytes(16).toString('hex');
const hash = v => createHash('sha256').update(v).digest('hex');
const passwordHash = p => { const salt = id(); return salt + ':' + scryptSync(p, salt, 64).toString('hex'); };
const verify = (p, stored) => { const [salt, value] = stored.split(':'); return timingSafeEqual(Buffer.from(value, 'hex'), scryptSync(p, salt, 64)); };
const audit = (u, action, target) => db.prepare('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)').run(u.id, action, target, now());
const notify = (user, message) => db.prepare('INSERT INTO notifications VALUES(?,?,?,0,?)').run(id(), user, message, now());
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const text = (v, max = 2000) => typeof v === 'string' && v.trim().length <= max ? v.trim() : fail(400, 'Проверьте текстовые поля');
const number = (v, min, max) => Number.isFinite(v) && v >= min && v <= max ? v : fail(400, 'Проверьте числовые поля');
const emailOf = v => { const e = text(v, 254).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) fail(400, 'Укажите корректный email'); return e; };
const checkPassword = p => { if (typeof p !== 'string' || p.length < 12 || p.length > 128) fail(400, 'Пароль должен содержать от 12 до 128 символов'); };
const adminEmail = process.env.ADMIN_EMAIL;
if (production && process.env.ADMIN_PASSWORD === 'REPLACE_WITH_A_UNIQUE_RANDOM_PASSWORD') throw new Error('Replace the example administrator password before starting');
if (adminEmail && !db.prepare('SELECT id FROM users WHERE email=?').get(adminEmail.toLowerCase())) {
  checkPassword(process.env.ADMIN_PASSWORD);
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id(), emailOf(adminEmail), 'Администратор', passwordHash(process.env.ADMIN_PASSWORD), 'admin', now());
}
const limits = new Map();
function throttle(key, max) {
  const t = Date.now(); if (limits.size > 10000) for (const [k,v] of limits) if (v.until < t) limits.delete(k);
  const entry = limits.get(key); if (!entry || entry.until < t) { limits.set(key,{count:1,until:t+900000}); return; }
  if (++entry.count > max) fail(429, 'Слишком много попыток. Повторите через 15 минут.');
}
function session(req) {
  const raw = /(?:^|;\s*)meken_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
  if (!raw) return null;
  return db.prepare('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(hash(raw), Date.now()) || null;
}
const requireUser = u => u || fail(401,'Войдите в аккаунт');
const requireAdmin = u => { requireUser(u); if (u.role !== 'admin') fail(403,'Доступ только администратору'); };
const dealOf = row => ({...JSON.parse(row.payload), id:row.id, published:!!row.published, version:row.version});
function validateDeal(b) {
  const d = {};
  for (const k of ['title','category','sharia','description','risk','exit','mechanism','location']) { d[k] = text(b[k]); if (!d[k]) fail(400,'Заполните описание, риски, структуру и условия выхода'); }
  if (!['Материалы','Строительство','Квартиры','Земля','Аренда'].includes(d.category)) fail(400,'Выберите категорию');
  for (const k of ['capital','revenue','costs','min','max']) d[k] = number(b[k], k==='costs'?0:1, 1e12);
  d.months = number(b.months,1,120); d.share = number(b.share,0,1); d.recurring = b.recurring === true;
  if (!Number.isInteger(d.months)) fail(400,'Срок должен быть целым числом месяцев');
  if (d.min > d.max || d.max > d.capital) fail(400,'Диапазон участия должен быть в пределах капитала проекта');
  d.season = b.season === 'Сезонный' ? 'Сезонный' : 'Всесезонный';
  d.image = ['materials','house','apartment'].includes(b.image)?b.image:'house';
  d.shariaReviewer = text(b.shariaReviewer || '',200);
  return d;
}
async function body(req) {
  const chunks=[]; let size=0;
  for await (const c of req) { size+=c.length; if(size>8*1024*1024) fail(413,'Максимальный размер запроса — 8 МБ'); chunks.push(c); }
  try { const parsed=JSON.parse(Buffer.concat(chunks).toString() || '{}'); if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) fail(400,'Ожидается объект'); return parsed; } catch { fail(400,'Некорректный запрос'); }
}
function json(res, value, status=200) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }
async function api(req,res,url) {
  const u=session(req), method=req.method, p=url.pathname;
  if (!['GET','HEAD'].includes(method)) {
    if (req.headers.origin !== origin || req.headers['x-meken-request'] !== '1') fail(403,'Недопустимый источник запроса');
    if (!req.headers['content-type']?.startsWith('application/json')) fail(415,'Ожидается JSON');
  }
  if (p==='/api/health') return json(res,{ok:true});
  if (p==='/api/me' && method==='GET') return json(res,{user:u});
  if (p==='/api/login' && method==='POST') {
    const b=await body(req), email=emailOf(b.email); throttle('login-ip:'+req.socket.remoteAddress,60); throttle('login:'+email,10);
    if (typeof b.password!=='string'||b.password.length>128) fail(400,'Проверьте пароль');
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user || !verify(b.password,user.password)) fail(401,'Неверный email или пароль');
    const token=randomBytes(32).toString('hex'); db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+86400000);
    res.setHeader('Set-Cookie',`meken_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${production?'; Secure':''}`);
    audit(user,'login',user.id); return json(res,{ok:true});
  }
  if (p==='/api/register' && method==='POST') {
    throttle('register:'+req.socket.remoteAddress,10); const b=await body(req), email=emailOf(b.email); checkPassword(b.password);
    const name=text(b.name,120); if (!name || b.consent!==true) fail(400,'Укажите имя и подтвердите согласие');
    if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(409,'Этот email уже зарегистрирован');
    const uid=id(); db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(uid,email,name,passwordHash(b.password),'investor',now());
    audit({id:uid},'register-consent-v1',uid); return json(res,{ok:true},201);
  }
  if (p==='/api/logout' && method==='POST') {
    const raw=/(?:^|;\s*)meken_session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1];
    if(raw) db.prepare('DELETE FROM sessions WHERE token=?').run(hash(raw));
    res.setHeader('Set-Cookie','meken_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');return json(res,{ok:true});
  }
  if (p==='/api/password' && method==='POST') {
    requireUser(u); throttle('password:'+u.id,10); const b=await body(req); checkPassword(b.password);
    const record=db.prepare('SELECT password FROM users WHERE id=?').get(u.id);
    if(typeof b.current!=='string'||b.current.length>128||!verify(b.current,record.password)) fail(400,'Текущий пароль неверен');
    db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(b.password),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);audit(u,'password-change',u.id);return json(res,{ok:true});
  }
  if (p==='/api/deals' && method==='GET') return json(res,{deals:db.prepare('SELECT * FROM deals WHERE published=1').all().map(dealOf)});
  if (p==='/api/applications' && method==='GET') {
    requireUser(u);return json(res,{applications:db.prepare('SELECT a.*,d.payload FROM applications a JOIN deals d ON d.id=a.deal_id WHERE a.user_id=? ORDER BY a.created DESC').all(u.id).map(a=>({...a,deal:JSON.parse(a.payload),payload:undefined}))});
  }
  if (p==='/api/applications' && method==='POST') {
    requireUser(u); const b=await body(req); const row=db.prepare('SELECT * FROM deals WHERE id=? AND published=1').get(b.dealId||'');if(!row)fail(404,'Проект недоступен');
    const d=dealOf(row), amount=number(b.amount,d.min,d.max);if(!Number.isInteger(amount)||b.consent!==true)fail(400,'Подтвердите условия и укажите целую сумму');
    if(db.prepare('SELECT id FROM applications WHERE user_id=? AND deal_id=?').get(u.id,d.id))fail(409,'Вы уже направили заявку на этот проект');
    const aid=id();db.prepare('INSERT INTO applications VALUES(?,?,?,?,?,?)').run(aid,u.id,d.id,amount,'submitted',now());audit(u,'application-consent-v1',aid);notify(u.id,'Заявка на «'+d.title+'» получена. Это заявка на обсуждение, денежные средства не списаны.');return json(res,{ok:true},201);
  }
  if (p==='/api/notifications' && method==='GET') { requireUser(u);return json(res,{notifications:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created DESC LIMIT 100').all(u.id)}); }
  if (p==='/api/notifications/read' && method==='POST') { requireUser(u);db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(u.id);return json(res,{ok:true}); }
  if (p==='/api/documents' && method==='GET') {
    requireUser(u); const deal=url.searchParams.get('deal');
    if(u.role!=='admin'&&!db.prepare("SELECT id FROM applications WHERE user_id=? AND deal_id=? AND status='approved'").get(u.id,deal))fail(403,'Документы доступны после допуска к проекту');
    return json(res,{documents:db.prepare('SELECT id,name,kind,created FROM documents WHERE deal_id=?').all(deal)});
  }
  if (p.startsWith('/api/documents/') && method==='GET') {
    requireUser(u);const d=db.prepare('SELECT * FROM documents WHERE id=?').get(p.split('/').pop());if(!d)fail(404,'Документ не найден');
    if(u.role!=='admin'&&!db.prepare("SELECT id FROM applications WHERE user_id=? AND deal_id=? AND status='approved'").get(u.id,d.deal_id))fail(403,'Нет доступа');
    audit(u,'document-download',d.id);res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(d.name)}`,'Cache-Control':'no-store'});return res.end(Buffer.from(d.content));
  }
  if(p==='/api/polls'&&method==='GET') {
    requireUser(u);return json(res,{polls:db.prepare("SELECT p.*,v.answer FROM polls p JOIN applications a ON a.deal_id=p.deal_id AND a.user_id=? AND a.status='approved' LEFT JOIN votes v ON v.poll_id=p.id AND v.user_id=? ORDER BY p.closes DESC").all(u.id,u.id)});
  }
  if(p==='/api/vote'&&method==='POST') {
    requireUser(u);const b=await body(req);const poll=db.prepare('SELECT * FROM polls WHERE id=?').get(b.pollId||'');
    if(!poll||poll.closes<=now())fail(400,'Голосование закрыто');if(!['yes','no','abstain'].includes(b.answer))fail(400,'Выберите ответ');
    if(!db.prepare("SELECT id FROM applications WHERE user_id=? AND deal_id=? AND status='approved'").get(u.id,poll.deal_id))fail(403,'Нет доступа');
    if(db.prepare('SELECT answer FROM votes WHERE poll_id=? AND user_id=?').get(poll.id,u.id))fail(409,'Голос уже принят');
    db.prepare('INSERT INTO votes VALUES(?,?,?,?)').run(poll.id,u.id,b.answer,now());audit(u,'vote',poll.id);return json(res,{ok:true});
  }
  if(p==='/api/settings'&&method==='GET')return json(res,JSON.parse(db.prepare("SELECT value FROM settings WHERE key='public'").get()?.value||'{}'));
  if(p.startsWith('/api/admin/')) {
    requireAdmin(u);
    if(p==='/api/admin/overview'&&method==='GET')return json(res,{deals:db.prepare('SELECT * FROM deals').all().map(dealOf),applications:db.prepare('SELECT a.*,u.name,u.email FROM applications a JOIN users u ON u.id=a.user_id ORDER BY a.created DESC').all(),users:db.prepare('SELECT id,name,email,role,created FROM users').all(),audit:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all(),polls:db.prepare('SELECT p.*, (SELECT count(*) FROM votes v WHERE v.poll_id=p.id) AS votes FROM polls p').all()});
    if(p==='/api/admin/deals'&&method==='POST') {
      const b=await body(req), d=validateDeal(b);const did=b.id||id(),existing=db.prepare('SELECT * FROM deals WHERE id=?').get(did);
      if(existing&&b.version!==existing.version)fail(409,'Проект изменён другим администратором. Обновите страницу.');
      db.prepare('INSERT INTO deals(id,payload,published) VALUES(?,?,0) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,published=0,version=version+1').run(did,JSON.stringify(d));audit(u,'deal-save-unpublished',did);return json(res,{id:did});
    }
    if(p==='/api/admin/publish'&&method==='POST') {
      const b=await body(req), row=db.prepare('SELECT * FROM deals WHERE id=?').get(b.id||'');if(!row)fail(404,'Проект не найден');
      if(b.published===true) {
        const kinds=db.prepare('SELECT kind FROM documents WHERE deal_id=?').all(row.id).map(d=>d.kind);
        if(!['asset','finance','contract','sharia'].every(k=>kinds.includes(k))||!dealOf(row).shariaReviewer)fail(400,'Нужны документы на актив, финансовая модель, договор, шариатское заключение и имя проверяющего');
      }
      db.prepare('UPDATE deals SET published=?,version=version+1 WHERE id=?').run(b.published===true?1:0,row.id);audit(u,b.published?'publish':'unpublish',row.id);return json(res,{ok:true});
    }
    if(p==='/api/admin/documents'&&method==='POST') {
      const b=await body(req);if(!db.prepare('SELECT id FROM deals WHERE id=?').get(b.dealId||''))fail(404,'Проект не найден');
      if(!['asset','finance','contract','sharia','report'].includes(b.kind))fail(400,'Выберите тип документа');
      const content=Buffer.from(typeof b.base64==='string'?b.base64:'','base64');if(content.length>5*1024*1024||content.subarray(0,5).toString()!=='%PDF-')fail(400,'Загрузите PDF до 5 МБ');
      const name=text(b.name,180);if(!name)fail(400,'Укажите название');const did=id();db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run(did,b.dealId,name,b.kind,content,now());audit(u,'document-upload',did);return json(res,{ok:true});
    }
    if(p==='/api/admin/application'&&method==='POST') {
      const b=await body(req);if(!['review','approved','declined'].includes(b.status))fail(400,'Недопустимый статус');const a=db.prepare('SELECT * FROM applications WHERE id=?').get(b.id||'');if(!a)fail(404,'Заявка не найдена');
      db.prepare('UPDATE applications SET status=? WHERE id=?').run(b.status,a.id);notify(a.user_id,'Статус заявки: '+({review:'на проверке',approved:'допуск к документам открыт',declined:'отклонена'}[b.status]));audit(u,'application-'+b.status,a.id);return json(res,{ok:true});
    }
    if(p==='/api/admin/polls'&&method==='POST') {
      const b=await body(req);if(!db.prepare('SELECT id FROM deals WHERE id=?').get(b.dealId||''))fail(404,'Проект не найден');const question=text(b.question,500),dt=new Date(b.closes);
      if(!question||!Number.isFinite(dt.getTime())||dt.getTime()<=Date.now())fail(400,'Укажите вопрос и будущую дату');
      const pid=id();db.prepare('INSERT INTO polls VALUES(?,?,?,?)').run(pid,b.dealId,question,dt.toISOString());audit(u,'poll-create',pid);return json(res,{ok:true});
    }
    if(p==='/api/admin/settings'&&method==='POST') {
      const b=await body(req),value={usdKgs:number(b.usdKgs,1,1000),rateDate:now()};db.prepare("INSERT INTO settings VALUES('public',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(value));audit(u,'exchange-rate','public');return json(res,{ok:true});
    }
  }
  fail(404,'Запрос не найден');
}
const redirects={'/index.html':'/','/concepts/market.html':'/','/concepts/club.html':'/#club','/concepts/flow.html':'/#flow','/faq.html':'/#faq','/about.html':'/#about','/principles.html':'/#faq','/disclosure.html':'/#legal','/user-agreement.html':'/#terms','/privacy-policy.html':'/#privacy','/invite.html':'/#register','/login.html':'/#login','/investor.html':'/#account','/admin.html':'/#admin','/admin-login.html':'/#admin-login','/track-record.html':'/#market','/en/index.html':'/'};
const publicFiles=new Set(['/app.html','/portal.css','/portal.js','/concepts/model.js','/favicon.svg','/robots.txt','/sitemap.xml']);
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try {
    const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);
    if(!['GET','HEAD'].includes(req.method))fail(405,'Метод не поддерживается');
    if(redirects[url.pathname]){res.writeHead(302,{Location:redirects[url.pathname]});return res.end();}
    const p=url.pathname==='/'?'/app.html':url.pathname;
    if(!publicFiles.has(p)&&!/^\/concepts\/assets\/(materials|house|apartment)\.webp$/.test(p))fail(404,'Страница не найдена');
    const file=resolve(root,'site','.'+p);if(!existsSync(file))fail(404,'Страница не найдена');
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain'})[extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-cache');return res.end(req.method==='HEAD'?undefined:readFileSync(file));
  }catch(e){if(!res.headersSent)json(res,{error:e.status?e.message:'Ошибка сервера. Попробуйте ещё раз.'},e.status||500);else res.end();if(!e.status)console.error(e);}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log(`Meken ready: ${origin}`));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
