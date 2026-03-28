'use client';

import { useState, useEffect } from 'react';
import { Search, User, X } from 'lucide-react';
import { Customer } from '@/types';
import { customerService } from '@/services/customer.service';

interface CustomerSelectProps {
  storeId: string;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export default function CustomerSelect({
  storeId,
  selectedCustomer,
  onSelectCustomer,
}: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen, storeId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.includes(searchQuery) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers(storeId);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleRemove = () => {
    onSelectCustomer(null);
  };

  return (
    <div>
      {/* Selected Customer Display */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-600">
                {selectedCustomer.phone && `${selectedCustomer.phone} • `}
                {selectedCustomer.loyaltyPoints} points
              </div>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        >
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <User size={20} />
            <span>Select Customer (Optional)</span>
          </div>
        </button>
      )}

      {/* Customer Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Select Customer</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No customers found' : 'No customers yet'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelect(customer)}
                      className="w-full p-4 text-left bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            {customer.phone && `${customer.phone}`}
                            {customer.email && ` • ${customer.email}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            {customer.loyaltyPoints} points
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
