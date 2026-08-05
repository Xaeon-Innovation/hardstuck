import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getStoredUser } from '../lib/api';

type Game = { _id: string; name: string; code: string };
type Rank = { _id: string; name: string; division: number; rankOrder: number };
type Service = { _id: string; name: string; code: string; priceMultiplier: number };
type Quote = {
  totalPrice: number;
  currency: string;
  estimatedHours: number;
  platformCommission: number;
  boosterEarnings: number;
  startRankName: string;
  endRankName: string;
};

const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'USD';

export function NewOrderPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [games, setGames] = useState<Game[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [gameId, setGameId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startRankId, setStartRankId] = useState('');
  const [endRankId, setEndRankId] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ games: Game[] }>('/api/orders/catalog/games')
      .then((d) => setGames(d.games))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!gameId) return;
    Promise.all([
      api<{ ranks: Rank[] }>(`/api/orders/catalog/games/${gameId}/ranks`),
      api<{ services: Service[] }>(
        `/api/orders/catalog/games/${gameId}/services`
      ),
    ]).then(([r, s]) => {
      setRanks(r.ranks);
      setServices(s.services);
      setStartRankId('');
      setEndRankId('');
      setServiceId(s.services[0]?._id ?? '');
      setQuote(null);
    });
  }, [gameId]);

  async function fetchQuote() {
    if (!gameId || !serviceId || !startRankId || !endRankId) return;
    setError('');
    try {
      const data = await api<{ quote: Quote }>('/api/orders/quote', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          serviceId,
          startRankId,
          endRankId,
          currency,
        }),
      });
      setQuote(data.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quote failed');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { order } = await api<{ order: { _id: string } }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          serviceId,
          startRankId,
          endRankId,
          currency,
        }),
      });

      const pay = await api<{ checkoutUrl: string; orderId: string }>(
        `/api/orders/${order._id}/pay`,
        {
          method: 'POST',
          body: JSON.stringify({
            currency,
            phone: '0000000000',
            firstName: user.username,
            lastName: 'Client',
          }),
        }
      );

      // In stub mode, simulate success then redirect to complete page
      if (pay.checkoutUrl.includes('stub_cs_')) {
        await api(`/api/payments/paymob/simulate-success/${order._id}`, {
          method: 'POST',
        });
        navigate(`/payment/complete?orderId=${order._id}&stub=1`);
        return;
      }

      window.location.href = pay.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl text-accent">New boost order</h1>
      <p className="mt-1 text-sm text-slate-400">
        Select game, service, ranks — get a quote, then pay with Paymob.
      </p>

      <form onSubmit={onSubmit} className="card-panel mt-6 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <label className="block text-sm">
          Game
          <select
            className="input mt-1"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {games.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Service
          <select
            className="input mt-1"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.priceMultiplier}x)
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Current rank
            <select
              className="input mt-1"
              value={startRankId}
              onChange={(e) => setStartRankId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {ranks.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                  {r.division ? ` ${r.division}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Desired rank
            <select
              className="input mt-1"
              value={endRankId}
              onChange={(e) => setEndRankId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {ranks.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                  {r.division ? ` ${r.division}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          Currency
          <select
            className="input mt-1"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {['USD', 'EGP', 'AED', 'SAR', 'EUR', 'GBP'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={fetchQuote}
          >
            Get quote
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing…' : 'Pay with Paymob'}
          </button>
        </div>

        {quote && (
          <div className="rounded-md border border-accent/30 bg-ink-950/50 p-4 text-sm">
            <p className="font-semibold text-accent">
              {quote.totalPrice} {quote.currency}
            </p>
            <p className="text-slate-400">
              {quote.startRankName} → {quote.endRankName} · ~{quote.estimatedHours}h
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Platform {quote.platformCommission} · Booster {quote.boosterEarnings}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export function OrdersListPage() {
  const [orders, setOrders] = useState<
    Array<{
      _id: string;
      orderNumber: string;
      status: string;
      totalPrice: { $numberDecimal?: string } | string;
      currency: string;
      startRankName: string;
      endRankName: string;
    }>
  >([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ orders: typeof orders }>('/api/orders/mine')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  function price(p: { $numberDecimal?: string } | string) {
    if (typeof p === 'string') return p;
    return p?.$numberDecimal ?? String(p);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-accent">My orders</h1>
        <Link to="/order/new" className="btn-primary">
          New order
        </Link>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o._id} className="card-panel flex justify-between gap-4">
            <div>
              <Link
                to={`/app/orders/${o._id}`}
                className="font-medium text-slate-100 hover:text-accent"
              >
                {o.orderNumber}
              </Link>
              <p className="text-sm text-slate-400">
                {o.startRankName} → {o.endRankName}
              </p>
            </div>
            <div className="text-right text-sm">
              <p>
                {price(o.totalPrice)} {o.currency}
              </p>
              <p className="text-slate-500">{o.status}</p>
            </div>
          </li>
        ))}
        {!orders.length && !error && (
          <p className="text-slate-500">No orders yet.</p>
        )}
      </ul>
    </div>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ order: Record<string, unknown> }>(`/api/orders/${orderId}`)
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e.message));
  }, [orderId]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!order) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="card-panel max-w-xl">
      <h1 className="font-display text-xl text-accent">
        {String(order.orderNumber)}
      </h1>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Status</dt>
          <dd>{String(order.status)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Payment</dt>
          <dd>{String(order.paymentStatus)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Ranks</dt>
          <dd>
            {String(order.startRankName)} → {String(order.endRankName)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Total</dt>
          <dd>
            {String(
              (order.totalPrice as { $numberDecimal?: string })?.$numberDecimal ??
                order.totalPrice
            )}{' '}
            {String(order.currency)}
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-xs text-slate-500">
        Chat shell — Socket.io room <code>order:{orderId}</code> (Phase next)
      </p>
    </div>
  );
}

export function PaymentCompletePage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const stub = params.get('stub');

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl text-accent">Payment received</h1>
      <p className="mt-2 text-slate-400">
        {stub
          ? 'Dev stub: payment simulated successfully. Order is in queue.'
          : 'Paymob redirected you here. Final status comes from the HMAC webhook.'}
      </p>
      {orderId && (
        <Link to={`/app/orders/${orderId}`} className="btn-primary mt-6 inline-flex">
          View order
        </Link>
      )}
      <Link to="/app" className="btn-ghost mt-3 inline-flex">
        Dashboard
      </Link>
    </div>
  );
}
