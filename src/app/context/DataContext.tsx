import React, { createContext, useContext, useState, useEffect } from 'react';

interface Product {
  id: string;
  image: string;
  name: string;
  modelNumber: string;
  category: string;
  brand: string;
  mrp: number;
  usualSellingPrice: number;
  gstPercent: number;
  specifications: string;
  status: 'active' | 'inactive';
}

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  customFields?: Record<string, any>;
}

interface QuotationItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  discount: number;
  specifications: string;
}

interface Quotation {
  id: string;
  number: string;
  date: string;
  customer: Customer;
  salesperson: {
    name: string;
    phone: string;
    email: string;
  };
  items: QuotationItem[];
  globalDiscount: number;
  adjustments: Record<string, { enabled: boolean; amount: number }>;
  gstInclusive: boolean;
  showDiscount: boolean;
  terms: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}

interface Category {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface Brand {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface Adjustment {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  defaultValue: number;
  status: 'active' | 'inactive';
}

interface Term {
  id: string;
  content: string;
  status: 'active' | 'inactive';
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required: boolean;
}

interface CompanySettings {
  name: string;
  logo: string;
  gstNumber: string;
  address: string;
  phone: string;
  email: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  };
  quotationPrefix: string;
  letterhead?: string;
}

interface DataContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  quotations: Quotation[];
  addQuotation: (quotation: Omit<Quotation, 'id' | 'number'>) => void;
  updateQuotation: (id: string, quotation: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;

  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  brands: Brand[];
  addBrand: (brand: Omit<Brand, 'id'>) => void;
  updateBrand: (id: string, brand: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  adjustments: Adjustment[];
  addAdjustment: (adjustment: Omit<Adjustment, 'id'>) => void;
  updateAdjustment: (id: string, adjustment: Partial<Adjustment>) => void;
  deleteAdjustment: (id: string) => void;

  terms: Term[];
  addTerm: (term: Omit<Term, 'id'>) => void;
  updateTerm: (id: string, term: Partial<Term>) => void;
  deleteTerm: (id: string) => void;

  customFields: CustomField[];
  addCustomField: (field: Omit<CustomField, 'id'>) => void;
  updateCustomField: (id: string, field: Partial<CustomField>) => void;
  deleteCustomField: (id: string) => void;

  settings: CompanySettings;
  updateSettings: (settings: Partial<CompanySettings>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
      name: 'Commercial Treadmill Pro X1',
      modelNumber: 'TM-PRO-X1-2024',
      category: 'Cardio Equipment',
      brand: 'FitPro',
      mrp: 185000,
      usualSellingPrice: 165000,
      gstPercent: 18,
      specifications: '4.0 HP motor, 22" touchscreen, Max speed 20 km/h, Max weight 200kg, Auto-incline 0-15%',
      status: 'active',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
      name: 'Smith Machine Elite Series',
      modelNumber: 'SM-ELITE-500',
      category: 'Strength Equipment',
      brand: 'IronForce',
      mrp: 245000,
      usualSellingPrice: 220000,
      gstPercent: 18,
      specifications: 'Linear bearing system, 7-degree reverse pitch, Safety stops, Plate storage, Max load 400kg',
      status: 'active',
    },
  ]);

  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: '1',
      name: 'Rajesh Kumar',
      company: 'Elite Fitness Center',
      email: 'rajesh@elitefitness.com',
      phone: '+91 98765 43210',
      address: '123, MG Road, Bangalore - 560001',
      gstNumber: '29ABCDE1234F1Z5',
    },
    {
      id: '2',
      name: 'Priya Sharma',
      company: 'Power Gym Chain',
      email: 'priya@powergym.com',
      phone: '+91 98765 43211',
      address: '456, Sector 17, Chandigarh - 160017',
      gstNumber: '04XYZAB5678G1Z2',
    },
  ]);

  const [quotations, setQuotations] = useState<Quotation[]>([]);

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Cardio Equipment', status: 'active' },
    { id: '2', name: 'Strength Equipment', status: 'active' },
    { id: '3', name: 'Functional Training', status: 'active' },
    { id: '4', name: 'Accessories', status: 'active' },
  ]);

  const [brands, setBrands] = useState<Brand[]>([
    { id: '1', name: 'FitPro', status: 'active' },
    { id: '2', name: 'IronForce', status: 'active' },
    { id: '3', name: 'PowerMax', status: 'active' },
  ]);

  const [adjustments, setAdjustments] = useState<Adjustment[]>([
    { id: '1', name: 'Delivery Charges', type: 'fixed', defaultValue: 5000, status: 'active' },
    { id: '2', name: 'Installation Charges', type: 'fixed', defaultValue: 3000, status: 'active' },
    { id: '3', name: 'Freight Charges', type: 'percentage', defaultValue: 2, status: 'active' },
  ]);

  const [terms, setTerms] = useState<Term[]>([
    { id: '1', content: 'Payment: 50% advance, 50% on delivery', status: 'active' },
    { id: '2', content: 'Delivery within 15-20 working days from order confirmation', status: 'active' },
    { id: '3', content: 'Warranty: 2 years on motor, 1 year on parts, lifetime on frame', status: 'active' },
    { id: '4', content: 'Installation and training included', status: 'active' },
    { id: '5', content: 'Prices are subject to change without prior notice', status: 'active' },
  ]);

  const [customFields, setCustomFields] = useState<CustomField[]>([
    { id: '1', name: 'Business Type', type: 'select', options: ['Gym', 'Hotel', 'Residential', 'Corporate'], required: false },
  ]);

  const [settings, setSettings] = useState<CompanySettings>({
    name: 'FitEquip Solutions Pvt Ltd',
    logo: '',
    gstNumber: '29AABCT1234C1Z5',
    address: '789, Industrial Area, Phase 2, Bangalore - 560058, Karnataka, India',
    phone: '+91 80 2345 6789',
    email: 'sales@fitequip.com',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      branch: 'MG Road, Bangalore',
    },
    quotationPrefix: 'FEQ',
    letterhead: '',
  });

  // Generate quotation number
  const generateQuotationNumber = () => {
    const count = quotations.length + 1;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${settings.quotationPrefix}-${year}${month}-${count.toString().padStart(4, '0')}`;
  };

  const value: DataContextType = {
    products,
    addProduct: (product) => setProducts([...products, { ...product, id: Date.now().toString() }]),
    updateProduct: (id, product) => setProducts(products.map(p => p.id === id ? { ...p, ...product } : p)),
    deleteProduct: (id) => setProducts(products.filter(p => p.id !== id)),

    customers,
    addCustomer: (customer) => setCustomers([...customers, { ...customer, id: Date.now().toString() }]),
    updateCustomer: (id, customer) => setCustomers(customers.map(c => c.id === id ? { ...c, ...customer } : c)),
    deleteCustomer: (id) => setCustomers(customers.filter(c => c.id !== id)),

    quotations,
    addQuotation: (quotation) => setQuotations([...quotations, { ...quotation, id: Date.now().toString(), number: generateQuotationNumber() }]),
    updateQuotation: (id, quotation) => setQuotations(quotations.map(q => q.id === id ? { ...q, ...quotation } : q)),
    deleteQuotation: (id) => setQuotations(quotations.filter(q => q.id !== id)),

    categories,
    addCategory: (category) => setCategories([...categories, { ...category, id: Date.now().toString() }]),
    updateCategory: (id, category) => setCategories(categories.map(c => c.id === id ? { ...c, ...category } : c)),
    deleteCategory: (id) => setCategories(categories.filter(c => c.id !== id)),

    brands,
    addBrand: (brand) => setBrands([...brands, { ...brand, id: Date.now().toString() }]),
    updateBrand: (id, brand) => setBrands(brands.map(b => b.id === id ? { ...b, ...brand } : b)),
    deleteBrand: (id) => setBrands(brands.filter(b => b.id !== id)),

    adjustments,
    addAdjustment: (adjustment) => setAdjustments([...adjustments, { ...adjustment, id: Date.now().toString() }]),
    updateAdjustment: (id, adjustment) => setAdjustments(adjustments.map(a => a.id === id ? { ...a, ...adjustment } : a)),
    deleteAdjustment: (id) => setAdjustments(adjustments.filter(a => a.id !== id)),

    terms,
    addTerm: (term) => setTerms([...terms, { ...term, id: Date.now().toString() }]),
    updateTerm: (id, term) => setTerms(terms.map(t => t.id === id ? { ...t, ...term } : t)),
    deleteTerm: (id) => setTerms(terms.filter(t => t.id !== id)),

    customFields,
    addCustomField: (field) => setCustomFields([...customFields, { ...field, id: Date.now().toString() }]),
    updateCustomField: (id, field) => setCustomFields(customFields.map(f => f.id === id ? { ...f, ...field } : f)),
    deleteCustomField: (id) => setCustomFields(customFields.filter(f => f.id !== id)),

    settings,
    updateSettings: (newSettings) => setSettings({ ...settings, ...newSettings }),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
