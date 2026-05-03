export type Status = 'active' | 'inactive';
export type QuotationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'revised';

const asNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const toStatus = (isActive: unknown): Status => (isActive ? 'active' : 'inactive');
export const toIsActive = (status?: Status) => status !== 'inactive';

export const toFrontendQuotationStatus = (status: string): QuotationStatus =>
  status === 'pending_approval' ? 'pending' : (status as QuotationStatus);

export const toApiQuotationStatus = (status: QuotationStatus | string) =>
  status === 'pending' ? 'pending_approval' : status;

export const mapCategory = (category: any) => ({
  id: String(category.id),
  name: category.name || '',
  description: category.description || '',
  displayOrder: category.display_order || 0,
  status: toStatus(category.is_active),
});

export const categoryPayload = (category: any) => ({
  name: category.name,
  description: category.description || null,
  display_order: category.displayOrder || category.display_order || 0,
  is_active: toIsActive(category.status),
});

export const mapBrand = (brand: any) => ({
  id: String(brand.id),
  name: brand.name || '',
  description: brand.description || '',
  logoPath: brand.logo_path || '',
  displayOrder: brand.display_order || 0,
  status: toStatus(brand.is_active),
});

export const brandPayload = (brand: any) => ({
  name: brand.name,
  description: brand.description || null,
  logo_path: brand.logoPath || brand.logo_path || null,
  display_order: brand.displayOrder || brand.display_order || 0,
  is_active: toIsActive(brand.status),
});

export const mapProduct = (product: any) => ({
  id: String(product.id),
  image: product.image_path || '',
  name: product.product_name || '',
  modelNumber: product.model_number || '',
  categoryId: product.category_id ? String(product.category_id) : '',
  brandId: product.brand_id ? String(product.brand_id) : '',
  category: product.category?.name || '',
  brand: product.brand?.name || '',
  unit: product.unit || '',
  mrp: asNumber(product.mrp),
  usualSellingPrice: asNumber(product.usual_selling_price),
  gstPercent: asNumber(product.gst_percent),
  specifications: product.specifications || '',
  brochurePath: product.brochure_path || '',
  status: toStatus(product.is_active ?? true),
});

export const productPayload = (product: any, categories: any[] = [], brands: any[] = []) => {
  const categoryId = product.categoryId || categories.find((category) => category.name === product.category)?.id;
  const brandId = product.brandId || brands.find((brand) => brand.name === product.brand)?.id || null;

  return {
    product_name: product.name,
    model_number: product.modelNumber || null,
    category_id: categoryId ? Number(categoryId) : undefined,
    brand_id: brandId ? Number(brandId) : null,
    unit: product.unit || null,
    mrp: asNumber(product.mrp),
    usual_selling_price: asNumber(product.usualSellingPrice),
    gst_percent: asNumber(product.gstPercent, 18),
    specifications: product.specifications || null,
    image_path: product.image || null,
    brochure_path: product.brochurePath || null,
    is_active: toIsActive(product.status),
  };
};

export const mapCustomerField = (field: any) => ({
  id: String(field.id),
  name: field.field_label || '',
  key: field.field_key || '',
  type: field.field_type === 'dropdown' ? 'select' : field.field_type,
  apiType: field.field_type,
  options: field.options_json || [],
  required: Boolean(field.is_required),
  displayOrder: field.display_order || 0,
  status: toStatus(field.is_active),
});

export const customerFieldPayload = (field: any) => ({
  field_key: field.key || field.field_key || String(field.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
  field_label: field.name || field.field_label,
  field_type: field.apiType || (field.type === 'select' ? 'dropdown' : field.type),
  options_json: (field.apiType === 'dropdown' || field.type === 'select') ? field.options || [] : null,
  is_required: Boolean(field.required),
  is_active: toIsActive(field.status),
  display_order: field.displayOrder || 0,
});

export const mapCustomer = (customer: any) => {
  const customFields = (customer.custom_fields || []).reduce((acc: Record<string, unknown>, field: any) => {
    acc[String(field.field_definition_id)] = field.value;
    if (field.field_key) acc[field.field_key] = field.value;
    return acc;
  }, {});

  return {
    id: String(customer.id),
    name: customer.primary_name || '',
    company: customer.company_name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || '',
    gstNumber: customer.gst_number || '',
    panNumber: customer.pan_number || '',
    status: toStatus(customer.is_active ?? true),
    customFields,
  };
};

export const customerPayload = (customer: any, definitions: any[] = []) => ({
  primary_name: customer.name,
  company_name: customer.company || null,
  email: customer.email || null,
  phone: customer.phone || null,
  address: customer.address || null,
  gst_number: customer.gstNumber || null,
  pan_number: customer.panNumber || null,
  is_active: toIsActive(customer.status),
  custom_fields: definitions.map((field) => ({
    field_definition_id: Number(field.id),
    value: customer.customFields?.[field.id] ?? customer.customFields?.[field.key] ?? null,
  })),
});

export const mapAdjustment = (adjustment: any) => ({
  id: String(adjustment.id),
  name: adjustment.name || '',
  code: adjustment.code || '',
  type: adjustment.value_type === 'percent' ? 'percentage' : 'fixed',
  adjustmentType: adjustment.adjustment_type || 'charge',
  valueType: adjustment.value_type || 'fixed',
  defaultValue: asNumber(adjustment.default_value),
  isTaxable: Boolean(adjustment.is_taxable),
  isOptional: Boolean(adjustment.is_optional),
  isEditable: Boolean(adjustment.is_editable),
  appliesTo: adjustment.applies_to || '',
  displayOrder: adjustment.display_order || 0,
  status: toStatus(adjustment.is_active ?? true),
});

export const adjustmentPayload = (adjustment: any) => ({
  name: adjustment.name,
  code: adjustment.code || String(adjustment.name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
  adjustment_type: adjustment.adjustmentType || adjustment.adjustment_type || 'charge',
  value_type: adjustment.valueType || (adjustment.type === 'percentage' ? 'percent' : 'fixed'),
  default_value: asNumber(adjustment.defaultValue),
  is_taxable: Boolean(adjustment.isTaxable),
  is_optional: adjustment.isOptional ?? true,
  is_editable: adjustment.isEditable ?? true,
  applies_to: adjustment.appliesTo || null,
  display_order: adjustment.displayOrder || 0,
  is_active: toIsActive(adjustment.status),
});

export const mapTerm = (term: any) => ({
  id: String(term.id),
  title: term.title || '',
  content: term.content || '',
  displayOrder: term.display_order || 0,
  isDefault: Boolean(term.is_default),
  status: toStatus(term.is_active ?? true),
});

export const termPayload = (term: any) => ({
  title: term.title || 'Term',
  content: term.content,
  display_order: term.displayOrder || 0,
  is_default: Boolean(term.isDefault),
  is_active: toIsActive(term.status),
});

export const mapQuotation = (quotation: any) => ({
  id: String(quotation.id),
  number: quotation.quotation_number || '',
  date: quotation.quote_date || quotation.created_at || '',
  validUntil: quotation.valid_until || '',
  customer: quotation.customer?.id ? mapCustomer(quotation.customer) : null,
  customerId: quotation.customer_id ? String(quotation.customer_id) : '',
  salesperson: {
    name: quotation.salesperson_name || '',
    phone: quotation.salesperson_phone || '',
    email: quotation.salesperson_email || '',
  },
  items: (quotation.items || []).map((item: any) => ({
    id: String(item.id),
    product: {
      id: String(item.product_id),
      image: item.product_image_path || '',
      name: item.product_name || '',
      modelNumber: item.model_number || '',
      mrp: asNumber(item.mrp),
      usualSellingPrice: asNumber(item.base_price),
      gstPercent: asNumber(item.gst_percent),
      specifications: item.specifications || '',
      status: 'active',
    },
    quantity: asNumber(item.quantity, 1),
    price: asNumber(item.edited_price || item.base_price),
    discount: asNumber(item.discount_percent),
    specifications: item.specifications || '',
    lineTotal: asNumber(item.line_total),
  })),
  globalDiscount: asNumber(quotation.default_discount_percent),
  adjustments: (quotation.adjustments || []).reduce((acc: Record<string, { enabled: boolean; amount: number }>, adjustment: any) => {
    acc[String(adjustment.adjustment_master_id)] = { enabled: true, amount: asNumber(adjustment.value) };
    return acc;
  }, {}),
  gstInclusive: quotation.pricing_mode === 'inclusive_gst',
  showDiscount: Boolean(quotation.show_discount_to_customer),
  terms: (quotation.terms || []).map((term: any) => String(term.term_master_id)),
  status: toFrontendQuotationStatus(quotation.status || 'draft'),
  subtotal: asNumber(quotation.subtotal_after_discount ?? quotation.subtotal),
  taxAmount: asNumber(quotation.total_tax ?? quotation.tax_total),
  grandTotal: asNumber(quotation.grand_total),
});

export const quotationPayload = (quotation: any) => ({
  customer_id: Number(quotation.customer?.id || quotation.customerId),
  salesperson_name: quotation.salesperson?.name || null,
  salesperson_phone: quotation.salesperson?.phone || null,
  salesperson_email: quotation.salesperson?.email || null,
  quote_date: quotation.date ? String(quotation.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
  valid_until: quotation.validUntil || null,
  pricing_mode: quotation.gstInclusive ? 'inclusive_gst' : 'exclusive_gst',
  show_discount_to_customer: Boolean(quotation.showDiscount),
  default_discount_percent: quotation.globalDiscount || null,
  default_discount_amount: null,
  status: toApiQuotationStatus(quotation.status || 'draft'),
  items: (quotation.items || []).map((item: any, index: number) => ({
    product_id: Number(item.product.id || item.productId),
    sort_order: index,
    quantity: asNumber(item.quantity, 1),
    edited_price: asNumber(item.price),
    discount_percent: asNumber(item.discount),
    discount_amount: null,
  })),
  adjustments: Object.entries(quotation.adjustments || {})
    .filter(([, value]: any) => value?.enabled)
    .map(([adjustmentId, value]: any, index) => ({
      adjustment_master_id: Number(adjustmentId),
      value: asNumber(value.amount),
      display_order: index,
    })),
  terms: (quotation.terms || []).map((termId: string, index: number) => ({
    term_master_id: Number(termId),
    display_order: index,
  })),
});

export const mapCompanySettings = (company: any, bank: any, numbering: any) => ({
  name: company?.company_name || '',
  logo: company?.logo_path || '',
  gstNumber: company?.gst_number || '',
  address: company?.address || '',
  phone: company?.phone || '',
  email: company?.email || '',
  defaultSalespersonName: company?.default_salesperson_name || '',
  defaultSalespersonPhone: company?.default_salesperson_phone || '',
  defaultSalespersonEmail: company?.default_salesperson_email || '',
  bankDetails: {
    id: bank?.id ? String(bank.id) : '',
    bankName: bank?.bank_name || '',
    accountName: bank?.account_name || company?.company_name || '',
    accountNumber: bank?.account_number || '',
    ifsc: bank?.ifsc_code || '',
    branch: bank?.branch || '',
  },
  quotationPrefix: numbering?.quotation_prefix || 'QT-',
  nextNumber: numbering?.next_number || 1,
  padding: numbering?.padding || 5,
  defaultValidityDays: numbering?.default_validity_days || 30,
  letterhead: company?.letterhead_path || '',
});
