import { Timestamp } from 'firebase/firestore';
import { ProductInput } from '../services/shopService';
import {
  Bill,
  CatalogItem,
  CoinTransaction,
  Customer,
  LoyaltyOffer,
  Shop,
} from '../types/shop';

const tsToIso = (ts?: Timestamp): string => {
  if (!ts) return '';
  try {
    return ts.toDate().toISOString();
  } catch {
    return '';
  }
};

const tsToLocalDate = (ts?: Timestamp): string => {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleString('en-IN');
  } catch {
    return '';
  }
};

const safeFilenameSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'shop';

const todaySlug = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsvCell(val: string | number | boolean | undefined | null): string {
  const str = val === undefined || val === null ? '' : String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvString(headers: string[], rows: (string | number | boolean | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((r) => r.map(escapeCsvCell).join(','));
  return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
}

export function exportInventoryCsv(shopName: string, items: CatalogItem[]): void {
  const headers = [
    'Name',
    'SKU',
    'Category',
    'Unit',
    'Price',
    'TaxRate',
    'StockQuantity',
    'LowStockThreshold',
    'IsActive',
  ];
  const rows = items.map((i) => [
    i.name,
    i.sku,
    i.category,
    i.unit,
    i.price,
    i.taxRate,
    i.stockQuantity,
    i.lowStockThreshold,
    i.isActive ? 'true' : 'false',
  ]);
  const csv = toCsvString(headers, rows);
  triggerFileDownload(
    csv,
    `${safeFilenameSlug(shopName)}-inventory-${todaySlug()}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportCustomersCsv(shopName: string, customers: Customer[]): void {
  const headers = [
    'CustomerCode',
    'Name',
    'Phone',
    'Visits',
    'Bills',
    'TotalSpent',
    'CoinBalance',
    'TotalCoinsEarned',
    'TotalCoinsRedeemed',
    'Notes',
    'FirstVisitAt',
    'LastVisitAt',
  ];
  const rows = customers.map((c) => [
    c.customerCode,
    c.name,
    c.phone,
    c.visitCount,
    c.billCount,
    c.totalSpent,
    c.coinBalance,
    c.totalCoinsEarned,
    c.totalCoinsRedeemed,
    c.notes,
    tsToLocalDate(c.firstVisitAt),
    tsToLocalDate(c.lastVisitAt),
  ]);
  const csv = toCsvString(headers, rows);
  triggerFileDownload(
    csv,
    `${safeFilenameSlug(shopName)}-customers-${todaySlug()}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportBillsCsv(shopName: string, bills: Bill[]): void {
  const headers = [
    'BillNumber',
    'CreatedAt',
    'CustomerName',
    'CustomerPhone',
    'CustomerCode',
    'RepeatVisit',
    'VisitNumber',
    'ItemCount',
    'Subtotal',
    'TaxAmount',
    'StoreDiscount',
    'CoinsRedeemed',
    'CoinDiscount',
    'AppliedOffer',
    'CoinsEarned',
    'TotalAmount',
    'PaymentMode',
    'Status',
    'Notes',
  ];
  const rows = bills.map((b) => [
    b.billNumber,
    tsToLocalDate(b.createdAt),
    b.customerName,
    b.customerPhone,
    b.customerCode,
    b.isRepeatVisit ? 'Yes' : 'No',
    b.visitNumber,
    b.itemCount,
    b.subtotal,
    b.taxAmount,
    b.discountAmount,
    b.coinsRedeemed,
    b.coinDiscount,
    b.appliedOfferTitle,
    b.coinsEarned,
    b.totalAmount,
    b.paymentMode,
    b.status,
    b.notes,
  ]);
  const csv = toCsvString(headers, rows);
  triggerFileDownload(
    csv,
    `${safeFilenameSlug(shopName)}-bills-${todaySlug()}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportFullBackupJson(params: {
  shop: Shop;
  items: CatalogItem[];
  customers: Customer[];
  bills: Bill[];
  offers?: LoyaltyOffer[];
  coinTransactions?: CoinTransaction[];
}): void {
  const { shop, items, customers, bills, offers = [], coinTransactions = [] } = params;

  const payload = {
    app: 'B&L — Billing & Loyalty',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    shop: {
      ...shop,
      createdAt: tsToIso(shop.createdAt),
      updatedAt: tsToIso(shop.updatedAt),
    },
    counts: {
      inventory: items.length,
      customers: customers.length,
      bills: bills.length,
      offers: offers.length,
      coinTransactions: coinTransactions.length,
    },
    inventory: items.map((i) => ({
      ...i,
      createdAt: tsToIso(i.createdAt),
      updatedAt: tsToIso(i.updatedAt),
    })),
    customers: customers.map((c) => ({
      ...c,
      firstVisitAt: tsToIso(c.firstVisitAt),
      lastVisitAt: tsToIso(c.lastVisitAt),
      createdAt: tsToIso(c.createdAt),
      updatedAt: tsToIso(c.updatedAt),
    })),
    bills: bills.map((b) => ({
      ...b,
      createdAt: tsToIso(b.createdAt),
      updatedAt: tsToIso(b.updatedAt),
    })),
    offers: offers.map((o) => ({
      ...o,
      createdAt: tsToIso(o.createdAt),
      updatedAt: tsToIso(o.updatedAt),
    })),
    coinTransactions: coinTransactions.map((t) => ({
      ...t,
      createdAt: tsToIso(t.createdAt),
    })),
  };

  triggerFileDownload(
    JSON.stringify(payload, null, 2),
    `${safeFilenameSlug(shop.shopName)}-backup-${todaySlug()}.json`,
    'application/json;charset=utf-8;'
  );
}

export function downloadSampleInventoryCsv(): void {
  const headers = [
    'Name',
    'SKU',
    'Category',
    'Unit',
    'Price',
    'TaxRate',
    'StockQuantity',
    'LowStockThreshold',
    'IsActive',
  ];
  const sampleRows = [
    ['Basmati Rice (5kg)', 'SKU-201', 'Staples', 'bag', 480, 0, 25, 5, 'true'],
    ['Sunflower Oil (1L)', 'SKU-202', 'Cooking', 'bottle', 155, 5, 40, 8, 'true'],
    ['Masala Chai (250g)', 'SKU-203', 'Beverages', 'pack', 120, 5, 18, 5, 'true'],
  ];
  const csv = toCsvString(headers, sampleRows);
  triggerFileDownload(csv, 'bnl-sample-products.csv', 'text/csv;charset=utf-8;');
}

// RFC-4180 CSV parser
export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  row.push(field.trim());
  if (row.some((c) => c !== '')) {
    rows.push(row);
  }
  return rows;
}

export interface ParsedCsvImportResult {
  validProducts: ProductInput[];
  errors: { rowNumber: number; message: string }[];
}

const normalizeHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseInventoryCsv(
  rawText: string,
  defaultTaxRate: number
): ParsedCsvImportResult {
  const matrix = parseCsvMatrix(rawText);
  if (matrix.length < 2) {
    return {
      validProducts: [],
      errors: [{ rowNumber: 1, message: 'CSV must include a header row and at least one product row.' }],
    };
  }

  const headers = matrix[0].map(normalizeHeader);
  const findCol = (aliases: string[]): number =>
    headers.findIndex((h) => aliases.includes(h));

  const nameCol = findCol(['name', 'product', 'productname', 'item', 'itemname', 'title']);
  const skuCol = findCol(['sku', 'code', 'itemcode', 'barcode']);
  const catCol = findCol(['category', 'cat', 'group']);
  const unitCol = findCol(['unit', 'uom']);
  const priceCol = findCol(['price', 'sellingprice', 'rate', 'mrp', 'amount']);
  const taxCol = findCol(['taxrate', 'tax', 'gst', 'gstpercent']);
  const stockCol = findCol(['stockquantity', 'stock', 'qty', 'quantity', 'currentstock']);
  const lowCol = findCol(['lowstockthreshold', 'lowstock', 'alertbelow', 'minstock', 'threshold']);
  const activeCol = findCol(['isactive', 'active', 'status']);

  if (nameCol === -1 || priceCol === -1) {
    return {
      validProducts: [],
      errors: [
        {
          rowNumber: 1,
          message: 'CSV header must include at least "Name" and "Price" columns (optional: SKU, Category, Unit, TaxRate, StockQuantity, LowStockThreshold, IsActive).',
        },
      ],
    };
  }

  const validProducts: ProductInput[] = [];
  const errors: { rowNumber: number; message: string }[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const rowNumber = r + 1;

    const rawName = (cells[nameCol] || '').trim();
    if (!rawName) {
      errors.push({ rowNumber, message: 'Missing product name.' });
      continue;
    }

    const rawPrice = (cells[priceCol] || '').replace(/[^0-9.-]/g, '');
    const parsedPrice = Number(rawPrice);
    if (rawPrice === '' || Number.isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 10000000) {
      errors.push({ rowNumber, message: `Invalid price for "${rawName}".` });
      continue;
    }

    const rawStock = stockCol >= 0 ? (cells[stockCol] || '').replace(/[^0-9.-]/g, '') : '10';
    const parsedStock = rawStock === '' ? 10 : Number(rawStock);
    if (Number.isNaN(parsedStock) || parsedStock < 0 || parsedStock > 1000000) {
      errors.push({ rowNumber, message: `Invalid stock quantity for "${rawName}".` });
      continue;
    }

    const rawLow = lowCol >= 0 ? (cells[lowCol] || '').replace(/[^0-9.-]/g, '') : '5';
    const parsedLow = rawLow === '' ? 5 : Number(rawLow);
    const safeLow = Number.isNaN(parsedLow) ? 5 : Math.min(100000, Math.max(0, parsedLow));

    const rawTax = taxCol >= 0 ? (cells[taxCol] || '').replace(/[^0-9.-]/g, '') : '';
    const parsedTax = rawTax === '' ? defaultTaxRate : Number(rawTax);
    const safeTax = Number.isNaN(parsedTax) ? defaultTaxRate : Math.min(28, Math.max(0, parsedTax));

    const rawActive = activeCol >= 0 ? (cells[activeCol] || '').toLowerCase() : 'true';
    const isActive = !['false', '0', 'no', 'inactive'].includes(rawActive);

    validProducts.push({
      name: rawName.slice(0, 80),
      sku: (skuCol >= 0 ? cells[skuCol] || '' : '').slice(0, 32),
      category: (catCol >= 0 && cells[catCol] ? cells[catCol] : 'General').slice(0, 40),
      unit: (unitCol >= 0 && cells[unitCol] ? cells[unitCol] : 'pcs').slice(0, 16),
      price: Math.round(parsedPrice * 100) / 100,
      taxRate: Math.round(safeTax * 100) / 100,
      stockQuantity: Math.round(parsedStock * 100) / 100,
      lowStockThreshold: Math.round(safeLow * 100) / 100,
      isActive,
    });
  }

  return { validProducts, errors };
}
