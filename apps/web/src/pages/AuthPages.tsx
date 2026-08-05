import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSession, AuthUser } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{ user: AuthUser; accessToken: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      setSession(data.accessToken, {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        emailVerified: data.user.emailVerified,
      });
      if (data.user.role === 'admin' || data.user.role === 'mod') {
        navigate('/admin');
      } else if (data.user.role === 'booster') {
        navigate('/booster');
      } else {
        navigate('/app');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl text-accent">Log in</h1>
      <form onSubmit={onSubmit} className="card-panel mt-6 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <label className="block text-sm">
          Email
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        No account?{' '}
        <Link to="/register" className="text-accent hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'booster'>('client');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{ user: AuthUser; accessToken: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ username, email, password, role }),
        }
      );
      setSession(data.accessToken, {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        emailVerified: data.user.emailVerified,
      });
      navigate(role === 'booster' ? '/booster' : '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl text-accent">Create account</h1>
      <form onSubmit={onSubmit} className="card-panel mt-6 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <label className="block text-sm">
          Username
          <input
            className="input mt-1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            className="input mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password (12+ chars, mixed case, number, symbol)
          <input
            className="input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
          />
        </label>
        <label className="block text-sm">
          I am a
          <select
            className="input mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value as 'client' | 'booster')}
          >
            <option value="client">Client</option>
            <option value="booster">Booster</option>
          </select>
        </label>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export function VerifyEmailPage() {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  async function verify() {
    try {
      await api('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setMessage('Email verified. You can place orders.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl text-accent">Verify email</h1>
      <div className="card-panel mt-6 space-y-3">
        <input
          className="input"
          placeholder="Verification token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="btn-primary" onClick={verify}>
          Verify
        </button>
        {message && <p className="text-sm text-slate-300">{message}</p>}
      </div>
    </div>
  );
}
