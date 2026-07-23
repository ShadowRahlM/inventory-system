import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api';

export function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(username, password);
      navigate('/login');
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('; ');
          setError(messages);
        } else {
          setError(String(data));
        }
      } else {
        setError('Registration failed. Please try again.');
      }
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
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Register to access the inventory system</p>
        </div>

        <form onSubmit={handleRegister} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="register-username" className="block text-sm font-medium mb-1">Username</label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Choose a username"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Create a password"
              required
              minLength={4}
            />
          </div>
          <div>
            <label htmlFor="register-confirm" className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              id="register-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Confirm your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
