'use client';

import { useState, useEffect } from 'react';
import { Clock, DollarSign, TrendingUp, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { shiftService } from '@/services/shift.service';
import { Shift } from '@/types';

export default function ShiftsPage() {
  const { company, user } = useAuth();
  const storeId = company?.id;
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');

  useEffect(() => {
    if (storeId) {
      loadShifts();
    }
  }, [storeId]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const [active, history] = await Promise.all([
        shiftService.getActiveShift(storeId!).catch(() => null),
        shiftService.getShifts(storeId!),
      ]);
      setActiveShift(active);
      setShifts(history);
    } catch (error) {
      console.error('Failed to load shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid opening cash amount');
      return;
    }

    try {
      await shiftService.openShift({
        storeId: storeId!,
        openingAmount: amount,
      });
      setShowOpenModal(false);
      setOpeningCash('');
      loadShifts();
      alert('Shift opened successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to open shift');
    }
  };

  const handleCloseShift = async () => {
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid closing cash amount');
      return;
    }

    try {
      await shiftService.closeShift(activeShift!.id, {
        shiftId: activeShift!.id,
      });
      setShowCloseModal(false);
      setClosingCash('');
      loadShifts();
      alert('Shift closed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to close shift');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shifts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600 mt-1">Manage cashier shifts and cash declarations</p>
        </div>
        {!activeShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Open New Shift
          </button>
        )}
      </div>

      {/* Active Shift Card */}
      {activeShift && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Clock size={24} />
                <h2 className="text-xl font-bold">Active Shift</h2>
              </div>
              <p className="text-green-100">
                Started: {new Date(activeShift.startTime).toLocaleString('id-ID')}
              </p>
              <p className="text-green-100 mt-1">
                Opening Cash: Rp {activeShift.startingCash.toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-green-50 font-semibold"
            >
              Close Shift
            </button>
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Shift History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shift ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  End Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Opening Cash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Closing Cash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{shift.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(shift.startTime).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {shift.endTime ? new Date(shift.endTime).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {shift.startingCash.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {shift.endingCash ? `Rp ${shift.endingCash.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        shift.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {shift.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {shifts.length === 0 && (
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No shift history</p>
            </div>
          )}
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Open New Shift</h2>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Cash Amount (Rp)
                </label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter opening cash..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  Count all cash in the register before starting your shift. This will be used for reconciliation at the end of the shift.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenShift}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
              >
                Open Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Close Shift</h2>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Opening Cash</p>
                <p className="text-xl font-bold text-gray-900">
                  Rp {activeShift?.startingCash.toLocaleString('id-ID')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closing Cash Amount (Rp)
                </label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter closing cash..."
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-900">
                  Count all cash in the register. The system will calculate any variance and generate a shift report.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseShift}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                Close Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
