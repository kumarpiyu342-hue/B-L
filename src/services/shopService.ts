import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Bill,
  BillLineItem,
  CatalogItem,
  Customer,
  DraftLineItem,
  FIELD_LIMITS,
  LoyaltyCard,
  LoyaltyOffer,
  PaymentMode,
  Shop,
  ShopCategory,
} from '../types/shop';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampStr = (s: string, max: number) => s.trim().slice(0, max);

export function buildCustomerCode(uid: string, seq: number): string {
  const tag = uid
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'K');
  return `${tag}-${1000 + seq}`;
}

export function formatOfferSummary(offer: Pick<LoyaltyOffer, 'coinsRequired' | 'discountValue' | 'minBillAmount' | 'title'>): string {
  const raw = `${Math.round(offer.coinsRequired)}|${round2(offer.discountValue)}|${round2(offer.minBillAmount)}|${clampStr(offer.title, 80)}`;
  return raw.slice(0, 160);
}

export function parseOfferSummary(entry: string): {
  coinsRequired: number;
  discountValue: number;
  minBillAmount: number;
  title: string;
} {
  const parts = entry.split('|');
  if (parts.length >= 4) {
    return {
      coinsRequired: Number(parts[0]) || 0,
      discountValue: Number(parts[1]) || 0,
      minBillAmount: Number(parts[2]) || 0,
      title: parts.slice(3).join('|'),
    };
  }
  return { coinsRequired: 0, discountValue: 0, minBillAmount: 0, title: entry };
}

export interface ShopSetupInput {
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
}

export async function createShop(uid: string, input: ShopSetupInput): Promise<void> {
  const path = `shops/${uid}`;
  const prefix =
    input.invoicePrefix
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, FIELD_LIMITS.INVOICE_PREFIX_MAX) || 'INV';

  try {
    await setDoc(doc(db, 'shops', uid), {
      ownerId: uid,
      shopName: clampStr(input.shopName, FIELD_LIMITS.SHOP_NAME_MAX),
      category: input.category,
      ownerName: clampStr(input.ownerName, FIELD_LIMITS.OWNER_NAME_MAX) || 'Shopkeeper',
      phone: clampStr(input.phone, FIELD_LIMITS.PHONE_MAX),
      address: clampStr(input.address, FIELD_LIMITS.ADDRESS_MAX),
      gstin: clampStr(input.gstin.toUpperCase(), FIELD_LIMITS.GSTIN_MAX),
      currencySymbol: clampStr(input.currencySymbol || '₹', 5) || '₹',
      taxEnabled: Boolean(input.taxEnabled),
      defaultTaxRate: Math.min(28, Math.max(0, round2(Number(input.defaultTaxRate) || 0))),
      invoicePrefix: prefix,
      receiptFooter: clampStr(
        input.receiptFooter || 'Thank you for shopping with us. Visit again!',
        FIELD_LIMITS.FOOTER_MAX
      ),
      coinName: clampStr(input.coinName || 'Coins', FIELD_LIMITS.COIN_NAME_MAX) || 'Coins',
      coinsPerHundred: Math.min(100, Math.max(0, round2(Number(input.coinsPerHundred) || 0))),
      coinValueInInr: Math.min(50, Math.max(0.1, round2(Number(input.coinValueInInr) || 1))),
      maxRedeemPercent: Math.min(100, Math.max(0, round2(Number(input.maxRedeemPercent) || 50))),
      welcomeBonusCoins: Math.min(500, Math.max(0, Math.round(Number(input.welcomeBonusCoins) || 0))),
      repeatBonusCoins: Math.min(500, Math.max(0, Math.round(Number(input.repeatBonusCoins) || 0))),
      totalBills: 0,
      totalRevenue: 0,
      lastBillSeq: 0,
      lastCustomerSeq: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateShopSettings(
  uid: string,
  input: ShopSetupInput,
  customers?: Customer[],
  offers?: LoyaltyOffer[]
): Promise<void> {
  const path = `shops/${uid}`;
  const prefix =
    input.invoicePrefix
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, FIELD_LIMITS.INVOICE_PREFIX_MAX) || 'INV';

  const shopName = clampStr(input.shopName, FIELD_LIMITS.SHOP_NAME_MAX);
  const currencySymbol = clampStr(input.currencySymbol || '₹', 5) || '₹';
  const coinName = clampStr(input.coinName || 'Coins', FIELD_LIMITS.COIN_NAME_MAX) || 'Coins';
  const coinsPerHundred = Math.min(100, Math.max(0, round2(Number(input.coinsPerHundred) || 0)));
  const coinValueInInr = Math.min(50, Math.max(0.1, round2(Number(input.coinValueInInr) || 1)));

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shops', uid), {
      shopName,
      category: input.category,
      ownerName: clampStr(input.ownerName, FIELD_LIMITS.OWNER_NAME_MAX) || 'Shopkeeper',
      phone: clampStr(input.phone, FIELD_LIMITS.PHONE_MAX),
      address: clampStr(input.address, FIELD_LIMITS.ADDRESS_MAX),
      gstin: clampStr(input.gstin.toUpperCase(), FIELD_LIMITS.GSTIN_MAX),
      currencySymbol,
      taxEnabled: Boolean(input.taxEnabled),
      defaultTaxRate: Math.min(28, Math.max(0, round2(Number(input.defaultTaxRate) || 0))),
      invoicePrefix: prefix,
      receiptFooter: clampStr(input.receiptFooter, FIELD_LIMITS.FOOTER_MAX),
      coinName,
      coinsPerHundred,
      coinValueInInr,
      maxRedeemPercent: Math.min(100, Math.max(0, round2(Number(input.maxRedeemPercent) || 50))),
      welcomeBonusCoins: Math.min(500, Math.max(0, Math.round(Number(input.welcomeBonusCoins) || 0))),
      repeatBonusCoins: Math.min(500, Math.max(0, Math.round(Number(input.repeatBonusCoins) || 0))),
      updatedAt: serverTimestamp(),
    });

    if (customers && offers) {
      const offersSummary = offers
        .filter((o) => o.isActive)
        .slice(0, 8)
        .map(formatOfferSummary);
      for (const c of customers.slice(0, 150)) {
        batch.update(doc(db, 'loyaltyCards', c.customerCode), {
          shopName,
          coinName,
          currencySymbol,
          coinsPerHundred,
          coinValueInInr,
          offersSummary,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function seedStarterCatalogAndOffers(
  uid: string,
  category: ShopCategory
): Promise<void> {
  const presets: Record<
    ShopCategory,
    { name: string; unit: string; price: number; taxRate: number; stock: number; low: number; cat: string }[]
  > = {
    'Kirana & Grocery': [
      { name: 'Basmati Rice (5kg)', unit: 'bag', price: 480, taxRate: 0, stock: 24, low: 5, cat: 'Staples' },
      { name: 'Mustard Oil (1L)', unit: 'bottle', price: 165, taxRate: 5, stock: 30, low: 8, cat: 'Cooking' },
      { name: 'Toor Dal (1kg)', unit: 'pack', price: 155, taxRate: 0, stock: 18, low: 5, cat: 'Pulses' },
      { name: 'Masala Chai Pack (250g)', unit: 'pack', price: 120, taxRate: 5, stock: 15, low: 4, cat: 'Beverages' },
      { name: 'Whole Wheat Atta (10kg)', unit: 'bag', price: 420, taxRate: 0, stock: 12, low: 4, cat: 'Staples' },
    ],
    'Apparel & Boutique': [
      { name: 'Cotton Kurta', unit: 'pcs', price: 899, taxRate: 5, stock: 20, low: 5, cat: 'Ethnic' },
      { name: 'Denim Jeans', unit: 'pcs', price: 1499, taxRate: 12, stock: 14, low: 4, cat: 'Bottomwear' },
      { name: 'Linen Shirt', unit: 'pcs', price: 1199, taxRate: 12, stock: 16, low: 4, cat: 'Topwear' },
      { name: 'Printed Dupatta', unit: 'pcs', price: 450, taxRate: 5, stock: 25, low: 6, cat: 'Accessories' },
    ],
    'Electronics & Mobile': [
      { name: 'USB-C Fast Cable', unit: 'pcs', price: 299, taxRate: 18, stock: 35, low: 8, cat: 'Accessories' },
      { name: '20W Fast Charger', unit: 'pcs', price: 799, taxRate: 18, stock: 18, low: 5, cat: 'Chargers' },
      { name: 'Tempered Glass Guard', unit: 'pcs', price: 199, taxRate: 18, stock: 40, low: 10, cat: 'Protection' },
      { name: 'Wired Earphones', unit: 'pcs', price: 499, taxRate: 18, stock: 15, low: 4, cat: 'Audio' },
    ],
    'Pharmacy & Wellness': [
      { name: 'Vitamin C Chewables', unit: 'strip', price: 120, taxRate: 12, stock: 30, low: 8, cat: 'Supplements' },
      { name: 'Herbal Cough Syrup', unit: 'bottle', price: 110, taxRate: 12, stock: 20, low: 5, cat: 'OTC' },
      { name: 'Digital Thermometer', unit: 'pcs', price: 249, taxRate: 12, stock: 12, low: 3, cat: 'Devices' },
      { name: 'Antiseptic Liquid (200ml)', unit: 'bottle', price: 135, taxRate: 12, stock: 22, low: 5, cat: 'First Aid' },
    ],
    'Cafe & Bakery': [
      { name: 'Masala Chai', unit: 'cup', price: 30, taxRate: 5, stock: 100, low: 20, cat: 'Beverages' },
      { name: 'Filter Coffee', unit: 'cup', price: 60, taxRate: 5, stock: 80, low: 15, cat: 'Beverages' },
      { name: 'Veg Paneer Puff', unit: 'pcs', price: 45, taxRate: 5, stock: 25, low: 6, cat: 'Snacks' },
      { name: 'Chocolate Truffle Pastry', unit: 'pcs', price: 110, taxRate: 5, stock: 16, low: 4, cat: 'Bakery' },
    ],
    'Hardware & Auto': [
      { name: 'LED Bulb 9W', unit: 'pcs', price: 95, taxRate: 18, stock: 45, low: 10, cat: 'Electrical' },
      { name: 'Extension Board 4-Socket', unit: 'pcs', price: 320, taxRate: 18, stock: 15, low: 4, cat: 'Electrical' },
      { name: 'Wall Paint Primer (1L)', unit: 'can', price: 260, taxRate: 18, stock: 12, low: 3, cat: 'Paints' },
      { name: 'Steel Padlock', unit: 'pcs', price: 180, taxRate: 18, stock: 20, low: 5, cat: 'Locks' },
    ],
    'General Retail': [
      { name: 'Everyday Gift Pack', unit: 'box', price: 350, taxRate: 12, stock: 20, low: 5, cat: 'General' },
      { name: 'Stainless Water Bottle', unit: 'pcs', price: 450, taxRate: 12, stock: 18, low: 4, cat: 'Home' },
      { name: 'Notebook Pack (3 pcs)', unit: 'pack', price: 150, taxRate: 12, stock: 30, low: 8, cat: 'Stationery' },
      { name: 'Handwash Refill (750ml)', unit: 'pack', price: 125, taxRate: 18, stock: 22, low: 5, cat: 'Personal Care' },
    ],
  };

  try {
    const batch = writeBatch(db);
    const items = presets[category] ?? presets['General Retail'];
    items.forEach((p, idx) => {
      const ref = doc(collection(db, 'shops', uid, 'items'));
      batch.set(ref, {
        ownerId: uid,
        name: p.name,
        sku: `SKU-${101 + idx}`,
        category: p.cat,
        unit: p.unit,
        price: p.price,
        taxRate: p.taxRate,
        stockQuantity: p.stock,
        lowStockThreshold: p.low,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const offer1 = doc(collection(db, 'shops', uid, 'offers'));
    batch.set(offer1, {
      ownerId: uid,
      title: '₹50 Regular Customer Discount',
      description: 'Redeem 50 coins to get ₹50 instant off on bills of ₹250 or more.',
      coinsRequired: 50,
      discountValue: 50,
      minBillAmount: 250,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const offer2 = doc(collection(db, 'shops', uid, 'offers'));
    batch.set(offer2, {
      ownerId: uid,
      title: '₹150 VIP Loyalty Reward',
      description: 'Redeem 120 coins for ₹150 off on orders above ₹750.',
      coinsRequired: 120,
      discountValue: 150,
      minBillAmount: 750,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `shops/${uid}/items`);
  }
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  taxRate: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export async function addCatalogItem(uid: string, input: ProductInput): Promise<void> {
  const path = `shops/${uid}/items`;
  try {
    const ref = doc(collection(db, 'shops', uid, 'items'));
    await setDoc(ref, {
      ownerId: uid,
      name: clampStr(input.name, FIELD_LIMITS.ITEM_NAME_MAX),
      sku: clampStr(input.sku, FIELD_LIMITS.SKU_MAX),
      category: clampStr(input.category || 'General', FIELD_LIMITS.CATEGORY_MAX) || 'General',
      unit: clampStr(input.unit || 'pcs', FIELD_LIMITS.UNIT_MAX) || 'pcs',
      price: Math.min(10000000, Math.max(0, round2(Number(input.price) || 0))),
      taxRate: Math.min(28, Math.max(0, round2(Number(input.taxRate) || 0))),
      stockQuantity: Math.min(1000000, Math.max(0, round2(Number(input.stockQuantity) || 0))),
      lowStockThreshold: Math.min(100000, Math.max(0, round2(Number(input.lowStockThreshold) || 0))),
      isActive: Boolean(input.isActive),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addCatalogItemsBatch(
  uid: string,
  inputs: ProductInput[]
): Promise<number> {
  if (!inputs.length) return 0;
  const path = `shops/${uid}/items`;
  const CHUNK_SIZE = 400;
  let importedCount = 0;

  try {
    for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
      const chunk = inputs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const input of chunk) {
        const ref = doc(collection(db, 'shops', uid, 'items'));
        batch.set(ref, {
          ownerId: uid,
          name: clampStr(input.name, FIELD_LIMITS.ITEM_NAME_MAX),
          sku: clampStr(input.sku, FIELD_LIMITS.SKU_MAX),
          category: clampStr(input.category || 'General', FIELD_LIMITS.CATEGORY_MAX) || 'General',
          unit: clampStr(input.unit || 'pcs', FIELD_LIMITS.UNIT_MAX) || 'pcs',
          price: Math.min(10000000, Math.max(0, round2(Number(input.price) || 0))),
          taxRate: Math.min(28, Math.max(0, round2(Number(input.taxRate) || 0))),
          stockQuantity: Math.min(1000000, Math.max(0, round2(Number(input.stockQuantity) || 0))),
          lowStockThreshold: Math.min(100000, Math.max(0, round2(Number(input.lowStockThreshold) || 0))),
          isActive: Boolean(input.isActive),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      importedCount += chunk.length;
    }
    return importedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCatalogItem(
  uid: string,
  itemId: string,
  input: ProductInput
): Promise<void> {
  const path = `shops/${uid}/items/${itemId}`;
  try {
    await updateDoc(doc(db, 'shops', uid, 'items', itemId), {
      name: clampStr(input.name, FIELD_LIMITS.ITEM_NAME_MAX),
      sku: clampStr(input.sku, FIELD_LIMITS.SKU_MAX),
      category: clampStr(input.category || 'General', FIELD_LIMITS.CATEGORY_MAX) || 'General',
      unit: clampStr(input.unit || 'pcs', FIELD_LIMITS.UNIT_MAX) || 'pcs',
      price: Math.min(10000000, Math.max(0, round2(Number(input.price) || 0))),
      taxRate: Math.min(28, Math.max(0, round2(Number(input.taxRate) || 0))),
      stockQuantity: Math.min(1000000, Math.max(0, round2(Number(input.stockQuantity) || 0))),
      lowStockThreshold: Math.min(100000, Math.max(0, round2(Number(input.lowStockThreshold) || 0))),
      isActive: Boolean(input.isActive),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adjustItemStock(
  uid: string,
  itemId: string,
  newStock: number
): Promise<void> {
  const path = `shops/${uid}/items/${itemId}`;
  try {
    await updateDoc(doc(db, 'shops', uid, 'items', itemId), {
      stockQuantity: Math.min(1000000, Math.max(0, round2(newStock))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCatalogItem(uid: string, itemId: string): Promise<void> {
  const path = `shops/${uid}/items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'shops', uid, 'items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface LoyaltyOfferInput {
  title: string;
  description: string;
  coinsRequired: number;
  discountValue: number;
  minBillAmount: number;
  isActive: boolean;
}

async function syncOffersToCards(
  uid: string,
  customers: Customer[],
  offersList: LoyaltyOfferInput[] | LoyaltyOffer[]
): Promise<void> {
  if (!customers.length) return;
  const summary = offersList
    .filter((o) => o.isActive)
    .slice(0, 8)
    .map(formatOfferSummary);
  const batch = writeBatch(db);
  for (const c of customers.slice(0, 200)) {
    batch.update(doc(db, 'loyaltyCards', c.customerCode), {
      offersSummary: summary,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function addLoyaltyOffer(
  uid: string,
  input: LoyaltyOfferInput,
  existingOffers: LoyaltyOffer[],
  customers: Customer[]
): Promise<void> {
  const path = `shops/${uid}/offers`;
  try {
    const ref = doc(collection(db, 'shops', uid, 'offers'));
    const payload = {
      ownerId: uid,
      title: clampStr(input.title, FIELD_LIMITS.OFFER_TITLE_MAX),
      description: clampStr(input.description, FIELD_LIMITS.OFFER_DESC_MAX),
      coinsRequired: Math.min(100000, Math.max(1, Math.round(Number(input.coinsRequired) || 1))),
      discountValue: Math.min(100000, Math.max(1, round2(Number(input.discountValue) || 1))),
      minBillAmount: Math.min(1000000, Math.max(0, round2(Number(input.minBillAmount) || 0))),
      isActive: Boolean(input.isActive),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    const updatedList: LoyaltyOfferInput[] = [...existingOffers, input];
    await syncOffersToCards(uid, customers, updatedList);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateLoyaltyOffer(
  uid: string,
  offerId: string,
  input: LoyaltyOfferInput,
  existingOffers: LoyaltyOffer[],
  customers: Customer[]
): Promise<void> {
  const path = `shops/${uid}/offers/${offerId}`;
  try {
    await updateDoc(doc(db, 'shops', uid, 'offers', offerId), {
      title: clampStr(input.title, FIELD_LIMITS.OFFER_TITLE_MAX),
      description: clampStr(input.description, FIELD_LIMITS.OFFER_DESC_MAX),
      coinsRequired: Math.min(100000, Math.max(1, Math.round(Number(input.coinsRequired) || 1))),
      discountValue: Math.min(100000, Math.max(1, round2(Number(input.discountValue) || 1))),
      minBillAmount: Math.min(1000000, Math.max(0, round2(Number(input.minBillAmount) || 0))),
      isActive: Boolean(input.isActive),
      updatedAt: serverTimestamp(),
    });
    const updatedList = existingOffers.map((o) =>
      o.id === offerId ? { ...o, ...input } : o
    );
    await syncOffersToCards(uid, customers, updatedList);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLoyaltyOffer(
  uid: string,
  offerId: string,
  existingOffers: LoyaltyOffer[],
  customers: Customer[]
): Promise<void> {
  const path = `shops/${uid}/offers/${offerId}`;
  try {
    await deleteDoc(doc(db, 'shops', uid, 'offers', offerId));
    const updatedList = existingOffers.filter((o) => o.id !== offerId);
    await syncOffersToCards(uid, customers, updatedList);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCustomer(
  shop: Shop,
  input: { name: string; phone: string; notes: string },
  offers: LoyaltyOffer[]
): Promise<Customer> {
  const uid = shop.ownerId;
  const nextSeq = (shop.lastCustomerSeq || 0) + 1;
  const customerCode = buildCustomerCode(uid, nextSeq);
  const custRef = doc(collection(db, 'shops', uid, 'customers'));
  const cleanName = clampStr(input.name, FIELD_LIMITS.CUSTOMER_NAME_MAX);
  const cleanPhone = clampStr(input.phone.replace(/[^0-9+\-\s]/g, ''), FIELD_LIMITS.PHONE_MAX);
  const cleanNotes = clampStr(input.notes, FIELD_LIMITS.NOTES_MAX);
  const welcomeCoins = Math.max(0, Math.round(shop.welcomeBonusCoins || 0));

  const offersSummary = offers
    .filter((o) => o.isActive)
    .slice(0, 8)
    .map(formatOfferSummary);

  try {
    const batch = writeBatch(db);
    batch.set(custRef, {
      ownerId: uid,
      customerCode,
      name: cleanName,
      phone: cleanPhone,
      notes: cleanNotes,
      visitCount: 0,
      billCount: 0,
      totalSpent: 0,
      coinBalance: welcomeCoins,
      totalCoinsEarned: welcomeCoins,
      totalCoinsRedeemed: 0,
      firstVisitAt: serverTimestamp(),
      lastVisitAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'loyaltyCards', customerCode), {
      ownerId: uid,
      customerCode,
      displayName: cleanName,
      shopName: shop.shopName,
      coinName: shop.coinName,
      currencySymbol: shop.currencySymbol,
      coinsPerHundred: shop.coinsPerHundred,
      coinValueInInr: shop.coinValueInInr,
      coinBalance: welcomeCoins,
      totalCoinsEarned: welcomeCoins,
      totalCoinsRedeemed: 0,
      visitCount: 0,
      billCount: 0,
      offersSummary,
      recentBillsSummary: [],
      lastVisitAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'shops', uid), {
      lastCustomerSeq: nextSeq,
      updatedAt: serverTimestamp(),
    });

    if (welcomeCoins > 0) {
      const txRef = doc(collection(db, 'shops', uid, 'coinTransactions'));
      batch.set(txRef, {
        ownerId: uid,
        customerId: custRef.id,
        customerName: cleanName,
        billId: '',
        billNumber: '',
        type: 'welcome_bonus',
        coinsDelta: welcomeCoins,
        balanceAfter: welcomeCoins,
        note: 'Welcome bonus on joining loyalty program',
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return {
      id: custRef.id,
      ownerId: uid,
      customerCode,
      name: cleanName,
      phone: cleanPhone,
      notes: cleanNotes,
      visitCount: 0,
      billCount: 0,
      totalSpent: 0,
      coinBalance: welcomeCoins,
      totalCoinsEarned: welcomeCoins,
      totalCoinsRedeemed: 0,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `shops/${uid}/customers`);
  }
}

export async function updateCustomerDetails(
  uid: string,
  customer: Customer,
  input: { name: string; phone: string; notes: string }
): Promise<void> {
  const path = `shops/${uid}/customers/${customer.id}`;
  const cleanName = clampStr(input.name, FIELD_LIMITS.CUSTOMER_NAME_MAX);
  const cleanPhone = clampStr(input.phone.replace(/[^0-9+\-\s]/g, ''), FIELD_LIMITS.PHONE_MAX);
  const cleanNotes = clampStr(input.notes, FIELD_LIMITS.NOTES_MAX);

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shops', uid, 'customers', customer.id), {
      name: cleanName,
      phone: cleanPhone,
      notes: cleanNotes,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'loyaltyCards', customer.customerCode), {
      displayName: cleanName,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adjustCustomerCoins(
  shop: Shop,
  customer: Customer,
  delta: number,
  note: string
): Promise<void> {
  const uid = shop.ownerId;
  const roundedDelta = Math.round(delta);
  if (roundedDelta === 0) return;

  const newBalance = Math.max(0, customer.coinBalance + roundedDelta);
  const actualDelta = newBalance - customer.coinBalance;
  const newEarned =
    actualDelta > 0 ? customer.totalCoinsEarned + actualDelta : customer.totalCoinsEarned;
  const newRedeemed =
    actualDelta < 0
      ? customer.totalCoinsRedeemed + Math.abs(actualDelta)
      : customer.totalCoinsRedeemed;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shops', uid, 'customers', customer.id), {
      coinBalance: newBalance,
      totalCoinsEarned: newEarned,
      totalCoinsRedeemed: newRedeemed,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'loyaltyCards', customer.customerCode), {
      coinBalance: newBalance,
      totalCoinsEarned: newEarned,
      totalCoinsRedeemed: newRedeemed,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, 'shops', uid, 'coinTransactions'));
    batch.set(txRef, {
      ownerId: uid,
      customerId: customer.id,
      customerName: customer.name,
      billId: '',
      billNumber: '',
      type: actualDelta >= 0 ? 'manual_add' : 'manual_deduct',
      coinsDelta: actualDelta,
      balanceAfter: newBalance,
      note: clampStr(note || 'Manual shopkeeper adjustment', 160),
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `shops/${uid}/customers/${customer.id}`);
  }
}

export async function redeemCustomerCoins(
  shop: Shop,
  customer: Customer,
  coinsToRedeem: number,
  note?: string
): Promise<{ redeemedCoins: number; discountValue: number; newBalance: number }> {
  const uid = shop.ownerId;
  const requested = Math.round(coinsToRedeem);
  const actualRedeem = Math.min(Math.max(0, requested), Math.floor(customer.coinBalance));
  if (actualRedeem <= 0) {
    throw new Error('Customer does not have enough coins to redeem.');
  }

  const newBalance = Math.max(0, customer.coinBalance - actualRedeem);
  const newRedeemed = customer.totalCoinsRedeemed + actualRedeem;
  const discountValue = round2(actualRedeem * (shop.coinValueInInr || 1));

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'shops', uid, 'customers', customer.id), {
      coinBalance: newBalance,
      totalCoinsRedeemed: newRedeemed,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'loyaltyCards', customer.customerCode), {
      coinBalance: newBalance,
      totalCoinsRedeemed: newRedeemed,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, 'shops', uid, 'coinTransactions'));
    batch.set(txRef, {
      ownerId: uid,
      customerId: customer.id,
      customerName: customer.name,
      billId: '',
      billNumber: '',
      type: 'redeem',
      coinsDelta: -actualRedeem,
      balanceAfter: newBalance,
      note: clampStr(
        note || `Redeemed ${actualRedeem} ${shop.coinName} (${shop.currencySymbol}${discountValue.toFixed(0)} value) at counter`,
        160
      ),
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { redeemedCoins: actualRedeem, discountValue, newBalance };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `shops/${uid}/customers/${customer.id}`);
  }
}

export interface CreateBillPayload {
  shop: Shop;
  existingCustomer: Customer | null;
  newCustomerInput?: { name: string; phone: string; notes?: string };
  lines: DraftLineItem[];
  catalogItems: CatalogItem[];
  offers: LoyaltyOffer[];
  existingCardBillsSummary?: string[];
  manualDiscount: number;
  coinsToRedeem: number;
  selectedOffer: LoyaltyOffer | null;
  paymentMode: PaymentMode;
  status: 'paid' | 'pending';
  notes: string;
}

export async function createBillAtomic(payload: CreateBillPayload): Promise<{
  bill: Bill;
  lineItems: BillLineItem[];
  customerCode: string;
  updatedCoinBalance: number;
}> {
  const {
    shop,
    existingCustomer,
    newCustomerInput,
    lines,
    catalogItems,
    offers,
    existingCardBillsSummary = [],
    manualDiscount,
    coinsToRedeem,
    selectedOffer,
    paymentMode,
    status,
    notes,
  } = payload;

  const uid = shop.ownerId;
  const nextBillSeq = (shop.lastBillSeq || 0) + 1;
  const billNumber = `${shop.invoicePrefix}-${String(nextBillSeq).padStart(4, '0')}`;
  const billRef = doc(collection(db, 'shops', uid, 'bills'));

  // Line calculations
  let subtotal = 0;
  let taxAmount = 0;
  const preparedLines = lines.slice(0, FIELD_LIMITS.MAX_BILL_ITEMS).map((l) => {
    const qty = Math.max(0.01, round2(l.qty));
    const unitPrice = Math.max(0, round2(l.unitPrice));
    const rate = shop.taxEnabled ? Math.min(28, Math.max(0, round2(l.taxRate))) : 0;
    const base = round2(qty * unitPrice);
    const lineTax = round2((base * rate) / 100);
    const lineTotal = round2(base + lineTax);
    subtotal = round2(subtotal + base);
    taxAmount = round2(taxAmount + lineTax);
    return {
      itemId: l.itemId || 'custom',
      name: clampStr(l.name, FIELD_LIMITS.ITEM_NAME_MAX),
      unit: clampStr(l.unit || 'pcs', FIELD_LIMITS.UNIT_MAX) || 'pcs',
      qty,
      unitPrice,
      taxRate: rate,
      taxAmount: lineTax,
      lineTotal,
    };
  });

  const grossTotal = round2(subtotal + taxAmount);
  const safeManualDiscount = Math.min(grossTotal, Math.max(0, round2(manualDiscount)));
  const afterManual = round2(grossTotal - safeManualDiscount);

  const isNewCustomer = !existingCustomer;
  const currentAvailableCoins = existingCustomer ? existingCustomer.coinBalance : 0;

  let actualCoinsRedeemed = 0;
  let coinDiscount = 0;
  let appliedOfferTitle = '';

  if (selectedOffer && existingCustomer && currentAvailableCoins >= selectedOffer.coinsRequired && afterManual >= selectedOffer.minBillAmount) {
    actualCoinsRedeemed = Math.round(selectedOffer.coinsRequired);
    coinDiscount = Math.min(afterManual, round2(selectedOffer.discountValue));
    appliedOfferTitle = clampStr(selectedOffer.title, FIELD_LIMITS.OFFER_TITLE_MAX);
  } else if (existingCustomer && coinsToRedeem > 0 && currentAvailableCoins > 0) {
    const maxRedeemValue = round2((afterManual * (shop.maxRedeemPercent || 0)) / 100);
    const maxCoinsByRule = Math.floor(maxRedeemValue / (shop.coinValueInInr || 1));
    actualCoinsRedeemed = Math.min(
      Math.round(coinsToRedeem),
      Math.floor(currentAvailableCoins),
      Math.max(0, maxCoinsByRule)
    );
    coinDiscount = Math.min(afterManual, round2(actualCoinsRedeemed * (shop.coinValueInInr || 1)));
  }

  const totalAmount = Math.max(0, round2(afterManual - coinDiscount));

  // Visit & Earn calculations
  const prevVisits = existingCustomer ? existingCustomer.visitCount : 0;
  const prevBills = existingCustomer ? existingCustomer.billCount : 0;
  const visitNumber = prevVisits + 1;
  const isRepeatVisit = prevVisits >= 1;

  const baseEarn = Math.floor((totalAmount / 100) * (shop.coinsPerHundred || 0));
  const welcomeBonus = isNewCustomer ? Math.max(0, Math.round(shop.welcomeBonusCoins || 0)) : 0;
  const repeatBonus = isRepeatVisit ? Math.max(0, Math.round(shop.repeatBonusCoins || 0)) : 0;
  const totalCoinsEarned = baseEarn + welcomeBonus + repeatBonus;

  const updatedCoinBalance = Math.max(
    0,
    currentAvailableCoins - actualCoinsRedeemed + totalCoinsEarned
  );
  const updatedTotalEarned =
    (existingCustomer ? existingCustomer.totalCoinsEarned : 0) + totalCoinsEarned;
  const updatedTotalRedeemed =
    (existingCustomer ? existingCustomer.totalCoinsRedeemed : 0) + actualCoinsRedeemed;

  const nextCustomerSeq = isNewCustomer ? (shop.lastCustomerSeq || 0) + 1 : shop.lastCustomerSeq || 0;
  const customerRef = existingCustomer
    ? doc(db, 'shops', uid, 'customers', existingCustomer.id)
    : doc(collection(db, 'shops', uid, 'customers'));
  const customerCode = existingCustomer
    ? existingCustomer.customerCode
    : buildCustomerCode(uid, nextCustomerSeq);
  const customerName = clampStr(
    existingCustomer ? existingCustomer.name : newCustomerInput?.name || 'Walk-in Customer',
    FIELD_LIMITS.CUSTOMER_NAME_MAX
  );
  const customerPhone = clampStr(
    (existingCustomer ? existingCustomer.phone : newCustomerInput?.phone || '0000000000').replace(
      /[^0-9+\-\s]/g,
      ''
    ),
    FIELD_LIMITS.PHONE_MAX
  );

  const offersSummary = offers
    .filter((o) => o.isActive)
    .slice(0, 8)
    .map(formatOfferSummary);

  let cardBills = existingCardBillsSummary;
  if (existingCustomer) {
    try {
      const cardSnap = await getDoc(doc(db, 'loyaltyCards', customerCode));
      if (cardSnap.exists()) {
        const data = cardSnap.data() as Partial<LoyaltyCard>;
        if (Array.isArray(data.recentBillsSummary)) {
          cardBills = data.recentBillsSummary;
        }
      }
    } catch {
      // Fall back to passed summary
    }
  }

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
  const newBillSummaryLine = `${billNumber} · ${shop.currencySymbol}${totalAmount.toFixed(0)} · +${totalCoinsEarned} ${shop.coinName} · ${todayLabel}`.slice(
    0,
    160
  );
  const recentBillsSummary = [newBillSummaryLine, ...cardBills].slice(0, 5);

  try {
    const batch = writeBatch(db);

    // 1. Customer create or update
    if (isNewCustomer) {
      batch.set(customerRef, {
        ownerId: uid,
        customerCode,
        name: customerName,
        phone: customerPhone,
        notes: clampStr(newCustomerInput?.notes || '', FIELD_LIMITS.NOTES_MAX),
        visitCount: 1,
        billCount: 1,
        totalSpent: totalAmount,
        coinBalance: updatedCoinBalance,
        totalCoinsEarned: updatedTotalEarned,
        totalCoinsRedeemed: updatedTotalRedeemed,
        firstVisitAt: serverTimestamp(),
        lastVisitAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'loyaltyCards', customerCode), {
        ownerId: uid,
        customerCode,
        displayName: customerName,
        shopName: shop.shopName,
        coinName: shop.coinName,
        currencySymbol: shop.currencySymbol,
        coinsPerHundred: shop.coinsPerHundred,
        coinValueInInr: shop.coinValueInInr,
        coinBalance: updatedCoinBalance,
        totalCoinsEarned: updatedTotalEarned,
        totalCoinsRedeemed: updatedTotalRedeemed,
        visitCount: 1,
        billCount: 1,
        offersSummary,
        recentBillsSummary,
        lastVisitAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(customerRef, {
        name: customerName,
        visitCount: visitNumber,
        billCount: prevBills + 1,
        totalSpent: round2((existingCustomer?.totalSpent || 0) + totalAmount),
        coinBalance: updatedCoinBalance,
        totalCoinsEarned: updatedTotalEarned,
        totalCoinsRedeemed: updatedTotalRedeemed,
        lastVisitAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.update(doc(db, 'loyaltyCards', customerCode), {
        displayName: customerName,
        shopName: shop.shopName,
        coinName: shop.coinName,
        currencySymbol: shop.currencySymbol,
        coinsPerHundred: shop.coinsPerHundred,
        coinValueInInr: shop.coinValueInInr,
        coinBalance: updatedCoinBalance,
        totalCoinsEarned: updatedTotalEarned,
        totalCoinsRedeemed: updatedTotalRedeemed,
        visitCount: visitNumber,
        billCount: prevBills + 1,
        offersSummary,
        recentBillsSummary,
        lastVisitAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Bill header
    const billDocPayload = {
      ownerId: uid,
      billNumber,
      customerId: customerRef.id,
      customerCode,
      customerName,
      customerPhone,
      isRepeatVisit,
      visitNumber,
      itemCount: preparedLines.length,
      subtotal,
      taxAmount,
      discountAmount: safeManualDiscount,
      coinsRedeemed: actualCoinsRedeemed,
      coinDiscount,
      appliedOfferTitle,
      coinsEarned: totalCoinsEarned,
      totalAmount,
      paymentMode,
      status,
      notes: clampStr(notes, FIELD_LIMITS.NOTES_MAX),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(billRef, billDocPayload);

    // 3. Bill Line Items + Stock Decrement aggregation
    const qtyByCatalogId = new Map<string, number>();
    const createdLineItems: BillLineItem[] = [];

    for (const line of preparedLines) {
      const lineRef = doc(collection(db, 'shops', uid, 'bills', billRef.id, 'lineItems'));
      const linePayload = {
        ownerId: uid,
        billId: billRef.id,
        itemId: line.itemId,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
        createdAt: serverTimestamp(),
      };
      batch.set(lineRef, linePayload);
      createdLineItems.push({
        id: lineRef.id,
        ownerId: uid,
        billId: billRef.id,
        itemId: line.itemId,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
      });

      if (line.itemId && line.itemId !== 'custom') {
        qtyByCatalogId.set(line.itemId, (qtyByCatalogId.get(line.itemId) || 0) + line.qty);
      }
    }

    for (const [catalogId, qtySold] of qtyByCatalogId.entries()) {
      const catalogItem = catalogItems.find((i) => i.id === catalogId);
      if (catalogItem) {
        const nextStock = Math.max(0, round2(catalogItem.stockQuantity - qtySold));
        batch.update(doc(db, 'shops', uid, 'items', catalogId), {
          stockQuantity: nextStock,
          updatedAt: serverTimestamp(),
        });
      }
    }

    // 4. Coin Transactions Ledger
    let runningBalance = currentAvailableCoins;

    if (actualCoinsRedeemed > 0) {
      runningBalance = Math.max(0, runningBalance - actualCoinsRedeemed);
      const txRedeem = doc(collection(db, 'shops', uid, 'coinTransactions'));
      batch.set(txRedeem, {
        ownerId: uid,
        customerId: customerRef.id,
        customerName,
        billId: billRef.id,
        billNumber,
        type: 'redeem',
        coinsDelta: -actualCoinsRedeemed,
        balanceAfter: runningBalance,
        note: appliedOfferTitle
          ? `Redeemed for offer: ${appliedOfferTitle}`.slice(0, 160)
          : `Redeemed ${shop.currencySymbol}${coinDiscount} discount on ${billNumber}`,
        createdAt: serverTimestamp(),
      });
    }

    if (baseEarn > 0) {
      runningBalance += baseEarn;
      const txEarn = doc(collection(db, 'shops', uid, 'coinTransactions'));
      batch.set(txEarn, {
        ownerId: uid,
        customerId: customerRef.id,
        customerName,
        billId: billRef.id,
        billNumber,
        type: 'earn',
        coinsDelta: baseEarn,
        balanceAfter: runningBalance,
        note: `Earned on bill ${billNumber} (${shop.currencySymbol}${totalAmount})`,
        createdAt: serverTimestamp(),
      });
    }

    if (welcomeBonus > 0) {
      runningBalance += welcomeBonus;
      const txWelcome = doc(collection(db, 'shops', uid, 'coinTransactions'));
      batch.set(txWelcome, {
        ownerId: uid,
        customerId: customerRef.id,
        customerName,
        billId: billRef.id,
        billNumber,
        type: 'welcome_bonus',
        coinsDelta: welcomeBonus,
        balanceAfter: runningBalance,
        note: `Welcome bonus on first visit (${billNumber})`,
        createdAt: serverTimestamp(),
      });
    }

    if (repeatBonus > 0) {
      runningBalance += repeatBonus;
      const txRepeat = doc(collection(db, 'shops', uid, 'coinTransactions'));
      batch.set(txRepeat, {
        ownerId: uid,
        customerId: customerRef.id,
        customerName,
        billId: billRef.id,
        billNumber,
        type: 'repeat_bonus',
        coinsDelta: repeatBonus,
        balanceAfter: runningBalance,
        note: `Repeat visit #${visitNumber} loyalty bonus (${billNumber})`,
        createdAt: serverTimestamp(),
      });
    }

    // 5. Shop counters update
    batch.update(doc(db, 'shops', uid), {
      totalBills: (shop.totalBills || 0) + 1,
      totalRevenue: round2((shop.totalRevenue || 0) + totalAmount),
      lastBillSeq: nextBillSeq,
      lastCustomerSeq: nextCustomerSeq,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      bill: {
        id: billRef.id,
        ownerId: uid,
        billNumber,
        customerId: customerRef.id,
        customerCode,
        customerName,
        customerPhone,
        isRepeatVisit,
        visitNumber,
        itemCount: preparedLines.length,
        subtotal,
        taxAmount,
        discountAmount: safeManualDiscount,
        coinsRedeemed: actualCoinsRedeemed,
        coinDiscount,
        appliedOfferTitle,
        coinsEarned: totalCoinsEarned,
        totalAmount,
        paymentMode,
        status,
        notes: clampStr(notes, FIELD_LIMITS.NOTES_MAX),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      lineItems: createdLineItems,
      customerCode,
      updatedCoinBalance,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `shops/${uid}/bills`);
  }
}

export async function markBillPaid(
  uid: string,
  billId: string,
  paymentMode: PaymentMode
): Promise<void> {
  const path = `shops/${uid}/bills/${billId}`;
  try {
    await updateDoc(doc(db, 'shops', uid, 'bills', billId), {
      status: 'paid',
      paymentMode,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function voidBill(uid: string, billId: string): Promise<void> {
  const path = `shops/${uid}/bills/${billId}`;
  try {
    await updateDoc(doc(db, 'shops', uid, 'bills', billId), {
      status: 'void',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchBillLineItems(
  uid: string,
  billId: string
): Promise<BillLineItem[]> {
  const path = `shops/${uid}/bills/${billId}/lineItems`;
  try {
    const q = query(
      collection(db, 'shops', uid, 'bills', billId, 'lineItems'),
      where('ownerId', '==', uid)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<BillLineItem, 'id'>),
    }));
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0;
      const tb = b.createdAt?.toMillis() ?? 0;
      return ta - tb;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function lookupLoyaltyCardByCode(
  customerCode: string
): Promise<LoyaltyCard | null> {
  const normalized = customerCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (normalized.length < 3 || normalized.length > 24) {
    return null;
  }
  const path = `loyaltyCards/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'loyaltyCards', normalized));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<LoyaltyCard, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
