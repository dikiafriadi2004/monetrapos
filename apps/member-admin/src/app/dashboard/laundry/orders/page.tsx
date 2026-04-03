'use client';

import { useState, useEffect } from 'react';
import { laundryService, LaundryOrder, LaundryOrderStatus } from '@/services/laundry.service';
import { Shirt, Plus, Search, Eye, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaundryOrdersPage() {
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LaundryOrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await laundryService.getOrders({
        status: statusFilter || undefined,
      });
      setOrders(response);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: LaundryOrderStatus) => {
    try {
      await laundryService.updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated');
      await loadOrders();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: LaundryOrderStatus) => {
    const styles = {
      [LaundryOrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [LaundryOrderStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [LaundryOrderStatus.READY]: 'bg-green-100 text-green-800',
      [LaundryOrderStatus.DELIVERED]: 'bg-indigo-100 text-indigo-800',
      [LaundryOrderStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
      [LaundryOrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laundry Orders</h1>
          <p className="text-gray-600 mt-1">Manage laundry service orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LaundryOrderStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value={LaundryOrderStatus.PENDING}>Pending</option>
            <option value={LaundryOrderStatus.IN_PROGRESS}>In Progress</option>
            <option value={LaundryOrderStatus.READY}>Ready</option>
            <option value={LaundryOrderStatus.DELIVERED}>Delivered</option>
            <option value={LaundryOrderStatus.COMPLETED}>Completed</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Shirt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">Laundry orders will appear here</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <Shirt className="w-6 h-6 text-indigo-600" />
              </div>

              {order.customerName && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Customer: </span>
                  <span className="text-sm font-medium">{order.customerName}</span>
                </div>
              )}

              <div className="mb-2">
                <span className="text-sm text-gray-600">Service: </span>
                <span className="text-sm font-medium">{order.serviceTypeName || '-'}</span>
              </div>

              <div className="mb-2">
                <span className="text-sm text-gray-600">Items: </span>
                <span className="text-sm font-medium">{order.items?.length || 0}</span>
              </div>

              {order.totalWeight && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Weight: </span>
                  <span className="text-sm font-medium">{order.totalWeight} kg</span>
                </div>
              )}

              <div className="mb-4">
                <span className="text-lg font-bold text-gray-900">
                  Rp {order.totalPrice.toLocaleString()}
                </span>
              </div>

              {order.deliveryDate && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Delivery: </span>
                  <span className="text-sm font-medium">
                    {new Date(order.deliveryDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="flex-1 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  View
                </button>
                {order.status !== LaundryOrderStatus.COMPLETED && order.status !== LaundryOrderStatus.CANCELLED && (
                  <select
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value as LaundryOrderStatus)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value={LaundryOrderStatus.PENDING}>Pending</option>
                    <option value={LaundryOrderStatus.IN_PROGRESS}>In Progress</option>
                    <option value={LaundryOrderStatus.READY}>Ready</option>
                    <option value={LaundryOrderStatus.DELIVERED}>Delivered</option>
                    <option value={LaundryOrderStatus.COMPLETED}>Completed</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({
  order,
  onClose,
}: {
  order: LaundryOrder;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Laundry Order Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-lg font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-semibold capitalize">{order.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Type</p>
              <p className="text-lg font-semibold">{order.serviceTypeName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-lg font-semibold">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {order.customerName && (
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="text-lg font-semibold">{order.customerName}</p>
            </div>
          )}

          {order.totalWeight && (
            <div>
              <p className="text-sm text-gray-500">Total Weight</p>
              <p className="text-lg font-semibold">{order.totalWeight} kg</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {order.pickupDate && (
              <div>
                <p className="text-sm text-gray-500">Pickup Date</p>
                <p className="text-lg font-semibold">
                  {new Date(order.pickupDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {order.deliveryDate && (
              <div>
                <p className="text-sm text-gray-500">Delivery Date</p>
                <p className="text-lg font-semibold">
                  {new Date(order.deliveryDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Items ({order.items?.length || 0})</h3>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      {item.notes && <p className="text-sm text-gray-500">Note: {item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No items</p>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Price</span>
              <span>Rp {order.totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="text-gray-900">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
