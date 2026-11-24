export type BillPrintFormat = '58mm' | '80mm' | 'a5' | 'a4';

export interface PrintFormatOption {
  id: BillPrintFormat;
  label: string;
  shortLabel: string;
  sizeNote: string;
  description: string;
}

export const PRINT_FORMAT_OPTIONS: PrintFormatOption[] = [
  {
    id: '58mm',
    label: '58mm Thermal',
    shortLabel: '58mm Roll',
    sizeNote: '2-inch POS',
    description: 'Compact mini thermal roll receipt for pocket & counter printers',
  },
  {
    id: '80mm',
    label: '80mm Thermal',
    shortLabel: '80mm Roll',
    sizeNote: '3-inch POS',
    description: 'Standard retail POS roll receipt with itemized lines & coin box',
  },
  {
    id: 'a5',
    label: 'A5 Invoice',
    shortLabel: 'A5 Half',
    sizeNote: '148 × 210 mm',
    description: 'Clean half-page bordered invoice for laser & inkjet printers',
  },
  {
    id: 'a4',
    label: 'A4 Tax Invoice',
    shortLabel: 'A4 Full',
    sizeNote: '210 × 297 mm',
    description: 'Formal full-page GST/tax invoice with full breakdown & signatory',
  },
];

const storageKey = (shopId: string) => `bnl_print_format_${shopId}`;

export function getSavedPrintFormat(shopId: string): BillPrintFormat {
  try {
    const raw = localStorage.getItem(storageKey(shopId));
    if (raw === '58mm' || raw === '80mm' || raw === 'a5' || raw === 'a4') {
      return raw;
    }
  } catch {
    // Ignore storage access errors
  }
  return '80mm';
}

export function savePrintFormat(shopId: string, format: BillPrintFormat): void {
  try {
    localStorage.setItem(storageKey(shopId), format);
  } catch {
    // Ignore storage access errors
  }
}
