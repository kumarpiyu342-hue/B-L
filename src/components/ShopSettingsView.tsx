import React, { useState } from 'react';
import {
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Printer,
  Store,
} from 'lucide-react';
import { updateShopSettings } from '../services/shopService';
import {
  Bill,
  CatalogItem,
  CoinTransaction,
  Customer,
  LoyaltyOffer,
  Shop,
  SHOP_CATEGORIES,
  ShopCategory,
} from '../types/shop';
import {
  exportBillsCsv,
  exportCustomersCsv,
  exportFullBackupJson,
  exportInventoryCsv,
} from '../utils/csvAndBackup';
import {
  BillPrintFormat,
  getSavedPrintFormat,
  PRINT_FORMAT_OPTIONS,
  savePrintFormat,
} from '../utils/printFormat';

interface ShopSettingsViewProps {
  shop: Shop;
  items: CatalogItem[];
  customers: Customer[];
  bills: Bill[];
  offers: LoyaltyOffer[];
  coinTransactions: CoinTransaction[];
}

export const ShopSettingsView: React.FC<ShopSettingsViewProps> = ({
  shop,
  items,
  customers,
  bills,
  offers,
  coinTransactions,
}) => {
  const [shopName, setShopName] = useState(shop.shopName);
  const [category, setCategory] = useState<ShopCategory>(shop.category);
  const [ownerName, setOwnerName] = useState(shop.ownerName);
  const [phone, setPhone] = useState(shop.phone);
  const [address, setAddress] = useState(shop.address);
  const [gstin, setGstin] = useState(shop.gstin);
  const [currencySymbol, setCurrencySymbol] = useState(shop.currencySymbol);
  const [taxEnabled, setTaxEnabled] = useState(shop.taxEnabled);
  const [defaultTaxRate, setDefaultTaxRate] = useState(shop.defaultTaxRate);
  const [invoicePrefix, setInvoicePrefix] = useState(shop.invoicePrefix);
  const [receiptFooter, setReceiptFooter] = useState(shop.receiptFooter);
  const [printFormat, setPrintFormat] = useState<BillPrintFormat>(() =>
    getSavedPrintFormat(shop.id)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exportFeedback, setExportFeedback] = useState('');

  const notifyExport = (label: string) => {
    setExportFeedback(`${label} downloaded.`);
    setTimeout(() => setExportFeedback(''), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      savePrintFormat(shop.id, printFormat);
      await updateShopSettings(
        shop.ownerId,
        {
          shopName,
          category,
          ownerName,
          phone,
          address,
          gstin,
          currencySymbol,
          taxEnabled,
          defaultTaxRate,
          invoicePrefix,
          receiptFooter,
          coinName: shop.coinName,
          coinsPerHundred: shop.coinsPerHundred,
          coinValueInInr: shop.coinValueInInr,
          maxRedeemPercent: shop.maxRedeemPercent,
          welcomeBonusCoins: shop.welcomeBonusCoins,
          repeatBonusCoins: shop.repeatBonusCoins,
        },
        customers,
        offers
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white border border-amber-200/80 rounded-xl p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-amber-100 mb-6">
          <Store className="w-4 h-4 text-amber-700" />
          <h2 className="font-display text-base font-semibold text-stone-900">
            Shop Profile &amp; Bill Settings
          </h2>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Shop Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ShopCategory)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {SHOP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Owner Name
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              GSTIN
            </label>
            <input
              type="text"
              maxLength={20}
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              maxLength={200}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Bill Prefix
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              required
              maxLength={5}
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Default Tax / GST (%)
            </label>
            <input
              type="number"
              min={0}
              max={28}
              step="0.5"
              value={defaultTaxRate}
              onChange={(e) => setDefaultTaxRate(Number(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700"
              />
              Enable Tax/GST on bills
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Receipt Footer Note
            </label>
            <input
              type="text"
              maxLength={160}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          {/* Default Bill Print Format & Paper Size */}
          <div className="sm:col-span-2 pt-3 border-t border-amber-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-2.5">
              <Printer className="w-3.5 h-3.5 text-amber-700" />
              Default Bill Print Format &amp; Paper Size
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRINT_FORMAT_OPTIONS.map((opt) => {
                const active = printFormat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPrintFormat(opt.id);
                      savePrintFormat(shop.id, opt.id);
                    }}
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'border-stone-900 bg-stone-900 text-amber-50'
                        : 'border-stone-200 hover:border-amber-400 bg-white text-stone-900'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${active ? 'text-amber-300' : 'text-stone-900'}`}>
                      {opt.label}
                    </div>
                    <div className={`text-[11px] font-mono-tabular mt-0.5 ${active ? 'text-stone-300' : 'text-stone-500'}`}>
                      {opt.sizeNote}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-500 mt-2">
              {PRINT_FORMAT_OPTIONS.find((o) => o.id === printFormat)?.description} (You can also switch sizes on any bill receipt before printing.)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-amber-100">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <Check className="w-4 h-4" />
              Shop settings saved
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
      </div>

      {/* Local Data Backup & Export */}
      <div className="bg-white border border-amber-200/80 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-100">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-display text-base font-semibold text-stone-900">
                Local Data Backup &amp; Export
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Download a complete store snapshot as JSON or export individual tables as CSV for spreadsheets.
              </p>
            </div>
          </div>
          {exportFeedback && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md shrink-0">
              <Check className="w-3.5 h-3.5 text-amber-700" />
              {exportFeedback}
            </span>
          )}
        </div>

        {/* Live Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Bills', count: bills.length },
            { label: 'Customers', count: customers.length },
            { label: 'Products', count: items.length },
            { label: 'Loyalty Offers', count: offers.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-3.5 py-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70"
            >
              <div className="text-[11px] text-stone-500">{stat.label}</div>
              <div className="font-mono-tabular text-base font-bold text-stone-900">
                {stat.count}
              </div>
            </div>
          ))}
        </div>

        {/* Full JSON Backup */}
        <div className="p-4 rounded-xl bg-stone-950 text-stone-100 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              Complete Shop Backup (.JSON)
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Includes shop profile, all {bills.length} bills, {customers.length} customers, {items.length} products, offers, and coin transactions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              exportFullBackupJson({
                shop,
                items,
                customers,
                bills,
                offers,
                coinTransactions,
              });
              notifyExport('Full JSON backup');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON Backup
          </button>
        </div>

        {/* Individual CSV Exports */}
        <div>
          <div className="text-xs font-medium text-stone-700 mb-2.5">
            Individual CSV Exports (Excel / Google Sheets compatible)
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                exportBillsCsv(shop.shopName, bills);
                notifyExport('Bills CSV');
              }}
              className="flex items-center justify-between gap-2 px-4 py-3 text-left border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl transition-colors cursor-pointer"
            >
              <div>
                <div className="text-xs font-semibold text-stone-900">Bills Ledger</div>
                <div className="text-[11px] text-stone-500 font-mono-tabular">
                  {bills.length} records
                </div>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-amber-700 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                exportCustomersCsv(shop.shopName, customers);
                notifyExport('Customers CSV');
              }}
              className="flex items-center justify-between gap-2 px-4 py-3 text-left border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl transition-colors cursor-pointer"
            >
              <div>
                <div className="text-xs font-semibold text-stone-900">Customers &amp; Coins</div>
                <div className="text-[11px] text-stone-500 font-mono-tabular">
                  {customers.length} records
                </div>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-amber-700 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                exportInventoryCsv(shop.shopName, items);
                notifyExport('Inventory CSV');
              }}
              className="flex items-center justify-between gap-2 px-4 py-3 text-left border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl transition-colors cursor-pointer"
            >
              <div>
                <div className="text-xs font-semibold text-stone-900">Product Inventory</div>
                <div className="text-[11px] text-stone-500 font-mono-tabular">
                  {items.length} products
                </div>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-amber-700 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
