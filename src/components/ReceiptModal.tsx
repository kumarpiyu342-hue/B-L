import React, { useState } from 'react';
import { Check, Copy, Link2, Printer, X } from 'lucide-react';
import { Bill, BillLineItem, Shop } from '../types/shop';
import {
  BillPrintFormat,
  getSavedPrintFormat,
  PRINT_FORMAT_OPTIONS,
  savePrintFormat,
} from '../utils/printFormat';

interface ReceiptModalProps {
  shop: Shop;
  bill: Bill;
  lineItems: BillLineItem[];
  customerCoinBalance?: number;
  onClose: () => void;
}

const PAGE_CSS: Record<BillPrintFormat, string> = {
  '58mm': '@page { size: 58mm auto; margin: 2mm; }',
  '80mm': '@page { size: 80mm auto; margin: 3mm; }',
  a5: '@page { size: A5 portrait; margin: 8mm; }',
  a4: '@page { size: A4 portrait; margin: 12mm; }',
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  shop,
  bill,
  lineItems,
  customerCoinBalance,
  onClose,
}) => {
  const [copiedMsg, setCopiedMsg] = useState<'wa' | 'link' | null>(null);
  const [printFormat, setPrintFormat] = useState<BillPrintFormat>(() =>
    getSavedPrintFormat(shop.id)
  );

  const handleSelectFormat = (fmt: BillPrintFormat) => {
    setPrintFormat(fmt);
    savePrintFormat(shop.id, fmt);
  };

  const dateText = bill.createdAt
    ? bill.createdAt.toDate().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-IN');

  const portalUrl = `${window.location.origin}/?cid=${encodeURIComponent(bill.customerCode)}`;

  const copyWhatsAppSummary = async () => {
    const linesText = lineItems
      .map(
        (li) =>
          `• ${li.name} (${li.qty} ${li.unit}) — ${shop.currencySymbol}${li.lineTotal.toFixed(2)}`
      )
      .join('\n');

    const msg = [
      `*${shop.shopName}*`,
      `Bill: ${bill.billNumber} | Date: ${dateText}`,
      `Customer: ${bill.customerName} (ID: ${bill.customerCode})`,
      '',
      linesText,
      '',
      `Total Paid: *${shop.currencySymbol}${bill.totalAmount.toFixed(2)}* (${bill.paymentMode})`,
      bill.coinsRedeemed > 0
        ? `Redeemed: ${bill.coinsRedeemed} ${shop.coinName} (-${shop.currencySymbol}${bill.coinDiscount.toFixed(2)})`
        : '',
      `Earned: +${bill.coinsEarned} ${shop.coinName}`,
      customerCoinBalance !== undefined
        ? `Updated ${shop.coinName} Balance: ${customerCoinBalance}`
        : '',
      `Check your points anytime: ${portalUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    await navigator.clipboard.writeText(msg);
    setCopiedMsg('wa');
    setTimeout(() => setCopiedMsg(null), 2000);
  };

  const copyCustomerLink = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopiedMsg('link');
    setTimeout(() => setCopiedMsg(null), 2000);
  };

  const modalMaxWidth =
    printFormat === 'a4'
      ? 'max-w-4xl'
      : printFormat === 'a5'
        ? 'max-w-2xl'
        : 'max-w-lg';

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
    >
      <style>{`@media print { ${PAGE_CSS[printFormat]} }`}</style>

      <div
        id="receipt-modal-card"
        className={`bg-white border border-amber-200/80 rounded-xl ${modalMaxWidth} w-full overflow-hidden my-8 shadow-xl`}
      >
        {/* Top Modal Toolbar (hidden in print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-amber-200/70 bg-stone-950 text-amber-50">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-amber-300 font-mono-tabular">
              {bill.billNumber}
            </span>
            <span className="text-xs text-stone-400">· Print &amp; Share</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copyWhatsAppSummary()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 cursor-pointer"
            >
              {copiedMsg === 'wa' ? (
                <Check className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedMsg === 'wa' ? 'Copied' : 'Copy Summary'}
            </button>
            <button
              type="button"
              onClick={() => void copyCustomerLink()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 cursor-pointer"
            >
              {copiedMsg === 'link' ? (
                <Check className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              {copiedMsg === 'link' ? 'Link Copied' : 'Points Link'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print ({PRINT_FORMAT_OPTIONS.find((o) => o.id === printFormat)?.shortLabel})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              className="p-1.5 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bill Print Size Selector Strip (hidden in print) */}
        <div className="no-print px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/70 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-stone-700">
            Paper Size / Bill Format:
          </span>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-amber-200/80 rounded-lg">
            {PRINT_FORMAT_OPTIONS.map((opt) => {
              const active = printFormat === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectFormat(opt.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-stone-900 text-amber-300'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {opt.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview Stage */}
        <div className="bg-stone-100/80 p-4 sm:p-6 flex justify-center overflow-x-auto">
          {/* 58mm Compact Thermal Roll */}
          {printFormat === '58mm' && (
            <div
              id="printable-receipt"
              className="w-[228px] bg-white border border-stone-300 p-3 text-[10px] leading-snug text-stone-900 font-mono-tabular shadow-sm print:w-[54mm] print:border-none print:p-1"
            >
              <div className="text-center pb-2 border-b border-dashed border-stone-400">
                <div className="font-bold text-xs uppercase tracking-wide">
                  {shop.shopName}
                </div>
                {shop.address && <div className="text-[9px] mt-0.5">{shop.address}</div>}
                {shop.phone && <div className="text-[9px]">Ph: {shop.phone}</div>}
                {shop.gstin && <div className="text-[9px]">GST: {shop.gstin}</div>}
              </div>

              <div className="py-1.5 border-b border-dashed border-stone-400 space-y-0.5 text-[9.5px]">
                <div className="flex justify-between">
                  <span>Bill: {bill.billNumber}</span>
                  <span>{bill.paymentMode}</span>
                </div>
                <div>{dateText}</div>
                <div>
                  Cust: {bill.customerName} ({bill.customerPhone})
                </div>
                <div className="font-bold">
                  ID: {bill.customerCode} · Visit #{bill.visitNumber}
                </div>
              </div>

              <div className="py-1.5 border-b border-dashed border-stone-400 space-y-1.5">
                <div className="flex justify-between font-bold text-[9px] border-b border-stone-200 pb-0.5">
                  <span>ITEM</span>
                  <span>AMT</span>
                </div>
                {lineItems.map((item) => (
                  <div key={item.id}>
                    <div className="font-semibold text-stone-900 truncate">
                      {item.name}
                    </div>
                    <div className="flex justify-between text-[9.5px] text-stone-700">
                      <span>
                        {item.qty} {item.unit} × {shop.currencySymbol}
                        {item.unitPrice.toFixed(0)}
                        {item.taxRate > 0 ? ` (+${item.taxRate}%)` : ''}
                      </span>
                      <span className="font-semibold text-stone-900">
                        {shop.currencySymbol}
                        {item.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-1.5 border-b border-dashed border-stone-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {shop.currencySymbol}
                    {bill.subtotal.toFixed(2)}
                  </span>
                </div>
                {bill.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>
                      {shop.currencySymbol}
                      {bill.taxAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {bill.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>
                      -{shop.currencySymbol}
                      {bill.discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {bill.coinDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Coins ({bill.coinsRedeemed})</span>
                    <span>
                      -{shop.currencySymbol}
                      {bill.coinDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-300">
                  <span>TOTAL</span>
                  <span>
                    {shop.currencySymbol}
                    {bill.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-1.5 text-[9.5px] space-y-0.5 text-center">
                <div className="font-bold">
                  Earned: +{bill.coinsEarned} {shop.coinName}
                </div>
                {customerCoinBalance !== undefined && (
                  <div>
                    Bal: {customerCoinBalance} {shop.coinName}
                  </div>
                )}
                {shop.receiptFooter && (
                  <div className="pt-1 text-[9px] text-stone-600">
                    {shop.receiptFooter}
                  </div>
                )}
                <div className="text-[8.5px] text-stone-500 pt-0.5">
                  Powered by B&amp;L
                </div>
              </div>
            </div>
          )}

          {/* 80mm Standard POS Thermal Roll */}
          {printFormat === '80mm' && (
            <div
              id="printable-receipt"
              className="w-[312px] bg-white border border-stone-300 p-5 text-stone-900 shadow-sm print:w-[74mm] print:border-none print:p-2"
            >
              <div className="text-center pb-3.5 border-b border-dashed border-stone-300">
                <h2 className="font-display text-base font-bold text-stone-900">
                  {shop.shopName}
                </h2>
                {shop.address && (
                  <p className="text-[11px] text-stone-600 mt-0.5">{shop.address}</p>
                )}
                <div className="text-[11px] text-stone-500 mt-1">
                  {shop.phone && <span>Ph: {shop.phone}</span>}
                  {shop.phone && shop.gstin && <span className="mx-1.5">·</span>}
                  {shop.gstin && <span className="font-mono-tabular">GSTIN: {shop.gstin}</span>}
                </div>
              </div>

              <div className="py-3 border-b border-dashed border-stone-300 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Bill No</span>
                  <span className="font-mono-tabular font-semibold">{bill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Date</span>
                  <span className="font-mono-tabular">{dateText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer</span>
                  <span className="font-medium text-right">
                    {bill.customerName} ({bill.customerPhone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer ID</span>
                  <span className="font-mono-tabular font-semibold text-amber-800">
                    {bill.customerCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Visit</span>
                  <span>
                    {bill.isRepeatVisit
                      ? `Returning · #${bill.visitNumber}`
                      : 'First Visit (#1)'}
                  </span>
                </div>
              </div>

              <table className="w-full text-xs my-3">
                <thead>
                  <tr className="border-b border-stone-300 text-stone-500">
                    <th className="text-left py-1.5 font-medium">Item</th>
                    <th className="text-right py-1.5 font-medium">Qty</th>
                    <th className="text-right py-1.5 font-medium">Rate</th>
                    <th className="text-right py-1.5 font-medium">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-1.5">
                        <div className="font-medium text-stone-900">{item.name}</div>
                        {item.taxRate > 0 && (
                          <div className="text-[10px] text-stone-400">
                            Tax {item.taxRate}% ({shop.currencySymbol}
                            {item.taxAmount.toFixed(2)})
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-right font-mono-tabular whitespace-nowrap">
                        {item.qty}
                      </td>
                      <td className="py-1.5 text-right font-mono-tabular whitespace-nowrap">
                        {item.unitPrice.toFixed(0)}
                      </td>
                      <td className="py-1.5 text-right font-mono-tabular font-medium whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2.5 border-t border-dashed border-stone-300 text-xs space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono-tabular">
                    {shop.currencySymbol}
                    {bill.subtotal.toFixed(2)}
                  </span>
                </div>
                {bill.taxAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Tax / GST</span>
                    <span className="font-mono-tabular">
                      {shop.currencySymbol}
                      {bill.taxAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {bill.discountAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Store Discount</span>
                    <span className="font-mono-tabular text-amber-800">
                      -{shop.currencySymbol}
                      {bill.discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {bill.coinDiscount > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>
                      {bill.appliedOfferTitle
                        ? `${bill.appliedOfferTitle}`
                        : `${shop.coinName} Redeemed (${bill.coinsRedeemed})`}
                    </span>
                    <span className="font-mono-tabular">
                      -{shop.currencySymbol}
                      {bill.coinDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-300">
                  <span>Total ({bill.paymentMode})</span>
                  <span className="font-mono-tabular">
                    {shop.currencySymbol}
                    {bill.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between font-medium text-stone-900">
                  <span>{shop.coinName} Earned</span>
                  <span className="font-mono-tabular text-amber-800 font-bold">
                    +{bill.coinsEarned} {shop.coinName}
                  </span>
                </div>
                {customerCoinBalance !== undefined && (
                  <div className="flex justify-between text-stone-600">
                    <span>Updated Balance</span>
                    <span className="font-mono-tabular font-semibold">
                      {customerCoinBalance} {shop.coinName}
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-stone-500 pt-1">
                  Check points online with ID{' '}
                  <span className="font-mono-tabular font-semibold text-stone-800">
                    {bill.customerCode}
                  </span>
                </div>
              </div>

              {shop.receiptFooter && (
                <p className="text-center text-[11px] text-stone-500 mt-3.5">
                  {shop.receiptFooter}
                </p>
              )}
              <p className="text-center text-[10px] text-stone-400 mt-1.5">
                B&amp;L · Billing &amp; Loyalty
              </p>
            </div>
          )}

          {/* A5 Half-Page Invoice */}
          {printFormat === 'a5' && (
            <div
              id="printable-receipt"
              className="w-full max-w-[540px] bg-white border border-stone-300 p-6 text-stone-900 shadow-sm print:max-w-full print:border print:border-stone-400 print:p-5"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-stone-900">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    {shop.taxEnabled && bill.taxAmount > 0 ? 'Tax Invoice' : 'Retail Bill'}
                  </div>
                  <h2 className="font-display text-xl font-bold text-stone-900 mt-0.5">
                    {shop.shopName}
                  </h2>
                  {shop.address && (
                    <p className="text-xs text-stone-600 mt-0.5">{shop.address}</p>
                  )}
                  <div className="text-xs text-stone-500 mt-1">
                    {shop.phone && <span>Ph: {shop.phone}</span>}
                    {shop.phone && shop.gstin && <span className="mx-1.5">·</span>}
                    {shop.gstin && <span className="font-mono-tabular">GSTIN: {shop.gstin}</span>}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono-tabular font-bold text-sm text-stone-900">
                    {bill.billNumber}
                  </div>
                  <div className="text-stone-500 font-mono-tabular mt-0.5">{dateText}</div>
                  <div className="mt-1 font-medium text-stone-700">
                    {bill.paymentMode} ·{' '}
                    {bill.status === 'void'
                      ? 'VOID'
                      : bill.status === 'pending'
                        ? 'CREDIT PENDING'
                        : 'PAID'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-b border-stone-200 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    Billed To
                  </div>
                  <div className="font-semibold text-stone-900 mt-0.5">
                    {bill.customerName}
                  </div>
                  <div className="font-mono-tabular text-stone-600">{bill.customerPhone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    Loyalty Member
                  </div>
                  <div className="font-mono-tabular font-bold text-amber-800 mt-0.5">
                    ID: {bill.customerCode}
                  </div>
                  <div className="text-stone-600">
                    {bill.isRepeatVisit
                      ? `Returning Customer · Visit #${bill.visitNumber}`
                      : 'First Visit (#1)'}
                  </div>
                </div>
              </div>

              <table className="w-full text-xs my-4 border-collapse">
                <thead>
                  <tr className="border-b border-stone-300 bg-stone-50 text-stone-600">
                    <th className="text-left py-2 px-2 font-semibold">#</th>
                    <th className="text-left py-2 px-2 font-semibold">Item</th>
                    <th className="text-right py-2 px-2 font-semibold">Qty</th>
                    <th className="text-right py-2 px-2 font-semibold">Rate</th>
                    {shop.taxEnabled && (
                      <th className="text-right py-2 px-2 font-semibold">Tax</th>
                    )}
                    <th className="text-right py-2 px-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2 font-mono-tabular text-stone-400">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium text-stone-900">{item.name}</td>
                      <td className="py-2 px-2 text-right font-mono-tabular whitespace-nowrap">
                        {item.qty} {item.unit}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.unitPrice.toFixed(2)}
                      </td>
                      {shop.taxEnabled && (
                        <td className="py-2 px-2 text-right font-mono-tabular text-stone-500 whitespace-nowrap">
                          {item.taxRate}%
                        </td>
                      )}
                      <td className="py-2 px-2 text-right font-mono-tabular font-semibold whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-stone-300 items-start">
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <div className="font-semibold text-stone-900">
                    {shop.coinName} Loyalty Summary
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Earned this bill</span>
                    <span className="font-mono-tabular font-bold text-amber-800">
                      +{bill.coinsEarned}
                    </span>
                  </div>
                  {bill.coinsRedeemed > 0 && (
                    <div className="flex justify-between text-stone-700">
                      <span>Redeemed</span>
                      <span className="font-mono-tabular">-{bill.coinsRedeemed}</span>
                    </div>
                  )}
                  {customerCoinBalance !== undefined && (
                    <div className="flex justify-between text-stone-900 font-semibold pt-1 border-t border-amber-200/70">
                      <span>Updated Balance</span>
                      <span className="font-mono-tabular">
                        {customerCoinBalance} {shop.coinName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-mono-tabular">
                      {shop.currencySymbol}
                      {bill.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {bill.taxAmount > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Total Tax / GST</span>
                      <span className="font-mono-tabular">
                        {shop.currencySymbol}
                        {bill.taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {bill.discountAmount > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Store Discount</span>
                      <span className="font-mono-tabular text-amber-800">
                        -{shop.currencySymbol}
                        {bill.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {bill.coinDiscount > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>
                        {bill.appliedOfferTitle || `${shop.coinName} Redeemed`}
                      </span>
                      <span className="font-mono-tabular">
                        -{shop.currencySymbol}
                        {bill.coinDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-300">
                    <span>Grand Total</span>
                    <span className="font-mono-tabular">
                      {shop.currencySymbol}
                      {bill.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                <span>{shop.receiptFooter || 'Thank you for your business!'}</span>
                <span className="font-medium text-stone-400">B&amp;L Invoice</span>
              </div>
            </div>
          )}

          {/* A4 Full-Page Formal Tax Invoice */}
          {printFormat === 'a4' && (
            <div
              id="printable-receipt"
              className="w-full max-w-[740px] bg-white border border-stone-300 p-8 text-stone-900 shadow-sm print:max-w-full print:border print:border-stone-400 print:p-6"
            >
              {/* Formal Top Header */}
              <div className="flex items-start justify-between gap-6 pb-5 border-b-2 border-stone-900">
                <div>
                  <div className="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-stone-900 text-amber-300 rounded mb-2">
                    {shop.taxEnabled && bill.taxAmount > 0 ? 'Tax Invoice' : 'Invoice / Bill of Supply'}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-stone-900">
                    {shop.shopName}
                  </h2>
                  {shop.address && (
                    <p className="text-xs text-stone-600 mt-1 max-w-md">{shop.address}</p>
                  )}
                  <div className="text-xs text-stone-600 mt-1.5 space-x-3">
                    {shop.ownerName && <span>Prop: {shop.ownerName}</span>}
                    {shop.phone && <span className="font-mono-tabular">Ph: {shop.phone}</span>}
                    {shop.gstin && (
                      <span className="font-mono-tabular font-semibold text-stone-900">
                        GSTIN: {shop.gstin}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 min-w-[200px]">
                  <div className="text-[11px] text-stone-500 uppercase tracking-wider">
                    Invoice Number
                  </div>
                  <div className="font-mono-tabular text-lg font-bold text-stone-900">
                    {bill.billNumber}
                  </div>
                  <div className="text-xs text-stone-600 font-mono-tabular mt-1">
                    {dateText}
                  </div>
                  <div className="text-xs font-semibold text-amber-800 mt-1">
                    {bill.paymentMode} ·{' '}
                    {bill.status === 'void'
                      ? 'VOIDED'
                      : bill.status === 'pending'
                        ? 'CREDIT PENDING'
                        : 'PAID'}
                  </div>
                </div>
              </div>

              {/* Bill-To & Loyalty Member Details */}
              <div className="grid grid-cols-2 gap-6 py-4 border-b border-stone-200 text-xs">
                <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                    Bill To (Customer)
                  </div>
                  <div className="text-sm font-bold text-stone-900">{bill.customerName}</div>
                  <div className="font-mono-tabular text-stone-600 mt-0.5">
                    Phone: {bill.customerPhone}
                  </div>
                  {bill.notes && (
                    <div className="text-stone-500 mt-1">Note: {bill.notes}</div>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 mb-1">
                    B&amp;L Loyalty Account
                  </div>
                  <div className="font-mono-tabular text-sm font-bold text-stone-900">
                    Customer ID: {bill.customerCode}
                  </div>
                  <div className="text-stone-700 mt-0.5">
                    {bill.isRepeatVisit
                      ? `Returning Customer · Visit #${bill.visitNumber}`
                      : 'Welcome First Visit (#1)'}
                  </div>
                </div>
              </div>

              {/* Full Itemized Table */}
              <table className="w-full text-xs my-5 border border-stone-200 border-collapse">
                <thead>
                  <tr className="bg-stone-900 text-amber-50">
                    <th className="text-left py-2.5 px-3 font-semibold w-10">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Item Description</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Qty</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Unit Rate</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Tax %</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Tax Amt</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-mono-tabular text-stone-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular whitespace-nowrap">
                        {item.qty} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-stone-600 whitespace-nowrap">
                        {item.taxRate}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-stone-600 whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.taxAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold text-stone-900 whitespace-nowrap">
                        {shop.currencySymbol}
                        {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Lower Summary Grid */}
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-7 space-y-3">
                  <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                    <div className="font-display font-bold text-sm text-stone-900">
                      {shop.coinName} Rewards Summary
                    </div>
                    <div className="flex justify-between text-stone-700">
                      <span>{shop.coinName} Earned on Invoice</span>
                      <span className="font-mono-tabular font-bold text-amber-800">
                        +{bill.coinsEarned} {shop.coinName}
                      </span>
                    </div>
                    {bill.coinsRedeemed > 0 && (
                      <div className="flex justify-between text-stone-700">
                        <span>{shop.coinName} Redeemed</span>
                        <span className="font-mono-tabular font-semibold">
                          -{bill.coinsRedeemed} {shop.coinName} ({shop.currencySymbol}
                          {bill.coinDiscount.toFixed(2)} saved)
                        </span>
                      </div>
                    )}
                    {customerCoinBalance !== undefined && (
                      <div className="flex justify-between text-stone-900 font-semibold pt-1.5 border-t border-amber-200/80">
                        <span>Current Available Balance</span>
                        <span className="font-mono-tabular">
                          {customerCoinBalance} {shop.coinName}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-stone-500 pt-1">
                      Visit the B&amp;L Customer Points Portal and enter Customer ID{' '}
                      <span className="font-mono-tabular font-semibold text-stone-800">
                        {bill.customerCode}
                      </span>{' '}
                      to track points and special offers.
                    </p>
                  </div>
                </div>

                <div className="col-span-5 border border-stone-200 rounded-lg p-4 text-xs space-y-2">
                  <div className="flex justify-between text-stone-600">
                    <span>Taxable Subtotal</span>
                    <span className="font-mono-tabular">
                      {shop.currencySymbol}
                      {bill.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Total Tax / GST</span>
                    <span className="font-mono-tabular">
                      {shop.currencySymbol}
                      {bill.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  {bill.discountAmount > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Store Discount</span>
                      <span className="font-mono-tabular text-amber-800">
                        -{shop.currencySymbol}
                        {bill.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {bill.coinDiscount > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>
                        {bill.appliedOfferTitle
                          ? bill.appliedOfferTitle
                          : `${shop.coinName} Discount`}
                      </span>
                      <span className="font-mono-tabular">
                        -{shop.currencySymbol}
                        {bill.coinDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-stone-900 pt-2.5 border-t border-stone-300">
                    <span>Net Payable</span>
                    <span className="font-mono-tabular">
                      {shop.currencySymbol}
                      {bill.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer & Signatory */}
              <div className="mt-8 pt-4 border-t border-stone-200 flex items-end justify-between text-xs text-stone-500">
                <div>
                  <div className="font-medium text-stone-700">
                    {shop.receiptFooter || 'Thank you for shopping with us!'}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    Generated via B&amp;L — Billing &amp; Loyalty
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-stone-400 mb-6">
                    For {shop.shopName}
                  </div>
                  <div className="border-t border-stone-400 pt-1 px-4 font-medium text-stone-700">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
