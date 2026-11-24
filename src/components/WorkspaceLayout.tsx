import React, { useState } from 'react';
import {
  Coins,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  ReceiptText,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Shop } from '../types/shop';
import { BrandLogo } from './BrandLogo';
import { WorkspaceTab } from './OverviewView';

interface WorkspaceLayoutProps {
  shop: Shop;
  activeTab: WorkspaceTab;
  lowStockCount: number;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenCustomerPortal: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

const TAB_TITLES: Record<WorkspaceTab, string> = {
  overview: 'Store Overview',
  billing: 'Create New Bill',
  bills: 'Bills & Invoices',
  inventory: 'Products & Stock',
  customers: 'Customers & Repeat Visits',
  loyalty: 'Coin Loyalty & Redeem',
  settings: 'Shop Settings',
};

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  shop,
  activeTab,
  lowStockCount,
  onSelectTab,
  onOpenCustomerPortal,
  onSignOut,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    meta?: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'billing', label: 'New Bill', icon: Plus },
    { id: 'bills', label: 'Bills', icon: ReceiptText },
    {
      id: 'inventory',
      label: 'Products & Stock',
      icon: Package,
      meta: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
    },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'loyalty', label: 'Coin Loyalty', icon: Coins },
    { id: 'settings', label: 'Shop Settings', icon: Settings },
  ];

  const SidebarContent = (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 border-r border-stone-800">
      {/* Shop & B&L Brand */}
      <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo variant="icon" size="md" tone="dark" />
          <div className="min-w-0">
            <div className="font-display font-bold text-sm text-amber-50 truncate">
              {shop.shopName}
            </div>
            <div className="text-[11px] text-amber-400/80 truncate">
              B&amp;L · {shop.category}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-stone-400 hover:text-amber-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:bg-stone-900 hover:text-amber-100 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 whitespace-nowrap">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-amber-400' : 'text-stone-500'
                  }`}
                />
                {item.label}
              </span>
              {item.meta && (
                <span className="text-[11px] font-mono-tabular font-semibold text-amber-400">
                  {item.meta}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-stone-800 space-y-1">
        <button
          type="button"
          onClick={onOpenCustomerPortal}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-stone-900 rounded-lg cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          Customer Points Portal
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-400 hover:text-red-400 hover:bg-stone-900 rounded-lg cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf7f0] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-stone-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-full h-full z-10">
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-amber-200/70 px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-1.5 text-stone-600 hover:text-stone-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-stone-500 truncate whitespace-nowrap">
              <span className="text-amber-800 font-medium">{shop.shopName}</span>
              <span className="mx-2 text-stone-300" aria-hidden="true">/</span>
              <span className="font-semibold text-stone-900">
                {TAB_TITLES[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenCustomerPortal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Customer Portal
            </button>
            {activeTab !== 'billing' && (
              <button
                type="button"
                onClick={() => onSelectTab('billing')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                New Bill
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
