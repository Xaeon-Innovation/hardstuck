import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser } from '../lib/api';

export function PublicLayout() {
  const user = getStoredUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-xl tracking-wide text-accent">
            HardStuck
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <NavLink to="/order/new" className="text-slate-300 hover:text-accent">
              Order boost
            </NavLink>
            {user ? (
              <>
                <NavLink to="/app" className="text-slate-300 hover:text-accent">
                  Dashboard
                </NavLink>
                {user.role === 'booster' && (
                  <NavLink to="/booster" className="text-slate-300 hover:text-accent">
                    Booster
                  </NavLink>
                )}
                {(user.role === 'admin' || user.role === 'mod') && (
                  <NavLink to="/admin" className="text-slate-300 hover:text-accent">
                    Admin
                  </NavLink>
                )}
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn-ghost">
                  Log in
                </NavLink>
                <NavLink to="/register" className="btn-primary">
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function AppShell({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string }>;
}) {
  const navigate = useNavigate();
  const user = getStoredUser();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-ink-800 lg:border-b-0 lg:border-r">
        <div className="p-4">
          <Link to="/" className="font-display text-lg text-accent">
            HardStuck
          </Link>
          <p className="mt-1 text-xs text-slate-500">{title}</p>
        </div>
        <nav className="flex flex-wrap gap-1 px-2 pb-4 lg:flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-ink-800 text-accent'
                    : 'text-slate-300 hover:bg-ink-900'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-ink-800 p-4 text-xs text-slate-500 lg:block">
          <p>{user?.email}</p>
          <button
            className="mt-2 text-warn hover:underline"
            onClick={() => {
              clearSession();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
