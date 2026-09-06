import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const email=process.argv[2]?.trim().toLowerCase();
if(!email){console.error('Usage: node --env-file-if-exists=.env scripts/reset-password.mjs user@example.com');process.exit(1);}
const dir=resolve(process.env.DATA_DIR||'data'), db=new DatabaseSync(resolve(dir,'meken.sqlite'));
const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);
if(!user){console.error('Account not found. No changes made.');process.exit(1);}
const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
const file=resolve(dir,'password-reset-'+randomBytes(8).toString('hex')+'.txt');
writeFileSync(file,password+'\n',{mode:0o600,flag:'wx'});
db.exec('BEGIN IMMEDIATE');
try{db.prepare('UPDATE users SET password=? WHERE id=?').run(salt+':'+scryptSync(password,salt,64).toString('hex'),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.prepare('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)').run('server-operator','password-reset',user.id,new Date().toISOString());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
db.close();console.log('Password reset; all sessions revoked. Private credential file: '+file);console.log('Verify the account owner before handing over access; remove the credential file after secure delivery.');
