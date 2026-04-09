'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LogOut, Bell, Search } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, tenant, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="input pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{tenant?.name}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
