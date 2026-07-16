import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { DEMO_CREDENTIALS, validateCredentials, writeSession } from '@/lib/auth';

export const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = validateCredentials(username, password);
    if (!user) {
      setError('Username atau password salah.');
      return;
    }
    writeSession(user);
    setError('');
    onLogin?.(user);
  };

  return (
    <div className="min-h-screen bg-pg-surface-soft flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-pg-border rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 bg-pg-critical rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-pg-text-main tracking-tight">
              PipelineGuard
            </h1>
            <p className="text-sm text-pg-text-soft">Masuk untuk memantau risiko pipa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="block text-xs font-semibold text-pg-text-soft mb-1.5">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-pg-border rounded-xl bg-pg-surface-soft focus:outline-none focus:ring-2 focus:ring-pg-accent/30 focus:border-pg-accent"
              placeholder="Username"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-pg-text-soft mb-1.5">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-pg-border rounded-xl bg-pg-surface-soft focus:outline-none focus:ring-2 focus:ring-pg-accent/30 focus:border-pg-accent"
              placeholder="Password"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-pg-critical" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-pg-text-main hover:bg-[#1a3a5c] transition-colors"
          >
            Masuk
          </button>
        </form>

        <p className="mt-6 text-xs text-pg-text-soft leading-relaxed text-center">
          Demo prototype — username{' '}
          <strong className="text-pg-text-main font-mono">{DEMO_CREDENTIALS.username}</strong>
          {' · '}
          password{' '}
          <strong className="text-pg-text-main font-mono">{DEMO_CREDENTIALS.password}</strong>
        </p>
      </div>
    </div>
  );
};
