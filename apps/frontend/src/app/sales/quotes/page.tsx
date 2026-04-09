import type { Metadata } from 'next';
import { QuotesPage } from '@/components/sales/QuotesPage';

export const metadata: Metadata = { title: 'Devis' };

export default function Page() {
  return <QuotesPage />;
}
