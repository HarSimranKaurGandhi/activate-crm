import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { Plus, Search, Edit, Trash2, Building } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '../components/common/AsyncState';

export const CustomerList = () => {
  const navigate = useNavigate();
  const { customers, deleteCustomer, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Customers</h2>
          <button
            onClick={() => navigate('/customers/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}/edit`)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Deactivate this customer?')) {
                          await deleteCustomer(customer.id);
                          toast.success('Customer deactivated');
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{customer.company}</h3>
                <p className="text-sm text-gray-600 mb-3">{customer.name}</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{customer.email}</p>
                  <p>{customer.phone}</p>
                  {customer.rating > 0 && <p className="text-xs text-amber-600 mt-2">Rating: {customer.rating}/5</p>}
                  {customer.address && <p className="text-xs text-gray-500 mt-2">{customer.address}</p>}
                </div>
              </div>
            ))}
          </div>

          {loading && <LoadingState label="Loading customers..." />}
          {!loading && filteredCustomers.length === 0 && (
            <EmptyState label="No customers found. Add your first customer to get started." />
          )}
        </div>
      </div>
    </div>
  );
};
