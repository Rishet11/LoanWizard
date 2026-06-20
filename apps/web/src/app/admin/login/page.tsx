'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setError('Invalid password');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--color-bg)">
      <div className="bg-(--color-surface) rounded-[var(--radius-xl)] border border-(--color-muted)/10 p-8 w-full max-w-sm shadow-lg">
        <h1 className="text-xl font-bold text-(--color-fg) mb-6">Admin login</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-(--color-fg) mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-(--color-muted)/20 rounded-[var(--radius-md)] bg-(--color-bg) text-(--color-fg) focus:outline-none focus:border-(--color-brand)"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-(--color-danger)">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Sign in</Button>
        </form>
        <p className="text-xs text-(--color-muted) mt-4 text-center">Use the password configured for this demo.</p>
      </div>
    </div>
  );
}
