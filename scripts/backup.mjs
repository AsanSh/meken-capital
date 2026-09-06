import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
mkdirSync('backups',{recursive:true,mode:0o700});
const source=new DatabaseSync(resolve(process.env.DATA_DIR||'data','meken.sqlite'));
const target=resolve('backups',`meken-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
await backup(source,target);chmodSync(target,0o600);source.close();console.log(target);
