# Security Specification — KhataCoin Firestore Rules

## 1. Data Invariants
1. **Strict Multi-Tenant Ownership**: Every `/shops/{shopId}` document MUST satisfy `shopId == request.auth.uid` and `ownerId == request.auth.uid`. All subcollections (`items`, `offers`, `customers`, `bills`, `lineItems`, `coinTransactions`) inherit ownership from the parent shop via `get(/databases/$(database)/documents/shops/$(shopId)).data.ownerId == request.auth.uid` on single-doc access, and `resource.data.ownerId == request.auth.uid` on `list` queries (cost-optimized, zero `get()` inside `allow list`).
2. **Zero-PII Customer Portal Lookup (`/loyaltyCards/{customerCode}`)**: Customers look up their points by exact `customerCode` (`allow get: if isValidCustomerCode(customerCode)`). `allow list: if false;` strictly prevents scraping or enumerating customers. `loyaltyCards` NEVER stores phone, email, or address. Only the owning verified shopkeeper can write/update/delete a loyalty card (`ownerId == request.auth.uid`).
3. **Verified Email Mandate**: Every write operation requires `request.auth != null && request.auth.token.email_verified == true`.
4. **Referential Integrity & Atomicity**: A bill in `/shops/{shopId}/bills/{billId}` MUST reference an existing or atomically created customer via `existsAfter(/databases/$(database)/documents/shops/$(shopId)/customers/$(incoming().customerId))`. A `BillLineItem` MUST reference its parent bill via `existsAfter(...)`. A `CoinTransaction` MUST reference an existing/atomic customer via `existsAfter(...)`.
5. **Immutable Ownership & Creation Timestamps**: `ownerId` and `createdAt` (plus `firstVisitAt` on Customer, `billId` on BillLineItem, `customerCode` on LoyaltyCard) cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create/update.
6. **Terminal State Locking**: Once a Bill has `status == 'void'`, it is locked from any further updates.
7. **Strict Schema & Size Bounds**: Every document enforces exact `hasAll` + `hasOnly` keys on create, `affectedKeys().hasOnly(...)` on action-based updates, regex `isValidId()` on all path IDs, bounded array guards (`offersSummary.size() <= 8`, `recentBillsSummary.size() <= 5`), and explicit `.size()` bounds on all strings.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Shop Read**: User B attempts `get` on `/shops/userA`. Must return `PERMISSION_DENIED`.
2. **Owner Spoofing on Create**: User B attempts `create` on `/shops/userB` with `ownerId: "userA"`. Must return `PERMISSION_DENIED`.
3. **Shadow Field Injection**: User A creates a customer or catalog item with extra ghost field `isVipAdmin: true`. Must return `PERMISSION_DENIED`.
4. **Unverified Email Write**: User with `email_verified: false` attempts to create a bill or product. Must return `PERMISSION_DENIED`.
5. **ID Poisoning (1.5KB Document ID)**: User attempts to create `/shops/{uid}/customers/${'a'.repeat(1500)}`. Must return `PERMISSION_DENIED`.
6. **Client Timestamp Forgery**: User creates a bill with `createdAt` set to a past timestamp (`new Date(2020, 0, 1)`). Must return `PERMISSION_DENIED`.
7. **Orphan Bill Creation**: User creates a bill pointing to non-existent `customerId: "ghost_cust_999"` without creating the customer in the same batch. Must return `PERMISSION_DENIED`.
8. **Negative Coin Balance or Negative Stock Attack**: User updates a customer with `coinBalance: -50` or product with `stockQuantity: -10`. Must return `PERMISSION_DENIED`.
9. **Voided Bill Tampering**: User updates `totalAmount` or `status` on an already-voided bill (`status == 'void'`). Must return `PERMISSION_DENIED`.
10. **Loyalty Card Scraping (`list` attack)**: Unauthenticated visitor or User B runs `list` query on `/loyaltyCards`. Must return `PERMISSION_DENIED`.
11. **Value Poisoning on Allowed Update Key**: User updates `shopName` with a 5000-character string or non-string number. Must return `PERMISSION_DENIED`.
12. **Immutable Owner Swap on Update**: User updates a customer or loyalty card attempting to change `ownerId` or `firstVisitAt`. Must return `PERMISSION_DENIED`.
