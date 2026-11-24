import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  addCatalogItem,
  addCatalogItemsBatch,
  adjustItemStock,
  deleteCatalogItem,
  ProductInput,
  updateCatalogItem,
} from '../services/shopService';
import { CatalogItem, Shop } from '../types/shop';
import {
  downloadSampleInventoryCsv,
  exportInventoryCsv,
  ParsedCsvImportResult,
  parseInventoryCsv,
} from '../utils/csvAndBackup';

interface InventoryViewProps {
  shop: Shop;
  items: CatalogItem[];
  autoOpenAdd?: boolean;
  onAutoOpenHandled?: () => void;
}

const emptyForm: ProductInput = {
  name: '',
  sku: '',
  category: 'General',
  unit: 'pcs',
  price: 0,
  taxRate: 5,
  stockQuantity: 10,
  lowStockThreshold: 5,
  isActive: true,
};

export const InventoryView: React.FC<InventoryViewProps> = ({
  shop,
  items,
  autoOpenAdd,
  onAutoOpenHandled,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low' | 'out' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Bulk CSV Import state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRawText, setCsvRawText] = useState('');
  const [csvParsed, setCsvParsed] = useState<ParsedCsvImportResult | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  useEffect(() => {
    if (autoOpenAdd) {
      setEditingItem(null);
      setForm({ ...emptyForm, taxRate: shop.taxEnabled ? shop.defaultTaxRate : 0 });
      setErrorMsg('');
      setModalOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenAdd, onAutoOpenHandled, shop.taxEnabled, shop.defaultTaxRate]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = item.category.trim() || 'General';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const lowStockItems = useMemo(
    () => items.filter((i) => i.stockQuantity <= i.lowStockThreshold),
    [items]
  );
  const outOfStockItems = useMemo(
    () => items.filter((i) => i.stockQuantity <= 0),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter !== 'all' && (i.category.trim() || 'General') !== categoryFilter) {
        return false;
      }
      if (filter === 'in_stock' && (i.stockQuantity <= i.lowStockThreshold || !i.isActive)) {
        return false;
      }
      if (filter === 'low' && i.stockQuantity > i.lowStockThreshold) return false;
      if (filter === 'out' && i.stockQuantity > 0) return false;
      if (filter === 'inactive' && i.isActive) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.unit.toLowerCase().includes(q)
      );
    });
  }, [items, filter, categoryFilter, search]);

  const hasActiveFilters =
    Boolean(search.trim()) || filter !== 'all' || categoryFilter !== 'all';

  const openAdd = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, taxRate: shop.taxEnabled ? shop.defaultTaxRate : 0 });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      price: item.price,
      taxRate: item.taxRate,
      stockQuantity: item.stockQuantity,
      lowStockThreshold: item.lowStockThreshold,
      isActive: item.isActive,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      if (editingItem) {
        await updateCatalogItem(shop.ownerId, editingItem.id, form);
      } else {
        await addCatalogItem(shop.ownerId, form);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRestock = async (item: CatalogItem, delta: number) => {
    setBusyId(item.id);
    try {
      await adjustItemStock(shop.ownerId, item.id, Math.max(0, item.stockQuantity + delta));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    setBusyId(item.id);
    try {
      await deleteCatalogItem(shop.ownerId, item.id);
    } finally {
      setBusyId(null);
    }
  };

  const openCsvModal = () => {
    setCsvFileName('');
    setCsvRawText('');
    setCsvParsed(null);
    setImportError('');
    setCsvModalOpen(true);
  };

  const parseCsvInput = (raw: string) => {
    setCsvRawText(raw);
    setImportError('');
    if (!raw.trim()) {
      setCsvParsed(null);
      return;
    }
    const defaultTax = shop.taxEnabled ? shop.defaultTaxRate : 0;
    setCsvParsed(parseInventoryCsv(raw, defaultTax));
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const text = await file.text();
    parseCsvInput(text);
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    if (!csvParsed || csvParsed.validProducts.length === 0) return;
    setImportingCsv(true);
    setImportError('');
    try {
      const count = await addCatalogItemsBatch(shop.ownerId, csvParsed.validProducts);
      setCsvModalOpen(false);
      setImportSuccess(`Imported ${count} ${count === 1 ? 'product' : 'products'} into inventory.`);
      setTimeout(() => setImportSuccess(''), 5000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import CSV products.');
    } finally {
      setImportingCsv(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Low Stock Alert Strip */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-slate-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>{lowStockItems.length}</strong>{' '}
              {lowStockItems.length === 1 ? 'product is' : 'products are'} below low-stock threshold
              {outOfStockItems.length > 0 && (
                <span className="text-red-700 font-medium">
                  {' '}
                  ({outOfStockItems.length} out of stock)
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer self-start sm:self-center"
          >
            {filter === 'low' ? 'Show All Products' : 'Filter Low-Stock Items'}
          </button>
        </div>
      )}

      {/* CSV Import Confirmation Banner */}
      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportSuccess('')}
            className="text-xs text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-amber-100/70 border border-amber-200/70 rounded-lg self-start">
          {(
            [
              { id: 'all', label: `All Products (${items.length})` },
              { id: 'low', label: `Low Stock (${lowStockItems.length})` },
              { id: 'out', label: `Out of Stock (${outOfStockItems.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === t.id
                  ? 'bg-stone-900 text-amber-300 shadow-sm'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] sm:w-56">
            <Search className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative">
            <Tag className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-8 pr-7 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
            >
              <option value="all">All Categories ({items.length})</option>
              {categories.map(([cat, count]) => (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter Dropdown */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filter by stock status"
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as 'all' | 'in_stock' | 'low' | 'out' | 'inactive'
                )
              }
              className="pl-8 pr-7 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => exportInventoryCsv(shop.shopName, filtered.length ? filtered : items)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={openCsvModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
          <span className="text-stone-600 font-mono-tabular">
            Showing <strong>{filtered.length}</strong> of {items.length} products
          </span>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilter('all');
              setCategoryFilter('all');
            }}
            className="font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Product Table */}
      <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="w-8 h-8 text-amber-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500 mb-4">
              {items.length === 0
                ? 'No products in your shop inventory yet.'
                : 'No products match your filter.'}
            </p>
            {items.length === 0 && (
              <div className="inline-flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={openAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Product
                </button>
                <button
                  type="button"
                  onClick={openCsvModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded-lg cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Bulk Import CSV
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-xs text-stone-500 bg-amber-50/40">
                  <th className="text-left font-medium px-5 py-3">Product</th>
                  <th className="text-left font-medium px-3 py-3">Category</th>
                  <th className="text-right font-medium px-3 py-3">Price</th>
                  <th className="text-right font-medium px-3 py-3">Stock</th>
                  <th className="text-right font-medium px-3 py-3">Alert Below</th>
                  <th className="text-left font-medium px-3 py-3">Status</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/70">
                {filtered.map((item) => {
                  const isOut = item.stockQuantity <= 0;
                  const isLow = !isOut && item.stockQuantity <= item.lowStockThreshold;
                  return (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-stone-900">
                          {item.name}
                        </div>
                        <div className="text-xs text-stone-500 font-mono-tabular">
                          {item.sku || 'No SKU'} · Unit: {item.unit}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-stone-600">
                        {item.category}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular font-semibold text-stone-900 whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isOut
                              ? 'text-red-700'
                              : isLow
                                ? 'text-amber-700'
                                : 'text-stone-900'
                          }`}
                        >
                          {item.stockQuantity}
                        </span>{' '}
                        <span className="text-xs text-stone-500">{item.unit}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular text-xs text-stone-500 whitespace-nowrap">
                        {item.lowStockThreshold} {item.unit}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">
                        {!item.isActive ? (
                          <span className="text-stone-400">Inactive</span>
                        ) : isOut ? (
                          <span className="text-red-700 font-medium">Out of Stock</span>
                        ) : isLow ? (
                          <span className="text-amber-700 font-medium">Low Stock</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">In Stock</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void handleQuickRestock(item, 10)}
                            className="px-2 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer"
                          >
                            +10 Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            aria-label={`Edit ${item.name}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void handleDelete(item)}
                            aria-label={`Delete ${item.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add/Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Basmati Rice (5kg)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Staples"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    SKU / Code (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={32}
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="SKU-101"
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Selling Price ({shop.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit (pcs, kg, pack)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={form.stockQuantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stockQuantity: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Low-Stock Alert Threshold *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lowStockThreshold: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tax / GST %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={28}
                    step="0.5"
                    value={form.taxRate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        taxRate: Math.min(28, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    Active in POS billing
                  </label>
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {saving
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="font-display text-lg font-semibold text-stone-900">
                    Bulk Import Products (CSV)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Upload a CSV file with columns like Name, Price, SKU, Category, Unit, StockQuantity, LowStockThreshold
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-300 bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {csvFileName ? `Selected: ${csvFileName}` : 'Choose .CSV File'}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => void handleCsvFileChange(e)}
                      className="hidden"
                    />
                  </label>
                  <span className="block sm:inline-block sm:ml-3 mt-1.5 sm:mt-0 text-xs text-stone-600">
                    Required columns: <span className="font-semibold">Name</span> &amp;{' '}
                    <span className="font-semibold">Price</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleInventoryCsv}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 underline self-start sm:self-center cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Or paste CSV content directly
                </label>
                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={(e) => parseCsvInput(e.target.value)}
                  placeholder={'Name,SKU,Category,Unit,Price,TaxRate,StockQuantity,LowStockThreshold\nBasmati Rice 5kg,SKU-101,Staples,bag,480,0,25,5'}
                  className="w-full px-3 py-2 text-xs font-mono-tabular border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {csvParsed && csvParsed.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 space-y-1">
                  <div className="font-semibold">
                    {csvParsed.errors.length}{' '}
                    {csvParsed.errors.length === 1 ? 'row skipped' : 'rows skipped'}:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {csvParsed.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>
                        Row {err.rowNumber}: {err.message}
                      </li>
                    ))}
                  </ul>
                  {csvParsed.errors.length > 5 && (
                    <div className="text-red-700">
                      + {csvParsed.errors.length - 5} more row errors
                    </div>
                  )}
                </div>
              )}

              {csvParsed && csvParsed.validProducts.length > 0 && (
                <div className="border border-amber-200/80 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-900">
                      Preview ({csvParsed.validProducts.length} ready to import)
                    </span>
                    <span className="text-stone-500">
                      {csvParsed.validProducts.length > 8 ? 'Showing first 8 rows' : 'All rows shown'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-amber-100 text-stone-500 bg-white">
                          <th className="text-left font-medium px-3 py-2">Name</th>
                          <th className="text-left font-medium px-3 py-2">Category</th>
                          <th className="text-right font-medium px-3 py-2">Price</th>
                          <th className="text-right font-medium px-3 py-2">Stock</th>
                          <th className="text-right font-medium px-3 py-2">Alert</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100/70">
                        {csvParsed.validProducts.slice(0, 8).map((p, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-stone-900">
                              {p.name}
                              {p.sku && (
                                <span className="ml-1.5 font-mono-tabular text-[11px] text-stone-400">
                                  ({p.sku})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-stone-600">{p.category}</td>
                            <td className="px-3 py-2 text-right font-mono-tabular text-stone-900">
                              {shop.currencySymbol}
                              {p.price.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono-tabular text-stone-900">
                              {p.stockQuantity} {p.unit}
                            </td>
                            <td className="px-3 py-2 text-right font-mono-tabular text-stone-500">
                              {p.lowStockThreshold}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importError && <p className="text-xs text-red-600">{importError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-amber-100 bg-amber-50/30">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  importingCsv || !csvParsed || csvParsed.validProducts.length === 0
                }
                onClick={() => void handleBulkImport()}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {importingCsv
                  ? 'Importing...'
                  : csvParsed && csvParsed.validProducts.length > 0
                    ? `Import ${csvParsed.validProducts.length} ${csvParsed.validProducts.length === 1 ? 'Product' : 'Products'}`
                    : 'Import Products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
