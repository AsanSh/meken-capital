import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const schema='meken_test_'+randomBytes(8).toString('hex');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
  await client.query('CREATE SCHEMA '+schema);
  const connection=new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
  connection.searchParams.set('options','-c search_path='+schema);
  const child=spawn(process.execPath,['--test','tests/server.test.mjs'],{
    env:{...process.env,DATABASE_URL:connection.href,VERCEL:''},stdio:'inherit'
  });
  const [code]=await once(child,'exit');
  process.exitCode=code??1;
}finally{
  // Only this freshly generated test schema is removed; production is untouched.
  await client.query('DROP SCHEMA '+schema+' CASCADE');
  await client.end();
}
