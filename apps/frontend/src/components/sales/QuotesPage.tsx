'use client';

import { useState } from 'react';
import { useQuotes, useConvertQuote } from '@/hooks/useSales';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Plus, RefreshCw, ArrowRightCircle } from 'lucide-react';
import type { Quote } from '@/types/api';

export function QuotesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data: quotes, isLoading, refetch } = useQuotes(statusFilter);
  const convertMutation = useConvertQuote();

  const statuses = ['draft', 'sent', 'accepted', 'declined', 'expired', 'converted'];

  const handleConvert = async (id: string) => {
    if (!confirm('Convertir ce devis en commande ?')) return;
    await convertMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {quotes?.length ?? 0} devis au total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            !statusFilter
              ? 'bg-brand-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Tous
        </button>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        ) : !quotes?.length ? (
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-400 dark:text-gray-500">Aucun devis trouvé</p>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N°</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant TTC</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Émis le</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expire le</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {quotes.map((quote: Quote) => (
                  <tr key={quote._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-sm text-gray-900 dark:text-white font-medium">
                        {quote.number}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {typeof quote.customerId === 'object' ? quote.customerId.name : quote.customerId}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(quote.grandTotal, quote.currency)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(quote.issueDate)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(quote.expiryDate)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {quote.status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={convertMutation.isPending}
                          onClick={() => handleConvert(quote._id)}
                        >
                          <ArrowRightCircle className="h-3.5 w-3.5" />
                          Convertir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
