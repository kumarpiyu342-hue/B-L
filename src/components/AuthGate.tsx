import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { ArrowRight, Coins, ShieldCheck, Store, Users } from 'lucide-react';
import { createShop, seedStarterCatalogAndOffers } from '../services/shopService';
import { SHOP_CATEGORIES, ShopCategory } from '../types/shop';
import { BrandLogo } from './BrandLogo';

interface AuthGateProps {
  user: User | null;
  authLoading: boolean;
  onSignIn: () => Promise<void>;
  onOpenCustomerPortal: () => void;
  signingIn: boolean;
  authError: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  user,
  authLoading,
  onSignIn,
  onOpenCustomerPortal,
  signingIn,
  authError,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-700 text-sm">
          <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex flex-col">
        {/* Clean 3-zone Top Bar */}
        <header className="bg-stone-950 border-b border-stone-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
            <BrandLogo variant="full" size="md" tone="dark" />

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300">
              <a href="#features" className="hover:text-amber-300 whitespace-nowrap shrink-0 transition-colors">
                Billing &amp; Stock
              </a>
              <a href="#features" className="hover:text-amber-300 whitespace-nowrap shrink-0 transition-colors">
                Repeat Tracking
              </a>
              <a href="#features" className="hover:text-amber-300 whitespace-nowrap shrink-0 transition-colors">
                Coin Loyalty
              </a>
            </nav>

            <button
              type="button"
              onClick={onOpenCustomerPortal}
              className="px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Customer Points Check
            </button>
          </div>
        </header>

        {/* Split Hero */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-16 flex items-center">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch w-full">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3">
                Shop Billing · Inventory · Repeat Customers · Coin Loyalty
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight leading-tight mb-4 [text-wrap:balance]">
                Run your shop billing, stock, and{' '}
                <span className="text-amber-700">coin rewards</span> in one ledger.
              </h1>
              <p className="text-base text-stone-600 leading-relaxed mb-8 max-w-xl">
                Create custom bills in 58mm, 80mm, A5 or A4 sizes, get instant low-stock alerts, track returning customers, and let shoppers earn and redeem coins effortlessly.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => void onSignIn()}
                  disabled={signingIn}
                  className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                >
                  {signingIn ? 'Connecting Google...' : 'Sign in as Shopkeeper'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onOpenCustomerPortal}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-stone-900 bg-white border border-amber-300 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Coins className="w-4 h-4 text-amber-600" />
                  I am a Customer (Check Points)
                </button>
              </div>

              {authError && (
                <p className="text-sm text-red-600 mb-4">{authError}</p>
              )}

              <div
                id="features"
                className="grid sm:grid-cols-3 gap-6 pt-8 mt-6 border-t border-amber-200/80"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-1">
                    <Store className="w-4 h-4 text-amber-700" />
                    Multi-Size POS
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Print 58mm/80mm thermal rolls or A5/A4 GST bills with live stock alerts.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-1">
                    <Users className="w-4 h-4 text-amber-700" />
                    Repeat Insights
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    See returning visits, bill count, and lifetime spend per phone number.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    Earn &amp; Redeem Coins
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Redeem coins or special offers at checkout and track via Customer ID.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-xl overflow-hidden border border-amber-200/80 bg-stone-900 min-h-[320px] lg:min-h-[440px] relative shadow-sm">
                {!imgFailed ? (
                  <img
                    src="/src/assets/images/shop_counter_editorial_1795541954881.jpg"
                    alt="Modern neighborhood retail store counter with digital billing terminal"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-stone-900 to-stone-950 text-amber-100">
                    <BrandLogo variant="full" size="lg" tone="dark" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
};

interface ShopOnboardingProps {
  user: User;
  onCreated: () => void;
}

export const ShopOnboarding: React.FC<ShopOnboardingProps> = ({ user, onCreated }) => {
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState<ShopCategory>('Kirana & Grocery');
  const [ownerName, setOwnerName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [coinName, setCoinName] = useState('Coins');
  const [coinsPerHundred, setCoinsPerHundred] = useState(5);
  const [coinValueInInr, setCoinValueInInr] = useState(1);
  const [welcomeBonusCoins, setWelcomeBonusCoins] = useState(10);
  const [repeatBonusCoins, setRepeatBonusCoins] = useState(5);
  const [seedSamples, setSeedSamples] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shopName.trim().length < 2) {
      setError('Please enter your shop name (at least 2 characters).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createShop(user.uid, {
        shopName,
        category,
        ownerName: ownerName || 'Shopkeeper',
        phone,
        address,
        gstin,
        currencySymbol: '₹',
        taxEnabled: true,
        defaultTaxRate: 5,
        invoicePrefix: 'INV',
        receiptFooter: 'Thank you for shopping with us! Check your coins anytime.',
        coinName,
        coinsPerHundred,
        coinValueInInr,
        maxRedeemPercent: 50,
        welcomeBonusCoins,
        repeatBonusCoins,
      });

      if (seedSamples) {
        await seedStarterCatalogAndOffers(user.uid, category);
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shop.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f0] py-10 px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white border border-amber-200/80 rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6 pb-5 border-b border-amber-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
              Shop Setup · Step 1 of 1
            </div>
            <h1 className="font-display text-2xl font-bold text-stone-900">
              Configure Your Shop &amp; Coin Loyalty
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Customize your store details and loyalty coin rules. You can edit any of these later in Settings.
            </p>
          </div>
          <BrandLogo variant="icon" size="lg" />
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Shop Name *
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Sharma Kirana & General Store"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Shop Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ShopCategory)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {SHOP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Owner Name
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Shop Phone (Optional)
              </label>
              <input
                type="text"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                maxLength={20}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Shop Address (Optional)
              </label>
              <input
                type="text"
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Main Market Road, Sector 4"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          <div className="pt-5 border-t border-amber-100">
            <h2 className="font-display text-sm font-semibold text-stone-900 mb-3">
              Coin Loyalty Rules
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Coin Label
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={coinName}
                  onChange={(e) => setCoinName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Earn per ₹100
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={coinsPerHundred}
                  onChange={(e) => setCoinsPerHundred(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  1 Coin Value (₹)
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={coinValueInInr}
                  onChange={(e) => setCoinValueInInr(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Welcome Bonus
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={welcomeBonusCoins}
                  onChange={(e) => setWelcomeBonusCoins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Repeat Visit Bonus
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={repeatBonusCoins}
                  onChange={(e) => setRepeatBonusCoins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-stone-700 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={seedSamples}
              onChange={(e) => setSeedSamples(e.target.checked)}
              className="mt-1 rounded border-stone-300 text-amber-600 focus:ring-amber-600"
            />
            <span>
              Add starter products (with stock levels) and 2 sample loyalty offers for{' '}
              <strong>{category}</strong> so I can start billing right away
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {saving ? 'Creating Store...' : 'Launch Shop Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
