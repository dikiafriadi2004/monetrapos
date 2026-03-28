'use client';

import { useState, useEffect } from 'react';
import { Receipt, Search, Filter, Eye, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { transactionService } from '@/services/transaction.service';

interface Transaction {
  id: string;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  customerName?: string;
  employeeName?: string;
  createdAt: string;
  items: any[];
}

export default function TransactionsPage() {
  const { storeId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (storeId) {
      loadTransactions();
    }
  }, [storeId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactions(storeId!);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) =>
    t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      qris: 'bg-blue-100 text-blue-800',
      edc: 'bg-purple-100 text-purple-800',
      bank_transfer: 'bg-yellow-100 text-yellow-800',
      e_wallet: 'bg-pink-100 text-pink-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600 mt-1">View all sales transactions</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Export Report
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number or customer name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
            <Filter size={20} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Receipt size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {transaction.invoiceNumber}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(transaction.createdAt).toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {transaction.customerName || 'Walk-in Customer'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodColor(transaction.paymentMethod)}`}>
                    {transaction.paymentMethod.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  Rp {transaction.total.toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedTransaction(transaction)}
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Eye size={16} />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <Receipt size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No transactions found</p>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
              <button onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedTransaction.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-semibold">
                    {new Date(selectedTransaction.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedTransaction.customerName || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cashier</p>
                  <p className="font-semibold">{selectedTransaction.employeeName || 'N/A'}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <p className="font-semibold">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>Rp {selectedTransaction.total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment Method</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodColor(selectedTransaction.paymentMethod)}`}>
                    {selectedTransaction.paymentMethod.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
