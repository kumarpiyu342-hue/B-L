import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Download, FileText, Filter, Search, Slash } from 'lucide-react';
import { markBillPaid, voidBill } from '../services/shopService';
import { Bill, PaymentMode, Shop } from '../types/shop';
import { exportBillsCsv } from '../utils/csvAndBackup';

interface BillsLedgerViewProps {
  shop: Shop;
  bills: Bill[];
  onOpenReceipt: (bill: Bill) => void;
  onNewBill: () => void;
}

export const BillsLedgerView: React.FC<BillsLedgerViewProps> = ({
  shop,
  bills,
  onOpenReceipt,
  onNewBill,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'repeat'>('all');
  const [dateRange, setDateRange] = useState<
    'all' | 'today' | '7days' | '30days' | 'month' | 'custom'
  >('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMode | 'void'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return bills.filter((b) => {
      if (filter === 'paid' && b.status !== 'paid') return false;
      if (filter === 'pending' && b.status !== 'pending') return false;
      if (filter === 'repeat' && !b.isRepeatVisit) return false;

      if (paymentFilter === 'void') {
        if (b.status !== 'void') return false;
      } else if (paymentFilter !== 'all') {
        if (b.paymentMode !== paymentFilter || b.status === 'void') return false;
      }

      if (dateRange !== 'all') {
        if (!b.createdAt) return false;
        const billDate = b.createdAt.toDate();
        if (dateRange === 'today') {
          if (billDate < todayStart) return false;
        } else if (dateRange === '7days') {
          const start7 = new Date(todayStart);
          start7.setDate(start7.getDate() - 6);
          if (billDate < start7) return false;
        } else if (dateRange === '30days') {
          const start30 = new Date(todayStart);
          start30.setDate(start30.getDate() - 29);
          if (billDate < start30) return false;
        } else if (dateRange === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (billDate < monthStart) return false;
        } else if (dateRange === 'custom') {
          if (customStart) {
            const from = new Date(`${customStart}T00:00:00`);
            if (billDate < from) return false;
          }
          if (customEnd) {
            const to = new Date(`${customEnd}T23:59:59.999`);
            if (billDate > to) return false;
          }
        }
      }

      if (!q) return true;
      return (
        b.billNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.toLowerCase().includes(q) ||
        b.customerCode.toLowerCase().includes(q) ||
        b.paymentMode.toLowerCase().includes(q) ||
        b.appliedOfferTitle.toLowerCase().includes(q)
      );
    });
  }, [bills, filter, dateRange, customStart, customEnd, paymentFilter, search]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    filter !== 'all' ||
    dateRange !== 'all' ||
    paymentFilter !== 'all';

  const handleMarkPaid = async (
    e: React.MouseEvent,
    billId: string,
    mode: PaymentMode
  ) => {
    e.stopPropagation();
    setBusyId(billId);
    try {
      await markBillPaid(shop.ownerId, billId, mode);
    } finally {
      setBusyId(null);
    }
  };

  const handleVoid = async (e: React.MouseEvent, billId: string) => {
    e.stopPropagation();
    setBusyId(billId);
    try {
      await voidBill(shop.ownerId, billId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-amber-100/70 border border-amber-200/70 rounded-lg self-start">
          {(
            [
              { id: 'all', label: `All (${bills.length})` },
              {
                id: 'repeat',
                label: `Repeat Visits (${bills.filter((b) => b.isRepeatVisit).length})`,
              },
              {
                id: 'pending',
                label: `Credit Pending (${bills.filter((b) => b.status === 'pending').length})`,
              },
              { id: 'paid', label: 'Paid' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-stone-900 text-amber-300 shadow-sm'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[210px] sm:w-64">
            <Search className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill #, customer, phone, ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filter by date range"
              value={dateRange}
              onChange={(e) =>
                setDateRange(
                  e.target.value as 'all' | 'today' | '7days' | '30days' | 'month' | 'custom'
                )
              }
              className="pl-8 pr-7 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>

          {/* Payment / Status Filter Dropdown */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filter by payment mode"
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as 'all' | PaymentMode | 'void')
              }
              className="pl-8 pr-7 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Credit">Credit / Udhar</option>
              <option value="void">Voided Bills</option>
            </select>
          </div>

          {bills.length > 0 && (
            <button
              type="button"
              onClick={() => exportBillsCsv(shop.shopName, filtered.length ? filtered : bills)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Inputs + Active Filter Bar */}
      {(dateRange === 'custom' || hasActiveFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {dateRange === 'custom' && (
              <>
                <label className="flex items-center gap-1.5 text-stone-700">
                  <span>From:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1 text-xs font-mono-tabular bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-stone-700">
                  <span>To:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-1 text-xs font-mono-tabular bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </label>
              </>
            )}
            <span className="text-stone-600 font-mono-tabular">
              Showing <strong>{filtered.length}</strong> of {bills.length} bills
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilter('all');
                setDateRange('all');
                setCustomStart('');
                setCustomEnd('');
                setPaymentFilter('all');
              }}
              className="font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-stone-500 mb-4">
              {bills.length === 0
                ? 'No bills recorded yet.'
                : 'No bills match your search or filter.'}
            </p>
            {bills.length === 0 && (
              <button
                type="button"
                onClick={onNewBill}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                Create First Bill
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-xs text-stone-500 bg-amber-50/40">
                  <th className="text-left font-medium px-5 py-3">Bill #</th>
                  <th className="text-left font-medium px-3 py-3">Customer</th>
                  <th className="text-left font-medium px-3 py-3">Visit</th>
                  <th className="text-left font-medium px-3 py-3">Payment</th>
                  <th className="text-right font-medium px-3 py-3">Coins</th>
                  <th className="text-right font-medium px-3 py-3">Total</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/70">
                {filtered.map((bill) => {
                  const dateLabel = bill.createdAt
                    ? bill.createdAt.toDate().toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';

                  return (
                    <tr
                      key={bill.id}
                      onClick={() => onOpenReceipt(bill)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-mono-tabular font-semibold text-stone-900">
                          {bill.billNumber}
                        </div>
                        <div className="text-xs text-stone-500 font-mono-tabular">
                          {dateLabel} · {bill.itemCount} items
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-stone-900">
                          {bill.customerName}
                        </div>
                        <div className="text-xs text-stone-500 font-mono-tabular">
                          {bill.customerPhone} · {bill.customerCode}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        {bill.isRepeatVisit ? (
                          <span className="text-amber-700 font-semibold">
                            Returning (#{bill.visitNumber})
                          </span>
                        ) : (
                          <span className="text-stone-600">First (#1)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        <span
                          className={
                            bill.status === 'void'
                              ? 'text-red-700 font-medium'
                              : bill.status === 'pending'
                                ? 'text-amber-700 font-medium'
                                : 'text-stone-700'
                          }
                        >
                          {bill.paymentMode} ·{' '}
                          {bill.status === 'void'
                            ? 'Voided'
                            : bill.status === 'pending'
                              ? 'Pending'
                              : 'Paid'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular text-xs whitespace-nowrap">
                        <span className="text-amber-700 font-semibold">+{bill.coinsEarned}</span>
                        {bill.coinsRedeemed > 0 && (
                          <span className="text-stone-500 ml-1.5">
                            -{bill.coinsRedeemed}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular font-semibold text-stone-900 whitespace-nowrap">
                        {shop.currencySymbol}
                        {bill.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {bill.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === bill.id}
                              onClick={(e) => void handleMarkPaid(e, bill.id, 'UPI')}
                              title="Mark as Paid"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Paid
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReceipt(bill);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 border border-stone-200 rounded hover:bg-amber-50 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Receipt
                          </button>
                          {bill.status !== 'void' && (
                            <button
                              type="button"
                              disabled={busyId === bill.id}
                              onClick={(e) => void handleVoid(e, bill.id)}
                              title="Void Bill"
                              className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Slash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
