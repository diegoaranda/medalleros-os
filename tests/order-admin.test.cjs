/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node test harness for the existing TypeScript modules. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { spawnSync, spawn } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const ts = require('typescript')
const Module = require('node:module')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest)
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { calculateFinanceMetrics, calculateReportMetrics } = require('../lib/finance/metrics.ts')
const { needsFinancialConfirmation } = require('../app/orders/admin/types.ts')
const range = { from: new Date('2026-11-01'), to: new Date('2026-12-01') }
const order = { id: 'test', status: 'produccion', created_at: '2026-11-20', total_amount: 400, paid_amount: 150, balance_amount: 250, production_cost: 70, production_expense: 30 }
const payment = { order_id: 'test', amount: 150, paid_at: '2026-11-21' }
const expense = { amount: 25, expense_date: '2026-11-21' }

test('cancellation keeps collections, removes projected sales/balance, preserves independent expenses', () => {
  const cancelled = { ...order, status: 'cancelado' }
  for (const calculate of [calculateFinanceMetrics, calculateReportMetrics]) {
    const before = calculate([order], [payment], [expense], range, 10)
    const after = calculate([cancelled], [payment], [expense], range, 10)
    assert.equal(before.sold, 400)
    assert.equal(before.pending, 250)
    assert.equal(before.grossProfit, 300)
    assert.equal(after.sold, 0)
    assert.equal(after.pending, 0)
    assert.equal(after.collected, 150)
    assert.equal(after.grossProfit, 0)
  }
  const report = calculateReportMetrics([cancelled], [payment], [expense], range, 10)
  assert.equal(report.cancelledOrders, 1)
  assert.equal(report.pendingOrders, 0)
  assert.equal(report.actualExpenses, 25)
})
test('deletion removes collections and balances while preserving independent expenses', () => {
  const result = calculateFinanceMetrics([], [], [expense], range, 10)
  assert.equal(result.collected, 0)
  assert.equal(result.pending, 0)
  assert.equal(result.expenses, 25)
})
test('undo delivery changes counters and preserves financial formulas', () => {
  const delivered = calculateReportMetrics([{ ...order, status: 'entregado' }], [payment], [], range, 10)
  const undone = calculateReportMetrics([{ ...order, status: 'listo' }], [payment], [], range, 10)
  assert.equal(undone.deliveredOrders, 0)
  assert.equal(undone.pendingOrders, 1)
  for (const key of ['sold', 'collected', 'pending', 'productionCosts', 'productionExpenses', 'grossProfit', 'reserveAmount', 'netProfit']) assert.equal(undone[key], delivered[key])
})
test('extra confirmation covers payments, Eugenio cost and production expenses independently', () => {
  const empty = { order: { production_cost: null, production_expense: 0 }, payments: [] }
  assert.equal(needsFinancialConfirmation(empty), false)
  assert.equal(needsFinancialConfirmation({ ...empty, payments: [{ amount: 1 }] }), true)
  assert.equal(needsFinancialConfirmation({ ...empty, order: { ...empty.order, production_cost: 1 } }), true)
  assert.equal(needsFinancialConfirmation({ ...empty, order: { ...empty.order, production_cost: 0 } }), true)
  assert.equal(needsFinancialConfirmation({ ...empty, order: { ...empty.order, production_expense: 30 } }), true)
})

test('real PostgreSQL transaction, cascades, revisions, financial views and RLS with disposable fixtures', async () => {
  // Hardcoded loopback and dedicated test port. Never reads .env or connects to Supabase.
  const db = `medalleros_admin_test_${process.pid}`
  const connection = ['-X', '-tA', '-h', '127.0.0.1', '-p', '55439', '-U', process.env.USER || 'diego', '-v', 'ON_ERROR_STOP=1']
  function psql(database, sql) {
    const result = spawnSync('psql', [...connection, '-d', database], { input: sql, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    return result.stdout
  }
  psql('postgres', `create database ${db};`)
  try {
    const bootstrap = `
      do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
    `
    psql(db, bootstrap + readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8')
      + readFileSync(path.join(root, 'supabase/migrations/20261126000100_order_admin_corrections.sql'), 'utf8')
      + readFileSync(path.join(__dirname, 'order-admin.sql'), 'utf8'))
    const actor = "set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001'; set role authenticated;"
    const id = '10000000-0000-4000-8000-000000000003'
    const revision = psql(db, actor + `select public.get_order_admin_snapshot('${id}')->>'revision';`).match(/[0-9a-f]{32}/)[0]
    function concurrent(sql) {
      return new Promise((resolve, reject) => {
        const child = spawn('psql', [...connection, '-d', db], { timeout: 15000 })
        let stderr = ''
        child.stderr.on('data', chunk => { stderr += chunk })
        child.stdout.resume()
        child.on('error', reject)
        child.on('close', status => resolve({ status, stderr }))
        child.stdin.end(sql)
      })
    }
    const sql = actor + `select public.apply_order_admin_action('${id}','delete','${revision}',true);`
    const results = await Promise.all([concurrent(sql), concurrent(sql)])
    assert.equal(results.filter(result => result.status === 0).length, 1, JSON.stringify(results))
    assert.match(results.find(result => result.status !== 0).stderr, /Order not found/)
    assert.equal(psql(db, `select count(*) from public.order_admin_events where order_id='${id}';`).trim(), '0')
    assert.equal(psql(db, `select count(*) from public.order_payments where order_id='${id}';`).trim(), '0')
    assert.equal(psql(db, 'select count(*) from public.expenses;').trim(), '1')

  } finally {
    psql('postgres', `drop database ${db} with (force);`)
  }
})

function loadAdminActions(client, revalidated) {
  const originalLoad = Module._load
  const filename = path.join(root, 'app/orders/admin/actions.ts')
  delete require.cache[filename]
  Module._load = function (request, parent, isMain) {
    if (request === 'next/cache') return { revalidatePath: (value) => revalidated.push(value) }
    if (request === '@/lib/supabase/server') return { createClient: async () => client }
    return originalLoad.call(this, request, parent, isMain)
  }
  try { return require(filename) } finally { Module._load = originalLoad }
}
function mockOperator({ user = { id: 'operator' }, profile = { id: 'operator' }, rpcError = null } = {}) {
  const calls = []
  return {
    calls,
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) }),
    rpc: async (...args) => { calls.push(args); return { data: 'test-order', error: rpcError } },
  }
}
test('server rejects missing session/profile before issuing any administrative RPC', async () => {
  for (const options of [{ user: null }, { profile: null }]) {
    const client = mockOperator(options)
    const actions = loadAdminActions(client, [])
    assert.equal((await actions.getOrderAdminSnapshot('test-order')).ok, false)
    assert.equal((await actions.applyOrderAdminAction('test-order', 'delete', 'revision', true)).ok, false)
    assert.equal(client.calls.length, 0)
  }
})
test('server rejects invalid requests and revalidates all six requested surfaces after success', async () => {
  const client = mockOperator()
  const paths = []
  const actions = loadAdminActions(client, paths)
  assert.equal((await actions.applyOrderAdminAction('test-order', 'invalid', 'revision', false)).ok, false)
  assert.equal(client.calls.length, 0)
  assert.equal((await actions.applyOrderAdminAction('test-order', 'undo_delivery', 'revision', false)).ok, true)
  assert.deepEqual(client.calls[0], ['apply_order_admin_action', { p_order_id: 'test-order', p_action: 'undo_delivery', p_expected_revision: 'revision', p_financial_confirmation: false }])
  assert.deepEqual(paths, ['/dashboard', '/orders', '/production', '/deliveries', '/finances', '/reports'])
})
test('missing migration and stale snapshots produce useful errors without reporting success', async () => {
  for (const code of ['PGRST202', '40001', '42501']) {
    const client = mockOperator({ rpcError: { code } })
    const paths = []
    const actions = loadAdminActions(client, paths)
    const result = await actions.applyOrderAdminAction('test-order', 'delete', 'revision', true)
    assert.equal(result.ok, false)
    assert.equal(paths.length, 0)
    if (code === 'PGRST202') assert.match(result.error, /migración pendiente/)
    if (code === '40001') assert.match(result.error, /cambiaron/)
    if (code === '42501') assert.match(result.error, /permisos/)
  }
})
