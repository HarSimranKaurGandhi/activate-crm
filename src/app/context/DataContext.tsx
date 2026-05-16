import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const loadSettings = useCallback(async () => {
    const [company, banks, numbering] = await Promise.all([
      settingsService.company(),
      settingsService.bankDetails(),
      settingsService.quotationNumbering(),
    ]);
    const bankList = asArray(banks);
    const defaultBank = bankList.find((bank: any) => bank.is_default) || bankList[0];
    setSettings(mapCompanySettings(company, defaultBank, numbering));
  }, []);

  const refreshAll = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [
        categoryResult,
        brandResult,
        productResult,
        customerResult,
        quotationResult,
        adjustmentResult,
        termResult,
        customFieldResult,
      ] = await Promise.all([
        categoryService.list(),
        brandService.list(),
        productService.list(),
        customerService.list(),
        quotationService.list(),
        adjustmentService.list(),
        termService.list(),
        customerFieldService.list(),
      ]);

      setCategories(asArray(categoryResult.data).map(mapCategory));
      setBrands(asArray(brandResult.data).map(mapBrand));
      setProducts(asArray(productResult.data).map(mapProduct));
      setCustomers(asArray(customerResult.data).map(mapCustomer));
      setQuotations(asArray(quotationResult.data).map(mapQuotation));
      setAdjustments(asArray(adjustmentResult.data).map(mapAdjustment));
      setTerms(asArray(termResult.data).map(mapTerm));
      setCustomFields(asArray(customFieldResult.data).map(mapCustomerField));
      await loadSettings();
    } finally {
      setLoading(false);
    }
  }, [loadSettings, token]);

  useEffect(() => {
    if (token) {
      refreshAll();
    } else {
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
  }, [refreshAll, token]);

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
      const updated = await productService.status(id, false);
      replaceById(setProducts, mapProduct(updated));
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
      const updated = await customerService.status(id, false);
      replaceById(setCustomers, mapCustomer(updated));
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
      const updated = await categoryService.status(id, false);
      replaceById(setCategories, mapCategory(updated));
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
      const updated = await brandService.status(id, false);
      replaceById(setBrands, mapBrand(updated));
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
      const updated = await adjustmentService.status(id, false);
      replaceById(setAdjustments, mapAdjustment(updated));
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
      const updated = await termService.status(id, false);
      replaceById(setTerms, mapTerm(updated));
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
      companyPayload.append('address', nextSettings.address || '');
      companyPayload.append('phone', nextSettings.phone || '');
      companyPayload.append('email', nextSettings.email || '');
      companyPayload.append('gst_number', nextSettings.gstNumber || '');
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
        branch: nextSettings.bankDetails.branch || null,
        is_default: true,
        is_active: true,
      };

      const numberingPayload = {
        quotation_prefix: nextSettings.quotationPrefix,
        next_number: nextSettings.nextNumber || 1,
        padding: nextSettings.padding || 5,
        default_validity_days: nextSettings.defaultValidityDays || 30,
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
