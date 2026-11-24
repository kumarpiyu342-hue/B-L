import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Coins,
  Gift,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { createBillAtomic } from '../services/shopService';
import {
  Bill,
  BillLineItem,
  CatalogItem,
  Customer,
  DraftLineItem,
  LoyaltyOffer,
  PaymentMode,
  Shop,
} from '../types/shop';

interface BillBuilderViewProps {
  shop: Shop;
  catalogItems: CatalogItem[];
  customers: Customer[];
  offers: LoyaltyOffer[];
  preselectedCustomer: Customer | null;
  onClearPreselected: () => void;
  onBillCreated: (result: {
    bill: Bill;
    lineItems: BillLineItem[];
    updatedCoinBalance: number;
  }) => void;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const BillBuilderView: React.FC<BillBuilderViewProps> = ({
  shop,
  catalogItems,
  customers,
  offers,
  preselectedCustomer,
  onClearPreselected,
  onBillCreated,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    preselectedCustomer
  );
  const [creatingNewCustomer, setCreatingNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const [itemSearch, setItemSearch] = useState('');
  const [lines, setLines] = useState<DraftLineItem[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('pcs');

  const [manualDiscount, setManualDiscount] = useState(0);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [billStatus, setBillStatus] = useState<'paid' | 'pending'>('paid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomer(preselectedCustomer);
      setCreatingNewCustomer(false);
      onClearPreselected();
    }
  }, [preselectedCustomer, onClearPreselected]);

  const matchedCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 6);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  const filteredCatalog = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return catalogItems
      .filter((i) => i.isActive)
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q)
      );
  }, [catalogItems, itemSearch]);

  const addCatalogLine = (item: CatalogItem) => {
    setErrorMsg('');
    setLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.itemId === item.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], qty: next[existingIdx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          localId: `${item.id}_${Date.now()}`,
          itemId: item.id,
          name: item.name,
          unit: item.unit,
          qty: 1,
          unitPrice: item.price,
          taxRate: shop.taxEnabled ? item.taxRate : 0,
        },
      ];
    });
  };

  const addCustomLine = () => {
    const name = customItemName.trim();
    const price = Number(customItemPrice);
    if (!name || Number.isNaN(price) || price < 0) return;
    setLines((prev) => [
      ...prev,
      {
        localId: `custom_${Date.now()}`,
        itemId: 'custom',
        name,
        unit: customItemUnit.trim() || 'pcs',
        qty: 1,
        unitPrice: price,
        taxRate: shop.taxEnabled ? shop.defaultTaxRate : 0,
      },
    ]);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const updateLine = (localId: string, patch: Partial<DraftLineItem>) => {
    setLines((prev) =>
      prev.map((l) => (l.localId === localId ? { ...l, ...patch } : l))
    );
  };

  const removeLine = (localId: string) => {
    setLines((prev) => prev.filter((l) => l.localId !== localId));
  };

  const subtotal = useMemo(
    () => round2(lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)),
    [lines]
  );

  const taxAmount = useMemo(() => {
    if (!shop.taxEnabled) return 0;
    return round2(
      lines.reduce((sum, l) => sum + (l.qty * l.unitPrice * l.taxRate) / 100, 0)
    );
  }, [lines, shop.taxEnabled]);

  const grossTotal = round2(subtotal + taxAmount);
  const safeManualDiscount = Math.min(grossTotal, Math.max(0, round2(manualDiscount)));
  const afterManual = round2(grossTotal - safeManualDiscount);

  const activeOffers = offers.filter((o) => o.isActive);
  const selectedOffer = activeOffers.find((o) => o.id === selectedOfferId) || null;

  const availableCoins = selectedCustomer ? selectedCustomer.coinBalance : 0;
  const maxCoinsByRule = useMemo(() => {
    const maxRs = round2((afterManual * (shop.maxRedeemPercent || 0)) / 100);
    return Math.min(
      Math.floor(availableCoins),
      Math.max(0, Math.floor(maxRs / (shop.coinValueInInr || 1)))
    );
  }, [afterManual, availableCoins, shop.coinValueInInr, shop.maxRedeemPercent]);

  const { actualCoinsRedeemed, coinDiscount } = useMemo(() => {
    if (!selectedCustomer || availableCoins <= 0) {
      return { actualCoinsRedeemed: 0, coinDiscount: 0 };
    }
    if (
      selectedOffer &&
      availableCoins >= selectedOffer.coinsRequired &&
      afterManual >= selectedOffer.minBillAmount
    ) {
      return {
        actualCoinsRedeemed: Math.round(selectedOffer.coinsRequired),
        coinDiscount: Math.min(afterManual, round2(selectedOffer.discountValue)),
      };
    }
    const clampedCoins = Math.min(Math.max(0, Math.round(coinsToRedeem)), maxCoinsByRule);
    return {
      actualCoinsRedeemed: clampedCoins,
      coinDiscount: Math.min(afterManual, round2(clampedCoins * (shop.coinValueInInr || 1))),
    };
  }, [
    selectedCustomer,
    availableCoins,
    selectedOffer,
    afterManual,
    coinsToRedeem,
    maxCoinsByRule,
    shop.coinValueInInr,
  ]);

  const finalTotal = Math.max(0, round2(afterManual - coinDiscount));
  const baseCoinsEarned = Math.floor((finalTotal / 100) * (shop.coinsPerHundred || 0));
  const bonusCoins = selectedCustomer
    ? selectedCustomer.visitCount >= 1
      ? shop.repeatBonusCoins
      : 0
    : shop.welcomeBonusCoins;
  const totalCoinsEarned = baseCoinsEarned + bonusCoins;

  const handleSubmitBill = async () => {
    setErrorMsg('');
    if (lines.length === 0) {
      setErrorMsg('Add at least one item to generate a bill.');
      return;
    }
    if (!selectedCustomer && !creatingNewCustomer) {
      setErrorMsg('Select an existing customer or enter a new customer phone & name.');
      return;
    }
    if (creatingNewCustomer) {
      const cleanPhone = newCustPhone.replace(/[^0-9+\-\s]/g, '').trim();
      if (newCustName.trim().length < 1 || cleanPhone.length < 6) {
        setErrorMsg('Enter customer name and a valid phone number (at least 6 digits).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await createBillAtomic({
        shop,
        existingCustomer: selectedCustomer,
        newCustomerInput: creatingNewCustomer
          ? { name: newCustName.trim(), phone: newCustPhone.trim() }
          : undefined,
        lines,
        catalogItems,
        offers,
        manualDiscount: safeManualDiscount,
        coinsToRedeem: selectedOffer ? 0 : actualCoinsRedeemed,
        selectedOffer,
        paymentMode,
        status: paymentMode === 'Credit' ? billStatus : 'paid',
        notes,
      });

      setLines([]);
      setManualDiscount(0);
      setCoinsToRedeem(0);
      setSelectedOfferId('');
      setNotes('');
      setCreatingNewCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setSelectedCustomer(null);
      setCustomerSearch('');

      onBillCreated(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save bill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Customer + Catalog + Line Items */}
      <div className="lg:col-span-8 space-y-6">
        {/* 1. Customer Selection Card */}
        <section className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-base font-semibold text-stone-900">
              1. Customer
            </h2>
            {!selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setCreatingNewCustomer((v) => !v);
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {creatingNewCustomer ? 'Search Existing Instead' : 'New Customer'}
              </button>
            )}
          </div>

          {selectedCustomer ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-50/70 border border-amber-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900">
                    {selectedCustomer.name}
                  </span>
                  <span className="text-xs font-mono-tabular text-stone-500">
                    {selectedCustomer.phone}
                  </span>
                </div>
                <div className="text-xs text-stone-600 mt-1">
                  ID:{' '}
                  <span className="font-mono-tabular font-semibold text-stone-900">
                    {selectedCustomer.customerCode}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  {selectedCustomer.visitCount >= 1 ? (
                    <span className="text-amber-800 font-medium">
                      Returning Customer (Visit #{selectedCustomer.visitCount + 1} · {selectedCustomer.billCount} past bills)
                    </span>
                  ) : (
                    <span>First bill</span>
                  )}
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono-tabular font-semibold text-amber-700">
                    {selectedCustomer.coinBalance} {shop.coinName} available
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCoinsToRedeem(0);
                  setSelectedOfferId('');
                }}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 underline cursor-pointer self-start sm:self-center"
              >
                Change
              </button>
            </div>
          ) : creatingNewCustomer ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  maxLength={20}
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Priya Verma"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              {shop.welcomeBonusCoins > 0 && (
                <p className="sm:col-span-2 text-xs text-amber-800 font-medium">
                  New Customer ID will be generated automatically with +{shop.welcomeBonusCoins} welcome {shop.coinName}.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer by phone number, name, or ID..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              {matchedCustomers.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {matchedCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      className="text-left p-2.5 rounded-lg border border-stone-200 hover:border-amber-600 hover:bg-amber-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-stone-900 truncate">
                          {c.name}
                        </span>
                        <span className="text-xs font-mono-tabular font-semibold text-amber-700 shrink-0">
                          {c.coinBalance} {shop.coinName}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 font-mono-tabular mt-0.5">
                        {c.phone} · {c.visitCount} visits
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-500 flex items-center justify-between py-2">
                  <span>No matching customer found.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingNewCustomer(true);
                      if (/^[0-9+\-\s]+$/.test(customerSearch.trim())) {
                        setNewCustPhone(customerSearch.trim());
                      } else {
                        setNewCustName(customerSearch.trim());
                      }
                    }}
                    className="text-amber-700 font-semibold hover:underline cursor-pointer"
                  >
                    + Add &quot;{customerSearch || 'New Customer'}&quot;
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 2. Products Quick Picker */}
        <section className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-base font-semibold text-stone-900">
              2. Add Items
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search products or SKU..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          {filteredCatalog.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
              {filteredCatalog.slice(0, 12).map((item) => {
                const isLow = item.stockQuantity <= item.lowStockThreshold;
                const isOut = item.stockQuantity <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addCatalogLine(item)}
                    className="text-left p-3 rounded-lg border border-stone-200 hover:border-amber-600 hover:bg-amber-50/40 transition-colors cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {item.category} · {item.unit}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-stone-100">
                      <span className="font-mono-tabular text-xs font-semibold text-stone-900">
                        {shop.currencySymbol}
                        {item.price}
                      </span>
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          isOut
                            ? 'text-red-700 font-medium'
                            : isLow
                              ? 'text-amber-700 font-medium'
                              : 'text-stone-500'
                        }`}
                      >
                        {isOut ? '0 left' : `${item.stockQuantity} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom / Ad-hoc Item Row */}
          <div className="pt-4 border-t border-amber-100">
            <div className="text-xs font-medium text-stone-600 mb-2">
              Quick Custom Item (not in catalog)
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                maxLength={80}
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Item name"
                className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(e.target.value)}
                placeholder={`Price (${shop.currencySymbol})`}
                className="w-28 px-3 py-1.5 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <input
                type="text"
                maxLength={16}
                value={customItemUnit}
                onChange={(e) => setCustomItemUnit(e.target.value)}
                placeholder="Unit"
                className="w-20 px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <button
                type="button"
                onClick={addCustomLine}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        </section>

        {/* 3. Current Bill Line Items Table */}
        <section className="bg-white border border-amber-200/80 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-stone-900">
              Bill Items ({lines.length})
            </h2>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setLines([])}
                className="text-xs text-stone-500 hover:text-red-600 cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              Tap any product above or add a custom item to build the bill.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-100 text-xs text-stone-500 bg-amber-50/40">
                    <th className="text-left font-medium px-5 py-2.5">Item</th>
                    <th className="text-right font-medium px-2 py-2.5">Qty</th>
                    <th className="text-right font-medium px-2 py-2.5">Rate</th>
                    {shop.taxEnabled && (
                      <th className="text-right font-medium px-2 py-2.5">Tax %</th>
                    )}
                    <th className="text-right font-medium px-3 py-2.5">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/70">
                  {lines.map((line) => {
                    const base = line.qty * line.unitPrice;
                    const lineTotal = shop.taxEnabled
                      ? base + (base * line.taxRate) / 100
                      : base;
                    const catalogMatch = catalogItems.find(
                      (c) => c.id === line.itemId
                    );
                    const overStock =
                      catalogMatch && line.qty > catalogMatch.stockQuantity;

                    return (
                      <tr key={line.localId}>
                        <td className="px-5 py-2.5">
                          <div className="font-medium text-stone-900">
                            {line.name}
                          </div>
                          {overStock && (
                            <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Exceeds current stock ({catalogMatch.stockQuantity} {catalogMatch.unit})
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <input
                            type="number"
                            min={0.1}
                            step="any"
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(line.localId, {
                                qty: Math.max(0.1, Number(e.target.value) || 0.1),
                              })
                            }
                            className="w-16 px-2 py-1 text-right font-mono-tabular text-xs border border-stone-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(line.localId, {
                                unitPrice: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-20 px-2 py-1 text-right font-mono-tabular text-xs border border-stone-200 rounded"
                          />
                        </td>
                        {shop.taxEnabled && (
                          <td className="px-2 py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              max={28}
                              value={line.taxRate}
                              onChange={(e) =>
                                updateLine(line.localId, {
                                  taxRate: Math.min(
                                    28,
                                    Math.max(0, Number(e.target.value) || 0)
                                  ),
                                })
                              }
                              className="w-14 px-2 py-1 text-right font-mono-tabular text-xs border border-stone-200 rounded"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right font-mono-tabular font-semibold text-stone-900 whitespace-nowrap">
                          {shop.currencySymbol}
                          {lineTotal.toFixed(2)}
                        </td>
                        <td className="pr-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.localId)}
                            aria-label="Remove item"
                            className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Right 4 Columns: Loyalty & Checkout Summary */}
      <aside className="lg:col-span-4 bg-white border border-amber-200/80 rounded-xl p-5 space-y-5 lg:sticky lg:top-6 shadow-sm">
        <h2 className="font-display text-base font-semibold text-stone-900 pb-3 border-b border-amber-100">
          3. Bill &amp; Coin Redeem
        </h2>

        {/* Totals Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span className="font-mono-tabular">
              {shop.currencySymbol}
              {subtotal.toFixed(2)}
            </span>
          </div>
          {shop.taxEnabled && (
            <div className="flex justify-between text-stone-600">
              <span>Tax / GST</span>
              <span className="font-mono-tabular">
                {shop.currencySymbol}
                {taxAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 text-stone-600">
            <span>Store Discount ({shop.currencySymbol})</span>
            <input
              type="number"
              min={0}
              max={grossTotal}
              value={manualDiscount || ''}
              placeholder="0"
              onChange={(e) => setManualDiscount(Number(e.target.value) || 0)}
              className="w-24 px-2.5 py-1 text-right font-mono-tabular text-xs border border-stone-200 rounded-md"
            />
          </div>
        </div>

        {/* Coin Redemption / Special Offer */}
        {selectedCustomer ? (
          <div className="p-3.5 rounded-xl bg-stone-950 text-stone-100 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Redeem {shop.coinName}
              </span>
              <span className="font-mono-tabular text-amber-200">
                Bal: {availableCoins} ({shop.currencySymbol}
                {(availableCoins * (shop.coinValueInInr || 1)).toFixed(0)})
              </span>
            </div>

            {availableCoins <= 0 ? (
              <p className="text-[11px] text-stone-400">
                Customer has 0 {shop.coinName} yet. Coins earned on this bill can be redeemed on their next visit.
              </p>
            ) : (
              <>
                {activeOffers.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                      <Gift className="w-3 h-3 text-amber-400" />
                      Redeem Special Offer
                    </div>
                    <select
                      value={selectedOfferId}
                      onChange={(e) => {
                        setSelectedOfferId(e.target.value);
                        if (e.target.value) setCoinsToRedeem(0);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-900 text-amber-50 border border-stone-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">Manual {shop.coinName} redeem</option>
                      {activeOffers.map((offer) => {
                        const canAfford = availableCoins >= offer.coinsRequired;
                        const meetsMin = afterManual >= offer.minBillAmount;
                        return (
                          <option
                            key={offer.id}
                            value={offer.id}
                            disabled={!canAfford || !meetsMin}
                          >
                            {offer.title} ({offer.coinsRequired} coins
                            {!canAfford
                              ? ' — low balance'
                              : !meetsMin
                                ? ` — min ${shop.currencySymbol}${offer.minBillAmount}`
                                : ` — save ${shop.currencySymbol}${offer.discountValue}`}
                            )
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {!selectedOfferId && (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="text-[11px] text-stone-300">
                        Coins to redeem (max {maxCoinsByRule})
                      </label>
                      {coinsToRedeem > 0 && (
                        <button
                          type="button"
                          onClick={() => setCoinsToRedeem(0)}
                          className="text-[11px] text-stone-400 hover:text-amber-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5 mb-2">
                      {[
                        { label: '25%', val: Math.floor(maxCoinsByRule * 0.25) },
                        { label: '50%', val: Math.floor(maxCoinsByRule * 0.5) },
                        { label: 'Max', val: maxCoinsByRule },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={maxCoinsByRule <= 0 || preset.val <= 0}
                          onClick={() => setCoinsToRedeem(preset.val)}
                          className="flex-1 py-1 text-[11px] font-mono-tabular font-semibold bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 border border-stone-700 rounded cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={maxCoinsByRule}
                      value={coinsToRedeem || ''}
                      placeholder="Enter coins to redeem"
                      onChange={(e) => setCoinsToRedeem(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-stone-900 text-white border border-stone-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                )}

                {coinDiscount > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-amber-300 pt-1 border-t border-stone-800">
                    <span>Coin Discount Applied</span>
                    <span className="font-mono-tabular">
                      -{shop.currencySymbol}
                      {coinDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-stone-600 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Select an existing customer above to redeem their {shop.coinName} or special offers.
            </span>
          </div>
        )}

        {/* Grand Total & Coins Preview */}
        <div className="pt-3 border-t border-amber-100 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-stone-900">Net Payable</span>
            <span className="font-mono-tabular text-2xl font-bold text-stone-900">
              {shop.currencySymbol}
              {finalTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>{shop.coinName} customer will earn</span>
            <span className="font-mono-tabular font-bold">
              +{totalCoinsEarned} {shop.coinName}
              {bonusCoins > 0 && (
                <span className="text-stone-500 font-normal ml-1">
                  (incl. +{bonusCoins} bonus)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-2">
            Payment Mode
          </label>
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-amber-50 border border-amber-200/70 rounded-lg">
            {(['UPI', 'Cash', 'Card', 'Credit'] as PaymentMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setPaymentMode(mode);
                  setBillStatus(mode === 'Credit' ? 'pending' : 'paid');
                }}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  paymentMode === mode
                    ? 'bg-stone-900 text-amber-300 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <input
            type="text"
            maxLength={200}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional bill note..."
            className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

        <button
          type="button"
          disabled={submitting || lines.length === 0}
          onClick={() => void handleSubmitBill()}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Check className="w-4 h-4" />
          {submitting ? 'Saving Bill...' : 'Generate & Save Bill'}
        </button>
      </aside>
    </div>
  );
};
