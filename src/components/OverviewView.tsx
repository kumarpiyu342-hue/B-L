import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  PackagePlus,
  Plus,
  ReceiptText,
  Repeat,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bill, CatalogItem, Customer, Shop } from '../types/shop';

export type WorkspaceTab =
  | 'overview'
  | 'billing'
  | 'bills'
  | 'inventory'
  | 'customers'
  | 'loyalty'
  | 'settings';

export type QuickActionType = 'new_sale' | 'add_product' | 'register_customer';

interface OverviewViewProps {
  shop: Shop;
  bills: Bill[];
  customers: Customer[];
  items: CatalogItem[];
  onNavigate: (tab: WorkspaceTab) => void;
  onQuickAction: (action: QuickActionType) => void;
  onStartBillForCustomer: (customer: Customer) => void;
  onOpenReceipt: (bill: Bill) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  shop,
  bills,
  customers,
  items,
  onNavigate,
  onQuickAction,
  onStartBillForCustomer,
  onOpenReceipt,
}) => {
  const [fabOpen, setFabOpen] = useState(true);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const nonVoidBills = useMemo(
    () => bills.filter((b) => b.status !== 'void'),
    [bills]
  );

  const todaysBills = nonVoidBills.filter(
    (b) => b.createdAt && b.createdAt.toDate() >= todayStart
  );
  const todaysRevenue = todaysBills.reduce((sum, b) => sum + b.totalAmount, 0);

  const revenueTrendData = useMemo(() => {
    const days: {
      key: string;
      label: string;
      sales: number;
      billCount: number;
    }[] = [];

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - offset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
      days.push({ key, label, sales: 0, billCount: 0 });
    }

    const dayMap = new Map(days.map((d) => [d.key, d]));

    for (const bill of nonVoidBills) {
      if (!bill.createdAt) continue;
      const dt = bill.createdAt.toDate();
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const bucket = dayMap.get(key);
      if (bucket) {
        bucket.sales = Math.round((bucket.sales + bill.totalAmount) * 100) / 100;
        bucket.billCount += 1;
      }
    }

    return days;
  }, [nonVoidBills, todayStart]);

  const sevenDayTotal = useMemo(
    () => revenueTrendData.reduce((sum, d) => sum + d.sales, 0),
    [revenueTrendData]
  );

  const repeatCustomers = customers.filter((c) => c.visitCount >= 2);
  const repeatRate =
    customers.length > 0
      ? Math.round((repeatCustomers.length / customers.length) * 100)
      : 0;

  const activeCoins = customers.reduce((sum, c) => sum + c.coinBalance, 0);
  const lowStockItems = items.filter(
    (i) => i.isActive && i.stockQuantity <= i.lowStockThreshold
  );

  const topReturning = [...customers]
    .sort((a, b) => b.visitCount - a.visitCount || b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const recentBills = bills.slice(0, 6);

  return (
    <div className="space-y-8 pb-20 sm:pb-8">
      {/* Quick Actions Section */}
      <section className="bg-stone-950 text-stone-100 border border-amber-500/35 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-amber-300">
                Quick Actions
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Jump straight into billing, stock updates, or customer onboarding.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onQuickAction('new_sale')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              New Sale
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add_product')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-200 bg-stone-900 hover:bg-stone-800 border border-amber-500/40 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4 text-amber-400" />
              Add Product
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('register_customer')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-200 bg-stone-900 hover:bg-stone-800 border border-amber-500/40 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              Register Customer
            </button>
          </div>
        </div>
      </section>

      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Today&apos;s Sales</span>
            <ReceiptText className="w-4 h-4 text-amber-700" />
          </div>
          <div className="font-mono-tabular text-2xl font-bold text-stone-900">
            {shop.currencySymbol}
            {todaysRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-stone-500 mt-1 tabular-nums">
            {todaysBills.length} bills today · {nonVoidBills.length} total bills
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Repeat Customers</span>
            <Repeat className="w-4 h-4 text-amber-700" />
          </div>
          <div className="font-mono-tabular text-2xl font-bold text-stone-900">
            {repeatCustomers.length}
            <span className="text-sm font-medium text-stone-500 ml-1.5">
              / {customers.length}
            </span>
          </div>
          <div className="text-xs text-amber-700 font-medium mt-1 tabular-nums">
            {repeatRate}% customer return rate
          </div>
        </div>

        <div className="bg-stone-950 text-stone-100 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
            <span>Active {shop.coinName}</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono-tabular text-2xl font-bold text-amber-400">
            {activeCoins.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-amber-200/80 mt-1 tabular-nums flex items-center justify-between gap-2">
            <span>
              Worth {shop.currencySymbol}
              {(activeCoins * shop.coinValueInInr).toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('loyalty')}
              className="text-amber-300 font-semibold hover:underline cursor-pointer"
            >
              Redeem
            </button>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Stock Health</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                lowStockItems.length > 0 ? 'text-amber-600' : 'text-stone-400'
              }`}
            />
          </div>
          <div className="font-mono-tabular text-2xl font-bold text-stone-900">
            {lowStockItems.length}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {lowStockItems.length > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-amber-700 font-medium hover:underline cursor-pointer"
              >
                Items below threshold — Restock
              </button>
            ) : (
              'All catalog items well stocked'
            )}
          </div>
        </div>
      </section>

      {/* Revenue Trends Chart (Past 7 Days) */}
      <section className="bg-white border border-amber-200/80 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              <h2 className="font-display text-base font-semibold text-stone-900">
                Revenue Trends
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Daily sales across the past 7 days (excluding voided bills)
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-stone-500">7-Day Total</div>
            <div className="font-mono-tabular text-lg font-bold text-amber-800">
              {shop.currencySymbol}
              {sevenDayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueTrendData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8c8" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#78716c' }}
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(val: number) =>
                  `${shop.currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1c1917',
                  color: '#fef3c7',
                  border: '1px solid #b45309',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(28, 25, 23, 0.25)',
                }}
                labelStyle={{ color: '#fcd34d', fontWeight: 600 }}
                formatter={(value: unknown, _name: unknown, item: { payload?: { billCount?: number } }) => {
                  const amount = Number(value) || 0;
                  const count = item?.payload?.billCount ?? 0;
                  return [
                    `${shop.currencySymbol}${amount.toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })} (${count} ${count === 1 ? 'bill' : 'bills'})`,
                    'Daily Sales',
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#b45309"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueFill)"
                activeDot={{ r: 5, fill: '#b45309', stroke: '#fef3c7', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Low Stock Alert Strip */}
      {lowStockItems.length > 0 && (
        <section className="bg-amber-50 border border-amber-300/80 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <h2 className="font-display text-sm font-semibold text-stone-900">
                Low-Stock Alerts ({lowStockItems.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 cursor-pointer whitespace-nowrap"
            >
              Manage Inventory
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="bg-white border border-amber-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-stone-500">
                    Alert below {item.lowStockThreshold} {item.unit}
                  </div>
                </div>
                <div
                  className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                    item.stockQuantity === 0 ? 'text-red-700' : 'text-amber-700'
                  }`}
                >
                  {item.stockQuantity === 0
                    ? 'Out of stock'
                    : `${item.stockQuantity} ${item.unit} left`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Split: Recent Bills + Repeat Customers */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Bills */}
        <section className="lg:col-span-7 bg-white border border-amber-200/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-semibold text-stone-900">
              Recent Bills
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                View all
              </button>
              <button
                type="button"
                onClick={() => onNavigate('billing')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                New Bill
              </button>
            </div>
          </div>

          {recentBills.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-stone-500 mb-4">
                No bills created yet. Generate your first shop bill to start tracking repeat visits and coins.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('billing')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Bill
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-100 text-xs text-stone-500 bg-amber-50/40">
                    <th className="text-left font-medium px-5 py-2.5">Bill</th>
                    <th className="text-left font-medium px-3 py-2.5">Customer</th>
                    <th className="text-right font-medium px-3 py-2.5">Amount</th>
                    <th className="text-right font-medium px-5 py-2.5">Coins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/70">
                  {recentBills.map((bill) => (
                    <tr
                      key={bill.id}
                      onClick={() => onOpenReceipt(bill)}
                      className="hover:bg-amber-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-mono-tabular font-medium text-stone-900">
                          {bill.billNumber}
                        </div>
                        <div className="text-xs text-stone-500">
                          {bill.paymentMode}
                          {bill.status === 'void' && ' · Void'}
                          {bill.status === 'pending' && ' · Pending'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-stone-900">
                          {bill.customerName}
                        </div>
                        <div className="text-xs text-stone-500">
                          {bill.isRepeatVisit
                            ? `Returning · Visit #${bill.visitNumber}`
                            : 'First visit'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular font-semibold text-stone-900 whitespace-nowrap">
                        {shop.currencySymbol}
                        {bill.totalAmount.toFixed(0)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-tabular text-xs text-amber-700 font-semibold whitespace-nowrap">
                        +{bill.coinsEarned}
                        {bill.coinsRedeemed > 0 && (
                          <span className="text-stone-500 font-normal ml-1.5">
                            (-{bill.coinsRedeemed})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top Repeat Customers */}
        <section className="lg:col-span-5 bg-white border border-amber-200/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700" />
              <h2 className="font-display text-base font-semibold text-stone-900">
                Top Repeat Customers
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              All customers
            </button>
          </div>

          {topReturning.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              Customer visit counts and loyalty balances will appear here after your first bill.
            </div>
          ) : (
            <div className="divide-y divide-amber-100/70">
              {topReturning.map((c) => (
                <div
                  key={c.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 font-mono-tabular">
                      {c.customerCode} · {c.visitCount} visits · {c.billCount} bills
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono-tabular text-sm font-semibold text-amber-700">
                        {c.coinBalance} {shop.coinName}
                      </div>
                      <div className="font-mono-tabular text-xs text-stone-500">
                        {shop.currencySymbol}
                        {c.totalSpent.toLocaleString('en-IN', {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartBillForCustomer(c)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-stone-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 cursor-pointer whitespace-nowrap"
                    >
                      Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => onQuickAction('register_customer')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-900 bg-white hover:bg-amber-50 border border-amber-300 rounded-full shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-700" />
              Register Customer
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('add_product')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-900 bg-white hover:bg-amber-50 border border-amber-300 rounded-full shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PackagePlus className="w-3.5 h-3.5 text-amber-700" />
              Add Product
            </button>
            <button
              type="button"
              onClick={() => onQuickAction('new_sale')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 rounded-full shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              New Sale
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? 'Collapse quick actions' : 'Open quick actions'}
          className="w-12 h-12 rounded-full bg-stone-950 hover:bg-stone-900 text-amber-400 border border-amber-500/50 shadow-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        >
          {fabOpen ? <X className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
