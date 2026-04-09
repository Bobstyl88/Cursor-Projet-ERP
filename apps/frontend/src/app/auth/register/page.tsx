'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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
          Create your ERP account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Start managing your business in minutes
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Company Name
              </label>
              <input
                type="text"
                required
                className="input mt-2"
                placeholder="ACME Corporation"
                value={form.companyName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    companyName: e.target.value,
                    companySlug: generateSlug(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Company ID (URL)
              </label>
              <input
                type="text"
                required
                className="input mt-2"
                placeholder="acme-corp"
                value={form.companySlug}
                onChange={(e) => setForm({ ...form, companySlug: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Used for login. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  className="input mt-2"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  className="input mt-2"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Email
              </label>
              <input
                type="email"
                required
                className="input mt-2"
                placeholder="admin@acme.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="input mt-2"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
