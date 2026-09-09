import { AsyncLocalStorage } from 'node:async_hooks';

// SQL placeholders in this application never occur inside SQL string literals.
export const postgresSQL = sql => {
  let index = 0;
  return sql.replace(/\?/g, () => '$' + (++index));
};

export async function openDatabase({ schema, dataDir }) {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 20000 });
    // Rate-limit writes must survive rejected requests and must not wait for
    // connections held by transactions waiting on the advisory lock.
    const ratePool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000, idleTimeoutMillis: 20000 });
    const context = new AsyncLocalStorage();
    const query = (sql, params=[]) => (context.getStore() || pool).query(postgresSQL(sql), params);
    const db = {
      prepare(sql) { return {
        async get(...args) { return (await query(sql,args)).rows[0]; },
        async all(...args) { return (await query(sql,args)).rows; },
        async run(...args) { return { changes: (await query(sql,args)).rowCount }; }
      }; },
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Serialize writes across function instances, including duplicate checks.
          await client.query('SELECT pg_advisory_xact_lock(734621)');
          const value = await context.run(client, fn);
          await client.query('COMMIT');
          return value;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
      async rateLimit(key,max) {
        const t=Date.now();
        const result=await ratePool.query('INSERT INTO rate_limits(key,count,expires) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires<$3 THEN 1 ELSE rate_limits.count+1 END, expires=CASE WHEN rate_limits.expires<$3 THEN $2 ELSE rate_limits.expires END RETURNING count',[key,t+900000,t]);
        return result.rows[0].count<=max;
      },
      close: () => Promise.all([pool.end(),ratePool.end()])
    };
    await db.transaction(() => query(schema.replace('content BLOB','content BYTEA').replace('expires INTEGER','expires BIGINT').replace('amount INTEGER','amount BIGINT').replace('id INTEGER PRIMARY KEY','id BIGSERIAL PRIMARY KEY')));
    return db;
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL is required on Vercel; local storage is not durable');
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdirSync, chmodSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  mkdirSync(dataDir,{recursive:true,mode:0o700});
  const db = new DatabaseSync(resolve(dataDir,'meken.sqlite'));
  chmodSync(resolve(dataDir,'meken.sqlite'),0o600);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;'+schema);
  let tail = Promise.resolve();
  return {
    prepare: sql => db.prepare(sql),
    transaction(fn) {
      const run = tail.then(async()=>{
        db.exec('BEGIN IMMEDIATE');
        try { const result=await fn();db.exec('COMMIT');return result; }
        catch(error){db.exec('ROLLBACK');throw error;}
      });
      tail=run.catch(()=>{});
      return run;
    },
    close:()=>db.close()
  };
}
