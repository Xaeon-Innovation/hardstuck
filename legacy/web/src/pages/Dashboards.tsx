import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function ClientDashboard() {
  return (
    <div>
      <h1 className="font-display text-xl text-accent">Client dashboard</h1>
      <p className="mt-2 text-slate-400">
        Track orders, chat with your booster, and manage your account.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-panel">
          <h2 className="font-semibold">Quick order</h2>
          <p className="mt-1 text-sm text-slate-400">
            Start a Solo or Duo boost for LoL, Valorant, or Apex.
          </p>
          <a href="/order/new" className="btn-primary mt-4 inline-flex">
            New order
          </a>
        </div>
        <div className="card-panel">
          <h2 className="font-semibold">Support</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ticket portal shell — see TASKS.md.
          </p>
        </div>
      </div>
    </div>
  );
}

export function BoosterDashboard() {
  const [queue, setQueue] = useState<unknown[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ queue: unknown[] }>('/api/orders/queue/waiting')
      .then((d) => setQueue(d.queue))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-xl text-accent">Booster dashboard</h1>
      <p className="mt-2 text-slate-400">
        Earnings, queue, and verification status (shell).
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-panel">
          <p className="text-xs text-slate-500">This month</p>
          <p className="text-2xl font-semibold">$0</p>
        </div>
        <div className="card-panel">
          <p className="text-xs text-slate-500">Rating</p>
          <p className="text-2xl font-semibold">—</p>
        </div>
        <div className="card-panel">
          <p className="text-xs text-slate-500">Verification</p>
          <p className="text-2xl font-semibold">pending</p>
        </div>
      </div>
      <h2 className="mt-8 font-semibold">Order queue</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ul className="mt-3 space-y-2">
        {queue.map((q, i) => (
          <li key={i} className="card-panel text-sm text-slate-300">
            {JSON.stringify(q).slice(0, 120)}…
          </li>
        ))}
        {!queue.length && !error && (
          <p className="text-slate-500">No waiting orders.</p>
        )}
      </ul>
    </div>
  );
}

export function AdminOverview() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ kpis: Record<string, unknown> }>('/api/admin/overview')
      .then((d) => setKpis(d.kpis))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-xl text-accent">Admin overview</h1>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-panel">
          <p className="text-xs text-slate-500">Clients</p>
          <p className="text-2xl font-semibold">
            {String(kpis?.clients ?? '—')}
          </p>
        </div>
        <div className="card-panel">
          <p className="text-xs text-slate-500">Boosters</p>
          <p className="text-2xl font-semibold">
            {String(kpis?.boosters ?? '—')}
          </p>
        </div>
        <div className="card-panel">
          <p className="text-xs text-slate-500">Active orders</p>
          <p className="text-2xl font-semibold">
            {String(kpis?.activeOrders ?? '—')}
          </p>
        </div>
      </div>
      {kpis?.revenueByCurrency != null && (
        <pre className="card-panel mt-6 overflow-auto text-xs text-slate-400">
          {JSON.stringify(kpis.revenueByCurrency, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<unknown[]>([]);
  useEffect(() => {
    api<{ users: unknown[] }>('/api/admin/users').then((d) => setUsers(d.users));
  }, []);
  return (
    <div>
      <h1 className="font-display text-xl text-accent">Users</h1>
      <ul className="mt-4 space-y-2">
        {users.map((u, i) => (
          <li key={i} className="card-panel text-sm">
            {JSON.stringify(u)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState<unknown[]>([]);
  useEffect(() => {
    api<{ orders: unknown[] }>('/api/admin/orders').then((d) =>
      setOrders(d.orders)
    );
  }, []);
  return (
    <div>
      <h1 className="font-display text-xl text-accent">Orders</h1>
      <ul className="mt-4 space-y-2">
        {orders.map((o, i) => (
          <li key={i} className="card-panel text-sm">
            {JSON.stringify(o).slice(0, 200)}…
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminPayments() {
  const [payments, setPayments] = useState<unknown[]>([]);
  useEffect(() => {
    api<{ payments: unknown[] }>('/api/admin/payments').then((d) =>
      setPayments(d.payments)
    );
  }, []);
  return (
    <div>
      <h1 className="font-display text-xl text-accent">Payments (Paymob)</h1>
      <ul className="mt-4 space-y-2">
        {payments.map((p, i) => (
          <li key={i} className="card-panel text-sm">
            {JSON.stringify(p).slice(0, 200)}…
          </li>
        ))}
      </ul>
    </div>
  );
}
