import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, LoadingState } from '../components/common/AsyncState';
import { toast } from 'sonner';

export const ProductList = () => {
  const navigate = useNavigate();
  const { products, deleteProduct, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.modelNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Products</h2>
          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-500 transition-all"
              >
                <img src={product.image} alt="" className="w-full h-48 object-cover" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                    }`}>
                      {product.status}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/products/${product.id}/edit`)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                      onClick={async () => {
                          if (confirm('Deactivate this product?')) {
                            await deleteProduct(product.id);
                            toast.success('Product deactivated');
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.modelNumber}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="px-2 py-1 bg-gray-100 rounded">{product.category}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">{product.brand}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">MRP:</span>
                      <span className="font-semibold text-gray-900">₹{product.mrp.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-semibold text-blue-600">₹{product.usualSellingPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST:</span>
                      <span className="font-semibold text-gray-900">{product.gstPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading && <LoadingState label="Loading products..." />}
          {!loading && filteredProducts.length === 0 && (
            <EmptyState label="No products found. Add your first product to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
