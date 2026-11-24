import React, { useMemo, useState } from 'react';
import { Check, Coins, Edit3, Gift, Plus, Search, Trash2, X } from 'lucide-react';
import {
  addLoyaltyOffer,
  deleteLoyaltyOffer,
  LoyaltyOfferInput,
  redeemCustomerCoins,
  updateLoyaltyOffer,
  updateShopSettings,
} from '../services/shopService';
import { CoinTransaction, Customer, LoyaltyOffer, Shop } from '../types/shop';

interface LoyaltyViewProps {
  shop: Shop;
  offers: LoyaltyOffer[];
  customers: Customer[];
  coinTransactions: CoinTransaction[];
}

const emptyOffer: LoyaltyOfferInput = {
  title: '',
  description: '',
  coinsRequired: 50,
  discountValue: 50,
  minBillAmount: 200,
  isActive: true,
};

export const LoyaltyView: React.FC<LoyaltyViewProps> = ({
  shop,
  offers,
  customers,
  coinTransactions,
}) => {
  // Coin rules form
  const [coinName, setCoinName] = useState(shop.coinName);
  const [coinsPerHundred, setCoinsPerHundred] = useState(shop.coinsPerHundred);
  const [coinValueInInr, setCoinValueInInr] = useState(shop.coinValueInInr);
  const [maxRedeemPercent, setMaxRedeemPercent] = useState(shop.maxRedeemPercent);
  const [welcomeBonusCoins, setWelcomeBonusCoins] = useState(shop.welcomeBonusCoins);
  const [repeatBonusCoins, setRepeatBonusCoins] = useState(shop.repeatBonusCoins);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);

  // Quick Coin Redeem state
  const [redeemSearch, setRedeemSearch] = useState('');
  const [redeemCustomerId, setRedeemCustomerId] = useState('');
  const [redeemCoinsInput, setRedeemCoinsInput] = useState('');
  const [redeemNote, setRedeemNote] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState('');
  const [redeemError, setRedeemError] = useState('');

  // Offer modal
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<LoyaltyOffer | null>(null);
  const [offerForm, setOfferForm] = useState<LoyaltyOfferInput>(emptyOffer);
  const [savingOffer, setSavingOffer] = useState(false);

  const totalIssued = customers.reduce((sum, c) => sum + c.totalCoinsEarned, 0);
  const totalRedeemed = customers.reduce((sum, c) => sum + c.totalCoinsRedeemed, 0);
  const circulating = customers.reduce((sum, c) => sum + c.coinBalance, 0);

  const customersWithCoins = useMemo(() => {
    const q = redeemSearch.trim().toLowerCase();
    return customers
      .filter((c) => c.coinBalance > 0)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q)
      )
      .sort((a, b) => b.coinBalance - a.coinBalance);
  }, [customers, redeemSearch]);

  const selectedRedeemCustomer = useMemo(
    () => customers.find((c) => c.id === redeemCustomerId) || null,
    [customers, redeemCustomerId]
  );

  const activeOffers = offers.filter((o) => o.isActive);

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    setRulesSaved(false);
    try {
      await updateShopSettings(
        shop.ownerId,
        {
          shopName: shop.shopName,
          category: shop.category,
          ownerName: shop.ownerName,
          phone: shop.phone,
          address: shop.address,
          gstin: shop.gstin,
          currencySymbol: shop.currencySymbol,
          taxEnabled: shop.taxEnabled,
          defaultTaxRate: shop.defaultTaxRate,
          invoicePrefix: shop.invoicePrefix,
          receiptFooter: shop.receiptFooter,
          coinName,
          coinsPerHundred,
          coinValueInInr,
          maxRedeemPercent,
          welcomeBonusCoins,
          repeatBonusCoins,
        },
        customers,
        offers
      );
      setRulesSaved(true);
      setTimeout(() => setRulesSaved(false), 2500);
    } finally {
      setSavingRules(false);
    }
  };

  const handleQuickRedeem = async (coinsToUse: number, customNote?: string) => {
    if (!selectedRedeemCustomer) return;
    setRedeemError('');
    setRedeemFeedback('');
    if (coinsToUse <= 0 || coinsToUse > selectedRedeemCustomer.coinBalance) {
      setRedeemError(
        `Enter between 1 and ${selectedRedeemCustomer.coinBalance} ${shop.coinName}.`
      );
      return;
    }

    setRedeeming(true);
    try {
      const res = await redeemCustomerCoins(
        shop,
        selectedRedeemCustomer,
        coinsToUse,
        customNote || redeemNote.trim() || undefined
      );
      setRedeemFeedback(
        `Redeemed ${res.redeemedCoins} ${shop.coinName} (${shop.currencySymbol}${res.discountValue.toFixed(0)} value) for ${selectedRedeemCustomer.name}. Remaining balance: ${res.newBalance}`
      );
      setRedeemCoinsInput('');
      setRedeemNote('');
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Failed to redeem coins.');
    } finally {
      setRedeeming(false);
    }
  };

  const openAddOffer = () => {
    setEditingOffer(null);
    setOfferForm(emptyOffer);
    setOfferModalOpen(true);
  };

  const openEditOffer = (offer: LoyaltyOffer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description,
      coinsRequired: offer.coinsRequired,
      discountValue: offer.discountValue,
      minBillAmount: offer.minBillAmount,
      isActive: offer.isActive,
    });
    setOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOffer(true);
    try {
      if (editingOffer) {
        await updateLoyaltyOffer(
          shop.ownerId,
          editingOffer.id,
          offerForm,
          offers,
          customers
        );
      } else {
        await addLoyaltyOffer(shop.ownerId, offerForm, offers, customers);
      }
      setOfferModalOpen(false);
    } finally {
      setSavingOffer(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    await deleteLoyaltyOffer(shop.ownerId, offerId, offers, customers);
  };

  return (
    <div className="space-y-8">
      {/* Summary Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="text-xs text-stone-500 mb-1">Total {shop.coinName} Issued</div>
          <div className="font-mono-tabular text-2xl font-bold text-stone-900">
            {totalIssued.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="text-xs text-stone-500 mb-1">Total {shop.coinName} Redeemed</div>
          <div className="font-mono-tabular text-2xl font-bold text-stone-900">
            {totalRedeemed.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-stone-950 text-stone-100 border border-amber-500/30 rounded-xl p-5">
          <div className="text-xs text-stone-400 mb-1">Active Balance with Customers</div>
          <div className="font-mono-tabular text-2xl font-bold text-amber-400">
            {circulating.toLocaleString('en-IN')}
          </div>
        </div>
      </section>

      {/* Quick Counter Coin & Offer Redeem Panel */}
      <section className="bg-stone-950 text-stone-100 border border-amber-500/30 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-800 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-base font-semibold text-amber-50">
                Redeem Customer {shop.coinName} at Counter
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Select a customer to redeem their {shop.coinName} or unlock a Special Offer directly (or redeem during New Bill checkout).
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-amber-300">
            1 {shop.coinName.replace(/s$/, '')} = {shop.currencySymbol}
            {shop.coinValueInInr}
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Customer Picker */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={redeemSearch}
                onChange={(e) => setRedeemSearch(e.target.value)}
                placeholder="Search customer by name, phone, ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-900 border border-stone-700 text-white placeholder:text-stone-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {customersWithCoins.length === 0 ? (
              <div className="text-xs text-stone-400 py-3">
                No customers currently have redeemable {shop.coinName} balance.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {customersWithCoins.slice(0, 12).map((c) => {
                  const active = c.id === redeemCustomerId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setRedeemCustomerId(c.id);
                        setRedeemError('');
                        setRedeemFeedback('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{c.name}</div>
                        <div className="text-[11px] font-mono-tabular text-stone-400">
                          {c.customerCode} · {c.phone}
                        </div>
                      </div>
                      <span className="font-mono-tabular text-xs font-bold text-amber-400 shrink-0">
                        {c.coinBalance} {shop.coinName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Redemption Controls */}
          <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-4">
            {!selectedRedeemCustomer ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Select a customer on the left to redeem their {shop.coinName} or special rewards.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {selectedRedeemCustomer.name}
                    </div>
                    <div className="text-xs text-stone-400 font-mono-tabular">
                      ID: {selectedRedeemCustomer.customerCode}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-tabular text-lg font-bold text-amber-400">
                      {selectedRedeemCustomer.coinBalance} {shop.coinName}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Worth {shop.currencySymbol}
                      {(selectedRedeemCustomer.coinBalance * (shop.coinValueInInr || 1)).toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* Custom Coins Redeem */}
                <div className="space-y-2.5">
                  <div className="text-xs font-medium text-stone-300">
                    Redeem Custom {shop.coinName}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={selectedRedeemCustomer.coinBalance < amt}
                        onClick={() => setRedeemCoinsInput(String(amt))}
                        className="px-2.5 py-1 text-xs font-mono-tabular font-semibold bg-stone-800 hover:bg-stone-700 disabled:opacity-35 text-amber-300 border border-stone-700 rounded cursor-pointer"
                      >
                        {amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={selectedRedeemCustomer.coinBalance <= 0}
                      onClick={() =>
                        setRedeemCoinsInput(String(Math.floor(selectedRedeemCustomer.coinBalance)))
                      }
                      className="px-2.5 py-1 text-xs font-mono-tabular font-semibold bg-stone-800 hover:bg-stone-700 disabled:opacity-35 text-amber-300 border border-stone-700 rounded cursor-pointer"
                    >
                      All ({Math.floor(selectedRedeemCustomer.coinBalance)})
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-12 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={selectedRedeemCustomer.coinBalance}
                      value={redeemCoinsInput}
                      onChange={(e) => setRedeemCoinsInput(e.target.value)}
                      placeholder="Coins"
                      className="sm:col-span-3 px-3 py-2 text-xs font-mono-tabular bg-stone-950 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      maxLength={160}
                      value={redeemNote}
                      onChange={(e) => setRedeemNote(e.target.value)}
                      placeholder="Note (e.g. Counter discount / gift redeemed)"
                      className="sm:col-span-6 px-3 py-2 text-xs bg-stone-950 border border-stone-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      disabled={redeeming || !redeemCoinsInput}
                      onClick={() => void handleQuickRedeem(Number(redeemCoinsInput))}
                      className="sm:col-span-3 px-3 py-2 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      {redeeming ? 'Redeeming...' : 'Redeem Now'}
                    </button>
                  </div>

                  {Number(redeemCoinsInput) > 0 && (
                    <div className="text-[11px] text-amber-300 font-mono-tabular">
                      Discount value: {shop.currencySymbol}
                      {(Number(redeemCoinsInput) * (shop.coinValueInInr || 1)).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* One-click Offer Redeem */}
                {activeOffers.length > 0 && (
                  <div className="pt-3 border-t border-stone-800 space-y-2">
                    <div className="text-xs font-medium text-stone-300">
                      Or Redeem an Active Offer Directly
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {activeOffers.map((offer) => {
                        const canRedeem =
                          selectedRedeemCustomer.coinBalance >= offer.coinsRequired;
                        return (
                          <button
                            key={offer.id}
                            type="button"
                            disabled={!canRedeem || redeeming}
                            onClick={() =>
                              void handleQuickRedeem(
                                offer.coinsRequired,
                                `Redeemed offer: ${offer.title}`
                              )
                            }
                            className="text-left p-2.5 rounded-lg bg-stone-950 border border-stone-700 hover:border-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-semibold text-amber-200 truncate">
                              {offer.title}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-stone-400 mt-0.5">
                              {offer.coinsRequired} {shop.coinName} · Saves{' '}
                              {shop.currencySymbol}
                              {offer.discountValue}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {redeemError && <p className="text-xs text-red-400">{redeemError}</p>}
                {redeemFeedback && (
                  <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-xs text-amber-200">
                    {redeemFeedback}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Coin Rules Configurator */}
        <section className="lg:col-span-5 bg-white border border-amber-200/80 rounded-xl p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-amber-100 mb-5">
            <Coins className="w-4 h-4 text-amber-700" />
            <h2 className="font-display text-base font-semibold text-stone-900">
              Coin Earn &amp; Redeem Rules
            </h2>
          </div>

          <form onSubmit={(e) => void handleSaveRules(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Coin Display Name
              </label>
              <input
                type="text"
                required
                maxLength={30}
                value={coinName}
                onChange={(e) => setCoinName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Earn per {shop.currencySymbol}100
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={coinsPerHundred}
                  onChange={(e) => setCoinsPerHundred(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  1 Coin Value ({shop.currencySymbol})
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={coinValueInInr}
                  onChange={(e) => setCoinValueInInr(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Max Redeem % / Bill
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={maxRedeemPercent}
                  onChange={(e) => setMaxRedeemPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Welcome Bonus
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={welcomeBonusCoins}
                  onChange={(e) => setWelcomeBonusCoins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Repeat Visit Bonus (awarded when customer returns)
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={repeatBonusCoins}
                  onChange={(e) => setRepeatBonusCoins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {rulesSaved ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                  <Check className="w-3.5 h-3.5" />
                  Saved &amp; synced to Customer Cards
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={savingRules}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                {savingRules ? 'Saving...' : 'Save Coin Rules'}
              </button>
            </div>
          </form>
        </section>

        {/* Special Offers & Rewards */}
        <section className="lg:col-span-7 bg-white border border-amber-200/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-700" />
              <h2 className="font-display text-base font-semibold text-stone-900">
                Special Loyalty Offers ({offers.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={openAddOffer}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Offer
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-stone-500 mb-3">
                Create special reward vouchers customers can unlock with their {shop.coinName} (also shown on the Customer Portal).
              </p>
              <button
                type="button"
                onClick={openAddOffer}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg cursor-pointer"
              >
                Create First Offer
              </button>
            </div>
          ) : (
            <div className="divide-y divide-amber-100/70">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-amber-50/40"
                >
                  <div>
                    <div className="font-medium text-stone-900 text-sm">
                      {offer.title}
                      {!offer.isActive && (
                        <span className="text-xs text-stone-400 font-normal ml-2">
                          (Paused)
                        </span>
                      )}
                    </div>
                    {offer.description && (
                      <div className="text-xs text-stone-600 mt-0.5">
                        {offer.description}
                      </div>
                    )}
                    <div className="text-xs text-stone-500 font-mono-tabular mt-1.5">
                      Costs {offer.coinsRequired} {shop.coinName} · Saves{' '}
                      {shop.currencySymbol}
                      {offer.discountValue}
                      {offer.minBillAmount > 0 &&
                        ` · Min bill ${shop.currencySymbol}${offer.minBillAmount}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditOffer(offer)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteOffer(offer.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Coin Transaction Ledger */}
      <section className="bg-white border border-amber-200/80 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-100">
          <h2 className="font-display text-base font-semibold text-stone-900">
            Recent {shop.coinName} Activity Ledger
          </h2>
        </div>

        {coinTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            Coin earn and redeem entries will appear here automatically when you issue bills or redeem coins.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-xs text-stone-500 bg-amber-50/40">
                  <th className="text-left font-medium px-5 py-2.5">Customer</th>
                  <th className="text-left font-medium px-3 py-2.5">Type</th>
                  <th className="text-left font-medium px-3 py-2.5">Details</th>
                  <th className="text-right font-medium px-3 py-2.5">Coins</th>
                  <th className="text-right font-medium px-5 py-2.5">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/70">
                {coinTransactions.slice(0, 30).map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-5 py-2.5 font-medium text-stone-900 whitespace-nowrap">
                      {tx.customerName}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-stone-600 capitalize whitespace-nowrap">
                      {tx.type.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-stone-600">
                      {tx.note}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                        tx.coinsDelta >= 0 ? 'text-amber-700' : 'text-stone-900'
                      }`}
                    >
                      {tx.coinsDelta >= 0 ? `+${tx.coinsDelta}` : tx.coinsDelta}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono-tabular text-stone-700 whitespace-nowrap">
                      {tx.balanceAfter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Offer Modal */}
      {offerModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-amber-100 mb-4">
              <h3 className="font-display text-lg font-semibold text-stone-900">
                {editingOffer ? 'Edit Loyalty Offer' : 'Create Loyalty Offer'}
              </h3>
              <button
                type="button"
                onClick={() => setOfferModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSaveOffer(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={offerForm.title}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, title: e.target.value })
                  }
                  placeholder="e.g. ₹100 Weekend Discount"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={offerForm.description}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, description: e.target.value })
                  }
                  placeholder="Redeem 80 coins for instant ₹100 off"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Coins Needed
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={offerForm.coinsRequired}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        coinsRequired: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Discount ({shop.currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={offerForm.discountValue}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        discountValue: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Min Bill ({shop.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={offerForm.minBillAmount}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        minBillAmount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offerForm.isActive}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, isActive: e.target.checked })
                  }
                  className="rounded border-stone-300 text-amber-600"
                />
                Offer is active &amp; visible to customers
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOfferModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-700 border border-stone-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                >
                  {savingOffer ? 'Saving...' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
