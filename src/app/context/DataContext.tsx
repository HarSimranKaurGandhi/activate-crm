import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { categoryService, brandService, adjustmentService, termService, customerFieldService } from '../../services/masterService';
import { productService } from '../../services/productService';
import { customerService } from '../../services/customerService';
import { quotationService } from '../../services/quotationService';
import { settingsService } from '../../services/settingsService';
import {
  adjustmentPayload,
  brandPayload,
  categoryPayload,
  customerFieldPayload,
  customerPayload,
  mapAdjustment,
  mapBrand,
  mapCategory,
  mapCompanySettings,
  mapCustomer,
  mapCustomerField,
  mapProduct,
  mapQuotation,
  mapTerm,
  productPayload,
  quotationPayload,
  termPayload,
} from '../../services/mappers';

const emptySettings = {
  name: '',
  logo: '',
  gstNumber: '',
  address: '',
  phone: '',
  email: '',
  defaultSalespersonName: '',
  defaultSalespersonPhone: '',
  defaultSalespersonEmail: '',
  bankDetails: {
    id: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
  },
  quotationPrefix: 'QT-',
  nextNumber: 1,
  padding: 5,
  defaultValidityDays: 30,
  letterhead: '',
};

interface DataContextType {
  loading: boolean;
  refreshAll: () => Promise<void>;
  products: any[];
  addProduct: (product: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  customers: any[];
  addCustomer: (customer: any) => Promise<any>;
  updateCustomer: (id: string, customer: any) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  quotations: any[];
  addQuotation: (quotation: any) => Promise<void>;
  updateQuotation: (id: string, quotation: any) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  duplicateQuotation: (id: string) => Promise<any>;
  submitQuotationForApproval: (id: string) => Promise<void>;
  approveQuotation: (id: string, remarks?: string) => Promise<void>;
  rejectQuotation: (id: string, remarks: string) => Promise<void>;
  reviseQuotation: (id: string, remarks: string) => Promise<void>;
  categories: any[];
  addCategory: (category: any) => Promise<void>;
  updateCategory: (id: string, category: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  brands: any[];
  addBrand: (brand: any) => Promise<void>;
  updateBrand: (id: string, brand: any) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
  adjustments: any[];
  addAdjustment: (adjustment: any) => Promise<void>;
  updateAdjustment: (id: string, adjustment: any) => Promise<void>;
  deleteAdjustment: (id: string) => Promise<void>;
  terms: any[];
  addTerm: (term: any) => Promise<void>;
  updateTerm: (id: string, term: any) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  customFields: any[];
  addCustomField: (field: any) => Promise<void>;
  updateCustomField: (id: string, field: any) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  settings: typeof emptySettings;
  updateSettings: (settings: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const asArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [settings, setSettings] = useState(emptySettings);
  const loadedRef = useRef<Record<string, boolean>>({});
  const inFlightRef = useRef<Record<string, Promise<void> | null>>({});

  const runLoader = useCallback(async (key: string, loader: () => Promise<void>, force = false) => {
    if (!token) return;

    if (!force && loadedRef.current[key]) return;
    if (!force && inFlightRef.current[key]) return inFlightRef.current[key];

    const promise = loader()
      .then(() => {
        loadedRef.current[key] = true;
      })
      .finally(() => {
        inFlightRef.current[key] = null;
      });

    inFlightRef.current[key] = promise;
    return promise;
  }, [token]);

  const loadSettings = useCallback(async (force = false) => {
    return runLoader('settings', async () => {
      const [company, banks, numbering] = await Promise.all([
        settingsService.company(),
        settingsService.bankDetails(),
        settingsService.quotationNumbering(),
      ]);
      const bankList = asArray(banks);
      const defaultBank = bankList.find((bank: any) => bank.is_default) || bankList[0];
      setSettings(mapCompanySettings(company, defaultBank, numbering));
    }, force);
  }, [runLoader]);

  const loadCategories = useCallback(async (force = false) => {
    return runLoader('categories', async () => {
      const result = await categoryService.list();
      setCategories(asArray(result.data).map(mapCategory));
    }, force);
  }, [runLoader]);

  const loadBrands = useCallback(async (force = false) => {
    return runLoader('brands', async () => {
      const result = await brandService.list();
      setBrands(asArray(result.data).map(mapBrand));
    }, force);
  }, [runLoader]);

  const loadProducts = useCallback(async (force = false) => {
    return runLoader('products', async () => {
      const result = await productService.listAll();
      setProducts(result.map(mapProduct));
    }, force);
  }, [runLoader]);

  const loadCustomers = useCallback(async (force = false) => {
    return runLoader('customers', async () => {
      const result = await customerService.list();
      setCustomers(asArray(result.data).map(mapCustomer));
    }, force);
  }, [runLoader]);

  const loadQuotations = useCallback(async (force = false) => {
    return runLoader('quotations', async () => {
      const result = await quotationService.list();
      setQuotations(asArray(result.data).map(mapQuotation));
    }, force);
  }, [runLoader]);

  const loadAdjustments = useCallback(async (force = false) => {
    return runLoader('adjustments', async () => {
      const result = await adjustmentService.list();
      setAdjustments(asArray(result.data).map(mapAdjustment));
    }, force);
  }, [runLoader]);

  const loadTerms = useCallback(async (force = false) => {
    return runLoader('terms', async () => {
      const result = await termService.list();
      setTerms(asArray(result.data).map(mapTerm));
    }, force);
  }, [runLoader]);

  const loadCustomFields = useCallback(async (force = false) => {
    return runLoader('customFields', async () => {
      const result = await customerFieldService.list();
      setCustomFields(asArray(result.data).map(mapCustomerField));
    }, force);
  }, [runLoader]);

  const loadForPath = useCallback(async (pathname: string) => {
    if (!token) return;

    const loaders: Array<Promise<void> | undefined> = [];

    if (pathname === '/') {
      loaders.push(loadQuotations());
    }

    if (pathname.startsWith('/quotations')) {
      if (pathname === '/quotations' || pathname === '/quotations/approvals') {
        loaders.push(loadQuotations());
      }

      if (pathname === '/quotations/new' || /^\/quotations\/[^/]+\/edit$/.test(pathname)) {
        loaders.push(loadCategories(), loadBrands(), loadAdjustments(), loadTerms(), loadSettings(), loadQuotations());
      }

      if (/^\/quotations\/[^/]+\/preview$/.test(pathname)) {
        loaders.push(loadAdjustments(), loadTerms(), loadSettings());
      }
    }

    if (pathname.startsWith('/customers')) {
      loaders.push(loadCustomers());
      if (pathname === '/customers/new' || /^\/customers\/[^/]+\/edit$/.test(pathname)) {
        loaders.push(loadCustomFields());
      }
    }

    if (pathname.startsWith('/products')) {
      loaders.push(loadCategories(), loadBrands());
    }

    if (pathname === '/masters/categories') loaders.push(loadCategories());
    if (pathname === '/masters/brands') loaders.push(loadBrands());
    if (pathname === '/masters/terms') loaders.push(loadTerms());
    if (pathname === '/masters/adjustments') loaders.push(loadAdjustments());
    if (pathname === '/masters/custom-fields') loaders.push(loadCustomFields());
    if (pathname === '/reports') loaders.push(loadQuotations(), loadCustomers(), loadProducts());
    if (pathname === '/settings') loaders.push(loadSettings());

    if (loaders.length === 0) return;

    setLoading(true);
    try {
      await Promise.all(loaders.filter(Boolean) as Promise<void>[]);
    } finally {
      setLoading(false);
    }
  }, [
    loadAdjustments,
    loadBrands,
    loadCategories,
    loadCustomFields,
    loadCustomers,
    loadProducts,
    loadQuotations,
    loadSettings,
    loadTerms,
    token,
  ]);

  const refreshAll = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      await Promise.all([
        loadCategories(true),
        loadBrands(true),
        loadProducts(true),
        loadCustomers(true),
        loadQuotations(true),
        loadAdjustments(true),
        loadTerms(true),
        loadCustomFields(true),
        loadSettings(true),
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    loadAdjustments,
    loadBrands,
    loadCategories,
    loadCustomFields,
    loadCustomers,
    loadProducts,
    loadQuotations,
    loadSettings,
    loadTerms,
    token,
  ]);

  useEffect(() => {
    const notify = () => setPathname(window.location.pathname);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };

    window.history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };

    window.addEventListener('popstate', notify);
    window.addEventListener('locationchange', notify);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', notify);
      window.removeEventListener('locationchange', notify);
    };
  }, []);

  useEffect(() => {
    if (token) {
      loadForPath(pathname);
    } else {
      loadedRef.current = {};
      inFlightRef.current = {};
      setProducts([]);
      setCustomers([]);
      setQuotations([]);
      setCategories([]);
      setBrands([]);
      setAdjustments([]);
      setTerms([]);
      setCustomFields([]);
      setSettings(emptySettings);
    }
  }, [loadForPath, pathname, token]);

  const replaceById = (setter: React.Dispatch<React.SetStateAction<any[]>>, item: any) => {
    setter((current) => current.map((existing) => (existing.id === item.id ? item : existing)));
  };

  const value = useMemo<DataContextType>(() => ({
    loading,
    refreshAll,
    products,
    async addProduct(product) {
      const created = await productService.create(productPayload(product, categories, brands));
      setProducts((current) => [mapProduct(created), ...current]);
    },
    async updateProduct(id, product) {
      const updated = await productService.update(id, productPayload(product, categories, brands));
      replaceById(setProducts, mapProduct(updated));
    },
    async deleteProduct(id) {
      await productService.remove(id);
      setProducts((current) => current.filter((product) => product.id !== id));
    },
    customers,
    async addCustomer(customer) {
      const created = await customerService.create(customerPayload(customer, customFields));
      const mapped = mapCustomer(created);
      setCustomers((current) => [mapped, ...current]);
      return mapped;
    },
    async updateCustomer(id, customer) {
      const updated = await customerService.update(id, customerPayload(customer, customFields));
      replaceById(setCustomers, mapCustomer(updated));
    },
    async deleteCustomer(id) {
      await customerService.remove(id);
      setCustomers((current) => current.filter((customer) => customer.id !== id));
    },
    quotations,
    async addQuotation(quotation) {
      const created = await quotationService.create(quotationPayload(quotation));
      setQuotations((current) => [mapQuotation(created), ...current]);
    },
    async updateQuotation(id, quotation) {
      const updated = await quotationService.update(id, quotationPayload(quotation));
      replaceById(setQuotations, mapQuotation(updated));
    },
    async deleteQuotation(id) {
      await quotationService.remove(id);
      setQuotations((current) => current.filter((quotation) => quotation.id !== id));
    },
    async duplicateQuotation(id) {
      const duplicated = await quotationService.duplicate(id);
      const mapped = mapQuotation(duplicated);
      setQuotations((current) => [mapped, ...current]);
      return mapped;
    },
    async submitQuotationForApproval(id) {
      const updated = await quotationService.submitForApproval(id);
      replaceById(setQuotations, mapQuotation(updated));
    },
    async approveQuotation(id, remarks) {
      const updated = await quotationService.approve(id, remarks);
      replaceById(setQuotations, mapQuotation(updated));
    },
    async rejectQuotation(id, remarks) {
      const updated = await quotationService.reject(id, remarks);
      replaceById(setQuotations, mapQuotation(updated));
    },
    async reviseQuotation(id, remarks) {
      const updated = await quotationService.revise(id, remarks);
      replaceById(setQuotations, mapQuotation(updated));
    },
    categories,
    async addCategory(category) {
      const created = await categoryService.create(categoryPayload(category));
      setCategories((current) => [mapCategory(created), ...current]);
    },
    async updateCategory(id, category) {
      const updated = await categoryService.update(id, categoryPayload(category));
      replaceById(setCategories, mapCategory(updated));
    },
    async deleteCategory(id) {
      await categoryService.remove(id);
      setCategories((current) => current.filter((category) => category.id !== id));
    },
    brands,
    async addBrand(brand) {
      const created = await brandService.create(brandPayload(brand));
      setBrands((current) => [mapBrand(created), ...current]);
    },
    async updateBrand(id, brand) {
      const updated = await brandService.update(id, brandPayload(brand));
      replaceById(setBrands, mapBrand(updated));
    },
    async deleteBrand(id) {
      await brandService.remove(id);
      setBrands((current) => current.filter((brand) => brand.id !== id));
    },
    adjustments,
    async addAdjustment(adjustment) {
      const created = await adjustmentService.create(adjustmentPayload(adjustment));
      setAdjustments((current) => [mapAdjustment(created), ...current]);
    },
    async updateAdjustment(id, adjustment) {
      const updated = await adjustmentService.update(id, adjustmentPayload(adjustment));
      replaceById(setAdjustments, mapAdjustment(updated));
    },
    async deleteAdjustment(id) {
      await adjustmentService.remove(id);
      setAdjustments((current) => current.filter((adjustment) => adjustment.id !== id));
    },
    terms,
    async addTerm(term) {
      const created = await termService.create(termPayload(term));
      setTerms((current) => [mapTerm(created), ...current]);
    },
    async updateTerm(id, term) {
      const updated = await termService.update(id, termPayload(term));
      replaceById(setTerms, mapTerm(updated));
    },
    async deleteTerm(id) {
      await termService.remove(id);
      setTerms((current) => current.filter((term) => term.id !== id));
    },
    customFields,
    async addCustomField(field) {
      const created = await customerFieldService.create(customerFieldPayload(field));
      setCustomFields((current) => [mapCustomerField(created), ...current]);
    },
    async updateCustomField(id, field) {
      const updated = await customerFieldService.update(id, customerFieldPayload(field));
      replaceById(setCustomFields, mapCustomerField(updated));
    },
    async deleteCustomField(id) {
      await customerFieldService.remove(id);
      setCustomFields((current) => current.filter((field) => field.id !== id));
    },
    settings,
    async updateSettings(nextSettings) {
      const companyPayload = new FormData();
      companyPayload.append('company_name', nextSettings.name);
      companyPayload.append('address_line_1', nextSettings.address || '');
      companyPayload.append('phone', nextSettings.phone || '');
      companyPayload.append('email', nextSettings.email || '');
      companyPayload.append('gst_number', nextSettings.gstNumber || '');
      companyPayload.append('quotation_prefix', nextSettings.quotationPrefix || 'QT-');
      companyPayload.append('default_validity_days', String(nextSettings.defaultValidityDays || 30));
      companyPayload.append('default_salesperson_name', nextSettings.defaultSalespersonName || '');
      companyPayload.append('default_salesperson_phone', nextSettings.defaultSalespersonPhone || '');
      companyPayload.append('default_salesperson_email', nextSettings.defaultSalespersonEmail || '');

      if (nextSettings.logoFile instanceof File) {
        companyPayload.append('logo_file', nextSettings.logoFile);
      }

      if (nextSettings.letterheadFile instanceof File) {
        companyPayload.append('letterhead_file', nextSettings.letterheadFile);
      }

      const bankPayload = {
        bank_name: nextSettings.bankDetails.bankName,
        account_name: nextSettings.bankDetails.accountName || nextSettings.name,
        account_number: nextSettings.bankDetails.accountNumber,
        ifsc_code: nextSettings.bankDetails.ifsc || null,
        branch_name: nextSettings.bankDetails.branch || null,
        is_default: true,
      };

      const numberingPayload = {
        quotation_prefix: nextSettings.quotationPrefix,
        next_number: nextSettings.nextNumber || 1,
      };

      await settingsService.updateCompany(companyPayload);
      if (nextSettings.bankDetails.id) {
        await settingsService.updateBankDetail(nextSettings.bankDetails.id, bankPayload);
      } else {
        await settingsService.storeBankDetail(bankPayload);
      }
      await settingsService.updateQuotationNumbering(numberingPayload);
      await loadSettings();
      toast.success('Settings updated successfully');
    },
  }), [
    adjustments,
    brands,
    categories,
    customFields,
    customers,
    loadSettings,
    loading,
    products,
    quotations,
    refreshAll,
    settings,
    terms,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
