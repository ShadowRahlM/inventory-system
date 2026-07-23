import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { initSession, getRedirectPath, clearRedirectPath } from '../lib/useSessionTimeout';

export function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(username, password);
      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      initSession();
      try {
        const userInfo = await authAPI.me();
        setAuth(true, userInfo);
      } catch {
        setAuth(true, { username, role: 'viewer' });
      }
      const redirect = getRedirectPath();
      clearRedirectPath();
      navigate(redirect || '/', { replace: true });
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-background">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-2xl font-bold text-primary-foreground">I</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory System</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage your inventory</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter your username"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
