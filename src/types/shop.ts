import { Timestamp } from 'firebase/firestore';

export type ShopCategory =
  | 'Kirana & Grocery'
  | 'Apparel & Boutique'
  | 'Electronics & Mobile'
  | 'Pharmacy & Wellness'
  | 'Cafe & Bakery'
  | 'Hardware & Auto'
  | 'General Retail';

export const SHOP_CATEGORIES: ShopCategory[] = [
  'Kirana & Grocery',
  'Apparel & Boutique',
  'Electronics & Mobile',
  'Pharmacy & Wellness',
  'Cafe & Bakery',
  'Hardware & Auto',
  'General Retail',
];

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Credit';
export type BillStatus = 'paid' | 'pending' | 'void';

export type CoinTransactionType =
  | 'earn'
  | 'redeem'
  | 'welcome_bonus'
  | 'repeat_bonus'
  | 'manual_add'
  | 'manual_deduct';

export interface Shop {
  id: string;
  ownerId: string;
  shopName: string;
  category: ShopCategory;
  ownerName: string;
  phone: string;
  address: string;
  gstin: string;
  currencySymbol: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
  invoicePrefix: string;
  receiptFooter: string;
  coinName: string;
  coinsPerHundred: number;
  coinValueInInr: number;
  maxRedeemPercent: number;
  welcomeBonusCoins: number;
  repeatBonusCoins: number;
  totalBills: number;
  totalRevenue: number;
  lastBillSeq: number;
  lastCustomerSeq: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CatalogItem {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  taxRate: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LoyaltyOffer {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  coinsRequired: number;
  discountValue: number;
  minBillAmount: number;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Customer {
  id: string;
  ownerId: string;
  customerCode: string;
  name: string;
  phone: string;
  notes: string;
  visitCount: number;
  billCount: number;
  totalSpent: number;
  coinBalance: number;
  totalCoinsEarned: number;
  totalCoinsRedeemed: number;
  firstVisitAt?: Timestamp;
  lastVisitAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LoyaltyCard {
  id: string;
  ownerId: string;
  customerCode: string;
  displayName: string;
  shopName: string;
  coinName: string;
  currencySymbol: string;
  coinsPerHundred: number;
  coinValueInInr: number;
  coinBalance: number;
  totalCoinsEarned: number;
  totalCoinsRedeemed: number;
  visitCount: number;
  billCount: number;
  offersSummary: string[];
  recentBillsSummary: string[];
  lastVisitAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Bill {
  id: string;
  ownerId: string;
  billNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  isRepeatVisit: boolean;
  visitNumber: number;
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  coinsRedeemed: number;
  coinDiscount: number;
  appliedOfferTitle: string;
  coinsEarned: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  status: BillStatus;
  notes: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BillLineItem {
  id: string;
  ownerId: string;
  billId: string;
  itemId: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  createdAt?: Timestamp;
}

export interface CoinTransaction {
  id: string;
  ownerId: string;
  customerId: string;
  customerName: string;
  billId: string;
  billNumber: string;
  type: CoinTransactionType;
  coinsDelta: number;
  balanceAfter: number;
  note: string;
  createdAt?: Timestamp;
}

export interface DraftLineItem {
  localId: string;
  itemId: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
}

export const FIELD_LIMITS = {
  SHOP_NAME_MAX: 80,
  OWNER_NAME_MAX: 80,
  PHONE_MAX: 20,
  ADDRESS_MAX: 200,
  GSTIN_MAX: 20,
  INVOICE_PREFIX_MAX: 10,
  FOOTER_MAX: 160,
  COIN_NAME_MAX: 30,
  ITEM_NAME_MAX: 80,
  SKU_MAX: 32,
  CATEGORY_MAX: 40,
  UNIT_MAX: 16,
  OFFER_TITLE_MAX: 80,
  OFFER_DESC_MAX: 160,
  CUSTOMER_NAME_MAX: 80,
  NOTES_MAX: 200,
  MAX_BILL_ITEMS: 100,
} as const;
