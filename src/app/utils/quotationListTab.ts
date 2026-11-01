const QUOTATION_STATUS_TABS = ['draft', 'pending', 'approved', 'locked', 'executed'] as const;
const QUOTATION_PAGE_SIZES = [10, 25, 50, 100] as const;
const QUOTATION_TAB_STORAGE_KEY = 'quotations.selectedStatus';
const QUOTATION_PAGE_SIZE_STORAGE_KEY = 'quotations.pageSize';

export const isQuotationListFlow = (pathname: string) => (
  pathname === '/quotations'
  || pathname === '/quotations/new'
  || /^\/quotations\/[^/]+\/(preview|edit)$/.test(pathname)
);

export const readStoredQuotationTab = () => {
  try {
    const stored = sessionStorage.getItem(QUOTATION_TAB_STORAGE_KEY);
    if (stored && QUOTATION_STATUS_TABS.includes(stored as (typeof QUOTATION_STATUS_TABS)[number])) {
      return stored;
    }
  } catch {
    // Ignore storage access errors and fall back to the default tab.
  }

  return 'draft';
};

export const storeQuotationTab = (value: string) => {
  try {
    sessionStorage.setItem(QUOTATION_TAB_STORAGE_KEY, value);
  } catch {
    // Ignore storage access errors; the tab still updates for this visit.
  }
};

export const readStoredQuotationPageSize = () => {
  try {
    const stored = Number(sessionStorage.getItem(QUOTATION_PAGE_SIZE_STORAGE_KEY));
    if (QUOTATION_PAGE_SIZES.includes(stored as (typeof QUOTATION_PAGE_SIZES)[number])) {
      return stored;
    }
  } catch {
    // Ignore storage access errors and fall back to the default page size.
  }

  return 10;
};

export const storeQuotationPageSize = (value: number) => {
  try {
    if (QUOTATION_PAGE_SIZES.includes(value as (typeof QUOTATION_PAGE_SIZES)[number])) {
      sessionStorage.setItem(QUOTATION_PAGE_SIZE_STORAGE_KEY, String(value));
    }
  } catch {
    // Ignore storage access errors; the page size still updates for this visit.
  }
};

export const clearStoredQuotationTab = () => {
  try {
    sessionStorage.removeItem(QUOTATION_TAB_STORAGE_KEY);
    sessionStorage.removeItem(QUOTATION_PAGE_SIZE_STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
};
