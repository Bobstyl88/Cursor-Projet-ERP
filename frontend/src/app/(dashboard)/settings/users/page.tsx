'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal, Mail, Shield } from 'lucide-react';
import { Button, Badge, Card, DataTable, Modal, Input, Select } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import { formatDate } from '@/lib/utils';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

const mockUsers: UserRow[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@company.com', role: 'Admin', isActive: true, lastLogin: '2024-12-15T10:30:00Z', createdAt: '2024-01-15' },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@company.com', role: 'Manager', isActive: true, lastLogin: '2024-12-14T16:45:00Z', createdAt: '2024-02-20' },
  { id: '3', firstName: 'Bob', lastName: 'Johnson', email: 'bob@company.com', role: 'Accountant', isActive: true, lastLogin: '2024-12-13T09:15:00Z', createdAt: '2024-03-10' },
  { id: '4', firstName: 'Alice', lastName: 'Williams', email: 'alice@company.com', role: 'Sales Rep', isActive: false, lastLogin: '2024-11-20T14:00:00Z', createdAt: '2024-04-05' },
  { id: '5', firstName: 'Charlie', lastName: 'Brown', email: 'charlie@company.com', role: 'Warehouse', isActive: true, lastLogin: '2024-12-15T08:00:00Z', createdAt: '2024-05-12' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const filteredData = mockUsers.filter((u) =>
    !search ||
    u.firstName.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold">
            {row.firstName.charAt(0)}{row.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-secondary-900">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-secondary-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-secondary-400" />
          <span className="text-sm text-secondary-700">{row.role}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'green' : 'gray'} dot>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-secondary-500">
          {formatDate(row.lastLogin, 'MMM dd, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: () => (
        <button className="p-1.5 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Users</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage user accounts and access</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowInviteModal(true)}
        >
          Invite User
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          keyExtractor={(row) => row.id}
          page={1}
          totalPages={1}
          total={filteredData.length}
        />
      </Card>

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite User"
        description="Send an invitation to join your organization."
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" placeholder="John" />
            <Input label="Last Name" placeholder="Doe" />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="user@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
          />
          <Select
            label="Role"
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'accountant', label: 'Accountant' },
              { value: 'sales', label: 'Sales Rep' },
              { value: 'warehouse', label: 'Warehouse' },
              { value: 'viewer', label: 'Viewer' },
            ]}
            placeholder="Select a role"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowInviteModal(false)} type="button">
              Cancel
            </Button>
            <Button type="button" leftIcon={<Mail className="h-4 w-4" />} onClick={() => setShowInviteModal(false)}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
