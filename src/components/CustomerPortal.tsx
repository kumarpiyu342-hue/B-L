import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Gift,
  ReceiptText,
  Search,
  Sparkles,
  Store,
  UserCheck,
} from 'lucide-react';
import { lookupLoyaltyCardByCode, parseOfferSummary } from '../services/shopService';
import { LoyaltyCard } from '../types/shop';
import { BrandLogo } from './BrandLogo';

interface CustomerPortalProps {
  initialCode?: string;
  onBack: () => void;
  backLabel?: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  initialCode = '',
  onBack,
  backLabel = 'Back to Shopkeeper Login',
}) => {
  const [codeInput, setCodeInput] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [searchedCode, setSearchedCode] = useState('');
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLookup = async (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.length < 3) {
      setErrorMsg('Please enter a valid Customer ID (e.g., A9X2-1001).');
      setCard(null);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSearchedCode(clean);
    try {
      const result = await lookupLoyaltyCardByCode(clean);
      setCard(result);
      if (!result) {
        setErrorMsg(`No loyalty card found for Customer ID "${clean}". Please check your bill receipt.`);
      }
    } catch {
      setErrorMsg('Unable to check points right now. Please try again in a moment.');
      setCard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode.trim().length >= 3) {
      void handleLookup(initialCode);
    }
  }, [initialCode]);

  const parsedOffers = (card?.offersSummary ?? []).map(parseOfferSummary);
  const approxCashValue = card
    ? (card.coinBalance * card.coinValueInInr).toFixed(0)
    : '0';

  return (
    <div className="min-h-screen bg-[#faf7f0] text-stone-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-stone-950 border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <BrandLogo variant="full" size="md" tone="dark" />

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-200 bg-stone-900 border border-stone-700 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </button>
        </div>
      </header>

      {/* Main Lookup Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight mb-2">
            Check Your Shop Loyalty Points
          </h1>
          <p className="text-sm sm:text-base text-stone-600">
            Enter the Customer ID printed on your bill receipt to view your coin balance, total visits, and unlocked shop offers.
          </p>
        </div>

        {/* Search Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLookup(codeInput);
          }}
          className="bg-white border border-amber-200/80 rounded-xl p-4 sm:p-5 mb-8 shadow-sm"
        >
          <label
            htmlFor="customer-id-lookup"
            className="block text-xs font-medium text-stone-600 mb-2"
          >
            Customer ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-amber-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="customer-id-lookup"
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. K9A2-1001"
                maxLength={24}
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono-tabular bg-[#faf7f0] border border-amber-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? 'Checking...' : 'Check Points'}
            </button>
          </div>
          {errorMsg && (
            <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
          )}
        </form>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white border border-amber-200/80 rounded-xl p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-amber-100 rounded w-1/3" />
            <div className="h-12 bg-amber-50 rounded w-1/2" />
            <div className="h-24 bg-stone-100 rounded w-full" />
          </div>
        )}

        {/* Result Card */}
        {!loading && card && (
          <div className="space-y-6">
            {/* Dark Obsidian + Gold Loyalty Wallet Summary */}
            <section className="bg-stone-950 text-stone-100 border border-amber-500/30 rounded-xl p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-stone-800">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-400 mb-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-amber-100">{card.shopName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular text-amber-300">ID: {card.customerCode}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-white">
                    {card.displayName}
                  </h2>
                  <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    {card.visitCount >= 2
                      ? `Returning Member · ${card.visitCount} Visits · ${card.billCount} Bills`
                      : `Member · ${card.visitCount} Visit · ${card.billCount} Bill`}
                  </p>
                </div>

                <div className="sm:text-right">
                  <div className="text-xs text-stone-400 mb-1">
                    Available {card.coinName}
                  </div>
                  <div className="font-mono-tabular text-3xl font-bold text-amber-400">
                    {card.coinBalance.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-amber-200/90 mt-0.5 tabular-nums">
                    Worth {card.currencySymbol}
                    {approxCashValue} in store discounts
                  </div>
                </div>
              </div>

              {/* 4-column metric row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
                <div>
                  <div className="text-xs text-stone-400">Total Bills</div>
                  <div className="font-mono-tabular text-lg font-semibold text-white mt-0.5">
                    {card.billCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-400">Total Visits</div>
                  <div className="font-mono-tabular text-lg font-semibold text-white mt-0.5">
                    {card.visitCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-400">Total Earned</div>
                  <div className="font-mono-tabular text-lg font-semibold text-amber-300 mt-0.5">
                    +{card.totalCoinsEarned}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-400">Total Redeemed</div>
                  <div className="font-mono-tabular text-lg font-semibold text-stone-200 mt-0.5">
                    {card.totalCoinsRedeemed}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-800 text-xs text-stone-400 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Earn rate: {card.coinsPerHundred} {card.coinName} per {card.currencySymbol}100 spent
                  <span className="mx-2" aria-hidden="true">·</span>
                  1 {card.coinName.replace(/s$/, '')} = {card.currencySymbol}
                  {card.coinValueInInr} value
                </span>
                <span className="text-amber-300 font-medium">
                  Show ID <span className="font-mono-tabular font-semibold">{card.customerCode}</span> at counter to redeem
                </span>
              </div>
            </section>

            {/* Special Offers & Rewards */}
            <section className="bg-white border border-amber-200/80 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-4 h-4 text-amber-600" />
                <h3 className="font-display text-base font-semibold text-stone-900">
                  Special Shop Offers &amp; Rewards
                </h3>
              </div>

              {parsedOffers.length === 0 ? (
                <p className="text-sm text-stone-500">
                  Redeem your {card.coinName} directly at the counter for {card.currencySymbol}
                  {card.coinValueInInr} off per coin on your next purchase.
                </p>
              ) : (
                <div className="divide-y divide-amber-100">
                  {parsedOffers.map((offer, idx) => {
                    const unlocked = card.coinBalance >= offer.coinsRequired;
                    const progress = offer.coinsRequired > 0
                      ? Math.min(100, Math.round((card.coinBalance / offer.coinsRequired) * 100))
                      : 100;
                    const remaining = Math.max(0, offer.coinsRequired - card.coinBalance);

                    return (
                      <div key={`${offer.title}-${idx}`} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <div className="text-sm font-semibold text-stone-900">
                              {offer.title}
                            </div>
                            <div className="text-xs text-stone-500 mt-0.5">
                              {offer.coinsRequired} {card.coinName} required
                              {offer.discountValue > 0 && (
                                <>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  Save {card.currencySymbol}
                                  {offer.discountValue}
                                </>
                              )}
                              {offer.minBillAmount > 0 && (
                                <>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  Min bill {card.currencySymbol}
                                  {offer.minBillAmount}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {unlocked ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <Sparkles className="w-3.5 h-3.5" />
                                Ready to Redeem
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-stone-500 tabular-nums">
                                {remaining} more needed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-amber-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              unlocked ? 'bg-amber-600' : 'bg-amber-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent Bills */}
            <section className="bg-white border border-amber-200/80 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ReceiptText className="w-4 h-4 text-amber-700" />
                <h3 className="font-display text-base font-semibold text-stone-900">
                  Recent Purchases
                </h3>
              </div>
              {card.recentBillsSummary.length === 0 ? (
                <p className="text-sm text-stone-500">
                  Your recent bills at {card.shopName} will appear here once billed.
                </p>
              ) : (
                <ul className="divide-y divide-amber-100">
                  {card.recentBillsSummary.map((line, idx) => (
                    <li
                      key={`${line}-${idx}`}
                      className="py-2.5 text-sm text-stone-700 font-mono-tabular"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {!loading && !card && !searchedCode && (
          <div className="bg-white border border-amber-200/80 rounded-xl p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-semibold text-stone-900 mb-1">
              Have a Customer ID from your receipt?
            </h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              Ask the shopkeeper for your Customer ID or check the top of your B&amp;L bill receipt to view your points anytime.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
