import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if(existsSync('.env')) { console.log('.env already exists; left unchanged.'); process.exit(0); }
const password=randomBytes(24).toString('base64url');
writeFileSync('.env',`APP_ORIGIN=http://127.0.0.1:4173\nADMIN_EMAIL=partner@meken.im\nADMIN_PASSWORD=${password}\nHOST=127.0.0.1\nPORT=4173\nDATA_DIR=./data\nNODE_ENV=development\n`,{mode:0o600,flag:'wx'});
console.log('Created private .env with a unique administrator password. No credentials were printed. Before public launch set APP_ORIGIN=https://meken.im and NODE_ENV=production.');
