'use client';

import { useState, useEffect } from 'react';
import { laundryService } from '@/services/laundry.service';
import { Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaundrySchedulePage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await laundryService.getSchedule(undefined, selectedDate);
      setSchedule(response);
    } catch (error: any) {
      console.error('Failed to load schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laundry Schedule</h1>
        <p className="text-gray-600 mt-1">View pickup and delivery schedule</p>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Schedule Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pickups */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Pickups ({schedule?.pickups?.length || 0})
            </h2>
            {schedule?.pickups && schedule.pickups.length > 0 ? (
              <div className="space-y-3">
                {schedule.pickups.map((order: any) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customerName || 'Walk-in'}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                        Pickup
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Service: {order.serviceTypeName || '-'}
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-2">
                      Rp {order.totalPrice?.toLocaleString() || 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No pickups scheduled</p>
            )}
          </div>

          {/* Deliveries */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Deliveries ({schedule?.deliveries?.length || 0})
            </h2>
            {schedule?.deliveries && schedule.deliveries.length > 0 ? (
              <div className="space-y-3">
                {schedule.deliveries.map((order: any) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customerName || 'Walk-in'}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                        Delivery
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Service: {order.serviceTypeName || '-'}
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-2">
                      Rp {order.totalPrice?.toLocaleString() || 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No deliveries scheduled</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
