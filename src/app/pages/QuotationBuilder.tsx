import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Search, GripVertical, Trash2, ChevronDown, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { toast } from 'sonner';
import { productService } from '../../services/productService';
import { mapProduct } from '../../services/mappers';
import { LoadingState } from '../components/common/AsyncState';

interface QuotationItem {
  id: string;
  product: any;
  quantity: number;
  price: number;
  discount: number;
  specifications: string;
}

const DraggableRow = ({ item, index, moveRow, onUpdate, onDelete, showDiscount, gstInclusive }: any) => {
  const [, drag] = useDrag({
    type: 'row',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'row',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveRow(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const calculateLineTotal = () => {
    const basePrice = item.price * item.quantity;
    const discountAmount = basePrice * (item.discount / 100);
    const afterDiscount = basePrice - discountAmount;

    if (gstInclusive) {
      return afterDiscount;
    } else {
      const gstAmount = afterDiscount * (item.product.gstPercent / 100);
      return afterDiscount + gstAmount;
    }
  };

  return (
    <tr ref={(node) => { drag(drop(node)); }} className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3">
        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
      </td>
      <td className="px-4 py-3">
        <img src={item.product.image} alt="" className="w-16 h-16 object-cover rounded-lg" />
      </td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900">{item.product.name}</div>
          <div className="text-sm text-gray-500">{item.product.modelNumber}</div>
          {item.specifications && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.specifications}</div>}
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-center"
          min="1"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={item.price}
          onChange={(e) => {
            const newPrice = parseFloat(e.target.value) || 0;
            const basePrice = item.product.usualSellingPrice;
            const newDiscount = ((basePrice - newPrice) / basePrice) * 100;
            onUpdate(item.id, { price: newPrice, discount: Math.max(0, newDiscount) });
          }}
          className="w-28 px-2 py-1 border border-gray-200 rounded-lg"
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {item.product.gstPercent}%
      </td>
      {showDiscount && (
        <td className="px-4 py-3">
          <input
            type="number"
            value={item.discount.toFixed(2)}
            onChange={(e) => {
              const newDiscount = parseFloat(e.target.value) || 0;
              const basePrice = item.product.usualSellingPrice;
              const newPrice = basePrice * (1 - newDiscount / 100);
              onUpdate(item.id, { discount: newDiscount, price: newPrice });
            }}
            className="w-20 px-2 py-1 border border-gray-200 rounded-lg"
            step="0.01"
          />
        </td>
      )}
      <td className="px-4 py-3 font-semibold text-gray-900">
        ₹{calculateLineTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export const QuotationBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, customers, quotations, addQuotation, updateQuotation, adjustments, terms: masterTerms, settings, loading } = useData();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [salesperson, setSalesperson] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [selectedAdjustments, setSelectedAdjustments] = useState<Record<string, { enabled: boolean; amount: number }>>({});
  const [gstInclusive, setGstInclusive] = useState(false);
  const [showDiscount, setShowDiscount] = useState(true);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectableProducts, setSelectableProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const quotation = id ? quotations.find(q => q.id === id) : null;
    if (id) {
      if (quotation) {
        setSelectedCustomer(quotation.customer);
        setSalesperson(quotation.salesperson);
        setItems(quotation.items);
        setGlobalDiscount(quotation.globalDiscount);
        setSelectedAdjustments(quotation.adjustments);
        setGstInclusive(quotation.gstInclusive);
        setShowDiscount(quotation.showDiscount);
        setSelectedTerms(quotation.terms);
      }
    } else if (settings.defaultSalespersonName || settings.defaultSalespersonEmail || settings.defaultSalespersonPhone) {
      setSalesperson({
        name: settings.defaultSalespersonName || '',
        phone: settings.defaultSalespersonPhone || '',
        email: settings.defaultSalespersonEmail || '',
      });
    }

    if (!quotation) {
      const adjMap: Record<string, { enabled: boolean; amount: number }> = {};
      adjustments.forEach(adj => {
        adjMap[adj.id] = { enabled: false, amount: adj.defaultValue };
      });
      setSelectedAdjustments(adjMap);
    }
  }, [id, quotations, adjustments, settings]);

  useEffect(() => {
    if (!showProductModal) return;

    productService
      .selectable({ is_active: true })
      .then((result) => {
        const data = Array.isArray(result.data) ? result.data : [];
        setSelectableProducts(data.map(mapProduct));
      })
      .catch(() => setSelectableProducts(products.filter((product) => product.status === 'active')));
  }, [products, showProductModal]);

  useEffect(() => {
    if (globalDiscount > 0) {
      setItems(items.map(item => ({
        ...item,
        discount: globalDiscount,
        price: item.product.usualSellingPrice * (1 - globalDiscount / 100),
      })));
    }
  }, [globalDiscount]);

  const moveRow = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);
  };

  const addProduct = (product: any) => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      product,
      quantity: 1,
      price: product.usualSellingPrice,
      discount: 0,
      specifications: product.specifications,
    };
    setItems([...items, newItem]);
    setShowProductModal(false);
  };

  const updateItem = (itemId: string, updates: Partial<QuotationItem>) => {
    setItems(items.map(item => item.id === itemId ? { ...item, ...updates } : item));
  };

  const deleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach(item => {
      const basePrice = item.price * item.quantity;
      const discountAmount = basePrice * (item.discount / 100);
      subtotal += basePrice - discountAmount;
    });

    let adjustmentsTotal = 0;
    Object.entries(selectedAdjustments).forEach(([adjId, adj]) => {
      if (adj.enabled) {
        const adjustment = adjustments.find(a => a.id === adjId);
        if (adjustment) {
          if (adjustment.type === 'percentage') {
            adjustmentsTotal += subtotal * (adj.amount / 100);
          } else {
            adjustmentsTotal += adj.amount;
          }
        }
      }
    });

    let taxAmount = 0;
    if (!gstInclusive) {
      items.forEach(item => {
        const basePrice = item.price * item.quantity;
        const discountAmount = basePrice * (item.discount / 100);
        const afterDiscount = basePrice - discountAmount;
        taxAmount += afterDiscount * (item.product.gstPercent / 100);
      });
    }

    const grandTotal = subtotal + adjustmentsTotal + taxAmount;

    return { subtotal, adjustmentsTotal, taxAmount, grandTotal };
  };

  const totals = calculateTotals();

  if (loading && id) {
    return (
      <div className="p-8">
        <LoadingState label="Loading quotation..." />
      </div>
    );
  }

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    const quotationData = {
      date: new Date().toISOString(),
      customer: selectedCustomer,
      salesperson,
      items,
      globalDiscount,
      adjustments: selectedAdjustments,
      gstInclusive,
      showDiscount,
      terms: selectedTerms,
      status: 'draft' as const,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
    };

    setSaving(true);
    try {
      if (id) {
        await updateQuotation(id, quotationData);
        toast.success('Quotation updated successfully');
      } else {
        await addQuotation(quotationData);
        toast.success('Quotation created successfully');
      }
      navigate('/quotations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/quotations')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {id ? 'Edit Quotation' : 'Create New Quotation'}
              </h2>
              <p className="text-gray-600 mt-1">Build your quotation with products and pricing</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>

        {/* Customer & Salesperson */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Customer Details</h3>
            {selectedCustomer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedCustomer.company}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                  </div>
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                Select Customer
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Salesperson Details</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={salesperson.name}
                onChange={(e) => setSalesperson({ ...salesperson, name: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                type="text"
                value={salesperson.phone}
                onChange={(e) => setSalesperson({ ...salesperson, phone: e.target.value })}
                placeholder="Phone"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                type="email"
                value={salesperson.email}
                onChange={(e) => setSalesperson({ ...salesperson, email: e.target.value })}
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Products Table */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Products</h3>
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GST%</th>
                    {showDiscount && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Disc%</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <DraggableRow
                      key={item.id}
                      item={item}
                      index={index}
                      moveRow={moveRow}
                      onUpdate={updateItem}
                      onDelete={deleteItem}
                      showDiscount={showDiscount}
                      gstInclusive={gstInclusive}
                    />
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  No products added yet. Click "Add Product" to get started.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Global Discount */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Global Discount</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="0"
                  step="0.01"
                />
                <span className="text-gray-600">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Overrides individual product discounts</p>
            </div>

            {/* Adjustments */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Adjustments</h3>
              <div className="space-y-3">
                {adjustments.filter(a => a.status === 'active').map(adj => (
                  <div key={adj.id} className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAdjustments[adj.id]?.enabled || false}
                        onChange={(e) => setSelectedAdjustments({
                          ...selectedAdjustments,
                          [adj.id]: { ...selectedAdjustments[adj.id], enabled: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{adj.name}</span>
                    </label>
                    {selectedAdjustments[adj.id]?.enabled && (
                      <input
                        type="number"
                        value={selectedAdjustments[adj.id].amount}
                        onChange={(e) => setSelectedAdjustments({
                          ...selectedAdjustments,
                          [adj.id]: { ...selectedAdjustments[adj.id], amount: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">GST Inclusive Pricing</span>
                <input
                  type="checkbox"
                  checked={gstInclusive}
                  onChange={(e) => setGstInclusive(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Show Discount to Customer</span>
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => setShowDiscount(e.target.checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative checked:bg-blue-600 transition-colors
                           after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5"
                />
              </label>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
              <div className="space-y-2">
                {masterTerms.filter(t => t.status === 'active').map(term => (
                  <label key={term.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTerms.includes(term.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTerms([...selectedTerms, term.id]);
                        } else {
                          setSelectedTerms(selectedTerms.filter(t => t !== term.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <span className="text-sm text-gray-700">{term.content}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                {totals.adjustmentsTotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Adjustments</span>
                    <span className="font-medium text-gray-900">₹{totals.adjustmentsTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {!gstInclusive && totals.taxAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">GST</span>
                    <span className="font-medium text-gray-900">₹{totals.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-600">₹{totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Select Product</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selectableProducts.length ? selectableProducts : products.filter(p => p.status === 'active')).map(product => (
                <div
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="flex gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
                  <img src={product.image} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.modelNumber}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500">MRP: ₹{product.mrp.toLocaleString('en-IN')}</span>
                      <span className="text-sm font-semibold text-blue-600">₹{product.usualSellingPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Select Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 mb-4">
              {customers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                  className="p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
                  <p className="font-medium text-gray-900">{customer.company}</p>
                  <p className="text-sm text-gray-600">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.email}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setShowCustomerModal(false);
                navigate('/customers/new');
              }}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              + Add New Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
