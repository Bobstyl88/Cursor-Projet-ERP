'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function Header({ onMenuToggle, isCollapsed, onToggleCollapse }: HeaderProps) {
  const router = useRouter();
  const { user, tenant, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 bg-white border-b border-secondary-200 px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-4 ml-4">
        <div className="hidden md:flex items-center max-w-md flex-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {tenant && (
          <span className="hidden sm:block text-sm font-medium text-secondary-500 px-3 py-1 bg-secondary-50 rounded-md">
            {tenant.name}
          </span>
        )}

        <button className="relative p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-error-500 rounded-full" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary-100 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
              {user ? getInitials(user.firstName, user.lastName) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-secondary-900">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-secondary-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-secondary-200 shadow-lg py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-secondary-100">
                <p className="text-sm font-medium text-secondary-900">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-secondary-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings/users');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                >
                  <User className="h-4 w-4 text-secondary-400" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings/users');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-secondary-400" />
                  Settings
                </button>
              </div>
              <div className="border-t border-secondary-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export { Header };
