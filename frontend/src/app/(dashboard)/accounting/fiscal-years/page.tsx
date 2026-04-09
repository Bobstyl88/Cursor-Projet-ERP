'use client';

import React, { useState } from 'react';
import { Plus, Calendar, Lock, Unlock } from 'lucide-react';
import { Button, Badge, Card, Modal } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface FiscalYearItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

const mockFiscalYears: FiscalYearItem[] = [
  { id: '1', name: 'FY 2024', startDate: '2024-01-01', endDate: '2024-12-31', isClosed: false },
  { id: '2', name: 'FY 2023', startDate: '2023-01-01', endDate: '2023-12-31', isClosed: true },
  { id: '3', name: 'FY 2022', startDate: '2022-01-01', endDate: '2022-12-31', isClosed: true },
  { id: '4', name: 'FY 2021', startDate: '2021-01-01', endDate: '2021-12-31', isClosed: true },
];

export default function FiscalYearsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Fiscal Years</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage accounting periods</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Fiscal Year
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockFiscalYears.map((fy) => (
          <Card key={fy.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${fy.isClosed ? 'bg-secondary-100' : 'bg-primary-50'}`}>
                  <Calendar className={`h-5 w-5 ${fy.isClosed ? 'text-secondary-500' : 'text-primary-600'}`} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-secondary-900">{fy.name}</h3>
                  <p className="text-sm text-secondary-500 mt-0.5">
                    {formatDate(fy.startDate)} — {formatDate(fy.endDate)}
                  </p>
                </div>
              </div>
              <Badge variant={fy.isClosed ? 'gray' : 'green'} dot>
                {fy.isClosed ? 'Closed' : 'Open'}
              </Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-secondary-500">
                {fy.isClosed ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Books closed</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Currently active</span>
                  </>
                )}
              </div>
              {!fy.isClosed && (
                <Button variant="outline" size="sm">
                  Close Year
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Fiscal Year"
        description="Create a new accounting fiscal year period."
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Name</label>
            <input
              type="text"
              placeholder="e.g., FY 2025"
              className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">Start Date</label>
              <input
                type="date"
                className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">End Date</label>
              <input
                type="date"
                className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} type="button">
              Cancel
            </Button>
            <Button type="button" onClick={() => setShowCreateModal(false)}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
