import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-16">
      <p className="font-display text-4xl tracking-widest text-accent md:text-6xl">
        HardStuck
      </p>
      <h1 className="mt-4 max-w-xl text-2xl font-semibold text-slate-100 md:text-3xl">
        Verified boosters. Transparent pricing. Real ranks.
      </h1>
      <p className="mt-3 max-w-lg text-slate-400">
        League of Legends, Valorant, and Apex — Solo or Duo. Pay securely with
        Paymob (USD default, multi-currency).
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/order/new" className="btn-primary">
          Start an order
        </Link>
        <Link to="/register" className="btn-ghost">
          Create account
        </Link>
      </div>
    </section>
  );
}
