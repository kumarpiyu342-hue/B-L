import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { AuthGate, ShopOnboarding } from './components/AuthGate';
import { BillBuilderView } from './components/BillBuilderView';
import { BillsLedgerView } from './components/BillsLedgerView';
import { CustomerPortal } from './components/CustomerPortal';
import { CustomersView } from './components/CustomersView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InventoryView } from './components/InventoryView';
import { LoyaltyView } from './components/LoyaltyView';
import { OverviewView, QuickActionType, WorkspaceTab } from './components/OverviewView';
import { ReceiptModal } from './components/ReceiptModal';
import { ShopSettingsView } from './components/ShopSettingsView';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { fetchBillLineItems } from './services/shopService';
import {
  Bill,
  BillLineItem,
  CatalogItem,
  CoinTransaction,
  Customer,
  LoyaltyOffer,
  Shop,
} from './types/shop';

function KhataCoinApp() {
  const initialParams = new URLSearchParams(window.location.search);
  const initialCid = initialParams.get('cid') || '';

  const [customerPortalMode, setCustomerPortalMode] = useState(
    Boolean(initialCid)
  );
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(false);

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [offers, setOffers] = useState<LoyaltyOffer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [preselectedCustomer, setPreselectedCustomer] =
    useState<Customer | null>(null);
  const [openAddProductIntent, setOpenAddProductIntent] = useState(false);
  const [openAddCustomerIntent, setOpenAddCustomerIntent] = useState(false);

  const [receiptState, setReceiptState] = useState<{
    bill: Bill;
    lineItems: BillLineItem[];
    coinBalance?: number;
  } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Attach shop listener when authenticated
  useEffect(() => {
    if (!user) {
      setShop(null);
      return;
    }

    const uid = user.uid;
    setShopLoading(true);

    const shopPath = `shops/${uid}`;
    const unsubShop = onSnapshot(
      doc(db, 'shops', uid),
      (snap) => {
        if (snap.exists()) {
          setShop({ id: snap.id, ...(snap.data() as Omit<Shop, 'id'>) });
        } else {
          setShop(null);
        }
        setShopLoading(false);
      },
      (err) => {
        setShopLoading(false);
        handleFirestoreError(err, OperationType.GET, shopPath);
      }
    );

    return () => {
      unsubShop();
    };
  }, [user]);

  // Attach subcollection listeners only once shop exists
  useEffect(() => {
    if (!user || !shop) {
      setItems([]);
      setOffers([]);
      setCustomers([]);
      setBills([]);
      setCoinTransactions([]);
      return;
    }

    const uid = user.uid;

    const itemsPath = `shops/${uid}/items`;
    const unsubItems = onSnapshot(
      query(collection(db, 'shops', uid, 'items'), where('ownerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatalogItem, 'id'>),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setItems(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, itemsPath)
    );

    const offersPath = `shops/${uid}/offers`;
    const unsubOffers = onSnapshot(
      query(collection(db, 'shops', uid, 'offers'), where('ownerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LoyaltyOffer, 'id'>),
        }));
        list.sort((a, b) => a.coinsRequired - b.coinsRequired);
        setOffers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, offersPath)
    );

    const customersPath = `shops/${uid}/customers`;
    const unsubCustomers = onSnapshot(
      query(collection(db, 'shops', uid, 'customers'), where('ownerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Customer, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.lastVisitAt?.toMillis() ?? 0) - (a.lastVisitAt?.toMillis() ?? 0)
        );
        setCustomers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, customersPath)
    );

    const billsPath = `shops/${uid}/bills`;
    const unsubBills = onSnapshot(
      query(collection(db, 'shops', uid, 'bills'), where('ownerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Bill, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
        );
        setBills(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, billsPath)
    );

    const txPath = `shops/${uid}/coinTransactions`;
    const unsubTx = onSnapshot(
      query(
        collection(db, 'shops', uid, 'coinTransactions'),
        where('ownerId', '==', uid)
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CoinTransaction, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
        );
        setCoinTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, txPath)
    );

    return () => {
      unsubItems();
      unsubOffers();
      unsubCustomers();
      unsubBills();
      unsubTx();
    };
  }, [user, shop?.id]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in failed.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveTab('overview');
  };

  const handleStartBillForCustomer = useCallback((customer: Customer) => {
    setPreselectedCustomer(customer);
    setActiveTab('billing');
  }, []);

  const handleClearPreselected = useCallback(() => {
    setPreselectedCustomer(null);
  }, []);

  const handleQuickAction = useCallback((action: QuickActionType) => {
    if (action === 'new_sale') {
      setActiveTab('billing');
    } else if (action === 'add_product') {
      setOpenAddProductIntent(true);
      setActiveTab('inventory');
    } else if (action === 'register_customer') {
      setOpenAddCustomerIntent(true);
      setActiveTab('customers');
    }
  }, []);

  const handleOpenReceipt = async (bill: Bill) => {
    if (!user) return;
    const lineItems = await fetchBillLineItems(user.uid, bill.id);
    const matchingCust = customers.find((c) => c.id === bill.customerId);
    setReceiptState({
      bill,
      lineItems,
      coinBalance: matchingCust?.coinBalance,
    });
  };

  if (customerPortalMode) {
    return (
      <CustomerPortal
        initialCode={initialCid}
        onBack={() => setCustomerPortalMode(false)}
        backLabel={user ? 'Back to Shop Workspace' : 'Back to Shopkeeper Login'}
      />
    );
  }

  if (authLoading || !user) {
    return (
      <AuthGate
        user={user}
        authLoading={authLoading}
        onSignIn={handleSignIn}
        onOpenCustomerPortal={() => setCustomerPortalMode(true)}
        signingIn={signingIn}
        authError={authError}
      />
    );
  }

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-700 text-sm">
          <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          Loading your store...
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <ShopOnboarding
        user={user}
        onCreated={() => setActiveTab('overview')}
      />
    );
  }

  const lowStockCount = items.filter(
    (i) => i.isActive && i.stockQuantity <= i.lowStockThreshold
  ).length;

  return (
    <>
      <WorkspaceLayout
        shop={shop}
        activeTab={activeTab}
        lowStockCount={lowStockCount}
        onSelectTab={setActiveTab}
        onOpenCustomerPortal={() => setCustomerPortalMode(true)}
        onSignOut={() => void handleSignOut()}
      >
        {activeTab === 'overview' && (
          <OverviewView
            shop={shop}
            bills={bills}
            customers={customers}
            items={items}
            onNavigate={setActiveTab}
            onQuickAction={handleQuickAction}
            onStartBillForCustomer={handleStartBillForCustomer}
            onOpenReceipt={(bill) => void handleOpenReceipt(bill)}
          />
        )}

        {activeTab === 'billing' && (
          <BillBuilderView
            shop={shop}
            catalogItems={items}
            customers={customers}
            offers={offers}
            preselectedCustomer={preselectedCustomer}
            onClearPreselected={handleClearPreselected}
            onBillCreated={({ bill, lineItems, updatedCoinBalance }) => {
              setReceiptState({
                bill,
                lineItems,
                coinBalance: updatedCoinBalance,
              });
            }}
          />
        )}

        {activeTab === 'bills' && (
          <BillsLedgerView
            shop={shop}
            bills={bills}
            onOpenReceipt={(bill) => void handleOpenReceipt(bill)}
            onNewBill={() => setActiveTab('billing')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            shop={shop}
            items={items}
            autoOpenAdd={openAddProductIntent}
            onAutoOpenHandled={() => setOpenAddProductIntent(false)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            shop={shop}
            customers={customers}
            bills={bills}
            coinTransactions={coinTransactions}
            offers={offers}
            autoOpenAdd={openAddCustomerIntent}
            onAutoOpenHandled={() => setOpenAddCustomerIntent(false)}
            onStartBillForCustomer={handleStartBillForCustomer}
            onOpenReceipt={(bill) => void handleOpenReceipt(bill)}
          />
        )}

        {activeTab === 'loyalty' && (
          <LoyaltyView
            shop={shop}
            offers={offers}
            customers={customers}
            coinTransactions={coinTransactions}
          />
        )}

        {activeTab === 'settings' && (
          <ShopSettingsView
            shop={shop}
            items={items}
            customers={customers}
            bills={bills}
            offers={offers}
            coinTransactions={coinTransactions}
          />
        )}
      </WorkspaceLayout>

      {receiptState && (
        <ReceiptModal
          shop={shop}
          bill={receiptState.bill}
          lineItems={receiptState.lineItems}
          customerCoinBalance={receiptState.coinBalance}
          onClose={() => setReceiptState(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <KhataCoinApp />
    </ErrorBoundary>
  );
}
