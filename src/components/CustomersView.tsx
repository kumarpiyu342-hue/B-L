import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Coins,
  Copy,
  Download,
  Link2,
  Plus,
  ReceiptText,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import {
  adjustCustomerCoins,
  createCustomer,
  redeemCustomerCoins,
  updateCustomerDetails,
} from '../services/shopService';
import {
  Bill,
  CoinTransaction,
  Customer,
  LoyaltyOffer,
  Shop,
} from '../types/shop';
import { exportCustomersCsv } from '../utils/csvAndBackup';

interface CustomersViewProps {
  shop: Shop;
  customers: Customer[];
  bills: Bill[];
  coinTransactions: CoinTransaction[];
  offers: LoyaltyOffer[];
  autoOpenAdd?: boolean;
  onAutoOpenHandled?: () => void;
  onStartBillForCustomer: (customer: Customer) => void;
  onOpenReceipt: (bill: Bill) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  shop,
  customers,
  bills,
  coinTransactions,
  offers,
  autoOpenAdd,
  onAutoOpenHandled,
  onStartBillForCustomer,
  onOpenReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'repeat' | 'new' | 'high_coins'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Customer modal
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (autoOpenAdd) {
      setAddError('');
      setAddOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenAdd, onAutoOpenHandled]);

  // Redeem / Adjust coins inside drawer
  const [coinActionTab, setCoinActionTab] = useState<'redeem' | 'adjust'>('redeem');
  const [coinDelta, setCoinDelta] = useState('');
  const [coinNote, setCoinNote] = useState('');
  const [adjustingCoins, setAdjustingCoins] = useState(false);
  const [coinFeedback, setCoinFeedback] = useState('');

  // Edit customer inline inside drawer
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const repeatCount = useMemo(
    () => customers.filter((c) => c.visitCount >= 2).length,
    [customers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (filter === 'repeat' && c.visitCount < 2) return false;
        if (filter === 'new' && c.visitCount >= 2) return false;
        if (filter === 'high_coins' && c.coinBalance <= 0) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        filter === 'high_coins'
          ? b.coinBalance - a.coinBalance
          : b.visitCount - a.visitCount || b.totalSpent - a.totalSpent
      );
  }, [customers, filter, search]);

  const customerBills = useMemo(() => {
    if (!selectedCustomer) return [];
    return bills.filter((b) => b.customerId === selectedCustomer.id);
  }, [bills, selectedCustomer]);

  const customerCoinLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    return coinTransactions.filter((t) => t.customerId === selectedCustomer.id);
  }, [coinTransactions, selectedCustomer]);

  const activeOffers = offers.filter((o) => o.isActive);

  const handleCopyCode = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopiedId(`code:${code}`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyPortalLink = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?cid=${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(`link:${code}`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newPhone.replace(/[^0-9+\-\s]/g, '').trim();
    if (!newName.trim() || cleanPhone.length < 6) {
      setAddError('Enter customer name and a valid phone number.');
      return;
    }
    setSavingNew(true);
    setAddError('');
    try {
      const created = await createCustomer(
        shop,
        { name: newName, phone: cleanPhone, notes: newNotes },
        offers
      );
      setAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      setSelectedCustomerId(created.id);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add customer.');
    } finally {
      setSavingNew(false);
    }
  };

  const handleRedeemDirect = async (coinsToUse: number, customNote?: string) => {
    if (!selectedCustomer) return;
    const amt = Math.round(coinsToUse);
    if (!amt || amt <= 0 || amt > selectedCustomer.coinBalance) return;
    setAdjustingCoins(true);
    setCoinFeedback('');
    try {
      const res = await redeemCustomerCoins(
        shop,
        selectedCustomer,
        amt,
        customNote || coinNote || undefined
      );
      setCoinDelta('');
      setCoinNote('');
      setCoinFeedback(
        `Redeemed ${res.redeemedCoins} ${shop.coinName} (${shop.currencySymbol}${res.discountValue.toFixed(0)} value).`
      );
    } finally {
      setAdjustingCoins(false);
    }
  };

  const handleAdjustCoins = async (sign: 1 | -1) => {
    if (!selectedCustomer) return;
    const amt = Math.round(Number(coinDelta));
    if (!amt || amt <= 0) return;
    setAdjustingCoins(true);
    setCoinFeedback('');
    try {
      await adjustCustomerCoins(
        shop,
        selectedCustomer,
        sign * amt,
        coinNote || (sign > 0 ? 'Bonus coins added by shopkeeper' : 'Coins deducted by shopkeeper')
      );
      setCoinDelta('');
      setCoinNote('');
    } finally {
      setAdjustingCoins(false);
    }
  };

  const handleSaveEditInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const cleanPhone = editPhone.replace(/[^0-9+\-\s]/g, '').trim();
    if (!editName.trim() || cleanPhone.length < 6) {
      setEditError('Enter a valid name and phone number (at least 6 digits).');
      return;
    }
    setEditError('');
    await updateCustomerDetails(shop.ownerId, selectedCustomer, {
      name: editName,
      phone: cleanPhone,
      notes: editNotes,
    });
    setEditingInfo(false);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-amber-100/70 border border-amber-200/70 rounded-lg self-start">
          {(
            [
              { id: 'all', label: `All (${customers.length})` },
              { id: 'repeat', label: `Repeat Visitors (${repeatCount})` },
              { id: 'new', label: `First-Time (${customers.length - repeatCount})` },
              { id: 'high_coins', label: 'Top Coins' },
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
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, Customer ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
          {customers.length > 0 && (
            <button
              type="button"
              onClick={() => exportCustomersCsv(shop.shopName, customers)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAddError('');
              setAddOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-stone-500 mb-4">
              {customers.length === 0
                ? 'No customers yet. Add a customer or generate a bill to track repeat visits and coins.'
                : 'No customers match your filter.'}
            </p>
            {customers.length === 0 && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-xs text-stone-500 bg-amber-50/40">
                  <th className="text-left font-medium px-5 py-3">Customer</th>
                  <th className="text-left font-medium px-3 py-3">Customer ID</th>
                  <th className="text-right font-medium px-3 py-3">Visits</th>
                  <th className="text-right font-medium px-3 py-3">Bills</th>
                  <th className="text-right font-medium px-3 py-3">Total Spent</th>
                  <th className="text-right font-medium px-3 py-3">{shop.coinName}</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/70">
                {filtered.map((c) => {
                  const lastDate = c.lastVisitAt
                    ? c.lastVisitAt.toDate().toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '—';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setEditingInfo(false);
                        setCoinFeedback('');
                      }}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-900">{c.name}</div>
                        <div className="text-xs text-stone-500 font-mono-tabular">
                          {c.phone} · Last: {lastDate}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono-tabular text-xs font-semibold text-stone-800">
                            {c.customerCode}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => void handleCopyCode(e, c.customerCode)}
                            title="Copy Customer ID"
                            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            {copiedId === `code:${c.customerCode}` ? (
                              <Check className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => void handleCopyPortalLink(e, c.customerCode)}
                            title="Copy Customer Points Link"
                            className="p-1 text-stone-400 hover:text-amber-700 cursor-pointer"
                          >
                            {copiedId === `link:${c.customerCode}` ? (
                              <Check className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="font-mono-tabular font-semibold text-stone-900">
                          {c.visitCount}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {c.visitCount >= 2 ? (
                            <span className="text-amber-700 font-semibold">Returning</span>
                          ) : (
                            'New'
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular text-stone-900 whitespace-nowrap">
                        {c.billCount}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular font-medium text-stone-900 whitespace-nowrap">
                        {shop.currencySymbol}
                        {c.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular font-semibold text-amber-700 whitespace-nowrap">
                        {c.coinBalance}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartBillForCustomer(c);
                          }}
                          className="px-3 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer"
                        >
                          New Bill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-amber-100 mb-4">
              <h3 className="font-display text-lg font-semibold text-stone-900">
                Add Customer
              </h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateCustomer(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Amit Kumar"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={20}
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Regular customer / preferences"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-700 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                >
                  {savingNew ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer 360° Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto border-l border-amber-200 p-6 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-amber-100">
              <div>
                <div className="text-xs font-mono-tabular text-amber-700 font-semibold">
                  Customer ID: {selectedCustomer.customerCode}
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 mt-0.5">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-stone-500 font-mono-tabular mt-0.5">
                  {selectedCustomer.phone}
                  {selectedCustomer.visitCount >= 2 && ' · Returning Member'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 bg-stone-950 text-stone-100 border border-amber-500/30 rounded-xl p-4">
              <div>
                <div className="text-[11px] text-stone-400">Visits</div>
                <div className="font-mono-tabular text-base font-bold text-white">
                  {selectedCustomer.visitCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-stone-400">Bills</div>
                <div className="font-mono-tabular text-base font-bold text-white">
                  {selectedCustomer.billCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-stone-400">Spent</div>
                <div className="font-mono-tabular text-base font-bold text-white">
                  {shop.currencySymbol}
                  {selectedCustomer.totalSpent.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-stone-400">{shop.coinName}</div>
                <div className="font-mono-tabular text-base font-bold text-amber-400">
                  {selectedCustomer.coinBalance}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  onStartBillForCustomer(selectedCustomer);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                Create New Bill
              </button>
              <button
                type="button"
                onClick={(e) =>
                  void handleCopyPortalLink(e, selectedCustomer.customerCode)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 border border-stone-200 rounded-lg hover:bg-amber-50 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                {copiedId === `link:${selectedCustomer.customerCode}`
                  ? 'Portal Link Copied'
                  : 'Copy Customer Points Link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditName(selectedCustomer.name);
                  setEditPhone(selectedCustomer.phone);
                  setEditNotes(selectedCustomer.notes);
                  setEditError('');
                  setEditingInfo((v) => !v);
                }}
                className="px-3.5 py-2 text-xs font-medium text-stone-700 border border-stone-200 rounded-lg hover:bg-amber-50 cursor-pointer"
              >
                {editingInfo ? 'Cancel Edit' : 'Edit Details'}
              </button>
            </div>

            {editingInfo && (
              <form
                onSubmit={(e) => void handleSaveEditInfo(e)}
                className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3"
              >
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg"
                />
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-mono-tabular bg-white border border-stone-200 rounded-lg"
                />
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg"
                />
                {editError && <p className="text-xs text-red-600">{editError}</p>}
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-lg cursor-pointer"
                >
                  Save Customer Info
                </button>
              </form>
            )}

            {/* Redeem Coins or Manual Adjustment */}
            <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                  <Coins className="w-3.5 h-3.5 text-amber-700" />
                  {shop.coinName} Redemption &amp; Balance
                </div>
                <div className="flex items-center gap-1 p-0.5 bg-white border border-amber-200 rounded-md">
                  <button
                    type="button"
                    onClick={() => setCoinActionTab('redeem')}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                      coinActionTab === 'redeem'
                        ? 'bg-stone-900 text-amber-300'
                        : 'text-stone-600'
                    }`}
                  >
                    Redeem
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoinActionTab('adjust')}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                      coinActionTab === 'adjust'
                        ? 'bg-stone-900 text-amber-300'
                        : 'text-stone-600'
                    }`}
                  >
                    Adjust (+/-)
                  </button>
                </div>
              </div>

              {coinActionTab === 'redeem' ? (
                selectedCustomer.coinBalance <= 0 ? (
                  <p className="text-xs text-stone-500">
                    Customer has 0 {shop.coinName} available to redeem.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={selectedCustomer.coinBalance}
                        value={coinDelta}
                        onChange={(e) => setCoinDelta(e.target.value)}
                        placeholder={`Max ${Math.floor(selectedCustomer.coinBalance)}`}
                        className="w-28 px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-stone-200 rounded-lg"
                      />
                      <input
                        type="text"
                        maxLength={160}
                        value={coinNote}
                        onChange={(e) => setCoinNote(e.target.value)}
                        placeholder="Redeem note (optional)"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={
                          adjustingCoins ||
                          !Number(coinDelta) ||
                          Number(coinDelta) > selectedCustomer.coinBalance
                        }
                        onClick={() => void handleRedeemDirect(Number(coinDelta))}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-45 rounded-md cursor-pointer"
                      >
                        Redeem {Number(coinDelta) > 0 ? `${coinDelta} ${shop.coinName}` : 'Coins'}
                      </button>
                      {activeOffers
                        .filter((o) => selectedCustomer.coinBalance >= o.coinsRequired)
                        .slice(0, 2)
                        .map((offer) => (
                          <button
                            key={offer.id}
                            type="button"
                            disabled={adjustingCoins}
                            onClick={() =>
                              void handleRedeemDirect(
                                offer.coinsRequired,
                                `Redeemed offer: ${offer.title}`
                              )
                            }
                            className="px-2.5 py-1.5 text-[11px] font-semibold text-stone-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-md cursor-pointer"
                          >
                            {offer.title} ({offer.coinsRequired})
                          </button>
                        ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={coinDelta}
                      onChange={(e) => setCoinDelta(e.target.value)}
                      placeholder="Coins"
                      className="w-24 px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-stone-200 rounded-lg"
                    />
                    <input
                      type="text"
                      maxLength={160}
                      value={coinNote}
                      onChange={(e) => setCoinNote(e.target.value)}
                      placeholder="Reason (e.g. Festival gift)"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={adjustingCoins}
                      onClick={() => void handleAdjustCoins(1)}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md cursor-pointer"
                    >
                      + Add Coins
                    </button>
                    <button
                      type="button"
                      disabled={adjustingCoins}
                      onClick={() => void handleAdjustCoins(-1)}
                      className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 rounded-md cursor-pointer"
                    >
                      - Deduct Coins
                    </button>
                  </div>
                </div>
              )}

              {coinFeedback && (
                <div className="text-xs font-medium text-amber-800">{coinFeedback}</div>
              )}
            </div>

            {/* Customer Bill History */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 mb-2.5">
                <ReceiptText className="w-3.5 h-3.5 text-amber-700" />
                Purchase &amp; Bill History ({customerBills.length})
              </div>
              {customerBills.length === 0 ? (
                <p className="text-xs text-stone-500">No bills recorded yet.</p>
              ) : (
                <div className="divide-y divide-amber-100 border border-amber-200/80 rounded-xl overflow-hidden">
                  {customerBills.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onOpenReceipt(b)}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-amber-50/40 cursor-pointer"
                    >
                      <div>
                        <div className="font-mono-tabular font-semibold text-stone-900">
                          {b.billNumber} · Visit #{b.visitNumber}
                        </div>
                        <div className="text-stone-500">
                          {b.createdAt
                            ? b.createdAt.toDate().toLocaleDateString('en-IN')
                            : ''}{' '}
                          · {b.paymentMode}
                        </div>
                      </div>
                      <div className="text-right font-mono-tabular">
                        <div className="font-semibold text-stone-900">
                          {shop.currencySymbol}
                          {b.totalAmount.toFixed(0)}
                        </div>
                        <div className="text-amber-700 font-semibold">+{b.coinsEarned}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coin Ledger */}
            <div>
              <div className="text-xs font-semibold text-stone-900 mb-2.5">
                {shop.coinName} Ledger ({customerCoinLedger.length})
              </div>
              {customerCoinLedger.length === 0 ? (
                <p className="text-xs text-stone-500">No coin movements yet.</p>
              ) : (
                <div className="divide-y divide-amber-100 border border-amber-200/80 rounded-xl overflow-hidden">
                  {customerCoinLedger.slice(0, 15).map((tx) => (
                    <div
                      key={tx.id}
                      className="px-3.5 py-2 flex items-center justify-between text-xs"
                    >
                      <div className="pr-3">
                        <div className="text-stone-800">{tx.note}</div>
                        <div className="text-[11px] text-stone-400 font-mono-tabular">
                          Bal after: {tx.balanceAfter}
                        </div>
                      </div>
                      <div
                        className={`font-mono-tabular font-semibold shrink-0 ${
                          tx.coinsDelta >= 0 ? 'text-amber-700' : 'text-stone-900'
                        }`}
                      >
                        {tx.coinsDelta >= 0 ? `+${tx.coinsDelta}` : tx.coinsDelta}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
