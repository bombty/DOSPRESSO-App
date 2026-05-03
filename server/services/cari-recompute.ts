/**
 * DOSPRESSO — Cari currentBalance Recompute Service (F32)
 *
 * `cari_accounts.currentBalance` cache değeri; transaction insert/update/delete
 * akışlarında read-modify-write ile tutuluyor (race + sessiz drift riski).
 * Bu servis SUM(cari_transactions) üzerinden gerçek bakiyeyi hesaplar.
 *
 * Kural: transactionType='borc' → +amount (bizden alacaklı arttı)
 *        transactionType='alacak' → -amount (ödendi/iade)
 *
 * - recomputeAccountBalance(id): tek hesap, write
 * - recomputeAllBalances(): tüm aktif hesaplar, write
 * - checkBalanceInvariant(): READ-ONLY drift raporu (cache vs gerçek)
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export interface BalanceDriftRow {
  accountId: number;
  accountCode: string | null;
  accountName: string;
  cachedBalance: number;
  computedBalance: number;
  diff: number;
  txCount: number;
}

async function computeFromTransactions(accountId: number): Promise<number> {
  const result = await db.execute<{ balance: string | null }>(sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN transaction_type = 'borc' THEN amount
        WHEN transaction_type = 'alacak' THEN -amount
        ELSE 0
      END
    ), 0)::text AS balance
    FROM cari_transactions
    WHERE account_id = ${accountId}
  `);
  return Number(result.rows[0]?.balance ?? 0);
}

export async function recomputeAccountBalance(accountId: number): Promise<{
  accountId: number;
  oldBalance: number;
  newBalance: number;
  diff: number;
}> {
  const before = await db.execute<{ current_balance: string | null }>(sql`
    SELECT current_balance FROM cari_accounts WHERE id = ${accountId} LIMIT 1
  `);
  if (before.rows.length === 0) {
    throw new Error(`Cari hesap bulunamadı: ${accountId}`);
  }
  const oldBalance = Number(before.rows[0].current_balance ?? 0);
  const newBalance = await computeFromTransactions(accountId);

  await db.execute(sql`
    UPDATE cari_accounts
    SET current_balance = ${newBalance.toFixed(2)},
        updated_at = NOW()
    WHERE id = ${accountId}
  `);

  return {
    accountId,
    oldBalance,
    newBalance,
    diff: Number((newBalance - oldBalance).toFixed(2)),
  };
}

export async function recomputeAllBalances(options: { onlyActive?: boolean } = {}): Promise<{
  total: number;
  updated: number;
  unchanged: number;
  drifts: Array<{ accountId: number; oldBalance: number; newBalance: number; diff: number }>;
}> {
  const { onlyActive = true } = options;
  const accounts = await db.execute<{ id: number }>(sql`
    SELECT id FROM cari_accounts
    ${onlyActive ? sql`WHERE is_active = true` : sql``}
    ORDER BY id
  `);
  const ids = ((accounts.rows ?? []) as unknown as Array<{ id: number }>).map((r) => r.id);

  const drifts: Array<{ accountId: number; oldBalance: number; newBalance: number; diff: number }> = [];
  let updated = 0;
  let unchanged = 0;

  for (const id of ids) {
    const result = await recomputeAccountBalance(id);
    if (Math.abs(result.diff) >= 0.01) {
      drifts.push(result);
      updated++;
    } else {
      unchanged++;
    }
  }

  return { total: ids.length, updated, unchanged, drifts };
}

interface InvariantRow {
  account_id: number;
  account_code: string | null;
  account_name: string;
  cached: string | null;
  computed: string | null;
  tx_count: number;
}

export async function checkBalanceInvariant(): Promise<BalanceDriftRow[]> {
  const result = await db.execute<InvariantRow>(sql`
    SELECT
      a.id AS account_id,
      a.account_code,
      a.account_name,
      a.current_balance AS cached,
      COALESCE(SUM(
        CASE
          WHEN t.transaction_type = 'borc' THEN t.amount
          WHEN t.transaction_type = 'alacak' THEN -t.amount
          ELSE 0
        END
      ), 0)::text AS computed,
      COUNT(t.id)::int AS tx_count
    FROM cari_accounts a
    LEFT JOIN cari_transactions t ON t.account_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id, a.account_code, a.account_name, a.current_balance
    HAVING ABS(COALESCE(a.current_balance, 0) - COALESCE(SUM(
      CASE
        WHEN t.transaction_type = 'borc' THEN t.amount
        WHEN t.transaction_type = 'alacak' THEN -t.amount
        ELSE 0
      END
    ), 0)) >= 0.01
    ORDER BY a.id
  `);

  const rows = (result.rows ?? []) as unknown as InvariantRow[];
  return rows.map((r) => {
    const cached = Number(r.cached ?? 0);
    const computed = Number(r.computed ?? 0);
    return {
      accountId: r.account_id,
      accountCode: r.account_code,
      accountName: r.account_name,
      cachedBalance: cached,
      computedBalance: computed,
      diff: Number((computed - cached).toFixed(2)),
      txCount: Number(r.tx_count ?? 0),
    };
  });
}
