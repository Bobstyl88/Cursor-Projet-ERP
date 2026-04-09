'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, Send, ArrowLeft } from 'lucide-react';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardFooter } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be positive'),
  discount: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

const quotationSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  date: z.string().min(1, 'Date is required'),
  validUntil: z.string().min(1, 'Valid until date is required'),
  currencyCode: z.string().default('USD'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lines: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

type QuotationForm = z.infer<typeof quotationSchema>;

const mockCustomers = [
  { value: '1', label: 'Acme Corp' },
  { value: '2', label: 'TechStart Inc' },
  { value: '3', label: 'Global Trade Co' },
  { value: '4', label: 'Innovation Labs' },
  { value: '5', label: 'Summit Industries' },
];

const mockProducts = [
  { value: '1', label: 'Widget Pro X1', price: 299.99 },
  { value: '2', label: 'Enterprise License', price: 1999.99 },
  { value: '3', label: 'Consulting Hour', price: 150.00 },
  { value: '4', label: 'Support Package', price: 499.99 },
  { value: '5', label: 'Custom Development', price: 2500.00 },
];

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

export default function NewQuotationPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuotationForm>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      validUntil: '',
      currencyCode: 'USD',
      notes: '',
      terms: '',
      lines: [
        {
          productId: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxRate: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchedLines = watch('lines');

  const calculateLineTotal = (index: number) => {
    const line = watchedLines?.[index];
    if (!line) return 0;
    const subtotal = line.quantity * line.unitPrice;
    const discountAmount = subtotal * (line.discount / 100);
    return subtotal - discountAmount;
  };

  const subtotal = watchedLines?.reduce(
    (acc, _, index) => acc + calculateLineTotal(index),
    0
  ) ?? 0;

  const taxAmount = watchedLines?.reduce((acc, line, index) => {
    const lineTotal = calculateLineTotal(index);
    return acc + lineTotal * ((line?.taxRate ?? 0) / 100);
  }, 0) ?? 0;

  const total = subtotal + taxAmount;

  const handleProductChange = (index: number, productId: string) => {
    const product = mockProducts.find((p) => p.value === productId);
    if (product) {
      setValue(`lines.${index}.description`, product.label);
      setValue(`lines.${index}.unitPrice`, product.price);
    }
  };

  const onSubmit = async (data: QuotationForm) => {
    setIsSaving(true);
    try {
      console.log('Creating quotation:', data);
      router.push('/sales/quotations');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">New Quotation</h1>
          <p className="text-sm text-secondary-500 mt-1">Create a new sales quotation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Info */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Customer"
              options={mockCustomers}
              placeholder="Select customer"
              error={errors.customerId?.message}
              {...register('customerId')}
            />
            <Input
              label="Date"
              type="date"
              error={errors.date?.message}
              {...register('date')}
            />
            <Input
              label="Valid Until"
              type="date"
              error={errors.validUntil?.message}
              {...register('validUntil')}
            />
            <Select
              label="Currency"
              options={currencies}
              error={errors.currencyCode?.message}
              {...register('currencyCode')}
            />
          </div>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>

          {errors.lines?.message && (
            <p className="text-sm text-error-600 mb-4">{errors.lines.message}</p>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-secondary-200">
                  <th className="pb-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider w-44">Product</th>
                  <th className="pb-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Description</th>
                  <th className="pb-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider w-24">Qty</th>
                  <th className="pb-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider w-32">Unit Price</th>
                  <th className="pb-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider w-24">Disc %</th>
                  <th className="pb-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider w-24">Tax %</th>
                  <th className="pb-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider w-32">Subtotal</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="py-3 pr-2">
                      <select
                        className="w-full text-sm border border-secondary-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...register(`lines.${index}.productId`)}
                        onChange={(e) => {
                          register(`lines.${index}.productId`).onChange(e);
                          handleProductChange(index, e.target.value);
                        }}
                      >
                        <option value="">Select...</option>
                        {mockProducts.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        className="w-full text-sm border border-secondary-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...register(`lines.${index}.description`)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-sm text-right border border-secondary-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...register(`lines.${index}.quantity`)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-sm text-right border border-secondary-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...register(`lines.${index}.unitPrice`)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-sm text-right border border-secondary-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...register(`lines.${index}.discount`)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-sm text-right border border-secondary-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...register(`lines.${index}.taxRate`)}
                      />
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium text-secondary-900">
                      {formatCurrency(calculateLineTotal(index))}
                    </td>
                    <td className="py-3 pl-2">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 rounded-md text-secondary-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() =>
                append({
                  productId: '',
                  description: '',
                  quantity: 1,
                  unitPrice: 0,
                  discount: 0,
                  taxRate: 0,
                })
              }
            >
              Add Line Item
            </Button>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Subtotal</span>
                <span className="font-medium text-secondary-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Tax</span>
                <span className="font-medium text-secondary-900">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-secondary-200">
                <span className="font-semibold text-secondary-900">Total</span>
                <span className="font-bold text-secondary-900">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes & Terms */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                Notes
              </label>
              <textarea
                rows={4}
                className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                placeholder="Additional notes for the customer..."
                {...register('notes')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                Terms & Conditions
              </label>
              <textarea
                rows={4}
                className="w-full text-sm border border-secondary-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                placeholder="Payment terms, delivery conditions..."
                {...register('terms')}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save as Draft
          </Button>
          <Button
            type="submit"
            leftIcon={<Send className="h-4 w-4" />}
            isLoading={isSaving}
          >
            Save & Send
          </Button>
        </div>
      </form>
    </div>
  );
}
