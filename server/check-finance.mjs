import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await c.connect();

const r = await c.query(`
  SELECT
    a.code,
    a.opening_balance::text AS opening_balance,
    COALESCE(
      SUM(
        CASE
          WHEN t.status IN ('posted','reversed') AND t.direction = 'in'
            THEN t.amount
          WHEN t.status IN ('posted','reversed') AND t.direction = 'out'
            THEN -t.amount
          ELSE 0
        END
      ),
      0
    )::text AS transaction_net,
    (
      a.opening_balance +
      COALESCE(
        SUM(
          CASE
            WHEN t.status IN ('posted','reversed') AND t.direction = 'in'
              THEN t.amount
            WHEN t.status IN ('posted','reversed') AND t.direction = 'out'
              THEN -t.amount
            ELSE 0
          END
        ),
        0
      )
    )::text AS calculated_balance
  FROM finance_accounts a
  LEFT JOIN finance_transactions t
    ON t.account_id = a.id
    AND t.deleted_at IS NULL
  WHERE a.code = 'BANKA-TRY-01'
  GROUP BY a.id, a.code, a.opening_balance
`);

console.table(r.rows);
await c.end();
