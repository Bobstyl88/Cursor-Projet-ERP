'use client';

import React, { useState } from 'react';
import { Plus, Shield, Users, Edit2, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, Modal } from '@/components/ui';

interface RoleItem {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: string[];
  isSystem: boolean;
}

const mockRoles: RoleItem[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access with all permissions',
    usersCount: 1,
    permissions: ['all'],
    isSystem: true,
  },
  {
    id: '2',
    name: 'Manager',
    description: 'Can manage sales, inventory, and view reports',
    usersCount: 2,
    permissions: ['sales:manage', 'inventory:manage', 'reports:view', 'invoicing:manage'],
    isSystem: false,
  },
  {
    id: '3',
    name: 'Accountant',
    description: 'Access to accounting, invoicing, and financial reports',
    usersCount: 1,
    permissions: ['accounting:manage', 'invoicing:manage', 'reports:view'],
    isSystem: false,
  },
  {
    id: '4',
    name: 'Sales Rep',
    description: 'Can create quotations and manage sales orders',
    usersCount: 3,
    permissions: ['sales:manage', 'inventory:view'],
    isSystem: false,
  },
  {
    id: '5',
    name: 'Warehouse',
    description: 'Manage inventory, stock levels, and warehouse operations',
    usersCount: 2,
    permissions: ['inventory:manage'],
    isSystem: false,
  },
  {
    id: '6',
    name: 'Viewer',
    description: 'Read-only access to all modules',
    usersCount: 0,
    permissions: ['sales:view', 'inventory:view', 'invoicing:view', 'accounting:view', 'reports:view'],
    isSystem: true,
  },
];

const allPermissions = [
  { group: 'Sales', items: ['sales:view', 'sales:manage'] },
  { group: 'Purchasing', items: ['purchasing:view', 'purchasing:manage'] },
  { group: 'Inventory', items: ['inventory:view', 'inventory:manage'] },
  { group: 'Invoicing', items: ['invoicing:view', 'invoicing:manage'] },
  { group: 'Accounting', items: ['accounting:view', 'accounting:manage'] },
  { group: 'Reports', items: ['reports:view'] },
  { group: 'Settings', items: ['settings:view', 'settings:manage'] },
];

export default function RolesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage access control and user roles</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockRoles.map((role) => (
          <Card key={role.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary-50">
                  <Shield className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-secondary-900">{role.name}</h3>
                    {role.isSystem && (
                      <Badge variant="blue">System</Badge>
                    )}
                  </div>
                  <p className="text-sm text-secondary-500 mt-0.5">{role.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-secondary-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-secondary-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{role.usersCount} user{role.usersCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-400">
                    {role.permissions.includes('all')
                      ? 'All permissions'
                      : `${role.permissions.length} permission${role.permissions.length !== 1 ? 's' : ''}`}
                  </span>
                  {!role.isSystem && (
                    <button className="p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Role"
        description="Define a new role with specific permissions."
        size="lg"
      >
        <form className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Role Name</label>
              <input
                type="text"
                placeholder="e.g., Sales Manager"
                className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Description</label>
              <textarea
                rows={2}
                placeholder="Describe what this role can do..."
                className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary-900 mb-3">Permissions</h4>
            <div className="space-y-4">
              {allPermissions.map((group) => (
                <div key={group.group} className="border border-secondary-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-secondary-700 mb-2">{group.group}</h5>
                  <div className="flex flex-wrap gap-3">
                    {group.items.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-secondary-600">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} type="button">
              Cancel
            </Button>
            <Button type="button" onClick={() => setShowCreateModal(false)}>
              Create Role
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
