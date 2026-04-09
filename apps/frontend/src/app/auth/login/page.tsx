'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    tenantSlug: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password, form.tenantSlug);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="tenantSlug" className="block text-sm font-medium leading-6 text-gray-900">
                Company ID
              </label>
              <input
                id="tenantSlug"
                type="text"
                required
                className="input mt-2"
                placeholder="acme-corp"
                value={form.tenantSlug}
                onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input mt-2"
                placeholder="admin@acme.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="input mt-2"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold text-primary-600 hover:text-primary-500">
              Register your company
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
