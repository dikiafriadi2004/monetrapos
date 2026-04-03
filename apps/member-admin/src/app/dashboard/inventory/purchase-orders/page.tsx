'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  purchaseOrdersService,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@/services/purchase-orders.service';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Loader2,
  Calendar,
  Building2,
  Store,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersService.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setOrders(response.data);
    } catch (error: any) {
      console.error('Failed to load purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to delete PO ${order.poNumber}?`)) return;

    try {
      await purchaseOrdersService.delete(order.id);
      toast.success('Purchase order deleted');
      await loadOrders();
    } catch (error: any) {
      console.error('Failed to delete purchase order:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  const handleCancel = async (order: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to cancel PO ${order.poNumber}?`)) return;

    try {
      await purchaseOrdersService.cancel(order.id);
      toast.success('Purchase order cancelled');
      await loadOrders();
    } catch (error: any) {
      console.error('Failed to cancel purchase order:', error);
      toast.error('Failed to cancel purchase order');
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const badges = {
      [PurchaseOrderStatus.DRAFT]: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: <FileText className="w-3 h-3" />,
      },
      [PurchaseOrderStatus.SENT]: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <Clock className="w-3 h-3" />,
      },
      [PurchaseOrderStatus.RECEIVED]: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      [PurchaseOrderStatus.CANCELLED]: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <XCircle className="w-3 h-3" />,
      },
    };

    const badge = badges[status];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
      >
        {badge.icon}
        {status.toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredOrders = orders.filter((order) =>
    order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage purchase orders from suppliers</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory/purchase-orders/new')}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create PO
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', ...Object.values(PurchaseOrderStatus)].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No purchase orders found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first purchase order'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => router.push('/dashboard/inventory/purchase-orders/new')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Order
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">
                          {order.poNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{order.supplierName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{order.storeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.expectedDate ? formatDate(order.expectedDate) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/inventory/purchase-orders/${order.id}`)
                          }
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.status === PurchaseOrderStatus.DRAFT && (
                          <>
                            <button
                              onClick={() =>
                                router.push(`/dashboard/inventory/purchase-orders/${order.id}/edit`)
                              }
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(order)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {order.status === PurchaseOrderStatus.SENT && (
                          <button
                            onClick={() => handleCancel(order)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {Object.values(PurchaseOrderStatus).map((status) => {
          const count = orders.filter((o) => o.status === status).length;
          const total = orders
            .filter((o) => o.status === status)
            .reduce((sum, o) => sum + o.total, 0);

          return (
            <div key={status} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                {getStatusBadge(status)}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{count}</div>
              <div className="text-sm text-gray-600">{formatCurrency(total)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
