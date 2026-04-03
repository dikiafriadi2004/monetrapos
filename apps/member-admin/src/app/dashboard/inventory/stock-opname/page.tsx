'use client';

import { useState, useEffect } from 'react';
import { 
  stockOpnameService, 
  StockOpname, 
  StockOpnameStatus,
  CreateStockOpnameDto 
} from '@/services/stock-opname.service';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  Loader2,
  X,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StockOpnamePage() {
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockOpnameStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);

  useEffect(() => {
    loadStockOpnames();
  }, [statusFilter]);

  const loadStockOpnames = async () => {
    try {
      setLoading(true);
      const response = await stockOpnameService.getAll({
        status: statusFilter || undefined,
      });
      setStockOpnames(response);
    } catch (error: any) {
      console.error('Failed to load stock opnames:', error);
      toast.error('Failed to load stock opnames');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (opname: StockOpname) => {
    if (!confirm('Complete this stock opname and apply adjustments?')) return;

    try {
      await stockOpnameService.complete(opname.id, true);
      toast.success('Stock opname completed');
      await loadStockOpnames();
    } catch (error: any) {
      console.error('Failed to complete:', error);
      toast.error('Failed to complete stock opname');
    }
  };

  const handleCancel = async (opname: StockOpname) => {
    if (!confirm('Cancel this stock opname?')) return;

    try {
      await stockOpnameService.cancel(opname.id);
      toast.success('Stock opname cancelled');
      await loadStockOpnames();
    } catch (error: any) {
      console.error('Failed to cancel:', error);
      toast.error('Failed to cancel stock opname');
    }
  };

  const filteredOpnames = stockOpnames.filter(opname =>
    opname.opnameNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opname.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: StockOpnameStatus) => {
    const styles = {
      [StockOpnameStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [StockOpnameStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [StockOpnameStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [StockOpnameStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Opname</h1>
          <p className="text-gray-600 mt-1">Physical inventory count and adjustments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Stock Opname
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by number or store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockOpnameStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value={StockOpnameStatus.DRAFT}>Draft</option>
            <option value={StockOpnameStatus.IN_PROGRESS}>In Progress</option>
            <option value={StockOpnameStatus.COMPLETED}>Completed</option>
            <option value={StockOpnameStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredOpnames.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No stock opnames found</h3>
          <p className="text-gray-600 mb-6">Start by creating your first stock opname</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            New Stock Opname
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOpnames.map((opname) => (
                <tr key={opname.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{opname.opnameNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(opname.opnameDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{opname.storeName || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{opname.items?.length || 0} items</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(opname.status)}`}>
                      {opname.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOpname(opname)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {opname.status === StockOpnameStatus.IN_PROGRESS && (
                        <button
                          onClick={() => handleComplete(opname)}
                          className="text-green-600 hover:text-green-900"
                          title="Complete"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {(opname.status === StockOpnameStatus.DRAFT || opname.status === StockOpnameStatus.IN_PROGRESS) && (
                        <button
                          onClick={() => handleCancel(opname)}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <CreateStockOpnameModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadStockOpnames();
          }}
        />
      )}

      {/* Details Modal */}
      {selectedOpname && (
        <StockOpnameDetailsModal
          opname={selectedOpname}
          onClose={() => setSelectedOpname(null)}
        />
      )}
    </div>
  );
}

function CreateStockOpnameModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeId: '',
    opnameDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.storeId) {
      toast.error('Store is required');
      return;
    }

    try {
      setLoading(true);
      await stockOpnameService.create({
        ...formData,
        items: [], // Start with empty items
      } as CreateStockOpnameDto);
      toast.success('Stock opname created');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create:', error);
      toast.error('Failed to create stock opname');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">New Stock Opname</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store ID *
            </label>
            <input
              type="text"
              value={formData.storeId}
              onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opname Date *
            </label>
            <input
              type="date"
              value={formData.opnameDate}
              onChange={(e) => setFormData({ ...formData, opnameDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockOpnameDetailsModal({
  opname,
  onClose,
}: {
  opname: StockOpname;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Stock Opname Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Number</p>
              <p className="text-lg font-semibold">{opname.opnameNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-lg font-semibold">
                {new Date(opname.opnameDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Store</p>
              <p className="text-lg font-semibold">{opname.storeName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-semibold capitalize">{opname.status}</p>
            </div>
          </div>

          {opname.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="text-gray-900">{opname.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Items ({opname.items?.length || 0})</h3>
            {opname.items && opname.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">System</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Physical</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {opname.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm">{item.productName || item.productId}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.systemQuantity}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.physicalQuantity}</td>
                        <td className={`px-4 py-2 text-sm text-right font-semibold ${
                          item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No items recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
